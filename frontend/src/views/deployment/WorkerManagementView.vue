<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search,
  Clock,
  UserCheck,
  LogOut,
  UserX,
  Eye,
  Timer,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Zap,
  History,
} from 'lucide-vue-next'
import {
  employmentKindDisplay,
  displayWorkerTradeLine,
  deriveAttendanceTag,
  attendanceTagBadgeClass,
} from '@/utils/workerUi'
import {
  WORKER_MANAGEMENT_TEXTS,
  jobRankBadgeClass,
  kpiTagCounts,
  localTodayISODate,
  parseISODateLocal,
  employmentBadgeClass,
  mapWorkerResToAttendance,
} from '@/utils/deployment/workerManagementMappers'
import { syncAllSites, fetchWorkerList, seedDemoAttendanceHistory, bulkOverrideAttendance } from '@/api/worker.js'
import { useAuthStore } from '@/stores/authStore.js'

const router = useRouter()
const authStore = useAuthStore()
const isTriggerLoading = ref(false)
const isSeedLoading = ref(false)
const isBulkLoading = ref(false)

const BULK_STATUS_OPTIONS = [
  { label: '미출근', value: 'PENDING' },
  { label: '출근',   value: 'PRESENT' },
  { label: '지각',   value: 'LATE' },
  { label: '조퇴',   value: 'EARLY_LEAVE' },
  { label: '퇴근',   value: 'LEAVE' },
]
const selectedBulkStatus = ref('PRESENT')

const WM = WORKER_MANAGEMENT_TEXTS
const T = WORKER_MANAGEMENT_TEXTS

/** 공종 구분: 서버에서 받은 현장+날짜 기준 전체 공종 목록 */
const tradeFilterOptions = computed(() => {
  const trades = availableTradesFromServer.value
  return [{ value: '', label: '전체 공종' }, ...trades.map((t) => ({ value: t, label: t }))]
})

/** MANAGEMENT_001 동기화 시 서버에 넘기는 현장 코드 — 로그인한 계정의 siteCode 사용 */
const SYNC_SITE_CODE = computed(() => authStore.siteCode)

const filters = ref({
  selectedTrade: '',
})
const searchNameInput = ref('')
let searchNameDebounceTimer = null

// 페이징
const currentPage = ref(0)
const totalPages = ref(0)
const totalElements = ref(0)

// 서버 KPI
const globalKpiData = ref(null)   // 전체 근무자 (필터 무관)
const listKpiData = ref(null)     // 공종+이름 필터 적용 후 전체
const availableTradesFromServer = ref([])

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']

const todayDateDisplay = computed(() => {
  const dt = parseISODateLocal(localTodayISODate())
  if (!dt) return '—'
  const y = dt.getFullYear()
  const m = dt.getMonth() + 1
  const d = dt.getDate()
  const w = WEEKDAY_KO[dt.getDay()]
  return `${y}년 ${m}월 ${d}일 (${w})`
})

/** MANAGEMENT_003 — 현재 페이지 근무자 (50개) */
const attendanceList = ref([])

const ATTENDANCE_STATE_LABELS = ['출근 전', '출근', '지각', '조퇴', '퇴근', '결근']
const EMPLOYMENT_FILTER_LABELS = ['상용', '일용']

const listStatusFilter = ref('')
const listEmploymentFilter = ref('')

/** 상단 KPI 카드 — 전체 근무자 (서버 globalKpi, 필터 무관) */
const kpAttendanceCounts = computed(() => kpiTagCounts(globalKpiData.value))

/** 목록 집계 근태 칩 — 공종+이름 필터 기준 전체 (서버 listKpi) */
const attendanceStateCounts = computed(() => kpiTagCounts(listKpiData.value))

/** 금일 작업자 수 — 필터 적용 후 전체 인원 */
const todayWorkerCount = computed(() => listKpiData.value?.total ?? 0)

/** 상용/일용 표시 필터 (현재 페이지 기준) */
const employmentFilteredRows = computed(() => {
  let rows = attendanceList.value
  const emp = listEmploymentFilter.value
  if (emp === '상용') rows = rows.filter((r) => r.employmentClass === '상용')
  else if (emp === '일용') rows = rows.filter((r) => r.employmentClass === '일용')
  return rows
})

