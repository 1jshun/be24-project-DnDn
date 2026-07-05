<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useGanttStore } from '@/stores/ganttStore.js'
import { parseFromApi } from '@/utils/ganttParser.js'
import { listTradeProcessesRaw } from '@/api/tradeProcess.js'
import { buildGanttData } from '@/utils/scheduleMapper.js'
import { fetchWorkPlansByProject } from '@/api/workplan.js'
import { fetchProgressList } from '@/api/analysis.js'
import { useCurrentProject } from '@/composables/useCurrentProject.js'
import ScheduleChartAiAnalysisModal from '@/components/schedule/scheduleChart/ScheduleChartAiAnalysisModal.vue'
import ScheduleChartChangeManagementModal from '@/components/schedule/scheduleChart/ScheduleChartChangeManagementModal.vue'
import ScheduleChartChangeRequestFormModal from '@/components/schedule/scheduleChart/ScheduleChartChangeRequestFormModal.vue'
import ScheduleChartConfirmModal from '@/components/schedule/scheduleChart/ScheduleChartConfirmModal.vue'
import ScheduleChartFirstSetup from '@/components/schedule/scheduleChart/ScheduleChartFirstSetup.vue'
import ScheduleChartGanttSection from '@/components/schedule/scheduleChart/ScheduleChartGanttSection.vue'
import ScheduleChartSummaryCards from '@/components/schedule/scheduleChart/ScheduleChartSummaryCards.vue'
import ScheduleChartUploadModal from '@/components/schedule/scheduleChart/ScheduleChartUploadModal.vue'
import { parseGanttJSON } from '@/utils/ganttParser.js'

const ganttStore = useGanttStore()
const { currentProjectId } = useCurrentProject()

const projectInfo = ref(ganttStore.projectInfo ?? {})
const aiTasks = ref(ganttStore.tasks ?? [])
const milestones = ref(ganttStore.milestones ?? [])
const workPlans = ref([])

function getWorkPlanStart(wp) {
  return wp.actualStart || wp.start
}

function getWorkPlanEnd(wp) {
  return wp.effectiveEnd || wp.end
}

function getWorkPlanDoneEnd(wp) {
  const start = getWorkPlanStart(wp)
  const end = getWorkPlanEnd(wp)
  const today = todayIso.value

  if (!start || !end) return null
  if (today < start) return null
  if (today > end) return end

  return today
}

function getWorkPlanRemainStart(wp) {
  const start = getWorkPlanStart(wp)
  const end = getWorkPlanEnd(wp)
  const today = todayIso.value

  if (!start || !end) return null
  if (today < start) return start
  if (today >= end) return null

  return today
}

// 스토어 데이터 변경 시 자동 반영
watch(
  () => ganttStore.tasks,
  (val) => {
    aiTasks.value = val ?? []
  },
)
watch(
  () => ganttStore.milestones,
  (val) => {
    milestones.value = val ?? []
  },
)
watch(
  () => ganttStore.projectInfo,
  (val) => {
    projectInfo.value = val ?? {}
  },
)

// 아래는 다른 기능용 — 건드리지 않아도 됨
const uploadedDocs = ref([])
const changeRequests = ref([])
const changeLog = ref([])

// ======================================================
// 상태/UI 토글
// ======================================================
const ganttScale = ref('month') // year | month | week
const ganttZoom = ref(1) // 0.6 ~ 1.6
const onlyCp = ref(false)
const onlyMilestone = ref(false)
const highlightDelayed = ref(true)

const groupOpen = ref({})

function isDateInRange(start, end, date = new Date().toISOString().slice(0, 10)) {
  if (!start || !end) return false
  return start <= date && date <= end
}

function isTaskInProgress(task) {
  if (isDateInRange(task?.start, task?.end)) return true

  const plans = task?.workPlans
  if (!Array.isArray(plans)) return false

  return plans.some((plan) => isDateInRange(getWorkPlanStart(plan), getWorkPlanEnd(plan)))
}

function resetGroupOpenByCurrentTasks(tasks = aiTasks.value) {
  const groups = [...new Set((tasks ?? []).map((t) => t.group).filter(Boolean))]
  groupOpen.value = Object.fromEntries(
    groups.map((group) => [
      group,
      (tasks ?? []).some((task) => task.group === group && isTaskInProgress(task)),
    ]),
  )
}

watch(
  aiTasks,
  (tasks) => {
    resetGroupOpenByCurrentTasks(tasks)
  },
  { immediate: true },
)

const filterGroup = ref('')
const filterReview = ref('')
const filterCp = ref('')
const searchKey = ref('')

const selectedTaskId = ref(null)
const selectedTask = computed(
  () => aiTasks.value.find((t) => t.id === selectedTaskId.value) ?? null,
)

function clampPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

function roundProgress(value, digits = 1) {
  const unit = 10 ** digits
  return Math.round(Number(value || 0) * unit) / unit
}

function isMonthlyWorkPlan(plan) {
  const type = String(plan?.planType || '').toLowerCase()
  return type === 'monthly' || type.includes('month') || type.includes('월') || type.includes('붽')
}

function isYearlyWorkPlan(plan) {
  const type = String(plan?.planType || '').toLowerCase()
  return (
    type === 'yearly' ||
    type === 'annual' ||
    type.includes('year') ||
    type.includes('annual') ||
    type.includes('연') ||
    type.includes('곌')
  )
}

function planDurationWeight(plan) {
  const start = toDateOnly(plan?.start)
  const end = toDateOnly(plan?.effectiveEnd || plan?.end)
  const days = daysInclusive(start, end)
  return days > 0 ? days : 1
}

