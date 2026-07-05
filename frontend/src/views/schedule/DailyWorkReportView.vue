<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import api from '@/api/index'
import DailyWorkReportEditorModal from '@/components/schedule/dailyWorkReport/DailyWorkReportEditorModal.vue'
import ReportViewerModal from '@/components/schedule/dailyWorkReport/ReportViewerModal.vue'
import TaskSelectorModal from '@/components/schedule/dailyWorkReport/TaskSelectorModal.vue'
import { useCurrentProject } from '@/composables/useCurrentProject.js'
import { useApprovedScheduleChanges } from '@/composables/schedule/dailyWorkReport/useApprovedScheduleChanges.js'
import { useDailyWorkReports } from '@/composables/schedule/dailyWorkReport/useDailyWorkReports.js'
import { isMilestoneScheduleRow } from '@/utils/scheduleMapper.js'
import {
  ROLES,
  ALL_PROCESSES,
  equipmentList,
  addDays,
  fmtKor,
  getAllTradeOptions,
  getEqKorName,
  getTradeNameFromRecord,
  toDateString,
  toNumberOrNull,
  todayStr,
} from '@/utils/schedule/dailyWorkReport.js'
import { useAuthStore } from '@/stores/authStore'
import { tradeMatches, useAuthScope } from '@/utils/authScope'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Users,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Eye,
  Pencil,
  Layers,
  ShieldCheck,
  UserCog,
} from 'lucide-vue-next'

const { currentProjectId } = useCurrentProject()
const auth = useAuthStore()
const { isTradeScope, assignedTrade, currentRoleMode } = useAuthScope(auth)
const canSwitchRole = computed(() => auth.isAdminRole)

const currentRole = ref(ROLES.WORKER)
const tradeOptions = ref([])
const myProcess = ref('')
const processOptions = computed(() =>
  isTradeScope.value && assignedTrade.value ? [assignedTrade.value] : tradeOptions.value,
)

const selectedDate = ref(todayStr())

const dateInputRef = ref(null) // HTML의 input 태그를 가리킬 변수

function openDatePicker() {    // 달력을 강제로 여는 함수
  if (dateInputRef.value && typeof dateInputRef.value.showPicker === 'function') {
    dateInputRef.value.showPicker()
  }
}

function prevDay() {
  selectedDate.value = addDays(selectedDate.value, -1)
}
function nextDay() {
  selectedDate.value = addDays(selectedDate.value, 1)
}
function goToday() {
  selectedDate.value = todayStr()
}
const isToday = computed(() => selectedDate.value === todayStr())

const activeTab = ref('today')

function ensureSelectedProcess() {
  if (isTradeScope.value && assignedTrade.value) {
    myProcess.value = assignedTrade.value
    return
  }

  if (!processOptions.value.length) {
    myProcess.value = ''
    return
  }

  if (!myProcess.value || !processOptions.value.includes(myProcess.value)) {
    myProcess.value = processOptions.value[0]
  }
}

watch(
  [currentRoleMode, assignedTrade],
  () => {
    currentRole.value = currentRoleMode.value
    ensureSelectedProcess()
    if (currentRole.value === ROLES.WORKER) activeTab.value = 'today'
  },
  { immediate: true },
)

function switchTab(tab) {
  if (tab === 'consolidated' && currentRole.value !== ROLES.MANAGER) return
  activeTab.value = tab
}

function switchRole(role) {
  if (!canSwitchRole.value) return
  currentRole.value = role
  if (role === ROLES.WORKER) activeTab.value = 'today'
}

const {
  reports,
  viewingReport,
  loadReportsForDate,
  saveDraftReport,
  submitReport: submitDailyReport,
  openViewer,
  closeViewer,
  approveReport,
  rejectReport,
} = useDailyWorkReports()

onMounted(() => {
  loadReportsForDate(selectedDate.value)
  loadApprovedScheduleChanges()
  fetchTradeOptions()
  document.addEventListener('keydown', onKeydown)
})

watch(selectedDate, (newDate) => {
  loadReportsForDate(newDate)
  loadApprovedScheduleChanges()
})

