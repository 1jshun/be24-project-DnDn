<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import {
  Upload,
  Users,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  ClipboardList,
  LoaderCircle,
} from 'lucide-vue-next'
import { planStore } from '@/data/planStore'
import { fetchTradeProcessList } from '@/api/tradeProcess.js'
import { fetchWorkPlanList } from '@/api/workplan.js'
import { useCurrentProject } from '@/composables/useCurrentProject.js'
import { useWorkPlanGantt } from '@/composables/schedule/workPlan/useWorkPlanGantt.js'
import { useWorkPlanWeeklyCalendar } from '@/composables/schedule/workPlan/useWorkPlanWeeklyCalendar.js'
import { useWorkPlanUpload } from '@/composables/schedule/workPlan/useWorkPlanUpload.js'
import { useWeeklyWorkPlanForm } from '@/composables/schedule/workPlan/useWeeklyWorkPlanForm.js'
import WorkPlanDetailPanel from '@/components/schedule/workPlan/WorkPlanDetailPanel.vue'
import WorkPlanMonthlyGantt from '@/components/schedule/workPlan/WorkPlanMonthlyGantt.vue'
import WorkPlanUploadSettingsModal from '@/components/schedule/workPlan/WorkPlanUploadSettingsModal.vue'
import WorkPlanVerifyModal from '@/components/schedule/workPlan/WorkPlanVerifyModal.vue'
import WorkPlanWeeklyFormModal from '@/components/schedule/workPlan/WorkPlanWeeklyFormModal.vue'
import WorkPlanYearlyGantt from '@/components/schedule/workPlan/WorkPlanYearlyGantt.vue'
import { useAuthStore } from '@/stores/authStore'
import { tradeMatches, useAuthScope } from '@/utils/authScope'
import {
  dayTextClass,
  monthlyDayCellClass,
  monthlyDayHeaderClass,
  statusClass,
  statuses,
  trades,
  weeklyDayHeaderClass,
  workPlanStatus,
} from '@/utils/schedule/workPlan.js'

const { currentProjectId: selectedProjectId } = useCurrentProject()
const auth = useAuthStore()
const { isManagerScope, isTradeScope, assignedTrade } = useAuthScope(auth)
const YEARLY_PLAN_TYPE = '연간'
const MONTHLY_PLAN_TYPE = '월간'
const canUploadPlans = computed(() => isManagerScope.value || isTradeScope.value)
const canUploadYearlyPlan = computed(() => isManagerScope.value)

const weeklyPlans = ref([]) // 주간 작업 계획
const monthlyPlans = ref([]) // 월간 작업 계획
const annualPlans = ref([]) // 연간 작업 계획
const baselinePlans = ref([]) // 최초 공정표 기반 기준 공정
const loading = ref(false)
const viewMode = ref('weekly')
const filterTrade = ref('')
const filterStatus = ref('')
const selectedPlan = ref(null)
const tradeFilterOptions = computed(() =>
  isTradeScope.value && assignedTrade.value ? [assignedTrade.value] : trades,
)

function scopedByTrade(plans) {
  if (!isTradeScope.value || !assignedTrade.value) return plans
  return plans.filter((plan) => {
    if (tradeMatches(plan.trade, assignedTrade.value)) return true

    const tradeProcessId = plan.tradeProcessId ?? plan.trade_process_id ?? plan.baseId ?? null
    if (tradeProcessId == null) return false

    const linkedBaseline = baselinePlans.value.find((baseline) => {
      const baselineId = baseline.tradeProcessId ?? baseline.idx ?? baseline.id ?? null
      return String(baselineId) === String(tradeProcessId)
    })

    return tradeMatches(linkedBaseline?.trade, assignedTrade.value)
  })
}

const scopedWeeklyPlans = computed(() => scopedByTrade(weeklyPlans.value))
const scopedMonthlyPlans = computed(() => scopedByTrade(monthlyPlans.value))
const scopedAnnualPlans = computed(() => scopedByTrade(annualPlans.value))
const scopedBaselinePlans = computed(() => scopedByTrade(baselinePlans.value))
const {
  uploadFileName,
  uploadCategory,
  yearlyInputRef,
  monthlyInputRef,
  isAnalyzingUpload,
  isUploadPopupOpen,
  uploadModalTrade,
  uploadModalType,
  mainTrades,
  showVerifyModal,
  verifyCategory,
  verifyFileName,
  verifyRows,
  verifyStats,
  loadMainTrades,
  triggerFileUpload,
  onFileChange,
  fixVerifyRow,
  removeVerifyRow,
  confirmVerifyAndApply,
  cancelVerify,
} = useWorkPlanUpload({
  selectedProjectId,
  reloadPlans: loadPlans,
})
const uploadTradeOptions = computed(() =>
  isTradeScope.value && assignedTrade.value ? [assignedTrade.value] : mainTrades.value,
)