function calcActualProgressForTask(plans = []) {
  const monthlyPlans = plans.filter(isMonthlyWorkPlan)
  if (!monthlyPlans.length) return 0

  const totalWeight = monthlyPlans.reduce((sum, plan) => sum + planDurationWeight(plan), 0)
  if (totalWeight <= 0) return 0

  const weightedProgress = monthlyPlans.reduce((sum, plan) => {
    return sum + clampPercent(plan.actualPct ?? plan.processProgress) * planDurationWeight(plan)
  }, 0)

  return roundProgress(weightedProgress / totalWeight)
}

function buildAnalysisProgressMap(progressRows = []) {
  const map = new Map()

  progressRows.forEach((row) => {
    const tradeProcessId = Number(row?.tradeProcessId ?? row?.id ?? row?.idx ?? 0)
    if (!tradeProcessId) return

    map.set(tradeProcessId, {
      actualPct: clampPercent(row.actualPct ?? 0),
      actualSource: row.actualSource ?? 'NONE',
      latestReportDate: row.latestReportDate ?? '',
      analysisDate: row.analysisDate ?? row.latestReportDate ?? '',
    })
  })

  return map
}

function attachWorkPlansToTasks(tasks, plans, analysisProgressByTrade = new Map()) {
  const workPlanMap = new Map()

  plans.forEach((plan) => {
    if (!plan.tradeProcessId) return

    if (!workPlanMap.has(plan.tradeProcessId)) {
      workPlanMap.set(plan.tradeProcessId, [])
    }

    workPlanMap.get(plan.tradeProcessId).push(plan)
  })

  return tasks.map((task) => {
    const taskId = Number(task.id)
    const taskWorkPlans = workPlanMap.get(taskId) || []
    const analysisProgress = analysisProgressByTrade.get(taskId)
    const actualProgress = analysisProgress
      ? roundProgress(analysisProgress.actualPct)
      : calcActualProgressForTask(taskWorkPlans)

    return {
      ...task,
      actualProgress,
      actualPct: actualProgress,
      actualSource: analysisProgress?.actualSource ?? null,
      latestReportDate: analysisProgress?.latestReportDate ?? '',
      analysisDate: analysisProgress?.analysisDate ?? '',
      workPlans: taskWorkPlans,
    }
  })
}

/**
 * task 에 연결된 WorkPlan 들을 합쳐서 빨간 막대 좌표 산출.
 *
 * 디자인:
 *   - 연한 빨강 (배경): planStart ~ planEnd (WorkPlan 기간 전체)
 *   - 진한 빨강 (오버레이): actualStart ~ min(today, planEnd) (실제 진행한 부분)
 *
 * 반환: { planStart, planEnd, actualStart, hasStarted } | null
 *  - 연결된 WorkPlan 이 하나도 없으면 null (빨간 막대 안 그림)
 *  - planStart: WorkPlan 들 중 가장 빠른 start
 *  - planEnd: WorkPlan 들 중 가장 늦은 effectiveEnd (또는 end)
 *  - actualStart: WorkPlan 들 중 가장 빠른 actualStart. 없으면 null.
 *  - hasStarted: 어느 한 plan 이라도 actualStart 가 있으면 true
 */
function workPlanProgress(task) {
  const plans = task?.workPlans
  if (!Array.isArray(plans) || plans.length === 0) return null
  const yearlyPlans = plans.filter(isYearlyWorkPlan)
  const sourcePlans = yearlyPlans.length ? yearlyPlans : plans

  let planStart = null
  let planEnd = null
  let actualStart = null

  for (const p of sourcePlans) {
    if (p.start && (!planStart || p.start < planStart)) planStart = p.start
    const e = p.end ?? p.effectiveEnd
    if (e && (!planEnd || e > planEnd)) planEnd = e
    if (p.actualStart && (!actualStart || p.actualStart < actualStart)) {
      actualStart = p.actualStart
    }
  }

  // 어떤 좌표도 못 잡으면 그릴 게 없음
  if (!planStart || !planEnd) return null

  return {
    planStart,
    planEnd,
    actualStart,
    hasStarted: !!actualStart,
  }
}

/**
 * 진한 빨강(진행된 구간) 의 [시작, 끝] 좌표.
 * 그릴 게 없으면 null.
 *
 * 원본 동작과 호환: actualStart 가 없어도 planStart 부터 today 까지 채움.
 * (실측 시작일이 안 들어와도 "오늘까지 진행된 것으로 간주"하던 기존 로직 유지)
 */
function progressBarRange(task) {
  const wp = workPlanProgress(task)
  if (!wp || !wp.planStart || !wp.planEnd) return null

  const today = new Date().toISOString().slice(0, 10)
  const fillStart = wp.actualStart ?? wp.planStart

  if (today < fillStart) return null

  const fillEnd = today < wp.planEnd ? today : wp.planEnd

  if (fillStart > fillEnd) return null

  return { start: fillStart, end: fillEnd }
}

/**
 * 빨간 막대의 진한 부분(오버레이) 너비를 % 로 계산.
 * 전체 막대(planStart ~ planEnd) 기준 actualStart 또는 planStart ~ min(today, planEnd) 의 비율.
 */
function progressFillWidthPct(task) {
  const wp = workPlanProgress(task)
  if (!wp || !wp.planStart || !wp.planEnd) return 0

  const today = new Date().toISOString().slice(0, 10)
  // 진한 부분 시작점: actualStart 가 있으면 그 값, 없으면 0% (안 그림)
  const fillStart = wp.actualStart ?? null
  if (!fillStart) return 0

  // 진한 부분 끝점: today vs planEnd 중 작은 값
  const fillEnd = today < wp.planEnd ? today : wp.planEnd

  // fillStart 가 planEnd 보다 미래면 진행 0
  if (fillStart > wp.planEnd) return 0
  // fillEnd 가 fillStart 이전이면 진행 0
  if (fillEnd < fillStart) return 0

  const totalMs = new Date(wp.planEnd) - new Date(wp.planStart)
  const elapsedMs = new Date(fillEnd) - new Date(wp.planStart)
  if (totalMs <= 0) return 0

  // 진한 부분의 시작점도 planStart 가 아닐 수 있지만,
  // 디자인적으로 "왼쪽부터 채워지는" 형태가 자연스러우므로
  // 시작점을 planStart 로 보고 fillEnd 까지만 채움.
  const pct = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100))
  return Math.round(pct * 10) / 10
}