/** 테이블 표시 행 — 현재 페이지에서 고용·근태 클라이언트 필터 적용 */
const filteredAttendance = computed(() => {
  let result = employmentFilteredRows.value
  if (listStatusFilter.value) {
    result = result.filter((r) => deriveAttendanceTag(r) === listStatusFilter.value)
  }
  return result
})

/** 고용 칩 카운트 — 현재 페이지 기준 */
const employmentCounts = computed(() => {
  const rows = attendanceList.value
  let sang = 0, il = 0
  for (const r of rows) {
    if (r.employmentClass === '일용') il++
    else sang++
  }
  return { 상용: sang, 일용: il }
})

function toggleListStatusFilter(state) {
  listStatusFilter.value = listStatusFilter.value === state ? '' : state
}

function toggleListEmploymentFilter(kind) {
  listEmploymentFilter.value = listEmploymentFilter.value === kind ? '' : kind
}

function goWorkerProfile(record, event) {
  event.stopPropagation()
  router.push({ name: 'siteWorkerProfile', params: { id: String(record.id) } })
}

/** MANAGEMENT_003 — 현재 필터+페이지 기준 목록 갱신 */
async function refreshWorkerListFromApi(pageOverride) {
  const pg = pageOverride !== undefined ? pageOverride : currentPage.value
  const listRes = await fetchWorkerList(SYNC_SITE_CODE.value, localTodayISODate(), {
    tradeName: filters.value.selectedTrade || undefined,
    searchName: searchNameInput.value.trim() || undefined,
    page: pg,
    size: 20,
  })
  const rows = listRes?.rows
  if (Array.isArray(rows)) {
    attendanceList.value = rows.map(mapWorkerResToAttendance)
  }
  if (listRes) {
    globalKpiData.value = listRes.globalKpi ?? null
    listKpiData.value = listRes.listKpi ?? null
    availableTradesFromServer.value = listRes.availableTrades ?? []
    currentPage.value = listRes.page ?? 0
    totalPages.value = listRes.totalPages ?? 0
    totalElements.value = listRes.totalElements ?? 0
  }
}

function goToPage(pg) {
  if (pg < 0 || pg >= totalPages.value || pg === currentPage.value) return
  refreshWorkerListFromApi(pg).catch((e) =>
    console.warn('[WorkerManagement] 페이지 이동 실패', e),
  )
}

watch(
  () => filters.value.selectedTrade,
  () => {
    currentPage.value = 0
    listStatusFilter.value = ''
    refreshWorkerListFromApi(0).catch((e) =>
      console.warn('[WorkerManagement] 공종 필터 변경 후 목록 갱신 실패', e),
    )
  },
)

watch(searchNameInput, () => {
  clearTimeout(searchNameDebounceTimer)
  searchNameDebounceTimer = setTimeout(() => {
    currentPage.value = 0
    refreshWorkerListFromApi(0).catch((e) =>
      console.warn('[WorkerManagement] 이름 검색 후 목록 갱신 실패', e),
    )
  }, 300)
})

// ─────────────────────────────────────────────────
// SSE: 출퇴근 실시간 반영
// ─────────────────────────────────────────────────

/** @type {EventSource|null} */
let sseSource = null

function startSseSubscription() {
  if (typeof EventSource === 'undefined') return

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  const siteCode = authStore.siteCode || ''
  const url = `${baseUrl}/management/sse/attendance-stream?siteCode=${encodeURIComponent(siteCode)}`

  sseSource = new EventSource(url, { withCredentials: true })

  sseSource.addEventListener('attendance', (e) => {
    try {
      const payload = JSON.parse(e.data)
      applySseAttendanceEvent(payload)
    } catch (err) {
      console.warn('[SSE] parse error', err)
    }
  })

  sseSource.onerror = () => {
    // 연결 오류 시 자동 재연결은 브라우저가 처리
    console.warn('[SSE] connection error — browser will retry')
  }
}

/**
 * SSE 이벤트로 받은 출퇴근 정보를 현재 페이지 목록에 반영한다.
 * workerIdx 가 일치하는 행만 갱신; 목록에 없으면 무시.
 */
