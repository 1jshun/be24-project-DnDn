<script setup>
import { ref, computed, watch } from 'vue'

import router from '@/router/index.js'
import { parseGanttJSON } from '@/utils/ganttParser.js'
import { useGanttStore } from '@/stores/ganttStore.js'
import { useAuthStore } from '@/stores/authStore.js'
import { useCurrentProject } from '@/composables/useCurrentProject.js'
import { getProject, getProjectList } from '@/api/project.js'
import { uploadAndExtractSchedule, updateTradeProcess } from '@/api/masterSchedule.js'
import {
  buildGanttData,
  isMilestoneScheduleRow,
  isTaskDirty,
  taskToReqBody,
} from '@/utils/scheduleMapper.js'
import FirstDocumentUploadCards from '@/components/schedule/firstDocumentUpload/FirstDocumentUploadCards.vue'
import FirstDocumentValidationModal from '@/components/schedule/firstDocumentUpload/FirstDocumentValidationModal.vue'
import FirstDocumentGanttPreviewModal from '@/components/schedule/firstDocumentUpload/FirstDocumentGanttPreviewModal.vue'
import {
  BrainCircuit,
  CheckCircle2,
  FileSpreadsheet,
  Flag,
  Layers,
  RefreshCw,
  ChevronRight,
  ArrowRight,
  Info,
  Trash2,
  FileWarning,
  Loader2,
  BarChart3,
  CalendarRange,
} from 'lucide-vue-next'

// =====================================================
// Props
// =====================================================
// 상위 라우트/페이지에서 현재 프로젝트(현장) ID를 내려줌.
// 추후 실제 라우팅과 연결하면 fallback 값(1)은 제거 예정.
const props = defineProps({
  projectId: {
    type: [Number, String],
    default: 1,
  },
})

const ganttStore = useGanttStore()
const authStore = useAuthStore()
const { currentProjectId } = useCurrentProject(props.projectId)
const resolvedProjectId = ref(null)
const activeProjectId = computed(
  () => authStore.projectId ?? resolvedProjectId.value ?? currentProjectId.value,
)

// =====================================================
// 상수
// =====================================================
const DOC_TYPES = [
  {
    key: 'master',
    label: '마스터 공정표',
    desc: '기준 공정표 생성에 필요한 필수 문서입니다. 공종, 공정명, 보할, 기준 시작일, 기간, 세부 작업을 추출합니다.',
    icon: 'spreadsheet',
    required: true,
    acceptedFormats: ['.xlsx', '.xls', '.pdf', '.mpp'],
    color: 'blue',
    aiCapabilities: ['공종/공정명 추출', '보할 추출', '기준 일정 산정', '세부 작업 생성'],
  },
]

// =====================================================
// 상태
// =====================================================
const uploads = ref({
  master: { file: null, fileName: '', status: 'idle', progress: 0, result: null, error: '' },
  milestone: { file: null, fileName: '', status: 'idle', progress: 0, result: null, error: '' },
  trade: { file: null, fileName: '', status: 'idle', progress: 0, result: null, error: '' },
  bohal: { file: null, fileName: '', status: 'idle', progress: 0, result: null, error: '' },
})

const projectMeta = ref({
  siteName: '',
  location: '',
  startDate: '',
  endDate: '',
  manager: authStore.userName || '',
})
const projectMetaLoading = ref(false)
const projectMetaError = ref('')

const currentStep = ref(1)
const analyzeAll = ref(false)

// 유효성 검사 알림 모달
const validationModal = ref(false)
const validationErrors = ref([])

// 간트차트 미리보기 모달
const ganttPreviewModal = ref(false)

// =====================================================
// 헬퍼
// =====================================================
function toDateInputValue(value) {
  return value ? String(value).slice(0, 10) : ''
}

function parseProjectLabel(name) {
  const raw = String(name || '').trim()
  const match = /^\s*\[(?<code>[^\]]+)\]\s*(?<displayName>.+)$/.exec(raw)
  if (!match?.groups) {
    return { code: '', displayName: raw }
  }
  return {
    code: match.groups.code.trim(),
    displayName: match.groups.displayName.trim(),
  }
}

function siteCodeMatches(project, siteCode) {
  const expected = String(siteCode || '')
    .trim()
    .toUpperCase()
  if (!expected) return false
  return parseProjectLabel(project?.name).code.toUpperCase() === expected
}

function applyProjectMeta(project) {
  const displayName = parseProjectLabel(project?.name).displayName
  const projectId = Number(project?.idx)
  if (Number.isFinite(projectId) && projectId > 0) {
    resolvedProjectId.value = projectId
    if (!authStore.projectId) authStore.setProjectId(projectId)
  }

  projectMeta.value = {
    siteName: displayName,
    location: String(project?.location || '').trim(),
    startDate: toDateInputValue(project?.startDate),
    endDate: toDateInputValue(project?.endDate),
    manager: authStore.userName || projectMeta.value.manager || '',
  }
}