// WorkPlanView와 동일하게 빨간 진행 점이 진행률/오늘 위치를 따라가도록 계산
function workPlanProgressDotStyle(task) {
  const wp = workPlanProgress(task)
  const range = progressBarRange(task)
  if (!wp || !range) return { display: 'none' }

  const full = barStyle(wp.planStart, wp.planEnd)
  const fill = barStyle(wp.planStart, range.end)
  if (!full || !fill) return { display: 'none' }

  const fullLeft = parseFloat(full.left)
  const fullWidth = parseFloat(full.width)
  const fillLeft = parseFloat(fill.left)
  const fillWidth = parseFloat(fill.width)
  const width = Math.max(0, Math.min(fullWidth, fillLeft + fillWidth - fullLeft))

  if (!Number.isFinite(width) || width <= 0) return { display: 'none' }
  return { left: `${Math.max(0, width - 4)}px` }
}
// 다이아몬드 버튼 누르면 토글 한 번에 접히고 열림
function toggleAllGroups() {
  const allOpen = Object.values(groupOpen.value).every((v) => v)
  Object.keys(groupOpen.value).forEach((k) => (groupOpen.value[k] = !allOpen))
  onlyMilestone.value = !onlyMilestone.value
}

function toggleGroup(group) {
  groupOpen.value[group] = !groupOpen.value[group]
}

// 모달
const confirmModalOpen = ref(false)
const changeModalOpen = ref(false)
const changeRequestFormOpen = ref(false)
const newChangeReq = ref(null)
const selectedChangeId = ref(null)
const selectedChange = computed(
  () => changeRequests.value.find((c) => c.id === selectedChangeId.value) ?? null,
)

// 업로드 폼
const uploadForm = ref({ docType: '마스터 공정표', desc: '', fileName: '' })
const showUploadSection = ref(false)
const aiAnalyzing = ref(false)

// =====================================================
// 최초 등록 페이지 (등록된 공정표 데이터가 없을 때)
// =====================================================
const firstSetup = ref({
  master: {
    name: '마스터 공정표',
    desc: '전체 공정의 큰 줄기를 담은 마스터 일정',
    file: null,
    status: 'idle',
  }, // idle | uploading | done
  milestone: {
    name: '마일스톤 공정표',
    desc: '주요 마일스톤(착공, 골조 완료, 준공 등) 일자',
    file: null,
    status: 'idle',
  },
  plan: {
    name: '공종별 시공계획서',
    desc: '공종별 상세 일정 — 골조, 전기, 설비 등',
    file: null,
    status: 'idle',
  },
})
const setupAnalyzing = ref(false)
const setupDone = ref(false)
function pickSetupFile(key, e) {
  const f = e.target.files?.[0]
  if (!f) return
  firstSetup.value[key].file = { name: f.name, size: f.size }
  firstSetup.value[key].status = 'uploading'
  setTimeout(() => {
    firstSetup.value[key].status = 'done'
  }, 700)
  e.target.value = ''
}
function handleSetupDrop(key, e) {
  const f = e.dataTransfer.files?.[0]
  if (!f) return
  firstSetup.value[key].file = { name: f.name, size: f.size }
  firstSetup.value[key].status = 'uploading'
  setTimeout(() => {
    firstSetup.value[key].status = 'done'
  }, 700)
}
function clearSetupFile(key) {
  firstSetup.value[key].file = null
  firstSetup.value[key].status = 'idle'
}
const setupReady = computed(() => Object.values(firstSetup.value).every((d) => d.status === 'done'))
function runSetupAnalysis() {
  if (!setupReady.value) return
  setupAnalyzing.value = true
  setTimeout(() => {
    setupAnalyzing.value = false
    setupDone.value = true
    setTimeout(() => {
      noDataYet.value = false
      setupDone.value = false
      projectInfo.value.status = '검토 중'
    }, 900)
  }, 1600)
}

// AI 분석 결과 모달
const aiAnalysisModalOpen = ref(false)

// 마일스톤 칩/리스트 클릭 시 해당 항목 강조
const highlightedMilestoneId = ref(null)

// 오늘 날짜 (yyyy-MM-dd) — 템플릿에서 빨간 막대 진행/예정 구간 분기에 사용
const todayIso = computed(() => new Date().toISOString().slice(0, 10))

// 인라인 핸들러를 메서드로 추출 (포매터가 multi-line 으로 펼쳐도 안전하게)
function toggleMilestoneHighlight(id) {
  highlightedMilestoneId.value = highlightedMilestoneId.value === id ? null : id
  selectedTaskId.value = null
}
function selectTask(id) {
  selectedTaskId.value = id
  highlightedMilestoneId.value = null
}
function clearMilestoneHighlight() {
  highlightedMilestoneId.value = null
}

// ======================================================
// 헬퍼
// ======================================================
const isConfirmed = computed(() =>
  ['확정', '변경 요청 중', '변경 승인 완료'].includes(projectInfo.value.status),
)

const reviewStatusClass = (s) =>
  ({
    승인: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    미검토: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
    '검토 중': 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    '수정 요청': 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    제외: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  })[s] ?? 'bg-slate-100 text-slate-500'

