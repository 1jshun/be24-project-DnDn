<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { fetchProgressList, fetchDelayRiskTasks } from '@/api/analysis.js'
import api from '@/api/index'
import { useCurrentProject } from '@/composables/useCurrentProject.js'
import { normalizeListResponse, toDateKey } from '@/utils/schedule/analysis/analysisUtils.js'
import {
  buildRedistributionPlan,
  getPlanId,
} from '@/utils/schedule/analysis/redistributionPlanner.js'
import {
  inferRepresentativeTradeName,
  mapDelayTaskItem,
  mapProgressItem,
} from '@/utils/schedule/analysis/analysisMappers.js'
import {
  arcPath,
  buildGroupProgress,
  buildScheduleKpi,
} from '@/utils/schedule/analysis/dashboardHelpers.js'
import { useAiScheduleRecommendations } from '@/composables/schedule/analysis/useAiScheduleRecommendations.js'
import { useAiRequestCreation } from '@/composables/schedule/analysis/useAiRequestCreation.js'
import { useScheduleChangeActions } from '@/composables/schedule/analysis/useScheduleChangeActions.js'
import OverviewTab from '@/components/schedule/analysis/OverviewTab.vue'
import AiRecommendationTab from '@/components/schedule/analysis/AiRecommendationTab.vue'
import AiQuickConfirmModal from '@/components/schedule/analysis/AiQuickConfirmModal.vue'
import RejectRequestModal from '@/components/schedule/analysis/RejectRequestModal.vue'
import TaskDetailModal from '@/components/schedule/analysis/TaskDetailModal.vue'
import ScheduleChangeTab from '@/components/schedule/analysis/ScheduleChangeTab.vue'
import { ShieldCheck, UserCog, ClipboardList, BarChart3, Activity, Layers } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/authStore'
import { tradeMatches, useAuthScope } from '@/utils/authScope'

// 권한
const auth = useAuthStore()
const { isTradeScope, assignedTrade } = useAuthScope(auth)
const canSwitchAuthority = computed(() => auth.isAdminRole)
const currentTrade = ref('all')

const isSupervisor = computed(() => currentTrade.value === 'all')

// 대표 공종 단위로 권한 선택
const tradeAuthorityOptions = computed(() => {
  if (isTradeScope.value && assignedTrade.value) {
    return [{ id: `trade:${assignedTrade.value}`, name: assignedTrade.value }]
  }

  const names = new Set()
  processes.value.forEach((p) => {
    const tradeName = inferRepresentativeTradeName(p)
    if (tradeName && tradeName !== '기타') names.add(tradeName)
  })
  return Array.from(names).map((name) => ({ id: `trade:${name}`, name }))
})

const currentTradeItem = computed(() => {
  if (isSupervisor.value) return null
  return { id: `trade:${currentTrade.value}`, name: currentTrade.value }
})

const currentTradeLabel = computed(() => {
  if (isSupervisor.value) return '현장 총 책임자'
  return currentTradeItem.value ? `${currentTradeItem.value.name} 공종 책임자` : '공종 책임자'
})

watch(currentTrade, () => {
  filterProcess.value = '전체'
})

// 필터
const selectedTradeId = ref(null)
const filterProcess = ref('전체')
const filterStatus = ref('전체')
const filterRisk = ref('전체')

watch(
  [isTradeScope, assignedTrade],
  () => {
    currentTrade.value = isTradeScope.value && assignedTrade.value ? assignedTrade.value : 'all'
    selectedTradeId.value = null
    filterProcess.value = '전체'
  },
  { immediate: true },
)

watch([currentTrade, filterProcess], () => {
  if (processes.value.length > 0) {
    invalidateDelayRiskTasks()
  }
})

watch(selectedTradeId, () => {
  if (processes.value.length > 0) {
    invalidateDelayRiskTasks()
  }
})

// 탭
const DELAY_RISK_TAB_KEY = 'ai'
const activeTab = ref('overview')
const tabs = computed(() => [
  { key: 'overview', label: '현황 분석', icon: BarChart3 },
  { key: 'ai', label: '지연 위험 작업', icon: Activity },
  {
    key: 'change',
    label: isSupervisor.value ? '변경 승인 · 이력' : '변경 요청 · 이력',
    icon: ClipboardList,
  },
])

const changeSubView = ref('active') // active | history

function selectMainTab(key) {
  activeTab.value = key
  if (key === 'change' && !['active', 'history'].includes(changeSubView.value)) {
    changeSubView.value = 'active'
  }
  if (key === DELAY_RISK_TAB_KEY && !loading.value) {
    loadDelayRiskTasksIfNeeded()
  }
}