async function resolveProjectForCurrentUser(projectId) {
  if (!authStore.projectId && authStore.siteCode) {
    const projects = await getProjectList()
    const matched = projects.find((project) => siteCodeMatches(project, authStore.siteCode))
    if (matched) return matched
  }
  return await getProject(projectId)
}

let projectMetaRequestSeq = 0

async function loadProjectMeta(projectId) {
  if (!projectId) return
  const seq = ++projectMetaRequestSeq
  projectMetaLoading.value = true
  projectMetaError.value = ''
  try {
    const project = await resolveProjectForCurrentUser(projectId)
    if (seq !== projectMetaRequestSeq) return
    applyProjectMeta(project)
  } catch (e) {
    if (seq !== projectMetaRequestSeq) return
    projectMetaError.value = e?.message || '현장 정보를 불러오지 못했습니다.'
    if (!projectMeta.value.manager && authStore.userName) {
      projectMeta.value.manager = authStore.userName
    }
  } finally {
    if (seq === projectMetaRequestSeq) {
      projectMetaLoading.value = false
    }
  }
}

watch(
  () => [currentProjectId.value, authStore.projectId, authStore.siteCode],
  () => loadProjectMeta(activeProjectId.value),
  { immediate: true },
)

watch(
  () => authStore.userName,
  (name) => {
    if (name && !projectMeta.value.manager) {
      projectMeta.value.manager = name
    }
  },
  { immediate: true },
)

const colorMap = {
  blue: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    ring: 'ring-sky-200',
    dot: 'bg-sky-500',
    badge: 'bg-sky-100 text-sky-700',
    icon: 'text-sky-600',
    dragBorder: 'border-sky-400 bg-sky-50/40',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-200',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'text-amber-600',
    dragBorder: 'border-amber-400 bg-amber-50/40',
  },
  teal: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: 'text-emerald-600',
    dragBorder: 'border-emerald-400 bg-emerald-50/40',
  },
  violet: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    ring: 'ring-violet-200',
    dot: 'bg-violet-500',
    badge: 'bg-violet-100 text-violet-700',
    icon: 'text-violet-600',
    dragBorder: 'border-violet-400 bg-violet-50/40',
  },
}

const hasAnyUpload = computed(() => Object.values(uploads.value).some((u) => u.fileName))
const hasMaster = computed(() => !!uploads.value.master.fileName)
const isAnalyzingAny = computed(() =>
  Object.values(uploads.value).some((u) => ['uploading', 'analyzing'].includes(u.status)),
)
const isProjectMetaComplete = computed(
  () =>
    projectMeta.value.siteName.trim() &&
    projectMeta.value.location.trim() &&
    projectMeta.value.startDate &&
    projectMeta.value.endDate &&
    projectMeta.value.manager.trim(),
)
const canStartScheduleGeneration = computed(
  () => isProjectMetaComplete.value && hasMaster.value && !isAnalyzingAny.value,
)
const generationReadyMessage = computed(() => {
  if (!isProjectMetaComplete.value) return '프로젝트 기본 정보를 먼저 확인해주세요.'
  if (!hasMaster.value) return '마스터 공정표를 업로드해주세요.'
  if (isAnalyzingAny.value) return 'AI 분석이 끝난 뒤 공정표를 생성할 수 있습니다.'
  if (uploads.value.master.status === 'done')
    return '마스터 공정표 분석 결과로 공정표를 생성할 수 있습니다.'
  return '버튼을 누르면 등록된 마스터 공정표를 먼저 분석한 뒤 공정표를 생성합니다.'
})

const allDone = computed(() =>
  Object.values(uploads.value)
    .filter((u) => u.fileName)
    .every((u) => u.status === 'done'),
)

const hasAnyDone = computed(() => Object.values(uploads.value).some((u) => u.status === 'done'))

function getStatusLabel(status) {
  return (
    {
      idle: '대기',
      uploading: '업로드 중',
      analyzing: 'AI 분석 중',
      done: '분석 완료',
      error: '오류',
    }[status] ?? '대기'
  )
}
function getStatusClass(status) {
  return (
    {
      idle: 'bg-slate-100 text-slate-500',
      uploading: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
      analyzing: 'bg-flare-50 text-flare-700 ring-1 ring-flare-200',
      done: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      error: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    }[status] ?? 'bg-slate-100 text-slate-500'
  )
}