function applySseAttendanceEvent(payload) {
  const { workerIdx, action, time, attendanceStatus } = payload
  if (!workerIdx) return

  const idx = Number(workerIdx)
  const row = attendanceList.value.find((r) => r.id === idx)
  if (!row) return

  if (action === 'CHECK_IN') {
    row.clockIn = time || '-'
    row.attendanceStatus = String(attendanceStatus ?? 'PRESENT').toUpperCase()
  } else if (action === 'CHECK_OUT') {
    row.clockOut = time || '-'
    row.attendanceStatus = String(attendanceStatus ?? 'LEAVE').toUpperCase()
  }
  row.status = deriveStatusLabel(row.attendanceStatus, row.clockIn, row.clockOut)
}

onMounted(() => {
  refreshWorkerListFromApi().catch((e) => console.warn('[WorkerManagement] 초기 목록 로드 실패', e))
  startSseSubscription()
})

onBeforeUnmount(() => {
  if (sseSource) {
    sseSource.close()
    sseSource = null
  }
})

async function onTriggerSync() {
  if (isTriggerLoading.value) return
  isTriggerLoading.value = true
  try {
    const bulkResult = await syncAllSites(localTodayISODate())
    await refreshWorkerListFromApi()
    const lines = (bulkResult.results ?? []).map((r) =>
      r.success
        ? `✓ ${r.siteCode}: 신규 ${r.detail?.created ?? 0}명 · 갱신 ${r.detail?.updated ?? 0}명`
        : `✗ ${r.siteCode}: ${r.errorMessage ?? '실패'}`,
    )
    window.alert(
      `전체 현장 동기화 완료 (${bulkResult.siteCount}개 현장)\n\n${lines.join('\n')}`,
    )
  } catch (err) {
    window.alert(err?.message || '전체 동기화에 실패했습니다.')
  } finally {
    isTriggerLoading.value = false
  }
}

async function onSeedHistory() {
  if (isSeedLoading.value) return
  isSeedLoading.value = true
  try {
    const result = await seedDemoAttendanceHistory(SYNC_SITE_CODE.value)
    await refreshWorkerListFromApi()
    window.alert(
      `이전 출결내역 적용 완료\n근무자 ${result.workers}명 · 출결 로그 ${result.logs ?? result.records ?? 0}건 · 구역배치 이력 ${result.staffingLogs}건 · 사고 이력 ${result.accidents}건\n(근무자별 피로도 점수가 재산정됩니다.)`,
    )
  } catch (err) {
    window.alert(err?.message || '이전 출결내역 불러오기에 실패했습니다.')
  } finally {
    isSeedLoading.value = false
  }
}