const docStatusClass = (s) =>
  ({
    미등록: 'bg-slate-100 text-slate-500',
    'AI 분석 중': 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    '검토 중': 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    확정: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    '변경 요청 중': 'bg-flare-50 text-flare-700 ring-1 ring-flare-200',
    '변경 승인 완료': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  })[projectInfo.value.status] ?? 'bg-slate-100 text-slate-500'

const milestoneStatusClass = (s) =>
  ({
    예정: 'bg-slate-100 text-slate-500',
    정상: 'bg-emerald-50 text-emerald-700',
    '지연 위험': 'bg-rose-50 text-rose-700',
    완료: 'bg-flare-50 text-flare-700',
  })[s] ?? 'bg-slate-100'

const crStatusClass = (s) =>
  ({
    요청됨: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    '검토 중': 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    승인: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    반려: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    '반영 완료': 'bg-flare-50 text-flare-700 ring-1 ring-flare-200',
  })[s] ?? 'bg-slate-100'

const confidenceClass = (n) =>
  n >= 90 ? 'text-emerald-600' : n >= 80 ? 'text-forena-600' : 'text-amber-600'

// 필터링된 작업 (테이블/간트차트 공용)
const filteredTasks = computed(() => {
  let r = aiTasks.value
  if (filterGroup.value) r = r.filter((t) => t.group === filterGroup.value)
  if (filterReview.value) r = r.filter((t) => t.reviewStatus === filterReview.value)
  if (filterCp.value === 'cp') r = r.filter((t) => t.isCritical)
  if (filterCp.value === 'noncp') r = r.filter((t) => !t.isCritical)
  if (onlyCp.value) r = r.filter((t) => t.isCritical)
  if (searchKey.value.trim()) {
    const k = searchKey.value.trim().toLowerCase()
    r = r.filter(
      (t) =>
        t.name.toLowerCase().includes(k) ||
        t.group.toLowerCase().includes(k) ||
        t.sub.toLowerCase().includes(k),
    )
  }
  return r
})

// 공종 그룹별 묶기
const groupedTasks = computed(() => {
  const map = new Map()
  for (const t of filteredTasks.value) {
    if (!map.has(t.group)) map.set(t.group, [])
    map.get(t.group).push(t)
  }
  return Array.from(map.entries()).map(([group, items]) => ({ group, items }))
})

// 검증 (확정 전 / 후 모두 화면에 노출)
const validation = computed(() => {
  const issues = []
  const unreviewed = aiTasks.value.filter((t) => t.reviewStatus === '미검토').length
  if (unreviewed) issues.push({ level: 'warn', msg: `미검토 항목이 ${unreviewed}건 있습니다.` })

  const noDate = aiTasks.value.filter((t) => !t.start || !t.end).length
  if (noDate)
    issues.push({ level: 'error', msg: `시작일/종료일 누락 작업이 ${noDate}건 있습니다.` })

  const reverse = aiTasks.value.filter((t) => t.start && t.end && t.start > t.end).length
  if (reverse)
    issues.push({ level: 'error', msg: `시작일이 종료일보다 늦은 작업이 ${reverse}건 있습니다.` })

  const wsum = aiTasks.value.reduce((a, t) => a + (Number(t.weight) || 0), 0)
  if (wsum !== 100) issues.push({ level: 'warn', msg: `보할 합계가 ${wsum}% 입니다 (100% 권장).` })

  const lowConf = aiTasks.value.filter((t) => t.confidence < 80).length
  if (lowConf)
    issues.push({ level: 'info', msg: `AI 신뢰도 80% 미만 항목이 ${lowConf}건 있습니다.` })

  const noLink = aiTasks.value.filter((t) => !t.prev && !t.next).length
  if (noLink)
    issues.push({ level: 'info', msg: `선행/후속 작업이 모두 누락된 항목이 ${noLink}건 있습니다.` })

  const pendingChanges = changeRequests.value.filter((c) =>
    ['요청됨', '검토 중'].includes(c.status),
  ).length
  if (pendingChanges)
    issues.push({
      level: 'warn',
      msg: `확정된 공정표에 변경 요청 ${pendingChanges}건이 대기 중입니다.`,
    })

  return issues
})

const validationCounts = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  // isDelayed 와 동일한 로직 (호이스팅 회피용 인라인)
  const isDelayedInline = (t) => {
    if (!t.start || !t.end) return false
    if (today < t.start) return false
    if (today > t.end && t.reviewStatus !== '승인') return true
    return t.confidence < 85
  }
  return {
    unreviewed: aiTasks.value.filter((t) => t.reviewStatus === '미검토').length,
    delayed: aiTasks.value.filter(isDelayedInline).length,
    pendingChanges: changeRequests.value.filter((c) => ['요청됨', '검토 중'].includes(c.status))
      .length,
    weightSum: aiTasks.value.reduce((a, t) => a + (Number(t.weight) || 0), 0),
  }
})

// ======================================================
// 간트차트 — 라인형
// ======================================================
const projStart = computed(() => projectInfo.value.startDate)
const projEnd = computed(() => projectInfo.value.endDate)
const projTotalDays = computed(() => {
  const a = new Date(projStart.value),
    b = new Date(projEnd.value)
  return Math.round((b - a) / 86400000) + 1
})
function dayOffset(dateStr) {
  const a = new Date(projStart.value),
    b = new Date(dateStr)
  return Math.max(0, Math.round((b - a) / 86400000))
}
function rangeDays(s, e) {
  return Math.max(1, Math.round((new Date(e) - new Date(s)) / 86400000) + 1)
}