// 파일 선택
function onFileSelect(typeKey, event) {
  const f = event.target.files?.[0]
  if (!f) return
  uploads.value[typeKey].file = f
  uploads.value[typeKey].fileName = f.name
  uploads.value[typeKey].status = 'idle'
  uploads.value[typeKey].error = ''
  uploads.value[typeKey].result = null
  if (typeKey === 'master') resetOptionalAnalysisResultsAfterMasterChange()
  event.target.value = ''
}

// 드래그 앤 드롭
function onDrop(typeKey, event) {
  event.preventDefault()
  const f = event.dataTransfer.files?.[0]
  if (!f) return
  uploads.value[typeKey].file = f
  uploads.value[typeKey].fileName = f.name
  uploads.value[typeKey].status = 'idle'
  uploads.value[typeKey].error = ''
  uploads.value[typeKey].result = null
  if (typeKey === 'master') resetOptionalAnalysisResultsAfterMasterChange()
}
function onDragOver(event) {
  event.preventDefault()
}

// 파일 삭제
function removeFile(typeKey) {
  uploads.value[typeKey] = {
    file: null,
    fileName: '',
    status: 'idle',
    progress: 0,
    result: null,
    error: '',
  }
}

function resetOptionalAnalysisResultsAfterMasterChange() {
  for (const dt of DOC_TYPES) {
    if (dt.key === 'master') continue
    const upload = uploads.value[dt.key]
    if (!upload.fileName) continue
    upload.status = 'idle'
    upload.progress = 0
    upload.result = null
    upload.error = ''
  }
}

// AI 분석 실행 — 백엔드 업로드 + OpenAI 추출 호출
async function runAnalysis(typeKey) {
  const u = uploads.value[typeKey]
  if (!u.file) return

  // DOC_TYPES에서 한글 라벨을 가져와 백엔드 DocType.fromLabel()에 매칭
  const docType = DOC_TYPES.find((dt) => dt.key === typeKey)
  if (!docType) {
    u.status = 'error'
    u.error = '알 수 없는 문서 유형입니다.'
    return
  }

  if (typeKey === 'master') resetOptionalAnalysisResultsAfterMasterChange()

  u.status = 'uploading'
  u.progress = 0
  u.error = ''
  u.result = null

  try {
    const tradeProcesses = await uploadAndExtractSchedule({
      projectId: activeProjectId.value,
      docType: docType.label, // 한글 라벨 그대로 전달
      file: u.file,
      onUploadProgress: (percent) => {
        // 100%에 도달하면 서버에서 OpenAI 분석이 시작됨 → analyzing 상태로 전환
        if (percent >= 100) {
          u.status = 'analyzing'
          u.progress = 100
        } else {
          u.progress = percent
        }
      },
    })

    u.status = 'done'
    u.progress = 100
    u.result = summarizeResult(typeKey, tradeProcesses)

    // 모든 업로드된 파일이 분석 완료면 단계 진행
    if (
      Object.values(uploads.value)
        .filter((x) => x.fileName)
        .every((x) => x.status === 'done')
    ) {
      currentStep.value = 3
    }
  } catch (e) {
    u.status = 'error'
    u.progress = 0
    u.error = e?.message || '분석 중 오류가 발생했습니다.'
  }
}

function runAllAnalysis() {
  analyzeAll.value = true
  currentStep.value = 2
  // 각 파일을 독립적으로 호출 (병렬). 한 파일 실패가 다른 파일에 영향 없음.
  DOC_TYPES.forEach((dt) => {
    if (uploads.value[dt.key].fileName && uploads.value[dt.key].status === 'idle') {
      runAnalysis(dt.key)
    }
  })
}

/**
 * 백엔드 응답(TradeProcessDto.Res[])을 카드별 요약 데이터로 변환.
 * - tasks: 추출 작업 수
 * - cpTasks: 마일스톤 표기된 작업 수 (간이 추정. CP 공정 정식 산출은 후속 작업에서)
 * - milestones: isMilestone=true 작업 수
 * - trades: 고유 공종 수
 * - dateRange: 가장 빠른 시작일 ~ 가장 늦은 종료일
 * - confidence: 임시값 (서버 응답에 신뢰도 필드가 추가되면 교체)
 * - rows: 원본 응답 배열 그대로 보관 (다음 단계 — 간트차트 생성에서 사용)
 */