function selectChangeSubView(view) {
  activeTab.value = 'change'
  changeSubView.value = view
}

// 백엔드 데이터
const { currentProjectId } = useCurrentProject()

const processes = ref([])
const delayTasks = ref([])
const delayTasksLoaded = ref(false)
const delayTasksLoading = ref(false)

// 재분배는 선택된 월간 계획의 하위 일정 기준
const monthlyWorkPlans = ref([])
const weeklyWorkPlans = ref([])
const todayReports = ref([])

const loading = ref(false)
const errorMessage = ref('')

async function loadWorkPlanDetails() {
  const [monthlyRes, weeklyRes] = await Promise.all([
    api
      .get('/work-plan', { params: { projectId: currentProjectId.value, planType: '월간' } })
      .catch(() => ({ data: [] })),
    api
      .get('/work-plan', { params: { projectId: currentProjectId.value, planType: '주간' } })
      .catch(() => ({ data: [] })),
  ])

  monthlyWorkPlans.value = normalizeListResponse(monthlyRes)
  weeklyWorkPlans.value = normalizeListResponse(weeklyRes)
}

async function loadTodayReports() {
  const today = toDateKey(new Date())
  const res = await api.get('/report/', { params: { date: today } }).catch(() => ({ data: [] }))
  todayReports.value = normalizeListResponse(res)
}

function findMonthlyPlanForTask(item) {
  const targetId = Number(item?.workPlanId ?? item?.idx ?? item?.id ?? 0)
  const byId = monthlyWorkPlans.value.find((p) => getPlanId(p) === targetId)
  if (byId) return byId

  const targetName = String(item?.name ?? '').trim()
  if (targetName) {
    const byName = monthlyWorkPlans.value.find((p) => String(p.name ?? '').trim() === targetName)
    if (byName) return byName
  }

  return null
}

function findDetailSchedulesForMonthly(monthlyPlanId) {
  const id = Number(monthlyPlanId)
  if (!id) return []
  return weeklyWorkPlans.value
    .filter((p) => Number(p.parentWorkPlanId ?? p.parent_work_plan_id ?? p.parentId ?? 0) === id)
    .sort((a, b) => String(a.startDate ?? '').localeCompare(String(b.startDate ?? '')))
}

function hasTodayReportForSchedule(schedule) {
  const scheduleId = getPlanId(schedule)
  if (!scheduleId) return false
  return todayReports.value.some((r) => Number(r.workPlanId ?? r.work_plan_id ?? 0) === scheduleId)
}

function buildTaskRedistributionPlan(task) {
  return buildRedistributionPlan(task, { hasTodayReportForSchedule })
}

const selectedTaskId = ref(null)
const selectedTask = computed(
  () => delayTasks.value.find((task) => task.id === selectedTaskId.value) || null,
)
const { aiRecs, ensureAiRecommendation, requestAiRecommendationForSelectedTask } =
  useAiScheduleRecommendations({
    delayTasks,
    currentProjectId,
    selectedTask,
    buildTaskRedistributionPlan,
  })

function getSelectedTradeProcessId() {
  if (typeof selectedTradeId.value === 'number') return selectedTradeId.value
  if (typeof selectedTradeId.value === 'string' && !selectedTradeId.value.startsWith('trade:')) {
    const n = Number(selectedTradeId.value)
    if (Number.isFinite(n)) return n
  }

  // 대표 공종 선택은 프론트에서 이름으로 필터링한다.
  if (!isSupervisor.value && currentTradeItem.value) {
    return null
  }

  return null
}

function getSelectedProcessName() {
  if (typeof selectedTradeId.value === 'string' && selectedTradeId.value.startsWith('trade:')) {
    return selectedTradeId.value.replace('trade:', '')
  }
  if (selectedTradeId.value) {
    const found = processes.value.find((p) => p.id === selectedTradeId.value)
    if (found) return inferRepresentativeTradeName(found)
  }
  if (!isSupervisor.value && currentTradeItem.value) return currentTradeItem.value.name

  return filterProcess.value === '전체' ? null : filterProcess.value
}

async function loadProgressList() {
  const data = await fetchProgressList(currentProjectId.value)
  processes.value = data.map(mapProgressItem)
}