// 스케일별 셀 너비(px)
const cellW = computed(() => {
  const base = ganttScale.value === 'year' ? 1.2 : ganttScale.value === 'month' ? 3 : 14
  return base * ganttZoom.value
})
const ganttPxWidth = computed(() => projTotalDays.value * cellW.value)

// 헤더 라벨 — year(분기), month(월), week(주)
const ganttHeader = computed(() => {
  const out = []
  const a = new Date(projStart.value)
  const total = projTotalDays.value
  if (ganttScale.value === 'year') {
    // 분기 단위
    let y = a.getFullYear(),
      q = Math.floor(a.getMonth() / 3) + 1
    let cursor = new Date(a)
    while (cursor < new Date(projEnd.value)) {
      const qStart = new Date(y, (q - 1) * 3, 1)
      const qEndMonth = (q - 1) * 3 + 3
      const qEnd = new Date(y, qEndMonth, 0)
      const start = qStart < a ? a : qStart
      const end = qEnd > new Date(projEnd.value) ? new Date(projEnd.value) : qEnd
      out.push({ label: `${y}년 ${q}Q`, days: Math.round((end - start) / 86400000) + 1 })
      q += 1
      if (q > 4) {
        q = 1
        y += 1
      }
      cursor = new Date(y, (q - 1) * 3, 1)
    }
  } else if (ganttScale.value === 'month') {
    let cur = new Date(a.getFullYear(), a.getMonth(), 1)
    const last = new Date(projEnd.value)
    while (cur <= last) {
      const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
      const start = cur < a ? a : cur
      const end = next > last ? last : next
      out.push({
        label: `${cur.getFullYear()}.${String(cur.getMonth() + 1).padStart(2, '0')}`,
        days: Math.round((end - start) / 86400000) + 1,
      })
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    }
  } else {
    // 주간 — 7일씩
    let cursor = new Date(a)
    let weekIdx = 1
    while (cursor <= new Date(projEnd.value)) {
      const next = new Date(cursor)
      next.setDate(next.getDate() + 7)
      const end = next > new Date(projEnd.value) ? new Date(projEnd.value) : next
      out.push({ label: `${weekIdx}주`, days: Math.round((end - cursor) / 86400000) + 1 })
      cursor = next
      weekIdx += 1
      if (weekIdx > 200) break // 안전장치
    }
  }
  return out
})

// 막대 위치 계산
function barStyle(start, end) {
  if (!start || !end) return null
  const left = dayOffset(start) * cellW.value
  const width = rangeDays(start, end) * cellW.value
  return { left: `${left}px`, width: `${width - 4}px` }
}

function toDateOnly(value) {
  if (!value) return null
  return String(value).slice(0, 10)
}

function daysInclusive(start, end) {
  const s = new Date(start)
  const e = new Date(end)

  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return 0
  }

  return Math.floor((e - s) / 86400000) + 1
}

function getRawWeight(task) {
  const raw = task?._src?.weightPct ?? task?.weight
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

function calcPlannedProgressByToday(tasks) {
  const today = new Date().toISOString().slice(0, 10)

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return 0
  }

  // 전체 보할 합계로 단위 판단
  // 합계가 1 근처면 0.00726 같은 비율값
  // 합계가 100 근처면 이미 퍼센트값
  const rawWeightSum = tasks.reduce((sum, task) => {
    return sum + getRawWeight(task)
  }, 0)

  const weightMultiplier = rawWeightSum <= 1.5 ? 100 : 1

  const total = tasks.reduce((sum, task) => {
    const start = toDateOnly(task.baselineStart ?? task.start)
    const end = toDateOnly(task.baselineEnd ?? task.end)
    const weightPct = getRawWeight(task) * weightMultiplier

    if (!start || !end || weightPct <= 0) {
      return sum
    }

    if (today < start) {
      return sum
    }

    if (today >= end) {
      return sum + weightPct
    }

    const totalDays = daysInclusive(start, end)
    const elapsedDays = daysInclusive(start, today)

    if (totalDays <= 0) {
      return sum
    }

    return sum + weightPct * (elapsedDays / totalDays)
  }, 0)

  return Math.floor(total)
}

function calcActualProgressByReports(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return 0
  }

  const rawWeightSum = tasks.reduce((sum, task) => sum + getRawWeight(task), 0)
  const weightMultiplier = rawWeightSum <= 1.5 ? 100 : 1

  const total = tasks.reduce((sum, task) => {
    const weightPct = getRawWeight(task) * weightMultiplier
    if (weightPct <= 0) return sum

    return sum + weightPct * (clampPercent(task.actualProgress ?? task.actualPct) / 100)
  }, 0)

  return roundProgress(total)
}

// 오늘 라인
const todayLineStyle = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  if (today < projStart.value || today > projEnd.value) return null
  return { left: `${dayOffset(today) * cellW.value + cellW.value / 2}px` }
})

// 마일스톤 마커 위치
function milestoneStyle(date) {
  return { left: `${dayOffset(date) * cellW.value + cellW.value / 2 - 6}px` }
}

// 그룹별 마일스톤 (간트 그룹 헤더라인에 표시)
function milestonesOfGroup(groupName) {
  return milestones.value.filter((m) => m.group === groupName)
}

// 현재일 근접 판단 (±14일 이내 이고 미완료 상태일 때 pulse)
function isMilestoneSoon(m) {
  if (m.status === '완료') return false
  const today = new Date()
  const ms = new Date(m.date)
  const diffDays = Math.abs((ms - today) / 86400000)
  return diffDays <= 14
}

// 마일스톤 색상 (다이아몬드 채움색)
function milestoneFill(m) {
  if (m.status === '완료') return '#10b981' // emerald-500
  if (m.status === '지연 위험') return '#f43f5e' // rose-500
  return '#3b82f6' // blue-500 (예정)
}
function milestoneStroke(m) {
  if (m.status === '완료') return '#047857' // emerald-700
  if (m.status === '지연 위험') return '#be123c' // rose-700
  return '#1d4ed8' // blue-700
}