function syncUploadScope() {
  if (!isTradeScope.value) return

  if (assignedTrade.value) {
    uploadModalTrade.value = assignedTrade.value
  }
  if (uploadModalType.value === YEARLY_PLAN_TYPE) {
    uploadModalType.value = MONTHLY_PLAN_TYPE
  }
}

// 연장 정보 헬퍼 (planStore 기반)
function extOf(p) {
  return planStore.extensions[p.id] ?? null
}
// 화면에 보일 "최종 종료일" — 연장이 있으면 연장된 종료일, 없으면 원래 종료일
function effectiveEnd(p) {
  return extOf(p)?.extendedEnd ?? p.end
}

// viewMode 에 따라 알맞은 데이터셋을 필터링
// - weekly  → weeklyPlans
// - monthly → monthlyPlans
const {
  displayMonthlyPlanName,
  displayMonthlyPlanPeriod,
  selectedWeekStart,
  weeklyWorkList,
  weekDays,
  weekHeader,
  isCurrentWeek,
  prevWeek,
  nextWeek,
  goCurrentWeek,
  plansForDay,
} = useWorkPlanWeeklyCalendar({
  weeklyPlans: scopedWeeklyPlans,
  monthlyPlans: scopedMonthlyPlans,
  viewMode,
  filterTrade,
  filterStatus,
  effectiveEnd,
  extOf,
})

const {
  showWeeklyForm,
  weeklyForm,
  monthlyPlanOptions,
  weeklyFormValid,
  openWeeklyForm,
  onSelectMonthlyPlan,
  addWorker,
  removeWorker,
  addEquipment,
  removeEquipment,
  addWeeklyItem,
  removeWeeklyItem,
  submitWeeklyForm,
  cancelWeeklyForm,
} = useWeeklyWorkPlanForm({
  monthlyPlans: scopedMonthlyPlans,
  reloadPlans: loadPlans,
})