async function onBulkOverride() {
  if (isBulkLoading.value) return
  const statusLabel = BULK_STATUS_OPTIONS.find((o) => o.value === selectedBulkStatus.value)?.label ?? selectedBulkStatus.value
  const confirmMsg = `${localTodayISODate()} · ${SYNC_SITE_CODE.value} 현장의\n모든 근무자를 [${statusLabel}] 상태로 일괄 변경합니다.\n계속하시겠습니까?`
  if (!window.confirm(confirmMsg)) return
  isBulkLoading.value = true
  try {
    const result = await bulkOverrideAttendance(SYNC_SITE_CODE.value, localTodayISODate(), selectedBulkStatus.value)
    await refreshWorkerListFromApi()
    window.alert(`일괄 변경 완료: ${result.total}명 → [${statusLabel}]`)
  } catch (err) {
    window.alert(err?.message || '일괄 변경에 실패했습니다.')
  } finally {
    isBulkLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6 pb-10">
    <div class="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <div class="flex items-start gap-3">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-widest text-flare-600">투입 관리</p>
          <h1 class="text-xl font-bold text-forena-900">{{ WM.pageTitle }}</h1>
        </div>
      </div>
      <div class="flex items-center gap-2">
          <!-- 근태 일괄 변경 -->
          <div class="flex items-center gap-1">
            <select
              v-model="selectedBulkStatus"
              class="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-forena-800 focus:outline-none focus:ring-2 focus:ring-flare-300"
            >
              <option v-for="opt in BULK_STATUS_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <button
              type="button"
              :disabled="isBulkLoading"
              class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              @click="onBulkOverride"
            >
              <CircleCheck
                class="h-3.5 w-3.5 shrink-0 text-slate-500"
                :class="{ 'animate-spin': isBulkLoading }"
              />
              {{ isBulkLoading ? WM.bulkOverrideLoading : WM.bulkOverride }}
            </button>
          </div>
          <!-- 개발용 동기화 버튼 — 운영 화면에서는 숨김 -->
          <template v-if="false">
          <button
            type="button"
            :disabled="isSeedLoading"
            class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            @click="onSeedHistory"
          >
            <History
              class="h-3.5 w-3.5 shrink-0 text-emerald-600"
              :class="{ 'animate-spin': isSeedLoading }"
            />
            {{ isSeedLoading ? WM.seedHistoryLoading : WM.seedHistory }}
          </button>
          <button
            type="button"
            :disabled="isTriggerLoading"
            class="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
            @click="onTriggerSync"
          >
            <Zap
              class="h-3.5 w-3.5 shrink-0 text-violet-600"
              :class="{ 'animate-pulse': isTriggerLoading }"
            />
            {{ isTriggerLoading ? WM.triggerSyncLoading : WM.triggerSync }}
          </button>
          </template>
      </div>
    </div>

    <div>
      <div class="mb-3">
        <h2 class="text-sm font-bold text-forena-900">{{ WM.sectionAttendance }}</h2>
      </div>

      <div class="space-y-6">
        <!-- KPI: 출근 전 / 출근 / 지각 / 조퇴 / 퇴근 / 결근 -->
        <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <div
            class="rounded-2xl border border-violet-100/90 bg-gradient-to-br from-violet-50/35 to-white p-4 shadow-card ring-1 ring-violet-100/60"
          >
            <p class="text-[11px] font-bold uppercase tracking-wider text-violet-800/90">출근 전</p>
            <div class="mt-2 flex items-end gap-2">
              <span class="text-3xl font-bold tabular-nums text-forena-900">{{
                kpAttendanceCounts['출근 전']
              }}</span>
              <span class="mb-1 text-sm font-medium text-slate-500">{{ T.countPeople }}</span>
              <Timer class="mb-1 h-5 w-5 text-violet-600" />
            </div>
          </div>
          <div
            class="rounded-2xl border border-emerald-100/90 bg-gradient-to-br from-emerald-50/35 to-white p-4 shadow-card ring-1 ring-emerald-100/60"
          >
            <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-800/90">출근</p>
            <div class="mt-2 flex items-end gap-2">
              <span class="text-3xl font-bold tabular-nums text-forena-900">{{
                kpAttendanceCounts['출근']
              }}</span>
              <span class="mb-1 text-sm font-medium text-slate-500">{{ T.countPeople }}</span>
              <UserCheck class="mb-1 h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div
            class="rounded-2xl border border-amber-100/90 bg-gradient-to-br from-amber-50/35 to-white p-4 shadow-card ring-1 ring-amber-100/60"
          >
            <p class="text-[11px] font-bold uppercase tracking-wider text-amber-800/90">지각</p>
            <div class="mt-2 flex items-end gap-2">
              <span class="text-3xl font-bold tabular-nums text-forena-900">{{
                kpAttendanceCounts['지각']
              }}</span>
              <span class="mb-1 text-sm font-medium text-slate-500">{{ T.countPeople }}</span>
              <Clock class="mb-1 h-5 w-5 text-amber-600" />
            </div>
          </div>
          <div
            class="rounded-2xl border border-rose-100/90 bg-gradient-to-br from-rose-50/35 to-white p-4 shadow-card ring-1 ring-rose-100/60"
          >
            <p class="text-[11px] font-bold uppercase tracking-wider text-rose-800/90">조퇴</p>
            <div class="mt-2 flex items-end gap-2">
              <span class="text-3xl font-bold tabular-nums text-forena-900">{{
                kpAttendanceCounts['조퇴']
              }}</span>
              <span class="mb-1 text-sm font-medium text-slate-500">{{ T.countPeople }}</span>
              <LogOut class="mb-1 h-5 w-5 text-rose-600" />
            </div>
          </div>
          <div
            class="rounded-2xl border border-sky-100/90 bg-gradient-to-br from-sky-50/35 to-white p-4 shadow-card ring-1 ring-sky-100/60"
          >
            <p class="text-[11px] font-bold uppercase tracking-wider text-sky-800/90">퇴근</p>
            <div class="mt-2 flex items-end gap-2">
              <span class="text-3xl font-bold tabular-nums text-forena-900">{{
                kpAttendanceCounts['퇴근']
              }}</span>
              <span class="mb-1 text-sm font-medium text-slate-500">{{ T.countPeople }}</span>
              <CircleCheck class="mb-1 h-5 w-5 text-sky-600" />
            </div>
          </div>
          <div
            class="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/80 to-white p-4 shadow-card ring-1 ring-slate-200/70"
          >
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-600">결근</p>
            <div class="mt-2 flex items-end gap-2">
              <span class="text-3xl font-bold tabular-nums text-forena-900">{{
                kpAttendanceCounts['결근']
              }}</span>
              <span class="mb-1 text-sm font-medium text-slate-500">{{ T.countPeople }}</span>
              <UserX class="mb-1 h-5 w-5 text-slate-500" />
            </div>
          </div>
        </div>

        <div
          class="rounded-2xl border border-forena-100/90 bg-white/90 p-5 shadow-card backdrop-blur-sm"
        >
          <div class="border-b border-forena-100 pb-5 text-center">
            <p class="text-lg font-bold tabular-nums text-forena-900 sm:text-xl">
              {{ todayDateDisplay }}
            </p>
          </div>
          <div class="mt-5 flex flex-wrap items-end gap-4">
            <div>
              <label class="mb-1.5 block text-[11px] font-bold text-forena-500">{{
                T.filterAffil
              }}</label>
              <select
                v-model="filters.selectedTrade"
                class="min-w-[11rem] rounded-xl border border-forena-200 bg-white px-3 py-2.5 text-sm text-forena-900 outline-none transition focus:border-flare-400 focus:ring-2 focus:ring-flare-400/20"
              >
                <option
                  v-for="opt in tradeFilterOptions"
                  :key="opt.value || 'all'"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="relative min-w-[200px] flex-1">
              <label class="mb-1.5 block text-[11px] font-bold text-forena-500">{{
                T.filterSearch
              }}</label>
              <Search
                class="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-flare-500/80"
                aria-hidden="true"
              />
              <input
                v-model="searchNameInput"
                type="text"
                :placeholder="T.filterSearchPh"
                class="w-full rounded-xl border border-forena-200 bg-white py-2.5 pr-4 pl-9 text-sm text-forena-900 outline-none transition placeholder:text-slate-400 focus:border-flare-400 focus:ring-2 focus:ring-flare-400/20"
              />
            </div>
          </div>
        </div>

        <div
          class="flex flex-col overflow-hidden rounded-2xl border border-forena-100/90 bg-white/95 shadow-card"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-forena-100 bg-forena-50/55 px-4 py-3 text-xs text-forena-700 sm:px-6 sm:text-sm"
          >
            <div class="flex flex-wrap items-baseline gap-2">
              <span class="font-bold text-forena-900">{{ T.listFilteredStats }}</span>
              <span class="tabular-nums text-forena-600">
                {{ T.todayWorkerTotal }}
                <strong class="font-bold text-forena-900">{{ todayWorkerCount }}</strong
                >{{ T.countPeople }}
              </span>
              <span v-if="totalPages > 1" class="text-[11px] text-forena-400 tabular-nums">
                ({{ currentPage + 1 }}&nbsp;/&nbsp;{{ totalPages }}&nbsp;페이지)
              </span>
            </div>
            <div
              class="flex w-full flex-wrap items-center justify-end gap-x-2 gap-y-1.5 sm:w-auto lg:max-w-[75%]"
            >
              <span class="text-[10px] font-bold uppercase tracking-wide text-forena-400">{{
                T.employmentFilterHint
              }}</span>
              <button
                v-for="ek in EMPLOYMENT_FILTER_LABELS"
                :key="ek"
                type="button"
                class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
                :class="
                  listEmploymentFilter === ek
                    ? 'border-sky-600 bg-sky-50 text-sky-950 shadow-sm ring-1 ring-sky-200/90'
                    : 'border-forena-200/90 bg-white/90 text-forena-700 hover:border-sky-300 hover:bg-white'
                "
                @click="toggleListEmploymentFilter(ek)"
              >
                {{ ek }}
                <span class="tabular-nums font-semibold text-forena-600/90">{{
                  employmentCounts[ek]
                }}</span>
              </button>
              <span
                class="mx-0.5 hidden h-4 w-px shrink-0 bg-forena-200 sm:inline-block"
                aria-hidden="true"
              />
              <span class="text-[10px] font-bold uppercase tracking-wide text-forena-400">{{
                T.attendanceFilterHint
              }}</span>
              <button
                v-for="st in ATTENDANCE_STATE_LABELS"
                :key="st"
                type="button"
                class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-flare-400/50"
                :class="
                  listStatusFilter === st
                    ? 'border-forena-600 bg-white text-forena-900 shadow-sm ring-1 ring-forena-200/80'
                    : 'border-forena-200/90 bg-white/90 text-forena-700 hover:border-forena-300 hover:bg-white'
                "
                @click="toggleListStatusFilter(st)"
              >
                {{ st }}
                <span class="tabular-nums font-semibold text-forena-600/90">{{
                  attendanceStateCounts[st]
                }}</span>
              </button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[980px] text-left text-sm whitespace-nowrap">
              <thead
                class="border-b border-forena-100 bg-forena-50/60 text-[11px] font-bold uppercase tracking-wider text-forena-500"
              >
                <tr>
                  <th class="px-6 py-4 font-semibold">{{ T.colContact }}</th>
                  <th class="px-6 py-4 font-semibold">{{ T.colTrade }}</th>
                  <th class="px-6 py-4 font-semibold">{{ T.colEmployment }}</th>
                  <th class="px-6 py-4 font-semibold">{{ T.colRank }}</th>
                  <th class="px-6 py-4 font-semibold">{{ T.colTime }}</th>
                  <th class="px-6 py-4 text-center font-semibold">{{ T.colStatus }}</th>
                  <th class="px-6 py-4 text-center font-semibold">{{ T.colDetail }}</th>
                </tr>
              </thead>
              <tbody class="text-forena-800">
                <tr v-if="filteredAttendance.length === 0">
                  <td colspan="7" class="px-6 py-14 text-center text-sm text-slate-400">
                    {{ T.empty }}
                  </td>
                </tr>
                <tr
                  v-else
                  v-for="record in filteredAttendance"
                  :key="record.id"
                  class="border-b border-forena-50 transition hover:bg-flare-50/40"
                >
                  <td class="px-6 py-4">
                    <div class="font-semibold text-forena-900">{{ record.name }}</div>
                    <div class="text-[11px] text-slate-500">{{ record.phone }}</div>
                  </td>
                  <td class="px-6 py-4 text-xs font-semibold text-forena-800">
                    {{ record.affiliationSubLabel }}
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold"
                      :class="employmentBadgeClass(record.employmentClass)"
                    >
                      {{ record.employmentClass }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold"
                      :class="jobRankBadgeClass(record.jobRank)"
                    >
                      {{ record.jobRank }}
                    </span>
                  </td>
                  <td class="px-6 py-4 font-mono text-xs">
                    <span class="font-semibold text-flare-700">{{ record.clockIn }}</span>
                    <span class="text-slate-400"> — </span>
                    <span class="text-slate-600">{{ record.clockOut }}</span>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span
                      class="inline-flex rounded-lg px-2.5 py-1 text-[10px] font-bold"
                      :class="attendanceTagBadgeClass(deriveAttendanceTag(record))"
                      >{{ deriveAttendanceTag(record) }}</span
                    >
                  </td>
                  <td class="px-6 py-4 text-center">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 rounded-lg border border-forena-200 bg-white px-3 py-1.5 text-[11px] font-bold text-forena-700 shadow-sm transition hover:border-flare-300 hover:bg-flare-50/50"
                      :title="T.colDetail"
                      @click="(e) => goWorkerProfile(record, e)"
                    >
                      <Eye class="h-3.5 w-3.5" />
                      {{ T.colDetail }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- 페이지네이션 -->
          <div
            v-if="totalPages > 1"
            class="flex items-center justify-center gap-3 border-t border-forena-100 px-4 py-3"
          >
            <button
              type="button"
              :disabled="currentPage === 0"
              class="inline-flex items-center justify-center rounded-lg p-1.5 text-forena-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              @click="goToPage(currentPage - 1)"
            >
              <ChevronLeft class="h-4 w-4" />
            </button>
            <span class="text-xs font-semibold tabular-nums text-forena-700">
              {{ currentPage + 1 }} / {{ totalPages }}
              <span class="font-normal text-forena-400">({{ totalElements }}명)</span>
            </span>
            <button
              type="button"
              :disabled="currentPage >= totalPages - 1"
              class="inline-flex items-center justify-center rounded-lg p-1.5 text-forena-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              @click="goToPage(currentPage + 1)"
            >
              <ChevronRight class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