// 데이터 미등록 (최초 등록 화면 노출 조건)
const noDataYet = ref(false) // true 로 두면 최초 등록 화면 노출
function enterFirstSetup() {
  noDataYet.value = true
}
function exitFirstSetup() {
  noDataYet.value = false
}

/**
 * 지연 위험 판단.
 *  - 시작 전 작업 (today < start) → 지연 아님
 *  - 종료 후인데 검토 미완료 → 지연
 *  - 진행 중 작업 → 신뢰도 < 85 면 지연 위험 (실제 진척률 컬럼이 추가되면 그걸로 교체)
 */
function isDelayed(task) {
  if (!task.start || !task.end) return false
  const today = new Date().toISOString().slice(0, 10)
  // 시작 전: 지연 아님
  if (today < task.start) return false
  // 종료 지났는데 아직 미완료(승인되지 않음) → 지연
  if (today > task.end && task.reviewStatus !== '승인') return true
  // 진행 중: 신뢰도 기반 임시 판단
  return task.confidence < 85
}

// ======================================================
// 액션 핸들러 — 모두 mock
// ======================================================
function onUploadFile(e) {
  const f = e.target.files?.[0]
  if (f) uploadForm.value.fileName = f.name
  e.target.value = ''
}
function runAiAnalysis() {
  if (!uploadForm.value.fileName) {
    alert('파일을 먼저 업로드하세요.')
    return
  }
  aiAnalyzing.value = true
  projectInfo.value.status = 'AI 분석 중'
  setTimeout(() => {
    aiAnalyzing.value = false
    projectInfo.value.status = '검토 중'
    uploadedDocs.value.unshift({
      id: Date.now(),
      name: uploadForm.value.fileName,
      type: uploadForm.value.docType,
      uploadedAt: new Date().toLocaleString('ko-KR'),
      uploadedBy: '관리자',
      aiAnalyzed: true,
      reflectStatus: '검토 중',
      desc: uploadForm.value.desc,
    })
    uploadForm.value = { docType: '마스터 공정표', desc: '', fileName: '' }
    showUploadSection.value = false
    aiAnalysisModalOpen.value = true
  }, 1400)
}
function loadExistingDoc() {
  alert('기존 문서 불러오기 (데모)')
}
function manualInput() {
  alert('직접 입력 모드 (데모)')
}
function reanalyze(docId) {
  const doc = uploadedDocs.value.find((d) => d.id === docId)
  if (doc) {
    doc.reflectStatus = '검토 중'
    alert(`"${doc.name}" 재분석 시작 (데모)`)
  }
}
function viewDoc(doc) {
  alert(`원본 문서 보기: ${doc.name} (데모)`)
}
function downloadDoc(doc) {
  alert(`다운로드: ${doc.name} (데모)`)
}

// 일괄 처리
function bulkApprove() {
  aiTasks.value.forEach((t) => {
    if (t.checked) t.reviewStatus = '승인'
  })
  aiTasks.value.forEach((t) => (t.checked = false))
}
function bulkExclude() {
  aiTasks.value.forEach((t) => {
    if (t.checked) t.reviewStatus = '제외'
  })
  aiTasks.value.forEach((t) => (t.checked = false))
}

// 기준 공정표 확정
function openConfirm() {
  if (!canConfirm.value) {
    alert('기준 공정표 확정 권한이 없습니다.')
    return
  }
  confirmModalOpen.value = true
}
function confirmBaseline() {
  projectInfo.value.status = '확정'
  projectInfo.value.lastModified = new Date().toISOString().slice(0, 10)
  changeLog.value.unshift({
    id: Date.now(),
    at: new Date().toLocaleString('ko-KR'),
    who: '박현수',
    action: '기준 공정표 확정',
    target: `v${changeLog.value.length + 1}`,
    detail: `전체 ${aiTasks.value.length}건 / CP ${aiTasks.value.filter((t) => t.isCritical).length}건`,
  })
  confirmModalOpen.value = false
  alert('기준 공정표가 확정되었습니다. 이후 수정은 변경 요청을 통해 처리됩니다.')
}