async function loadDelayRiskTasks() {
  const tradeProcessId = getSelectedTradeProcessId()
  const processName = getSelectedProcessName()

  const data = await fetchDelayRiskTasks(currentProjectId.value, tradeProcessId)
  const mappedTasks = data.map((item) =>
    mapDelayTaskItem(item, {
      findMonthlyPlanForTask,
      findDetailSchedulesForMonthly,
      buildRedistributionPlan: buildTaskRedistributionPlan,
      onMapped: ensureAiRecommendation,
    }),
  )
  delayTasks.value = processName
    ? mappedTasks.filter((task) => tradeMatches(task.process, processName))
    : mappedTasks

  if (!selectedTaskId.value && delayTasks.value.length > 0) {
    selectedTaskId.value = delayTasks.value[0].id
  }
  if (selectedTaskId.value && !delayTasks.value.some((t) => t.id === selectedTaskId.value)) {
    selectedTaskId.value = delayTasks.value[0]?.id ?? null
  }
}

async function loadDelayRiskTasksIfNeeded(force = false) {
  if (delayTasksLoading.value) return
  if (!force && delayTasksLoaded.value) return

  try {
    delayTasksLoading.value = true
    await loadDelayRiskTasks()
    delayTasksLoaded.value = true
  } catch (e) {
    errorMessage.value = e.message || '지연 위험 작업을 불러오지 못했습니다.'
  } finally {
    delayTasksLoading.value = false
  }
}

function invalidateDelayRiskTasks() {
  delayTasksLoaded.value = false
  if (activeTab.value === DELAY_RISK_TAB_KEY) {
    loadDelayRiskTasksIfNeeded(true)
  }
}

async function refreshScheduleContext() {
  await Promise.all([loadProgressList(), loadWorkPlanDetails()])
  if (activeTab.value === DELAY_RISK_TAB_KEY || delayTasksLoaded.value) {
    await loadDelayRiskTasksIfNeeded(true)
  }
}

const {
  changeRequests,
  changeHistory,
  applyingScheduleIds,
  loadScheduleChangeData,
  requestForm,
  submitRequest,
  rejectModal,
  approveRequest,
  applyToSchedule,
  openRejectModal,
  confirmReject,
} = useScheduleChangeActions({
  currentProjectId,
  currentTradeItem,
  currentTradeLabel,
  activeTab,
  changeSubView,
  refreshScheduleContext,
})

async function loadAnalysisData() {
  try {
    loading.value = true
    errorMessage.value = ''
    await Promise.all([
      loadProgressList(),
      loadWorkPlanDetails(),
      loadTodayReports(),
      loadScheduleChangeData(),
    ])
    if (activeTab.value === DELAY_RISK_TAB_KEY) {
      await loadDelayRiskTasksIfNeeded(true)
    }
  } catch (e) {
    errorMessage.value = e.message || '공정 분석 데이터를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAnalysisData()
})

// 화면 표시용 필터
function passProcessFilter(name) {
  if (filterProcess.value === '전체') return true
  return tradeMatches(name, filterProcess.value)
}
function passStatusFilter(status) {
  if (filterStatus.value === '전체') return true
  return status === filterStatus.value
}
function passRiskFilter(risk) {
  if (filterRisk.value === '전체') return true
  return risk === filterRisk.value
}

const visibleProcesses = computed(() => {
  let r = processes.value
  if (!isSupervisor.value) {
    const myName = currentTradeItem.value?.name
    r = myName ? r.filter((p) => tradeMatches(inferRepresentativeTradeName(p), myName)) : []
  } else {
    r = r.filter((p) => passProcessFilter(inferRepresentativeTradeName(p)))
  }
  r = r.filter((p) => passStatusFilter(p.status))
  r = r.filter((p) => passRiskFilter(p.risk))
  return r
})

const visibleTasks = computed(() => {
  let r = delayTasks.value.filter((t) => t.risk !== '낮음')
  if (!isSupervisor.value) {
    const myName = currentTradeItem.value?.name
    r = myName ? r.filter((t) => tradeMatches(t.process, myName)) : []
  } else {
    r = r.filter((t) => passProcessFilter(t.process))
  }
  r = r.filter((t) => passRiskFilter(t.risk))
  return r
})

const visibleRequests = computed(() => {
  let r = changeRequests.value
  if (!isSupervisor.value) {
    const myName = currentTradeItem.value?.name
    r = myName ? r.filter((req) => tradeMatches(req.process, myName)) : []
  } else {
    r = r.filter((req) => passProcessFilter(req.process))
  }
  return r
})

const visibleHistory = computed(() => {
  let r = changeHistory.value
  if (!isSupervisor.value) {
    const myName = currentTradeItem.value?.name
    r = myName ? r.filter((h) => tradeMatches(h.process, myName)) : []
  } else {
    r = r.filter((h) => passProcessFilter(h.process))
  }
  return r
})