function summarizeResult(typeKey, rows) {
  const list = Array.isArray(rows) ? rows : []
  const normalRows = list.filter((r) => !isMilestoneScheduleRow(r))
  const milestones = list.filter(isMilestoneScheduleRow).length
  const trades = new Set(normalRows.map((r) => r.tradeName).filter(Boolean)).size

  const startDates = list
    .map((r) => r.plannedStart)
    .filter(Boolean)
    .sort()
  const endDates = list
    .map((r) => r.plannedEnd)
    .filter(Boolean)
    .sort()
  const firstDate = startDates[0] ?? null
  const lastDate = endDates[endDates.length - 1] ?? null
  const dateRange = firstDate && lastDate ? `${firstDate} ~ ${lastDate}` : ''

  // 신뢰도 — 서버 응답에 아직 필드 없음. 임시 placeholder.
  const confidence = list.length > 0 ? 90 : 0

  const base = {
    tasks: list.length,
    milestones,
    trades,
    dateRange,
    firstDate,
    lastDate,
    confidence,
    rows, // 다음 단계(간트차트)에서 그대로 사용
  }

  if (typeKey === 'master') {
    return { ...base, cpTasks: milestones }
  }
  if (typeKey === 'milestone') {
    return base
  }
  if (typeKey === 'trade') {
    return base
  }
  if (typeKey === 'bohal') {
    return base
  }
  return base
}

// =====================================================
// 유효성 검사 & 공정표 검토 버튼
// =====================================================
function handleReviewClick() {
  const errors = []

  // 프로젝트 기본 정보 검사
  if (!projectMeta.value.siteName.trim())
    errors.push({ field: '현장명', msg: '현장명을 입력해주세요.' })
  if (!projectMeta.value.location.trim())
    errors.push({ field: '공사 위치', msg: '공사 위치를 입력해주세요.' })
  if (!projectMeta.value.startDate)
    errors.push({ field: '공사 시작일', msg: '공사 시작일을 선택해주세요.' })
  if (!projectMeta.value.endDate)
    errors.push({ field: '공사 종료일', msg: '공사 종료일을 선택해주세요.' })
  if (!projectMeta.value.manager.trim())
    errors.push({ field: '현장 총책임자', msg: '현장 총책임자를 입력해주세요.' })

  // 날짜 논리 검사
  if (
    projectMeta.value.startDate &&
    projectMeta.value.endDate &&
    projectMeta.value.startDate >= projectMeta.value.endDate
  ) {
    errors.push({ field: '공사 기간', msg: '공사 종료일은 시작일보다 늦어야 합니다.' })
  }

  // 파일 업로드 검사
  // ※ 테스트 단계: 마스터 공정표만 등록되어 있으면 미리보기 진행 가능.
  //   다른 3종(마일스톤/공종별/보할)은 본 운영 시 필수로 전환 예정.
  if (!uploads.value.master.fileName)
    errors.push({ field: '마스터 공정표', msg: '마스터 공정표 파일을 업로드해주세요.' })
  if (uploads.value.master.status === 'error')
    errors.push({
      field: '마스터 공정표',
      msg: uploads.value.master.error || '마스터 공정표 분석에 실패했습니다. 다시 분석해주세요.',
    })
  if (['uploading', 'analyzing'].includes(uploads.value.master.status))
    errors.push({ field: '마스터 공정표', msg: '마스터 공정표 분석이 끝난 뒤 다시 시도해주세요.' })

  if (errors.length > 0) {
    validationErrors.value = errors
    validationModal.value = true
    return
  }

  // AI 분석이 완료되지 않은 파일이 있으면 먼저 분석 실행
  const needsAnalysis = DOC_TYPES.some(
    (dt) => uploads.value[dt.key].fileName && uploads.value[dt.key].status === 'idle',
  )
  if (needsAnalysis) {
    runAllAnalysis()
    // 분석 완료 후 모달 열기 (polling)
    const checkDone = setInterval(() => {
      const allComplete = DOC_TYPES.filter((dt) => uploads.value[dt.key].fileName).every(
        (dt) => uploads.value[dt.key].status === 'done',
      )
      if (allComplete) {
        clearInterval(checkDone)
        openGanttPreviewFromResults()
      }
    }, 500)
    return
  }

  // 이미 분석 완료된 경우 바로 모달 오픈
  openGanttPreviewFromResults()
}

// =====================================================
// 간트차트 미리보기 모달 - 분석 결과 기반 데이터
// =====================================================
// 분석 결과(uploads.value.{key}.result.rows)를 모아서 변환.
// 미리보기 모달이 열릴 때 한 번 로드한 뒤,
// 사용자가 모달 안에서 수정한 내용은 ganttTasks/ganttMilestones에 직접 반영된다.
const ganttTasks = ref([])
const ganttMilestones = ref([])
const ganttProjectInfo = ref(null)

// 확정 시 일괄 저장 진행 중 플래그
const savingChanges = ref(false)
const saveError = ref('')

/**
 * 미리보기 모달 열기 직전에 호출.
 * 각 분석 결과의 rows 를 모아 간트 데이터로 매핑한다.
 */