// 변경 요청
function openChangeManagement() {
  changeModalOpen.value = true
}
function openChangeRequestForm(task) {
  newChangeReq.value = {
    taskId: task.id,
    taskName: task.name,
    group: task.group,
    changeType: '시작일 변경',
    oldStart: task.start,
    oldEnd: task.end,
    newStart: task.start,
    newEnd: task.end,
    oldCp: task.isCritical,
    newCp: task.isCritical,
    oldWeight: task.weight,
    newWeight: task.weight,
    oldPrev: task.prev,
    newPrev: task.prev,
    reason: '',
  }
  changeRequestFormOpen.value = true
}
function submitChangeRequest() {
  if (!newChangeReq.value.reason.trim()) {
    alert('변경 사유를 입력하세요.')
    return
  }
  const cp = newChangeReq.value.oldCp || newChangeReq.value.newCp
  const delayDays = Math.max(
    0,
    Math.round(
      (new Date(newChangeReq.value.newEnd) - new Date(newChangeReq.value.oldEnd)) / 86400000,
    ),
  )
  changeRequests.value.unshift({
    id: Date.now(),
    requestedAt: new Date().toISOString().slice(0, 10),
    ...newChangeReq.value,
    requester: '관리자',
    affectedTasks: [],
    milestoneImpact: cp ? '관련 마일스톤 영향 가능' : '없음',
    cpImpact: cp,
    expectedDelayDays: delayDays,
    aiSummary: cp
      ? `CP 공정 변경 요청. ${delayDays}일 지연 시 후속 작업과 마일스톤에 영향 가능. 현장 총책임자 승인 권장.`
      : `비CP 공정. 일정 영향 제한적.`,
    status: '요청됨',
    approver: '',
    approvedAt: '',
  })
  projectInfo.value.status = '변경 요청 중'
  changeRequestFormOpen.value = false
  alert('변경 요청이 등록되었습니다.')
}
function approveChange(cr) {
  if (!canConfirm.value) {
    alert('변경 승인 권한이 없습니다.')
    return
  }
  cr.status = '승인'
  cr.approver = '박현수'
  cr.approvedAt = new Date().toISOString().slice(0, 10)
  // 실제 작업 데이터에 반영
  const t = aiTasks.value.find((x) => x.id === cr.taskId)
  if (t) {
    t.start = cr.newStart
    t.end = cr.newEnd
    t.isCritical = cr.newCp
    t.weight = cr.newWeight
    t.prev = cr.newPrev
    t.durDays = rangeDays(cr.newStart, cr.newEnd)
  }
  cr.status = '반영 완료'
  projectInfo.value.status = '변경 승인 완료'
  changeLog.value.unshift({
    id: Date.now(),
    at: new Date().toLocaleString('ko-KR'),
    who: '박현수',
    action: '승인',
    target: cr.taskName,
    detail: `${cr.changeType}: ${cr.oldStart}~${cr.oldEnd} → ${cr.newStart}~${cr.newEnd}`,
  })
}
function rejectChange(cr) {
  if (!canConfirm.value) {
    alert('변경 반려 권한이 없습니다.')
    return
  }
  cr.status = '반려'
  cr.approver = '박현수'
  cr.approvedAt = new Date().toISOString().slice(0, 10)
  changeLog.value.unshift({
    id: Date.now(),
    at: new Date().toLocaleString('ko-KR'),
    who: '박현수',
    action: '반려',
    target: cr.taskName,
    detail: cr.reason,
  })
}
function reviewChange(cr) {
  cr.status = '검토 중'
}

// 줌
function zoomIn() {
  ganttZoom.value = Math.min(1.6, +(ganttZoom.value + 0.2).toFixed(1))
}

// 춤 아웃 설정 마지막 마일스톤까지만 축소 되도록 설정
function zoomOut() {
  const el = document.getElementById('gantt-scroll')
  if (!el) return
  // 이제 gantt-scroll이 차트 영역만 감싸므로 그대로 사용
  const availableWidth = el.clientWidth
  const base = ganttScale.value === 'year' ? 1.2 : ganttScale.value === 'month' ? 3 : 14
  const minZoom = availableWidth / (projTotalDays.value * base)
  const newZoom = Math.max(+minZoom.toFixed(2), +(ganttZoom.value - 0.2).toFixed(1))
  ganttZoom.value = Math.min(1.6, newZoom)
}

const isLoading = ref(false)
const loadError = ref('')