// 작업 계획 목록 로드 (주간 + 월간 + 연간 동시 호출)
async function loadPlans() {
  try {
    loading.value = true

    const projectId = selectedProjectId.value || 1

    const [baselineRes, weeklyRes, monthlyRes, yearlyRes] = await Promise.all([
      fetchTradeProcessList({ projectId }),
      fetchWorkPlanList({ projectId, planType: '주간' }),
      fetchWorkPlanList({ projectId, planType: '월간' }),
      fetchWorkPlanList({ projectId, planType: '연간' }),
    ])

    baselinePlans.value = baselineRes.filter((b) => !baseIsMilestone(b))
    weeklyPlans.value = weeklyRes
    monthlyPlans.value = monthlyRes
    annualPlans.value = yearlyRes
  } catch (err) {
    console.error('계획 목록 조회 실패:', err)
    alert(err.message || '계획 목록을 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

// 필터 변경 시 재조회 (서버 사이드 필터링)
watch([filterTrade, filterStatus], () => {
  loadPlans()
})

watch(
  [isTradeScope, assignedTrade],
  () => {
    filterTrade.value = isTradeScope.value && assignedTrade.value ? assignedTrade.value : ''
    selectedPlan.value = null
    syncUploadScope()
  },
  { immediate: true },
)

onMounted(() => {
  loadPlans() // 기존 계획 데이터 로드
  loadMainTrades().then(syncUploadScope) // 신규 추가: 업로드용 공종 리스트 로드
})

function importAi() {
  alert('AI로 작업계획을 불러옵니다. (데모)')
}

// =========================
// 월간/연간 간트차트

const {
  viewYear,
  viewMonth,
  prevYear,
  nextYear,
  prevMonth,
  nextMonth,
  goToday,
  monthMeta,
  isCurrentMonth,
  isCurrentYear,
  yearMeta,
  barStyle,
  monthCellCenterStyle,
  yearBarStyle,
  progressBarStyle,
  progressDotStyle,
  todayLineStyle,
  chartWidth,
  yearChartWidth,
  extensionCount,
  selectViewMode,
  baseIsMilestone,
  yearlyGroups,
  monthlyGroups,
  groupOpen,
  monthlyProcessOpen,
  processRowHeight,
  monthlyProcessHeaderHeight,
  monthlyDetailRowHeight,
  workPlanTop,
  onClickBaseline,
  onClickWorkPlan,
} = useWorkPlanGantt({
  baselinePlans: scopedBaselinePlans,
  monthlyPlans: scopedMonthlyPlans,
  annualPlans: scopedAnnualPlans,
  filterTrade,
  filterStatus,
  viewMode,
  selectedPlan,
  effectiveEnd,
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 pb-6">
    <!-- 헤더 -->
    <div class="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-widest text-flare-600">일정 관리</p>
        <h1 class="text-xl font-bold text-forena-900">공정 계획</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex overflow-hidden rounded-lg border border-forena-200 bg-white">
          <button
            v-for="m in [
              ['yearly', '연간'],
              ['monthly', '월간'],
              ['weekly', '주간'],
            ]"
            :key="m[0]"
            class="px-3.5 py-1.5 text-xs font-bold transition"
            :class="
              viewMode === m[0] ? 'bg-forena-800 text-white' : 'text-forena-600 hover:bg-forena-50'
            "
            @click="selectViewMode(m[0])"
          >
            {{ m[1] }}
          </button>
        </div>

        <button
          v-if="canUploadPlans"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-forena-200 bg-white px-3 py-1.5 text-xs font-semibold text-forena-700 hover:bg-forena-50"
          @click="isUploadPopupOpen = true"
        >
          <Upload class="h-3.5 w-3.5 text-forena-400" /> 계획서 업로드
        </button>

        <input
          ref="yearlyInputRef"
          type="file"
          class="sr-only"
          @change="(e) => onFileChange(e, '연간')"
          accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
        />
        <input
          ref="monthlyInputRef"
          type="file"
          class="sr-only"
          @change="(e) => onFileChange(e, '월간')"
          accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
        />

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-forena-200 bg-white px-3 py-1.5 text-xs font-semibold text-forena-700 hover:bg-forena-50"
          @click="openWeeklyForm"
        >
          <ClipboardList class="h-3.5 w-3.5 text-forena-400" /> 세부계획서 작성
        </button>
      </div>
    </div>

    <!-- 필터 바 -->
    <div
      class="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-forena-100 bg-white px-4 py-3"
    >
      <div class="flex items-center gap-2">
        <span class="text-[11px] font-bold text-forena-400">상태</span>
        <select
          v-model="filterStatus"
          class="rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs text-forena-800 outline-none focus:border-flare-400"
        >
          <option value="">전체</option>
          <option v-for="s in statuses" :key="s">{{ s }}</option>
        </select>
      </div>
      <div v-if="viewMode !== 'weekly'" class="flex items-center gap-2">
        <span class="text-[11px] font-bold text-forena-400">공종</span>
        <select
          v-model="filterTrade"
          :disabled="isTradeScope"
          class="rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs text-forena-800 outline-none focus:border-flare-400"
        >
          <option value="">전체</option>
          <option v-for="t in tradeFilterOptions" :key="t">{{ t }}</option>
        </select>
      </div>

      <!-- 연장 적용 개수 알림 -->
      <span
        v-if="extensionCount"
        class="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200"
      >
        <CalendarPlus class="h-3 w-3" />
        공정 분석으로 일정 연장 {{ extensionCount }}건 반영됨
      </span>

      <span
        v-if="uploadFileName"
        class="ml-auto inline-flex items-center gap-1.5 text-xs text-forena-500"
      >
        <span
          class="rounded-md bg-flare-50 px-2 py-0.5 text-[10px] font-bold text-flare-700 ring-1 ring-flare-200"
          >{{ uploadCategory }}</span
        >
        {{ uploadFileName }}
      </span>
    </div>

    <!-- 메인 -->
    <div class="flex min-h-0 flex-1 gap-4">
      <!-- 작업 목록 -->
      <div
        v-if="viewMode === 'weekly'"
        class="flex w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-forena-200 bg-white"
      >
        <div class="border-b border-forena-100 bg-forena-50/60 px-4 py-2.5">
          <span class="text-sm font-bold text-forena-900">작업 목록</span>
          <span class="ml-2 text-xs text-forena-400">{{ weeklyWorkList.length }}건</span>
          <p class="mt-0.5 text-[10px] text-forena-400">이번 주 · 다음 주</p>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto divide-y divide-forena-50">
          <div
            v-if="!weeklyWorkList.length"
            class="flex items-center justify-center py-16 text-sm text-slate-400"
          >
            조회된 작업이 없습니다.
          </div>
          <div
            v-for="p in weeklyWorkList"
            :key="p.id"
            class="cursor-pointer p-3.5 transition-colors hover:bg-forena-50/60"
            :class="selectedPlan?.id === p.id ? 'bg-flare-50/60 border-l-2 border-l-flare-500' : ''"
            @click="selectedPlan = p"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm font-semibold leading-snug text-forena-900">{{ p.name }}</p>
              <span
                class="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                :class="statusClass(workPlanStatus(p))"
                >{{ workPlanStatus(p) }}</span
              >
            </div>
            <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
              <span class="flex items-center gap-1"
                ><MapPin class="h-3 w-3" />{{ p.location }}</span
              >
              <span class="flex items-center gap-1"
                ><Users class="h-3 w-3" />{{ p.requiredCount }}명</span
              >
            </div>
            <div class="mt-1 flex items-center gap-1.5">
              <p class="text-[11px] tabular-nums text-forena-400">
                {{ p.start.slice(5) }} ~ {{ p.end.slice(5) }}
              </p>
              <span
                v-if="extOf(p)"
                class="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700"
              >
                → {{ extOf(p).extendedEnd.slice(5) }} (+{{ extOf(p).addedDays }}일)
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 오른쪽 -->
      <div
        class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-forena-200 bg-white"
      >
        <!-- 작업 상세 -->
        <WorkPlanDetailPanel
          v-if="selectedPlan"
          :plan="selectedPlan"
          :extension="extOf(selectedPlan)"
          :monthly-plan-name="displayMonthlyPlanName(selectedPlan)"
          :monthly-plan-period="displayMonthlyPlanPeriod(selectedPlan)"
          @close="selectedPlan = null"
        />

        <template v-else>
          <div
            class="flex shrink-0 items-center justify-between border-b border-forena-100 bg-forena-50/60 px-4 py-2.5"
          >
            <p class="text-sm font-bold text-forena-900">
              {{
                viewMode === 'weekly'
                  ? '주간 일정'
                  : viewMode === 'monthly'
                    ? '월간 계획 (간트차트)'
                    : '연간 계획 (간트차트)'
              }}
            </p>
            <div class="flex items-center gap-3">
              <!-- 간트차트 범례 -->
              <div v-if="viewMode !== 'weekly'" class="flex items-center gap-3 text-[10px]">
                <span class="flex items-center gap-1.5 text-forena-500">
                  <span class="h-[3px] w-5 rounded-full bg-blue-600"></span>전체 공정표 기준
                </span>
                <span class="flex items-center gap-1.5 text-forena-500">
                  <span class="relative h-[3px] w-5 rounded-full bg-red-200">
                    <span class="absolute inset-y-0 left-0 w-1/2 rounded-full bg-red-500"></span>
                  </span>
                  {{ viewMode === 'yearly' ? '연간' : '월간' }} 실행/진행
                </span>
                <span class="flex items-center gap-1.5 text-forena-500">
                  <svg class="h-3 w-3" viewBox="0 0 12 12">
                    <path
                      d="M6 1 L11 6 L6 11 L1 6 Z"
                      fill="#f59e0b"
                      stroke="#b45309"
                      stroke-width="1"
                    />
                  </svg>
                  마일스톤
                </span>
                <span class="flex items-center gap-1.5 text-forena-500">
                  <span class="h-3 w-px bg-flare-500"></span>오늘
                </span>
              </div>

              <!-- 연 이동 네비게이션 -->
              <div v-if="viewMode === 'yearly'" class="flex items-center gap-1">
                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-md border border-forena-200 bg-white text-forena-600 transition hover:bg-forena-50"
                  title="이전 해"
                  @click="prevYear"
                >
                  <ChevronLeft class="h-3.5 w-3.5" />
                </button>
                <p class="min-w-[82px] text-center text-xs font-bold tabular-nums text-forena-700">
                  {{ yearMeta.year }}년
                </p>
                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-md border border-forena-200 bg-white text-forena-600 transition hover:bg-forena-50"
                  title="다음 해"
                  @click="nextYear"
                >
                  <ChevronRight class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  class="ml-1 rounded-md border px-2 py-1 text-[10px] font-bold transition"
                  :class="
                    isCurrentYear
                      ? 'border-flare-200 bg-flare-50 text-flare-700'
                      : 'border-forena-200 bg-white text-forena-600 hover:bg-forena-50'
                  "
                  :disabled="isCurrentYear"
                  @click="goToday"
                >
                  올해
                </button>
              </div>

              <!-- 월 이동 네비게이션 -->
              <div v-if="viewMode === 'monthly'" class="flex items-center gap-1">
                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-md border border-forena-200 bg-white text-forena-600 transition hover:bg-forena-50"
                  title="이전 달"
                  @click="prevMonth"
                >
                  <ChevronLeft class="h-3.5 w-3.5" />
                </button>
                <p class="min-w-[110px] text-center text-xs font-bold tabular-nums text-forena-700">
                  {{ monthMeta.year }}년 {{ monthMeta.month }}월
                </p>
                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-md border border-forena-200 bg-white text-forena-600 transition hover:bg-forena-50"
                  title="다음 달"
                  @click="nextMonth"
                >
                  <ChevronRight class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  class="ml-1 rounded-md border px-2 py-1 text-[10px] font-bold transition"
                  :class="
                    isCurrentMonth
                      ? 'border-flare-200 bg-flare-50 text-flare-700'
                      : 'border-forena-200 bg-white text-forena-600 hover:bg-forena-50'
                  "
                  :disabled="isCurrentMonth"
                  @click="goToday"
                >
                  오늘
                </button>
              </div>

              <div v-if="viewMode === 'weekly'" class="flex items-center gap-1">
                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-md border border-forena-200 bg-white text-forena-600 transition hover:bg-forena-50"
                  title="이전 주"
                  @click="prevWeek"
                >
                  <ChevronLeft class="h-3.5 w-3.5" />
                </button>
                <p class="min-w-[150px] text-center text-xs font-bold tabular-nums text-forena-700">
                  {{ weekHeader }}
                </p>
                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-md border border-forena-200 bg-white text-forena-600 transition hover:bg-forena-50"
                  title="다음 주"
                  @click="nextWeek"
                >
                  <ChevronRight class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  class="ml-1 rounded-md border px-2 py-1 text-[10px] font-bold transition"
                  :class="
                    isCurrentWeek
                      ? 'border-flare-200 bg-flare-50 text-flare-700'
                      : 'border-forena-200 bg-white text-forena-600 hover:bg-forena-50'
                  "
                  :disabled="isCurrentWeek"
                  @click="goCurrentWeek"
                >
                  이번 주
                </button>
              </div>
            </div>
          </div>

          <!-- ========== 주간 ========== -->
          <div v-if="viewMode === 'weekly'" class="min-h-0 flex-1 overflow-auto p-3">
            <div class="grid h-full grid-cols-7 gap-2">
              <div
                v-for="day in weekDays"
                :key="day.date"
                class="flex flex-col overflow-hidden rounded-xl border bg-white"
                :class="
                  day.isToday ? 'border-flare-400 ring-2 ring-flare-200' : 'border-forena-100'
                "
              >
                <div
                  class="flex items-center justify-between px-2.5 py-2"
                  :class="weeklyDayHeaderClass(day)"
                >
                  <span class="text-[11px] font-bold">{{ day.label }}</span>
                  <span
                    class="rounded-md px-1.5 text-base font-bold tabular-nums"
                    :class="day.isToday ? 'bg-white/20' : dayTextClass(day)"
                    >{{ day.day }}</span
                  >
                </div>
                <div class="flex-1 space-y-1 overflow-y-auto p-1.5">
                  <div
                    v-if="!plansForDay(day.date).length"
                    class="py-4 text-center text-[10px] text-slate-300"
                  >
                    —
                  </div>
                  <div
                    v-for="p in plansForDay(day.date)"
                    :key="p.id"
                    class="cursor-pointer rounded-md border-l-[3px] border-l-flare-500 bg-flare-50 px-1.5 py-1 text-[10px] font-semibold text-flare-900 transition hover:bg-flare-100"
                    :class="p.isExtensionDay ? 'ring-1 ring-emerald-300' : ''"
                    @click="selectedPlan = p"
                  >
                    <div class="flex items-center gap-1">
                      <CalendarPlus v-if="p.isExtensionDay" class="h-2.5 w-2.5 shrink-0" />
                      <p class="truncate">{{ p.name }}</p>
                    </div>
                    <p class="mt-0.5 truncate text-[9px] font-normal text-flare-700">
                      <span v-if="p.isExtensionDay">연장 일정</span>
                      <span v-else>{{ p.location }}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ========== 연간 (간트차트) ========== -->
          <!-- 구조: 공종 그룹 → 공정(파란 기준선) → 위치별 실행계획(빨간 실행/진행선들) -->
          <WorkPlanYearlyGantt
            v-else-if="viewMode === 'yearly'"
            :groups="yearlyGroups"
            :group-open="groupOpen"
            :year-meta="yearMeta"
            :chart-width="yearChartWidth"
            :process-row-height="processRowHeight"
            :year-bar-style="yearBarStyle"
            :work-plan-top="workPlanTop"
            :progress-bar-style="progressBarStyle"
            :progress-dot-style="progressDotStyle"
            @toggle-group="(group) => (groupOpen[group] = !groupOpen[group])"
            @select-baseline="onClickBaseline"
            @select-work-plan="onClickWorkPlan"
          />

          <!-- 구조: 공종 그룹 → 공정 행(접기/펼치기, 마일스톤) → 세부계획 행들(파란 월간기준선 + 빨간 실행선) -->
          <WorkPlanMonthlyGantt
            v-else
            :groups="monthlyGroups"
            :group-open="groupOpen"
            :process-open="monthlyProcessOpen"
            :month-meta="monthMeta"
            :chart-width="chartWidth"
            :today-line-style="todayLineStyle"
            :monthly-day-header-class="monthlyDayHeaderClass"
            :monthly-day-cell-class="monthlyDayCellClass"
            :monthly-process-header-height="monthlyProcessHeaderHeight"
            :monthly-detail-row-height="monthlyDetailRowHeight"
            :month-cell-center-style="monthCellCenterStyle"
            :bar-style="barStyle"
            :progress-bar-style="progressBarStyle"
            :progress-dot-style="progressDotStyle"
            @toggle-group="(group) => (groupOpen[group] = !groupOpen[group])"
            @toggle-process="(id) => (monthlyProcessOpen[id] = !monthlyProcessOpen[id])"
            @select-baseline="onClickBaseline"
            @select-work-plan="onClickWorkPlan"
          />
        </template>
      </div>
    </div>

    <WorkPlanVerifyModal
      :show="showVerifyModal"
      :category="verifyCategory"
      :file-name="verifyFileName"
      :rows="verifyRows"
      :stats="verifyStats"
      @cancel="cancelVerify"
      @confirm="confirmVerifyAndApply"
      @fix-row="fixVerifyRow"
      @remove-row="removeVerifyRow"
    />

    <div
      v-if="isAnalyzingUpload"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white px-6 py-5 text-center shadow-xl">
        <LoaderCircle class="mx-auto h-8 w-8 animate-spin text-flare-500" />
        <p class="mt-3 text-sm font-bold text-forena-900">AI가 계획서를 분석 중입니다.</p>
        <p class="mt-1 text-xs text-forena-500">
          엑셀의 작업명, 기간, 공종 정보를 추출하고 있습니다.
        </p>
      </div>
    </div>

    <WorkPlanWeeklyFormModal
      :show="showWeeklyForm"
      :form="weeklyForm"
      :monthly-plan-options="monthlyPlanOptions"
      :valid="weeklyFormValid"
      @cancel="cancelWeeklyForm"
      @select-monthly-plan="onSelectMonthlyPlan"
      @add-item="addWeeklyItem"
      @remove-item="removeWeeklyItem"
      @add-worker="addWorker"
      @remove-worker="removeWorker"
      @add-equipment="addEquipment"
      @remove-equipment="removeEquipment"
      @submit="submitWeeklyForm"
    />
    <WorkPlanUploadSettingsModal
      :show="isUploadPopupOpen"
      v-model:trade="uploadModalTrade"
      v-model:type="uploadModalType"
      :main-trades="uploadTradeOptions"
      :allow-yearly="canUploadYearlyPlan"
      @close="isUploadPopupOpen = false"
      @upload="triggerFileUpload"
    />
  </div>
</template>