// 대시보드 요약
const noDataYet = computed(() => !loading.value && processes.value.length === 0)
const groupProgress = computed(() =>
  buildGroupProgress(visibleProcesses.value, inferRepresentativeTradeName),
)
const kpi = computed(() => buildScheduleKpi(visibleProcesses.value, visibleRequests.value))

const taskDetailModal = ref({ show: false, taskId: null })
function openTaskDetail(taskId) {
  taskDetailModal.value = { show: true, taskId }
}
function closeTaskDetail() {
  taskDetailModal.value = { show: false, taskId: null }
}
function gotoAiFromDetail() {
  if (!detailTask.value) return
  selectedTaskId.value = detailTask.value.id
  activeTab.value = DELAY_RISK_TAB_KEY
  loadDelayRiskTasksIfNeeded()
  closeTaskDetail()
}

function onTradeCardClick(tradeProcessId) {
  selectedTradeId.value = tradeProcessId
  activeTab.value = DELAY_RISK_TAB_KEY
  loadDelayRiskTasksIfNeeded()
}

function clearSelectedTrade() {
  selectedTradeId.value = null
}

const currentSelectedTradeName = computed(() => {
  if (!selectedTradeId.value) return null
  if (typeof selectedTradeId.value === 'string' && selectedTradeId.value.startsWith('trade:')) {
    return selectedTradeId.value.replace('trade:', '')
  }
  const found = processes.value.find((p) => p.id === selectedTradeId.value)
  return found ? inferRepresentativeTradeName(found) : null
})
const detailTask = computed(() =>
  taskDetailModal.value.taskId
    ? delayTasks.value.find((t) => t.id === taskDetailModal.value.taskId)
    : null,
)
const detailRec = computed(() =>
  taskDetailModal.value.taskId ? aiRecs[taskDetailModal.value.taskId] : null,
)

const selectedRec = computed(() => (selectedTaskId.value ? aiRecs[selectedTaskId.value] : null))
const { aiQuickConfirm, aiQuickSummary, createRequestFromAi, quickSubmitFromAi } =
  useAiRequestCreation({
    selectedTask,
    selectedRec,
    currentTradeItem,
    requestForm,
    submitRequest,
  })

const statusColor = (s) =>
  ({
    정상: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    주의: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    '지연 위험': 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    지연: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    완료: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    미착수: 'bg-slate-50 text-slate-500 ring-1 ring-slate-200',
  })[s] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'

const riskColor = (r) =>
  ({
    낮음: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    보통: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    높음: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    '매우 높음': 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  })[r] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
</script>