async function loadGanttFromApi() {
  const hasCachedGantt = ganttStore.tasks && ganttStore.tasks.length > 0

  // 1) 스토어에 이미 데이터가 있으면 그대로 사용 (FirstDocumentUpload 에서 넘어온 경우)
  if (hasCachedGantt) {
    projectInfo.value = ganttStore.projectInfo ?? {}
    aiTasks.value = ganttStore.tasks ?? []
    milestones.value = ganttStore.milestones ?? []
    resetGroupOpenByCurrentTasks(aiTasks.value)
  }

  // 2) 스토어가 비어 있으면 (새로고침 등) 백엔드에서 다시 로드
  isLoading.value = true
  loadError.value = ''
  try {
    const [rows, plans, progressRows] = await Promise.all([
      listTradeProcessesRaw({
        projectId: currentProjectId.value,
        includeAllTrades: true,
      }),
      fetchWorkPlansByProject(currentProjectId.value, { includeAllTrades: true }),
      fetchProgressList(currentProjectId.value),
    ])

    if (!rows.length) {
      // 데이터가 아예 없는 현장 — 일단 빈 상태로 두고 사용자가 등록 페이지에서 업로드하도록
      if (hasCachedGantt) return
      projectInfo.value = {}
      aiTasks.value = []
      milestones.value = []
      return
    }

    // master 키 하나로 묶어 buildGanttData 에 전달 (FirstDocumentUpload 와 동일한 매핑 경로)
    const { tasks, milestones: ms, projectInfo: pi } = buildGanttData({ master: rows })

    const analysisProgressByTrade = buildAnalysisProgressMap(progressRows)
    const tasksWithWorkPlans = attachWorkPlansToTasks(tasks, plans, analysisProgressByTrade)

    const plannedProgress = calcPlannedProgressByToday(tasksWithWorkPlans)
    const actualProgress = calcActualProgressByReports(tasksWithWorkPlans)

    const updatedProjectInfo = {
      ...pi,
      plannedProgress,
      actualProgress,
    }

    projectInfo.value = updatedProjectInfo
    aiTasks.value = tasksWithWorkPlans
    milestones.value = ms

    ganttStore.setData(tasksWithWorkPlans, ms, updatedProjectInfo)
  } catch (err) {
    console.error('공정표 로드 실패:', err)
    loadError.value = err?.message || '공정표를 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 마우스 휠로 좌우로 움직일 수 있도록 설정
function onGanttWheel(e) {
  const el = document.getElementById('gantt-scroll')
  if (el) el.scrollLeft += e.deltaY
}

function scrollToToday() {
  const today = new Date().toISOString().slice(0, 10)
  if (today < projStart.value || today > projEnd.value) {
    alert('오늘 날짜가 공사 기간 밖입니다.')
    return
  }
  const el = document.getElementById('gantt-scroll')
  if (el) el.scrollLeft = Math.max(0, dayOffset(today) * cellW.value - 200)
}

onMounted(async () => {
  await loadGanttFromApi()
  await nextTick()
  scrollToToday()
})
</script>

<template>
  <div class="flex flex-col gap-5 pb-8">
    <!-- ============================================================ -->
    <!-- 1. 상단: 페이지 제목 + 현장 요약 + 주요 액션                       -->
    <!-- ============================================================ -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[11px] font-bold uppercase tracking-widest text-flare-600">일정 관리</p>
        <h1 class="text-xl font-bold text-forena-900">전체 공정표</h1>
        <p class="mt-1 text-xs text-forena-500">
          {{ projectInfo.projectName }} &nbsp | &nbsp {{ projectInfo.startDate }} ~
          {{ projectInfo.endDate }}
        </p>
      </div>
    </div>
    <ScheduleChartFirstSetup
      v-if="noDataYet"
      :first-setup="firstSetup"
      :setup-ready="setupReady"
      :setup-analyzing="setupAnalyzing"
      :setup-done="setupDone"
      @exit="exitFirstSetup"
      @drop-file="handleSetupDrop"
      @pick-file="pickSetupFile"
      @clear-file="clearSetupFile"
      @run-analysis="runSetupAnalysis"
    />

    <ScheduleChartSummaryCards
      v-if="!noDataYet"
      :project-info="projectInfo"
      :validation-counts="validationCounts"
      :task-count="aiTasks.length"
    />

    <ScheduleChartUploadModal
      v-if="showUploadSection"
      :upload-form="uploadForm"
      :uploaded-docs="uploadedDocs"
      :ai-analyzing="aiAnalyzing"
      @close="showUploadSection = false"
      @upload-file="onUploadFile"
      @update-doc-type="uploadForm.docType = $event"
      @update-desc="uploadForm.desc = $event"
      @run-analysis="runAiAnalysis"
      @load-existing-doc="loadExistingDoc"
      @manual-input="manualInput"
      @view-doc="viewDoc"
      @download-doc="downloadDoc"
      @reanalyze="reanalyze"
    />

    <ScheduleChartGanttSection
      v-if="!noDataYet"
      :ai-tasks="aiTasks"
      :grouped-tasks="groupedTasks"
      :milestones="milestones"
      :group-open="groupOpen"
      :selected-task="selectedTask"
      :selected-task-id="selectedTaskId"
      :uploaded-docs="uploadedDocs"
      :only-cp="onlyCp"
      :only-milestone="onlyMilestone"
      :highlight-delayed="highlightDelayed"
      :gantt-zoom="ganttZoom"
      :gantt-px-width="ganttPxWidth"
      :gantt-header="ganttHeader"
      :cell-w="cellW"
      :today-line-style="todayLineStyle"
      :confidence-class="confidenceClass"
      :review-status-class="reviewStatusClass"
      :milestones-of-group="milestonesOfGroup"
      :is-milestone-soon="isMilestoneSoon"
      :milestone-fill="milestoneFill"
      :milestone-stroke="milestoneStroke"
      :day-offset="dayOffset"
      :bar-style="barStyle"
      :work-plan-progress="workPlanProgress"
      :progress-bar-range="progressBarRange"
      :work-plan-progress-dot-style="workPlanProgressDotStyle"
      @toggle-only-cp="onlyCp = !onlyCp"
      @toggle-highlight-delayed="highlightDelayed = !highlightDelayed"
      @toggle-all-groups="toggleAllGroups"
      @toggle-group="toggleGroup"
      @toggle-milestone-highlight="toggleMilestoneHighlight"
      @select-task="selectTask"
      @update-selected-task-id="selectedTaskId = $event"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @scroll-to-today="scrollToToday"
      @gantt-wheel="onGanttWheel"
    />

    <ScheduleChartAiAnalysisModal
      v-if="aiAnalysisModalOpen"
      :ai-tasks="aiTasks"
      :filtered-tasks="filteredTasks"
      :search-key="searchKey"
      :filter-group="filterGroup"
      :filter-review="filterReview"
      :filter-cp="filterCp"
      :selected-task-id="selectedTaskId"
      :is-confirmed="isConfirmed"
      :can-edit="canEdit"
      :confidence-class="confidenceClass"
      :review-status-class="reviewStatusClass"
      @close="aiAnalysisModalOpen = false"
      @update-search-key="searchKey = $event"
      @update-filter-group="filterGroup = $event"
      @update-filter-review="filterReview = $event"
      @update-filter-cp="filterCp = $event"
      @bulk-approve="bulkApprove"
      @bulk-exclude="bulkExclude"
    />

    <!-- ?? ??? ?? ?? -->
    <ScheduleChartConfirmModal
      v-if="confirmModalOpen"
      :validation="validation"
      @close="confirmModalOpen = false"
      @confirm="confirmBaseline"
    />

    <!-- ?? ?? ?? ?? -->
    <ScheduleChartChangeRequestFormModal
      v-if="changeRequestFormOpen && newChangeReq"
      :new-change-req="newChangeReq"
      @close="changeRequestFormOpen = false"
      @submit="submitChangeRequest"
    />

    <!-- ?? ?? ?? ?? -->
    <ScheduleChartChangeManagementModal
      v-if="changeModalOpen"
      :change-requests="changeRequests"
      :selected-change="selectedChange"
      :selected-change-id="selectedChangeId"
      :can-confirm="canConfirm"
      :cr-status-class="crStatusClass"
      @close="changeModalOpen = false"
      @select-change="selectedChangeId = $event"
      @review-change="reviewChange"
      @approve-change="approveChange"
      @reject-change="rejectChange"
    />
  </div>
</template>