function rebuildGanttFromResults() {
  const buckets = {}
  for (const dt of DOC_TYPES) {
    const rows = uploads.value[dt.key]?.result?.rows
    if (Array.isArray(rows)) buckets[dt.key] = rows
  }
  const { tasks, milestones, projectInfo } = buildGanttData(buckets)
  ganttTasks.value = tasks
  ganttMilestones.value = milestones
  ganttProjectInfo.value = projectInfo
}

function openGanttPreviewFromResults() {
  rebuildGanttFromResults()
  if (!ganttTasks.value.length) {
    validationErrors.value = [
      {
        field: 'AI 추출 결과',
        msg: '마스터 공정표에서 공정 항목을 찾지 못했습니다. 파일 내용을 확인하거나 다시 분석해주세요.',
      },
    ]
    validationModal.value = true
    return false
  }
  ganttPreviewModal.value = true
  return true
}

async function confirmAndNavigate() {
  saveError.value = ''

  // 1) 변경된 항목만 추출
  const dirty = ganttTasks.value.filter(isTaskDirty)

  if (dirty.length > 0) {
    savingChanges.value = true
    try {
      // 백엔드 단건 PUT을 병렬로 호출.
      // 일부 실패해도 나머지는 저장 — Promise.allSettled 사용.
      const results = await Promise.allSettled(
        dirty.map((t) => updateTradeProcess(t.id, taskToReqBody(t))),
      )
      const failed = results
        .map((r, i) => ({ r, t: dirty[i] }))
        .filter(({ r }) => r.status === 'rejected')

      if (failed.length > 0) {
        const names = failed
          .map(({ t }) => t.name)
          .slice(0, 3)
          .join(', ')
        saveError.value =
          `${failed.length}건 저장에 실패했습니다 (${names}${failed.length > 3 ? ' 외' : ''}). ` +
          `다시 시도해주세요.`
        savingChanges.value = false
        return
      }

      // 저장 성공한 항목들은 _src를 현재 값으로 갱신 → dirty 상태 해제
      for (const t of dirty) {
        if (t._src) {
          t._src.tradeName = t.group
          t._src.processName = t.name
          t._src.plannedStart = t.start
          t._src.plannedEnd = t.end
          t._src.weightPct = t.weight
          // isMilestone 은 task 가 마일스톤이 아님이 보장되므로 그대로 두거나 false 유지
        }
      }
    } catch (e) {
      saveError.value = e?.message || '변경 사항 저장 중 오류가 발생했습니다.'
      savingChanges.value = false
      return
    }
    savingChanges.value = false
  }

  // 2) store에 데이터 저장
  //    mapper 가 만든 projectInfo 베이스 위에 사용자 입력 값을 얹는다.
  const projectInfoForStore = {
    ...(ganttProjectInfo.value ?? {}),
    siteName: projectMeta.value.siteName,
    projectName: projectMeta.value.siteName || ganttProjectInfo.value?.projectName || '공정표',
    location: projectMeta.value.location,
    finalApprover: projectMeta.value.manager,
    // 사용자가 입력한 공사 기간이 있으면 우선 사용
    startDate: projectMeta.value.startDate || ganttProjectInfo.value?.startDate,
    endDate: projectMeta.value.endDate || ganttProjectInfo.value?.endDate,
    status: '확정',
    lastModified: new Date().toISOString().slice(0, 10),
  }
  ganttStore.setData(ganttTasks.value, ganttMilestones.value, projectInfoForStore)

  // 3) 라우팅
  ganttPreviewModal.value = false
  authStore.markInitialUploadComplete()
  router.push({ path: '/site/schedule', query: { projectId: String(activeProjectId.value) } })
}
</script>