const STATUS_META = {
  '작성 전': { cls: 'bg-slate-100 text-slate-500 ring-slate-200', icon: Clock },
  '임시 저장': { cls: 'bg-amber-50 text-amber-700 ring-amber-200', icon: Pencil },
  '제출 완료': { cls: 'bg-sky-50 text-sky-700 ring-sky-200', icon: Send },
  '검토 중': { cls: 'bg-violet-50 text-violet-700 ring-violet-200', icon: Eye },
  '승인 완료': { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
  반려: { cls: 'bg-rose-50 text-rose-700 ring-rose-200', icon: AlertTriangle },
}
function statusMeta(s) {
  return STATUS_META[s] || STATUS_META['작성 전']
}

const visibleProcesses = computed(() => {
  if (currentRole.value === ROLES.WORKER) return [myProcess.value]
  return processOptions.value
})

async function fetchTradeOptions() {
  if (!localStorage.getItem('accessToken')) {
    tradeOptions.value = []
    ensureSelectedProcess()
    return
  }
  if (!auth.projectId && !auth.isAdminRole) {
    tradeOptions.value = []
    ensureSelectedProcess()
    return
  }

  try {
    const response = await api.get('/trade-process', {
      params: { projectId: currentProjectId.value },
    })
    const data = Array.isArray(response) ? response : response?.data || []
    const trades = data
      .filter((p) => !isMilestoneScheduleRow(p))
      .map((p) => p.tradeName || p.name)
      .filter(Boolean)
    tradeOptions.value = Array.from(new Set(trades))
  } catch (e) {
    console.warn('마스터 공정표 기준 공종 목록 조회 실패:', e)
    tradeOptions.value = []
  }
  ensureSelectedProcess()
}

function reportsForDate(dateStr) {
  return reports.value.filter(
    (r) =>
      r.date === dateStr &&
      (currentRole.value === ROLES.WORKER
        ? tradeMatches(r.process, myProcess.value)
        : visibleProcesses.value.includes(r.process)),
  )
}

const todayReports = computed(() => reportsForDate(selectedDate.value))

const stats = computed(() => {
  const list = todayReports.value
  const total = list.length
  const submitted = list.filter((r) =>
    ['제출 완료', '검토 중', '승인 완료'].includes(r.status),
  ).length
  const pending = list.filter((r) => r.status === '작성 전' || r.status === '임시 저장').length
  const completed = list.filter((r) => r.completion === '완료').length
  const totalWorkers = list.reduce((s, r) => s + (r.workers || 0), 0)
  const totalEquip = list.reduce((s, r) => s + (r.equipmentCount || 0), 0)
  const avgProgress = total
    ? Math.round(list.reduce((s, r) => s + (r.processProgress || 0), 0) / total)
    : 0
  return { total, submitted, pending, completed, totalWorkers, totalEquip, avgProgress }
})

const showEditor = ref(false)
const editingReport = ref(null)
const { loadApprovedScheduleChanges, applyApprovedScheduleTarget, applyMonthlyScheduleWeights } =
  useApprovedScheduleChanges({ currentProjectId, reports, editingReport })
const isNewReport = ref(false)

const showTaskSelector = ref(false)
const availableTodayOrders = ref([])

function canEdit(report) {
  if (currentRole.value === ROLES.MANAGER) return false
  if (!tradeMatches(report.process, myProcess.value)) return false
  if (report.status === '승인 완료') return false
  return true
}

function isApprovedWorkOrder(order) {
  const status = String(order?.statusCode || order?.status || '')
    .trim()
    .toUpperCase()
  return status === 'APPROVED' || status === '승인 완료'
}

async function openCreate() {
  const targetDate = selectedDate.value
  const targetProcess = myProcess.value

  try {
    const res = await api.get('/work-order').catch(() => ({ data: [] }))
    const orders = Array.isArray(res) ? res : res.data?.data || res.data || []

    availableTodayOrders.value = orders.filter(
      (o) =>
        tradeMatches(getTradeNameFromRecord(o), targetProcess) &&
        toDateString(o.dueDate || o.date) === targetDate &&
        isApprovedWorkOrder(o),
    )

    if (availableTodayOrders.value.length === 0) {
      alert(`${targetDate} 일자에 등록된 [${targetProcess}] 작업 지시서가 없습니다.`)
      return
    }
    showTaskSelector.value = true
  } catch (e) {
    console.error('작업 지시서 조회 실패:', e)
  }
}

async function selectTaskForReport(order) {
  showTaskSelector.value = false
  isNewReport.value = true

  editingReport.value = {
    id: `r_${Date.now()}`,
    date: selectedDate.value,
    process: myProcess.value,
    author: '나(담당자)',
    location:
      order.location || order.title.replace(`[${myProcess.value}] `, '').replace(' 작업지시서', ''),
    workers: order.workerCount || 0,
    equipmentCount: 0,
    equipmentList: (order.equipments || []).map(
      (eq) =>
        `${getEqKorName(eq.equipmentName || eq.type)} ${eq.equipmentCount || eq.count || 1}대`,
    ),
    equipmentInput: { name: '', count: 1 },
    todayWork: `[지시내용]\n${order.instructionContent || ''}\n\n[실제 완료]\n`,
    startDate: '',
    endDate: '',
    tradeStartDate: '',
    tradeEndDate: '',
    progress: 0,
    processProgress: 0,
    prevProgress: 0,
    completion: '미완료',
    notes: '',
    photos: [],
    files: [],
    status: '작성 전',
    workPlanId: order.workPlanId || null,
    monthlyWorkPlanId: null,
    monthlyWorkPlanName: '',
    todayMonthlyOrderCount: 1,
    approvedDailyTargetPct: null,
    normalDailyTargetPct: null,
    dailyTargetSource: 'duration',
    scheduleWeightPct: null,
    normalScheduleWeightPct: null,
    remainingScheduleWeightPct: null,
    monthlyScheduleCount: 0,
    scheduleWeightSource: 'duration',
  }

  try {
    const [weekRes, monthRes] = await Promise.all([
      api
        .get('/work-plan', { params: { projectId: currentProjectId.value, planType: '주간' } })
        .catch(() => ({ data: [] })),
      api
        .get('/work-plan', { params: { projectId: currentProjectId.value, planType: '월간' } })
        .catch(() => ({ data: [] })),
    ])

    const weeklyPlans = Array.isArray(weekRes) ? weekRes : weekRes.data?.data || weekRes.data || []

    const monthlyPlans = Array.isArray(monthRes)
      ? monthRes
      : monthRes.data?.data || monthRes.data || []

    function findMonthlyPlanByWeeklyPlanId(weeklyPlanId) {
      if (!weeklyPlanId) return null

      const weeklyPlan = weeklyPlans.find((p) => Number(p.idx ?? p.id) === Number(weeklyPlanId))

      if (!weeklyPlan?.parentWorkPlanId) return null

      return (
        monthlyPlans.find((p) => Number(p.idx ?? p.id) === Number(weeklyPlan.parentWorkPlanId)) ||
        null
      )
    }

    const monthlyPlan = findMonthlyPlanByWeeklyPlanId(order.workPlanId)

    if (monthlyPlan) {
      editingReport.value.startDate = toDateString(monthlyPlan.startDate) || ''
      editingReport.value.endDate = toDateString(monthlyPlan.endDate) || ''
      editingReport.value.monthlyWorkPlanId = monthlyPlan.idx ?? monthlyPlan.id
      editingReport.value.monthlyWorkPlanName = monthlyPlan.name || ''
    } else if (order.workPlanId) {
      const currentPlan = weeklyPlans.find(
        (p) => Number(p.idx ?? p.id) === Number(order.workPlanId),
      )

      if (currentPlan) {
        editingReport.value.startDate = toDateString(currentPlan.startDate) || ''
        editingReport.value.endDate = toDateString(currentPlan.endDate) || ''
      }
    }

    if (monthlyPlan) {
      const monthlyPlanId = Number(monthlyPlan.idx ?? monthlyPlan.id)
      const sameMonthlyOrdersCount = availableTodayOrders.value.filter((todayOrder) => {
        const weeklyPlan = weeklyPlans.find(
          (p) => Number(p.idx ?? p.id) === Number(todayOrder.workPlanId),
        )
        return Number(weeklyPlan?.parentWorkPlanId) === monthlyPlanId
      }).length

      editingReport.value.todayMonthlyOrderCount = Math.max(1, sameMonthlyOrdersCount)
    }

    if (monthlyPlan) {
      const monthlyActualProgress = Number(
        monthlyPlan.actualProgressPct ?? monthlyPlan.actualProgress ?? 0,
      )
      editingReport.value.prevProgress = Number.isFinite(monthlyActualProgress)
        ? monthlyActualProgress
        : 0
      editingReport.value.processProgress = editingReport.value.prevProgress
    }

    await loadApprovedScheduleChanges()
    applyApprovedScheduleTarget()
    applyMonthlyScheduleWeights(weeklyPlans)
  } catch (e) {
    console.error('공사일보 계획 정보 로드 실패', e)
  }

  applyApprovedScheduleTarget()
  showEditor.value = true
}

async function openEditor(report) {
  isNewReport.value = false
  editingReport.value = {
    ...report,
    equipmentList: [...(report.equipmentList || [])],
    equipmentInput: { name: '', count: 1 },
    tradeStartDate: '',
    tradeEndDate: '',
    monthlyWorkPlanId: report.monthlyWorkPlanId || null,
    monthlyWorkPlanName: report.monthlyWorkPlanName || '',
    todayMonthlyOrderCount: report.todayMonthlyOrderCount || 1,
    approvedDailyTargetPct: report.approvedDailyTargetPct || null,
    normalDailyTargetPct: report.normalDailyTargetPct || null,
    dailyTargetSource: report.dailyTargetSource || 'duration',
    scheduleWeightPct: report.scheduleWeightPct || null,
    normalScheduleWeightPct: report.normalScheduleWeightPct || null,
    remainingScheduleWeightPct: report.remainingScheduleWeightPct || null,
    monthlyScheduleCount: report.monthlyScheduleCount || 0,
    scheduleWeightSource: report.scheduleWeightSource || 'duration',
    photos: (report.photos || []).map((p) => ({ ...p })),
    files: (report.files || []).map((f) => ({ ...f })),
  }

  try {
    const [weekRes, monthRes, yearRes] = await Promise.all([
      api
        .get('/work-plan', { params: { projectId: currentProjectId.value, planType: '주간' } })
        .catch(() => ({ data: [] })),
      api
        .get('/work-plan', { params: { projectId: currentProjectId.value, planType: '월간' } })
        .catch(() => ({ data: [] })),
      api
        .get('/work-plan', { params: { projectId: currentProjectId.value, planType: '연간' } })
        .catch(() => ({ data: [] })),
    ])

    const weeklyPlans = Array.isArray(weekRes) ? weekRes : weekRes.data?.data || weekRes.data || []
    const monthlyPlans = Array.isArray(monthRes)
      ? monthRes
      : monthRes.data?.data || monthRes.data || []
    const yearlyPlans = Array.isArray(yearRes) ? yearRes : yearRes.data?.data || yearRes.data || []

    const allPlans = [...weeklyPlans, ...monthlyPlans, ...yearlyPlans]

    if (report.workPlanId) {
      const weeklyPlan = weeklyPlans.find(
        (p) => Number(p.idx ?? p.id) === Number(report.workPlanId),
      )
      const monthlyPlan = weeklyPlan?.parentWorkPlanId
        ? monthlyPlans.find((p) => Number(p.idx ?? p.id) === Number(weeklyPlan.parentWorkPlanId))
        : null

      if (monthlyPlan) {
        editingReport.value.startDate = toDateString(monthlyPlan.startDate) || ''
        editingReport.value.endDate = toDateString(monthlyPlan.endDate) || ''
        editingReport.value.monthlyWorkPlanId = monthlyPlan.idx ?? monthlyPlan.id
        editingReport.value.monthlyWorkPlanName = monthlyPlan.name || ''

        const monthlyActualProgress = Number(
          monthlyPlan.actualProgressPct ?? monthlyPlan.actualProgress ?? 0,
        )
        editingReport.value.prevProgress = Number.isFinite(monthlyActualProgress)
          ? monthlyActualProgress
          : 0
        editingReport.value.processProgress = editingReport.value.prevProgress
      } else if (!editingReport.value.startDate || !editingReport.value.endDate) {
        const currentPlan = allPlans.find(
          (p) => Number(p.idx ?? p.id) === Number(report.workPlanId),
        )
        if (currentPlan) {
          editingReport.value.startDate = toDateString(currentPlan.startDate) || ''
          editingReport.value.endDate = toDateString(currentPlan.endDate) || ''
        }
      }
    }

    await loadApprovedScheduleChanges()
    applyApprovedScheduleTarget()
    applyMonthlyScheduleWeights(weeklyPlans)
  } catch (e) {
    console.error(e)
  }

  applyApprovedScheduleTarget()
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
  editingReport.value = null
}

const calcInfo = computed(() => {
  const r = editingReport.value
  if (!r) return null

  const start = new Date(r.startDate)
  const end = new Date(r.endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null

  const duration = Math.max(1, Math.round((end - start) / 86400000) + 1)

  const normalDailyAllocation = 100 / duration
  const approvedTargetPct = toNumberOrNull(r.approvedDailyTargetPct)
  const scheduleWeightPct = toNumberOrNull(r.scheduleWeightPct)
  const hasScheduleWeight = scheduleWeightPct !== null && scheduleWeightPct > 0
  const hasApprovedTarget =
    r.scheduleWeightSource === 'schedule_change' ||
    (approvedTargetPct !== null && approvedTargetPct > 0)
  const effectiveApprovedTargetPct = approvedTargetPct ?? normalDailyAllocation
  const dailyAllocation = hasScheduleWeight
    ? scheduleWeightPct
    : hasApprovedTarget
      ? effectiveApprovedTargetPct
      : normalDailyAllocation

  const tasksTodayCount =
    hasScheduleWeight || hasApprovedTarget
      ? 1
      : Math.max(1, r.todayMonthlyOrderCount || availableTodayOrders.value.length)

  const rawWeightPerTask =
    hasScheduleWeight || hasApprovedTarget ? dailyAllocation : dailyAllocation / tasksTodayCount

  const remainingWeightPct = toNumberOrNull(r.remainingScheduleWeightPct)
  const closeableWeight =
    remainingWeightPct !== null
      ? Math.max(0, 100 - Number(r.prevProgress || 0) - remainingWeightPct)
      : rawWeightPerTask
  const weightPerTask = Math.max(0, Math.min(rawWeightPerTask, closeableWeight))

  const increment = ((r.progress || 0) / 100) * weightPerTask

  return {
    duration,
    isScheduleChangeTarget: hasApprovedTarget,
    isMonthlyScheduleWeight: hasScheduleWeight,
    dailyAllocation: parseFloat(dailyAllocation.toFixed(2)),
    normalDailyAllocation: parseFloat(normalDailyAllocation.toFixed(2)),
    approvedDailyTargetPct:
      hasApprovedTarget && approvedTargetPct !== null
        ? parseFloat(approvedTargetPct.toFixed(2))
        : null,
    tasksTodayCount,
    rawWeightPerTask: parseFloat(rawWeightPerTask.toFixed(2)),
    remainingScheduleWeightPct:
      remainingWeightPct !== null ? parseFloat(remainingWeightPct.toFixed(2)) : null,
    weightPerTask: parseFloat(weightPerTask.toFixed(2)),
    increment: parseFloat(increment.toFixed(2)),
  }
})

watch(
  () => [
    editingReport.value?.progress,
    editingReport.value?.startDate,
    editingReport.value?.endDate,
    editingReport.value?.prevProgress,
    editingReport.value?.todayMonthlyOrderCount,
    editingReport.value?.approvedDailyTargetPct,
    editingReport.value?.scheduleWeightPct,
    editingReport.value?.remainingScheduleWeightPct,
  ],
  () => {
    const r = editingReport.value
    if (!r) return
    const info = calcInfo.value
    if (!info) {
      r.processProgress = r.prevProgress || 0
      return
    }
    r.processProgress = parseFloat(Math.min(100, (r.prevProgress || 0) + info.increment).toFixed(1))
  },
  { deep: true },
)

function addEquipment() {
  const v = (editingReport.value.equipmentInput.name || '').trim()
  if (!v) return
  const count = Math.max(1, editingReport.value.equipmentInput.count || 1)
  editingReport.value.equipmentList.push(v + ' ' + count + '대')
  editingReport.value.equipmentInput = { name: '', count: 1 }
}
function removeEquipment(idx) {
  editingReport.value.equipmentList.splice(idx, 1)
}

function onPhotoChange(e) {
  const list = Array.from(e.target.files || [])
  list.forEach((f) => {
    if (!f.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      editingReport.value.photos.push({
        id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        size: f.size,
        dataUrl: ev.target.result,
      })
    }
    reader.readAsDataURL(f)
  })
  e.target.value = ''
}

function onFileChangeInput(e) {
  const list = Array.from(e.target.files || [])
  list.forEach((f) => {
    editingReport.value.files.push({
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      size: f.size,
      type: f.type,
    })
  })
  e.target.value = ''
}

function removePhoto(idx) {
  editingReport.value.photos.splice(idx, 1)
}
function removeFile(idx) {
  editingReport.value.files.splice(idx, 1)
}
function fmtSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
function fileBadge(type) {
  if (!type) return '파일'
  if (type.includes('pdf')) return 'PDF'
  if (type.includes('sheet') || type.includes('excel')) return 'XLSX'
  if (type.includes('image')) return 'IMG'
  return '파일'
}

function saveDraft() {
  saveDraftReport(editingReport.value)
  closeEditor()
}

async function submitReport() {
  await submitDailyReport({
    report: editingReport.value,
    calcInfo: calcInfo.value,
    targetDate: selectedDate.value,
    onSuccess: closeEditor,
  })
}

function onKeydown(e) {
  if (e.key !== 'Escape') return
  if (showTaskSelector.value) showTaskSelector.value = false
  else if (showEditor.value) closeEditor()
  else if (viewingReport.value) closeViewer()
}

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 pb-6">
    <div class="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-widest text-flare-600">현장 보고</p>
        <h1 class="text-xl font-bold text-forena-900">공사일보</h1>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="flex overflow-hidden rounded-lg border border-forena-200 bg-white">
          <button
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition"
            :class="
              currentRole === ROLES.WORKER
                ? 'bg-forena-800 text-white'
                : 'text-forena-600 hover:bg-forena-50'
            "
            :disabled="!canSwitchRole"
            @click="switchRole(ROLES.WORKER)"
          >
            <UserCog class="h-3.5 w-3.5" /> 공종 담당자
          </button>
          <button
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition"
            :class="
              currentRole === ROLES.MANAGER
                ? 'bg-forena-800 text-white'
                : 'text-forena-600 hover:bg-forena-50'
            "
            :disabled="!canSwitchRole"
            @click="switchRole(ROLES.MANAGER)"
          >
            <ShieldCheck class="h-3.5 w-3.5" /> 현장 총 책임자
          </button>
        </div>

        <select
          v-if="currentRole === ROLES.WORKER"
          v-model="myProcess"
          :disabled="isTradeScope"
          class="rounded-lg border border-forena-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-forena-700 outline-none focus:border-flare-400"
        >
          <option v-for="p in processOptions" :key="p" :value="p">{{ p }} 공종</option>
        </select>
      </div>
    </div>

    <div
      class="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-forena-100 bg-white px-4 py-3"
    >
      <div class="flex items-center gap-1.5">
        <CalendarDays class="h-4 w-4 text-flare-600" />
        <span class="text-[11px] font-bold uppercase tracking-wide text-forena-500">조회 일자</span>
      </div>

      <div class="flex items-center gap-1">
        <button
          @click="prevDay"
          class="flex h-7 w-7 items-center justify-center rounded-md border border-forena-200 bg-white text-forena-600 hover:bg-forena-50"
        >
          <ChevronLeft class="h-3.5 w-3.5" />
        </button>
        <div class="relative flex items-center">
  <button
    @click="openDatePicker"
    class="rounded-md border border-forena-200 bg-white px-3 py-1.5 text-xs font-bold tabular-nums text-forena-800 hover:bg-forena-50 transition min-w-[140px]"
  >
     {{ fmtKor(selectedDate) }}
  </button>
  
  <input
    type="date"
    ref="dateInputRef"
    v-model="selectedDate"
    class="absolute left-1/2 top-1/2 -z-10 h-0 w-0 opacity-0 cursor-pointer"
  />
</div>
        <button
          @click="nextDay"
          class="flex h-7 w-7 items-center justify-center rounded-md border border-forena-200 bg-white text-forena-600 hover:bg-forena-50"
        >
          <ChevronRight class="h-3.5 w-3.5" />
        </button>
        <button
          @click="goToday"
          class="ml-1 rounded-md border px-2 py-1 text-[10px] font-bold transition"
          :class="
            isToday
              ? 'border-flare-200 bg-flare-50 text-flare-700'
              : 'border-forena-200 bg-white text-forena-600 hover:bg-forena-50'
          "
          :disabled="isToday"
        >
          오늘
        </button>
      </div>

      <span class="text-xs font-semibold text-forena-400 tabular-nums">
         오늘:  {{ fmtKor(todayStr()) }}
      </span>

      <div class="ml-auto flex items-center gap-2">
        <span
          v-if="currentRole === ROLES.MANAGER && stats.pending > 0"
          class="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200"
        >
          <AlertTriangle class="h-3 w-3" />미제출 {{ stats.pending }}건
        </span>
        <button
          v-if="currentRole === ROLES.WORKER"
          @click="openCreate"
          class="inline-flex items-center gap-1.5 rounded-lg bg-flare-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-flare-600"
        >
          <Plus class="h-3.5 w-3.5" /> 공사일보 작성
        </button>
      </div>
    </div>

    <div
      v-if="currentRole === ROLES.MANAGER"
      class="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6"
    >
      <div class="rounded-xl border border-forena-100 bg-white p-3.5">
        <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">전체 공종</p>
        <p class="mt-1 text-2xl font-bold tabular-nums text-forena-900">{{ stats.total }}</p>
      </div>
      <div class="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5">
        <p class="text-[10px] font-bold uppercase tracking-wide text-emerald-600">제출 완료</p>
        <p class="mt-1 text-2xl font-bold tabular-nums text-emerald-700">{{ stats.submitted }}</p>
      </div>
      <div class="rounded-xl border border-rose-100 bg-rose-50/40 p-3.5">
        <p class="text-[10px] font-bold uppercase tracking-wide text-rose-600">미제출</p>
        <p class="mt-1 text-2xl font-bold tabular-nums text-rose-700">{{ stats.pending }}</p>
      </div>
      <div class="rounded-xl border border-forena-100 bg-white p-3.5">
        <p
          class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-forena-400"
        >
          <Users class="h-3 w-3" /> 총 투입 인력
        </p>
        <p class="mt-1 text-2xl font-bold tabular-nums text-forena-900">
          {{ stats.totalWorkers }}<span class="text-sm font-normal text-slate-400 ml-1">명</span>
        </p>
      </div>
      <div class="rounded-xl border border-forena-100 bg-white p-3.5">
        <p
          class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-forena-400"
        >
          <Wrench class="h-3 w-3" /> 총 투입 장비
        </p>
        <p class="mt-1 text-2xl font-bold tabular-nums text-forena-900">
          {{ stats.totalEquip }}<span class="text-sm font-normal text-slate-400 ml-1">대</span>
        </p>
      </div>
      <div class="rounded-xl border border-flare-100 bg-flare-50/40 p-3.5">
        <p class="text-[10px] font-bold uppercase tracking-wide text-flare-600">평균 진척률</p>
        <p class="mt-1 text-2xl font-bold tabular-nums text-flare-700">
          {{ stats.avgProgress }}<span class="text-sm font-normal ml-0.5">%</span>
        </p>
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-1 border-b border-forena-100 mt-2">
      <button
        class="border-b-2 px-4 py-2 text-xs font-bold transition"
        :class="
          activeTab === 'today'
            ? 'border-flare-500 text-flare-700'
            : 'border-transparent text-forena-500 hover:text-forena-700'
        "
        @click="switchTab('today')"
      >
        금일 공사일보
      </button>
      <button
        v-if="currentRole === ROLES.MANAGER"
        class="inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-bold transition"
        :class="
          activeTab === 'consolidated'
            ? 'border-flare-500 text-flare-700'
            : 'border-transparent text-forena-500 hover:text-forena-700'
        "
        @click="switchTab('consolidated')"
      >
        <Layers class="h-3.5 w-3.5" /> 종합 공사일보
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <div v-if="activeTab === 'today'" class="grid grid-cols-1 gap-3 lg:grid-cols-2 mt-2">
        <div
          v-if="todayReports.length === 0"
          class="col-span-1 lg:col-span-2 flex flex-col items-center justify-center gap-3 py-16 text-center"
        >
          <FileText class="h-10 w-10 text-slate-300" />
          <p class="text-sm text-slate-500">작성된 공사일보가 없습니다.</p>
          <button
            v-if="currentRole === ROLES.WORKER"
            @click="openCreate"
            class="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-flare-500 px-4 py-2 text-xs font-bold text-white hover:bg-flare-600"
          >
            <Plus class="h-3.5 w-3.5" /> 작성하기
          </button>
        </div>

        <div
          v-for="r in todayReports"
          :key="r.id"
          class="flex flex-col rounded-xl border bg-white border-forena-100 hover:border-flare-200 hover:shadow-sm transition"
        >
          <div class="flex items-start justify-between gap-3 border-b border-forena-100 px-4 py-3">
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span
                  class="rounded-md bg-forena-50 px-1.5 py-0.5 text-[10px] font-bold text-forena-700"
                  >{{ r.process }} 공종</span
                >
                <span
                  class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1"
                  :class="statusMeta(r.status).cls"
                  ><component :is="statusMeta(r.status).icon" class="h-3 w-3" />
                  {{ r.status }}</span
                >
              </div>
              <p class="mt-1.5 truncate text-sm font-bold text-forena-900">
                {{ r.location || '작업 위치 미입력' }}
              </p>
            </div>
            <div class="flex shrink-0 gap-1">
              <button
                @click="openViewer(r)"
                class="rounded-md border border-forena-200 bg-white p-1.5 text-forena-600 hover:bg-forena-50"
                title="상세 보기"
              >
                <Eye class="h-3.5 w-3.5" />
              </button>
              <button
                v-if="canEdit(r)"
                @click="openEditor(r)"
                class="rounded-md border border-flare-200 bg-flare-50 p-1.5 text-flare-700 hover:bg-flare-100"
                title="수정"
              >
                <Pencil class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div class="flex-1 px-4 py-3">
            <div class="grid grid-cols-3 gap-2">
              <div class="rounded-lg bg-forena-50/40 px-2.5 py-2">
                <p class="flex items-center gap-1 text-[10px] font-bold text-forena-400">
                  <Users class="h-3 w-3" /> 인력
                </p>
                <p class="mt-0.5 text-base font-bold tabular-nums text-forena-900">
                  {{ r.workers
                  }}<span class="text-[10px] font-normal text-slate-400 ml-0.5">명</span>
                </p>
              </div>
              <div class="rounded-lg bg-forena-50/40 px-2.5 py-2">
                <p class="flex items-center gap-1 text-[10px] font-bold text-forena-400">
                  <Wrench class="h-3 w-3" /> 장비
                </p>
                <p class="mt-0.5 text-base font-bold tabular-nums text-forena-900">
                  {{ r.equipmentCount
                  }}<span class="text-[10px] font-normal text-slate-400 ml-0.5">대</span>
                </p>
              </div>

              <div class="rounded-lg bg-flare-50/60 px-2.5 py-1.5 flex flex-col justify-center">
                <p class="flex items-center justify-between text-[10px] font-bold text-flare-600">
                  전체 진척률
                  <span
                    class="rounded bg-white px-1 py-0.5 text-[9px] font-bold text-flare-600 shadow-sm border border-flare-100"
                    >금일 {{ r.progress }}%</span
                  >
                </p>
                <p class="mt-0.5 text-base font-bold tabular-nums text-flare-700">
                  {{ r.processProgress }}<span class="text-[10px] font-normal ml-0.5">%</span>
                </p>
              </div>
            </div>

            <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-forena-100">
              <div
                class="h-full rounded-full bg-flare-500 transition-all"
                :style="{ width: r.processProgress + '%' }"
              ></div>
            </div>

            <div class="mt-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">
                금일 작업 완료
              </p>
              <p class="mt-1 text-xs leading-relaxed text-forena-800">{{ r.todayWork || '—' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <TaskSelectorModal
      :show="showTaskSelector"
      :orders="availableTodayOrders"
      :selected-date="selectedDate"
      :format-date="fmtKor"
      @close="showTaskSelector = false"
      @select="selectTaskForReport"
    />

    <DailyWorkReportEditorModal
      :show="showEditor"
      :report="editingReport"
      :is-new-report="isNewReport"
      :equipment-list="equipmentList"
      :calc-info="calcInfo"
      :format-date="fmtKor"
      :file-badge="fileBadge"
      @close="closeEditor"
      @add-equipment="addEquipment"
      @remove-equipment="removeEquipment"
      @photo-change="onPhotoChange"
      @remove-photo="removePhoto"
      @file-change="onFileChangeInput"
      @remove-file="removeFile"
      @save-draft="saveDraft"
      @submit="submitReport"
    />

    <ReportViewerModal
      :report="viewingReport"
      :is-manager="currentRole === ROLES.MANAGER"
      :format-date="fmtKor"
      :format-size="fmtSize"
      @close="closeViewer"
      @approve="approveReport"
      @reject="rejectReport"
    />
  </div>
</template>