<template>
  <div class="flex flex-col gap-5 pb-10">
    <!-- 헤더 -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-widest text-flare-600">일정 관리</p>
        <h1 class="text-xl font-bold text-forena-900">공정 분석</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-1.5 rounded-lg border border-forena-200 bg-white pl-2.5">
          <Layers class="h-3.5 w-3.5 text-forena-400" />
          <span class="text-[11px] font-bold uppercase tracking-wide text-forena-400">공종</span>
          <select
            v-model="currentTrade"
            :disabled="!canSwitchAuthority"
            class="cursor-pointer rounded-r-lg bg-forena-800 px-3 py-1.5 text-xs font-bold text-white outline-none transition hover:bg-forena-900"
          >
            <option value="all">현장 총 책임자 (전체)</option>
            <option v-for="p in tradeAuthorityOptions" :key="p.id" :value="p.name">
              {{ p.name }} 책임자
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- 권한 안내 -->
    <div
      v-if="!isSupervisor"
      class="flex items-center gap-2 rounded-lg border border-flare-200 bg-flare-50/60 px-3 py-2 text-xs text-forena-800"
    >
      <UserCog class="h-3.5 w-3.5 shrink-0 text-flare-600" />
      <span>
        <strong class="text-flare-700">{{ currentTradeLabel }}</strong> 계정 —
        {{ currentTradeItem?.name || '선택된 공종' }} 공종만 조회 및 일정 변경 요청 가능
      </span>
    </div>
    <div
      v-else
      class="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-forena-800"
    >
      <ShieldCheck class="h-3.5 w-3.5 shrink-0 text-emerald-600" />
      <span>
        <strong class="text-emerald-700">현장 총 책임자</strong> 계정 — 전체 공종 조회 및 변경 요청
        승인·반려·반영 가능
      </span>
    </div>

    <!-- KPI -->
    <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <div class="rounded-xl border border-orange-200 bg-white p-3.5">
        <p class="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-orange-600">
          지연 위험
        </p>
        <p class="text-2xl font-bold tabular-nums text-orange-700">{{ kpi.riskCount }}</p>
        <p class="mt-0.5 text-[10px] text-orange-400">건</p>
      </div>
      <div class="rounded-xl border border-rose-200 bg-white p-3.5">
        <p class="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-500">지연 발생</p>
        <p class="text-2xl font-bold tabular-nums text-rose-700">{{ kpi.delayCount }}</p>
        <p class="mt-0.5 text-[10px] text-rose-400">건</p>
      </div>
      <div class="rounded-xl border border-amber-200 bg-white p-3.5">
        <p class="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">변경 요청</p>
        <p class="text-2xl font-bold tabular-nums text-amber-700">{{ kpi.reqCount }}</p>
        <p class="mt-0.5 text-[10px] text-amber-500">건</p>
      </div>
      <div class="rounded-xl border border-forena-200 bg-white p-3.5">
        <p class="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-forena-400">
          승인 대기
        </p>
        <p class="text-2xl font-bold tabular-nums text-forena-900">{{ kpi.pendingCount }}</p>
        <p class="mt-0.5 text-[10px] text-forena-400">건</p>
      </div>
    </div>

    <!-- 상태 메시지 -->
    <div
      v-if="loading"
      class="rounded-xl border border-forena-200 bg-white px-4 py-3 text-sm text-forena-500"
    >
      공정 분석 데이터를 불러오는 중입니다...
    </div>
    <div
      v-if="errorMessage"
      class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
    >
      {{ errorMessage }}
    </div>

    <!-- 탭 -->
    <div class="flex gap-1 rounded-xl border border-forena-200 bg-forena-50/60 p-1">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        @click.prevent.stop="selectMainTab(t.key)"
        class="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition"
        :class="
          activeTab === t.key
            ? 'bg-white text-forena-900 shadow-sm'
            : 'text-forena-400 hover:text-forena-700'
        "
      >
        <component :is="t.icon" class="h-3.5 w-3.5" />
        {{ t.label }}
        <span
          v-if="t.key === 'change' && kpi.pendingCount > 0"
          class="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] text-white"
          >{{ kpi.pendingCount }}</span
        >
      </button>
    </div>

    <OverviewTab
      v-if="activeTab === 'overview'"
      :no-data-yet="noDataYet"
      :group-progress="groupProgress"
      :selected-trade-id="selectedTradeId"
      :status-color="statusColor"
      :risk-color="riskColor"
      :arc-path="arcPath"
      @select-trade="onTradeCardClick"
    />

    <AiRecommendationTab
      v-if="activeTab === 'ai'"
      :visible-tasks="visibleTasks"
      :selected-task-id="selectedTaskId"
      :selected-task="selectedTask"
      :selected-rec="selectedRec"
      :selected-trade-id="selectedTradeId"
      :current-selected-trade-name="currentSelectedTradeName"
      :is-supervisor="isSupervisor"
      :current-trade-item="currentTradeItem"
      :loading="delayTasksLoading"
      @select-task="selectedTaskId = $event"
      @clear-task-selection="selectedTaskId = null"
      @clear-selected-trade="clearSelectedTrade"
      @open-task-detail="openTaskDetail"
      @request-ai-recommendation="requestAiRecommendationForSelectedTask"
      @create-request-from-ai="createRequestFromAi"
    />

    <ScheduleChangeTab
      v-if="activeTab === 'change'"
      :is-supervisor="isSupervisor"
      :change-sub-view="changeSubView"
      :visible-requests="visibleRequests"
      :visible-history="visibleHistory"
      :pending-count="kpi.pendingCount"
      :applying-schedule-ids="applyingScheduleIds"
      @select-sub-view="selectChangeSubView"
      @reject="openRejectModal"
      @approve="approveRequest"
      @apply="applyToSchedule"
    />

    <!-- 모달 -->
    <AiQuickConfirmModal
      :show="aiQuickConfirm.show"
      :selected-task="selectedTask"
      :selected-rec="selectedRec"
      :ai-quick-summary="aiQuickSummary"
      @close="aiQuickConfirm.show = false"
      @submit="quickSubmitFromAi"
    />

    <RejectRequestModal
      :modal="rejectModal"
      @close="rejectModal.show = false"
      @confirm="confirmReject"
    />

    <TaskDetailModal
      :show="taskDetailModal.show"
      :detail-task="detailTask"
      :detail-rec="detailRec"
      @close="closeTaskDetail"
      @goto-ai="gotoAiFromDetail"
    />
  </div>
</template>