<template>
  <div class="flex flex-col gap-5 pb-8">
    <!-- ============================================================ -->
    <!-- 상단: 페이지 헤더 + 단계 표시                                   -->
    <!-- ============================================================ -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[11px] font-bold uppercase tracking-widest text-flare-600">일정 관리</p>
        <h1 class="text-xl font-bold text-forena-900">최초 공정표 문서 등록</h1>
        <p class="mt-1 text-xs text-forena-500">
          마스터 공정표를 기준으로 공종, 세부 작업, 보할, 기준 일정을 추출해 전체 공정표를
          생성합니다.
        </p>
      </div>

      <!-- 단계 표시 -->
      <div class="flex items-center gap-1.5">
        <div
          v-for="(step, i) in ['문서 등록', 'AI 분석', '검토 확인']"
          :key="i"
          class="flex items-center gap-1.5"
        >
          <div
            class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold"
            :class="
              currentStep === i + 1
                ? 'bg-forena-800 text-white'
                : currentStep > i + 1
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-forena-50 text-forena-400'
            "
          >
            <CheckCircle2 v-if="currentStep > i + 1" class="h-3 w-3" />
            <span
              v-else
              class="h-4 w-4 flex items-center justify-center rounded-full text-[9px]"
              :class="currentStep === i + 1 ? 'bg-white/20' : 'bg-forena-200 text-forena-500'"
            >
              {{ i + 1 }}
            </span>
            {{ step }}
          </div>
          <ChevronRight v-if="i < 2" class="h-3.5 w-3.5 text-forena-300" />
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- 안내 박스                                                      -->
    <!-- ============================================================ -->
    <div
      class="overflow-hidden rounded-2xl border border-forena-100/90 bg-white/95 p-5 shadow-card"
    >
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-flare-50">
          <Info class="h-5 w-5 text-flare-600" />
        </div>
        <div>
          <p class="text-sm font-bold text-forena-900 mb-1">공정표 문서 등록 안내</p>
          <div class="text-[11px] leading-relaxed text-forena-600 space-y-1">
            <p>
              ① <strong>프로젝트 기본 정보</strong>(현장명, 공사 위치, 공사 기간, 책임자)를 먼저
              입력해주세요.
            </p>
            <p>
              ② <strong>마스터 공정표</strong>만 필수입니다. 마스터 공정표에서 공종, 공정명, 보할,
              기준 일정, 세부 작업을 추출합니다.
            </p>
            <p>
              ③ 마일스톤은 마스터 공정표의 MileStone 행에서 분리하고, 보할은 마스터 공정표의 보할
              값을 기준으로 반영합니다.
            </p>
            <p>
              ④ <strong>AI 공정표 생성하기</strong>를 누른 뒤 미리보기에서 내용을 확인하고
              <strong>공정표 확정하기</strong>를 진행합니다.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- 프로젝트 기본 정보 + 문서 선택 + 등록 현황                         -->
    <!-- ============================================================ -->
    <div class="grid gap-4 xl:grid-cols-[minmax(520px,1fr)_minmax(360px,0.72fr)_minmax(520px,1fr)]">
      <!-- 프로젝트 기본 정보 -->
      <div class="overflow-hidden rounded-2xl border border-forena-100/90 bg-white/95 shadow-card">
        <div class="flex items-center gap-2 border-b border-forena-100 px-5 py-3">
          <BarChart3 class="h-4 w-4 text-flare-600" />
          <h2 class="text-sm font-bold text-forena-900">프로젝트 기본 정보</h2>
          <span class="ml-1 text-[11px] text-forena-400">필수 항목을 모두 입력해주세요</span>
          <span v-if="projectMetaLoading" class="ml-auto text-[11px] font-semibold text-forena-500">
            현장 정보 불러오는 중
          </span>
          <span
            v-else-if="projectMetaError"
            class="ml-auto text-[11px] font-semibold text-rose-500"
          >
            {{ projectMetaError }}
          </span>
        </div>
        <div class="grid gap-3 p-5 pt-4 sm:grid-cols-2 2xl:grid-cols-3">
          <!-- 현장명 -->
          <div>
            <label class="text-[10px] font-bold uppercase text-forena-400">
              현장명 <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="projectMeta.siteName"
              type="text"
              placeholder="예) 강남 복합개발 1공구"
              :class="[
                'mt-1 w-full rounded-lg border px-2.5 py-2 text-xs text-forena-800 outline-none transition',
                !projectMeta.siteName.trim()
                  ? 'border-forena-200 focus:border-flare-400'
                  : 'border-emerald-300 bg-emerald-50/30 focus:border-emerald-400',
              ]"
            />
          </div>
          <!-- 공사 위치 -->
          <div class="sm:col-span-2 2xl:col-span-2">
            <label class="text-[10px] font-bold uppercase text-forena-400">
              공사 위치 <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="projectMeta.location"
              type="text"
              placeholder="예) 서울 강남구 삼성동 123"
              :class="[
                'mt-1 w-full rounded-lg border px-2.5 py-2 text-xs text-forena-800 outline-none transition',
                !projectMeta.location.trim()
                  ? 'border-forena-200 focus:border-flare-400'
                  : 'border-emerald-300 bg-emerald-50/30 focus:border-emerald-400',
              ]"
            />
          </div>
          <!-- 시작일 -->
          <div>
            <label class="text-[10px] font-bold uppercase text-forena-400">
              공사 시작일 <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="projectMeta.startDate"
              type="date"
              :class="[
                'mt-1 w-full rounded-lg border px-2.5 py-2 text-xs text-forena-800 outline-none transition',
                !projectMeta.startDate
                  ? 'border-forena-200 focus:border-flare-400'
                  : 'border-emerald-300 bg-emerald-50/30 focus:border-emerald-400',
              ]"
            />
          </div>
          <!-- 종료일 -->
          <div>
            <label class="text-[10px] font-bold uppercase text-forena-400">
              공사 종료일 <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="projectMeta.endDate"
              type="date"
              :class="[
                'mt-1 w-full rounded-lg border px-2.5 py-2 text-xs text-forena-800 outline-none transition',
                !projectMeta.endDate
                  ? 'border-forena-200 focus:border-flare-400'
                  : 'border-emerald-300 bg-emerald-50/30 focus:border-emerald-400',
              ]"
            />
          </div>
          <!-- 책임자 -->
          <div>
            <label class="text-[10px] font-bold uppercase text-forena-400">
              현장 총책임자 <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="projectMeta.manager"
              type="text"
              placeholder="예) 박현수"
              :class="[
                'mt-1 w-full rounded-lg border px-2.5 py-2 text-xs text-forena-800 outline-none transition',
                !projectMeta.manager.trim()
                  ? 'border-forena-200 focus:border-flare-400'
                  : 'border-emerald-300 bg-emerald-50/30 focus:border-emerald-400',
              ]"
            />
          </div>
        </div>
        <!-- 입력 완료 상태 요약 -->
        <div class="border-t border-forena-100 bg-forena-50/30 px-5 py-3">
          <div class="flex flex-wrap gap-3 text-[11px]">
            <span
              :class="
                projectMeta.siteName &&
                projectMeta.location &&
                projectMeta.startDate &&
                projectMeta.endDate &&
                projectMeta.manager
                  ? 'text-emerald-600 font-bold'
                  : 'text-slate-400'
              "
            >
              <CheckCircle2
                v-if="
                  projectMeta.siteName &&
                  projectMeta.location &&
                  projectMeta.startDate &&
                  projectMeta.endDate &&
                  projectMeta.manager
                "
                class="inline h-3 w-3 mr-0.5"
              />
              {{
                projectMeta.siteName &&
                projectMeta.location &&
                projectMeta.startDate &&
                projectMeta.endDate &&
                projectMeta.manager
                  ? '기본 정보 완료'
                  : '기본 정보 미완료'
              }}
            </span>
          </div>
        </div>
      </div>

      <FirstDocumentUploadCards
        :doc-types="DOC_TYPES"
        :uploads="uploads"
        :color-map="colorMap"
        :get-status-label="getStatusLabel"
        :get-status-class="getStatusClass"
        @drag-over="onDragOver"
        @drop-file="onDrop"
        @file-select="onFileSelect"
        @remove-file="removeFile"
        @run-analysis="runAnalysis"
      />

      <!-- 등록 현황 + 액션 -->
      <div class="overflow-hidden rounded-2xl border border-forena-100/90 bg-white/95 shadow-card">
        <div
          class="flex flex-wrap items-center justify-between gap-3 border-b border-forena-100 px-5 py-3"
        >
          <div class="flex items-center gap-2">
            <BrainCircuit class="h-4 w-4 text-flare-600" />
            <h2 class="text-sm font-bold text-forena-900">등록 현황</h2>
          </div>
        </div>

        <!-- 현황 테이블 -->
        <div class="overflow-x-auto">
          <table class="w-full min-w-[580px] text-xs">
            <thead class="bg-forena-50/60 text-[10px] font-bold uppercase text-forena-500">
              <tr>
                <th class="px-4 py-2 text-left">문서 유형</th>
                <th class="px-4 py-2 text-center">파일명</th>
                <th class="px-4 py-2 text-center">분석 상태</th>
                <th class="px-4 py-2 text-center">AI 신뢰도</th>
                <th class="px-4 py-2 text-center">액션</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-forena-50">
              <tr v-for="dt in DOC_TYPES" :key="dt.key" class="hover:bg-forena-50/30">
                <td class="px-4 py-2.5">
                  <div class="flex items-center gap-2">
                    <FileSpreadsheet
                      v-if="dt.icon === 'spreadsheet'"
                      class="h-3.5 w-3.5"
                      :class="colorMap[dt.color].icon"
                    />
                    <Flag
                      v-else-if="dt.icon === 'flag'"
                      class="h-3.5 w-3.5"
                      :class="colorMap[dt.color].icon"
                    />
                    <Layers v-else class="h-3.5 w-3.5" :class="colorMap[dt.color].icon" />
                    <span class="font-semibold text-forena-800">{{ dt.label }}</span>
                    <!-- 미업로드 경고 표시 (필수 항목만) -->
                    <span
                      v-if="dt.required && !uploads[dt.key].fileName"
                      class="rounded bg-rose-100 px-1 py-0.5 text-[9px] font-bold text-rose-600"
                      >필수</span
                    >
                    <span
                      v-else-if="!dt.required"
                      class="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-500"
                      >선택</span
                    >
                  </div>
                </td>
                <td class="px-4 py-2.5 text-center">
                  <span v-if="uploads[dt.key].fileName" class="text-forena-700 font-medium">{{
                    uploads[dt.key].fileName
                  }}</span>
                  <span v-else class="text-slate-400 italic">{{
                    dt.required ? '미등록' : '선택 미등록'
                  }}</span>
                </td>
                <td class="px-4 py-2.5 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <Loader2
                      v-if="['uploading', 'analyzing'].includes(uploads[dt.key].status)"
                      class="h-3 w-3 animate-spin text-sky-600"
                    />
                    <CheckCircle2
                      v-else-if="uploads[dt.key].status === 'done'"
                      class="h-3 w-3 text-emerald-500"
                    />
                    <FileWarning
                      v-else-if="uploads[dt.key].status === 'error'"
                      class="h-3 w-3 text-rose-500"
                    />
                    <span
                      class="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                      :class="getStatusClass(uploads[dt.key].status)"
                    >
                      {{
                        !dt.required && !uploads[dt.key].fileName
                          ? '선택'
                          : getStatusLabel(uploads[dt.key].status)
                      }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-2.5 text-center tabular-nums font-bold">
                  <span
                    v-if="uploads[dt.key].result"
                    :class="
                      uploads[dt.key].result.confidence >= 90
                        ? 'text-emerald-600'
                        : uploads[dt.key].result.confidence >= 80
                          ? 'text-forena-700'
                          : 'text-amber-600'
                    "
                  >
                    {{ uploads[dt.key].result.confidence }}%
                  </span>
                  <span v-else class="text-slate-300">—</span>
                </td>
                <td class="px-4 py-2.5 text-center">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      v-if="uploads[dt.key].fileName && uploads[dt.key].status === 'idle'"
                      @click="runAnalysis(dt.key)"
                      class="rounded px-2 py-1 text-[10px] font-bold bg-flare-50 text-flare-700 hover:bg-flare-100"
                    >
                      분석 실행
                    </button>
                    <button
                      v-if="uploads[dt.key].status === 'done'"
                      @click="runAnalysis(dt.key)"
                      class="rounded p-1 text-forena-500 hover:bg-forena-100"
                    >
                      <RefreshCw class="h-3.5 w-3.5" />
                    </button>
                    <button
                      v-if="uploads[dt.key].fileName"
                      @click="removeFile(dt.key)"
                      class="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 입력 완료 상태 요약 -->
        <div class="border-t border-forena-100 bg-forena-50/30 px-5 py-3">
          <div class="flex flex-wrap gap-3 text-[11px]">
            <span
              v-for="dt in DOC_TYPES"
              :key="dt.key"
              :class="
                uploads[dt.key].fileName
                  ? 'text-emerald-600 font-bold'
                  : dt.required
                    ? 'text-rose-500 font-semibold'
                    : 'text-slate-400'
              "
            >
              <CheckCircle2 v-if="uploads[dt.key].fileName" class="inline h-3 w-3 mr-0.5" />
              {{
                uploads[dt.key].fileName
                  ? dt.label + ' 등록됨'
                  : dt.required
                    ? dt.label + ' 필수 미등록'
                    : dt.label + ' 선택 미등록'
              }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- 하단 CTA: AI 공정표 생성하기                                    -->
    <!-- ============================================================ -->
    <div
      class="overflow-hidden rounded-2xl border border-forena-100/90 bg-gradient-to-r from-forena-800 to-forena-900 p-5 shadow-card"
    >
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="text-white">
          <p class="text-base font-bold">마스터 공정표로 AI 공정표를 생성해보세요</p>
          <p class="mt-1 text-xs text-forena-300">{{ generationReadyMessage }}</p>
        </div>
        <button
          :disabled="!canStartScheduleGeneration"
          @click="handleReviewClick"
          class="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-forena-900 shadow-md transition hover:bg-forena-50 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
        >
          <CalendarRange class="h-4 w-4 text-flare-600" />
          AI 공정표 생성하기
          <ArrowRight class="h-4 w-4" />
        </button>
      </div>
    </div>

    <FirstDocumentValidationModal
      :show="validationModal"
      :errors="validationErrors"
      @close="validationModal = false"
    />

    <FirstDocumentGanttPreviewModal
      :show="ganttPreviewModal"
      :project-meta="projectMeta"
      :tasks="ganttTasks"
      :milestones="ganttMilestones"
      :project-info="ganttProjectInfo"
      :saving-changes="savingChanges"
      :save-error="saveError"
      @close="ganttPreviewModal = false"
      @confirm="confirmAndNavigate"
    />
  </div>
</template>
