<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  ClipboardList,
  MapPin,
  AlertTriangle,
  ShieldAlert,
  Download,
  Loader2,
  X,
  Eye,
} from 'lucide-vue-next'
import {
  fetchWorkerProfile,
  fetchWorkerDocs,
  fetchWorkerAttendance,
  fetchWorkerDeployments,
  fetchWorkerAccidents,
} from '@/api/worker.js'
import {
  employmentKindDisplay,
  deriveAttendanceTag,
  attendanceTagBadgeClass,
} from '@/utils/workerUi'
import {
  buildWorkerProfile,
  formatManDaysSum,
  formatSanctionSummary,
  jobRankBadgeClass,
  localTodayISODate,
  mapAttendanceRow,
  normalizeApiDate,
  sanitizeFilename,
  unwrapWorkerDetailPayload,
} from '@/utils/deployment/workerProfileMappers'
import FatigueCriteriaModal from '@/components/deployment/worker/FatigueCriteriaModal.vue'

const T = {
  title: '근무자 상세 프로필',
  loading: '불러오는 중…',
  contact: '연락처',
  emergencyPhone: '비상 연락망',
  emergencyRelation: '관계',
  todayAttendance: '금일 근태',
  employmentKind: '고용형태',
  blood: '혈액형',
  registered: '최초 등록일',
  fatigueScore: '피로도 점수',
  fatigueCriteriaAriaLabel: '피로도 산정 기준 보기',
  fatigueModalTitle: '피로도 산정 항목',
  fatigueModalColItem: '항목',
  fatigueModalColPoints: '부여 점수',
  fatigueModalColRule: '산정 기준',
  fatigueModalFooterNote:
    '표의 「부여 점수」는 해당 작업자에게 적용된 항목별 점수입니다. 총점은 항목 합에 상한 100을 적용하며, 80점 이상은 고위험으로 표시됩니다.',
  fatigueModalClose: '닫기',
  fatigueHighRiskBadge: '고위험 (80점 이상)',
  fatigueCalcAt: '마지막 산정',
  tabDocs: '안전 및 서류 현황',
  tabAttendance: '최근 출결 이력',
  tabZone: '구역 배치 이력',
  tabSanction: '제재·주의 이력',
  tabAccident: '안전 사고 이력',
  docsSection: '안전교육 및 필수 서류',
  docBtnDownload: '다운로드',
  docNoFileUrl: '파일 주소 없음',
  colDate: '일자',
  colDateTime: '일자/시간',
  colClock: '출·퇴근',
  colMan: '공수',
  colSite: '현장',
  colZone: '구역',
  colNote: '비고',
  colType: '구분',
  colDesc: '내용',
  colResolution: '조치',
  emptySanction: '등록된 이력이 없습니다.',
  emptyAccident: '등록된 사고 이력이 없습니다.',
  notFound: '작업자를 찾을 수 없습니다.',
  backList: '목록으로',
  monthAcc: '조회 월 누적',
  manUnit: '공수',
  calPrevMonth: '이전 달',
  calNextMonth: '다음 달',
}

const weekDayLabels = ['일', '월', '화', '수', '목', '금', '토']

const route = useRoute()
const router = useRouter()

const profile = ref(null)
const loading = ref(false)
const fatigueCriteriaModalOpen = ref(false)

function openFatigueCriteriaModal() {
  fatigueCriteriaModalOpen.value = true
}

function closeFatigueCriteriaModal() {
  fatigueCriteriaModalOpen.value = false
}
/** MANAGEMENT_004~009 로드 후 유지 — 출결 월 변경 시에만 attendance 재조회 */
const activeWorkerIdx = ref(null)
let suppressAttendanceMonthWatch = false

async function loadAttendanceMonth(workerIdx, y, m) {
  const ym = `${y}-${String(m).padStart(2, '0')}`
  const att = await fetchWorkerAttendance(workerIdx, ym)
  return Array.isArray(att) ? att.map(mapAttendanceRow) : []
}

/** 상세 API 가 작업자 필드를 한 단 더 감싸 돌려주는 경우 */
async function loadWorkerFromApi(workerIdx) {
  loading.value = true
  suppressAttendanceMonthWatch = true
  try {
    const [rawP, docs, dep] = await Promise.all([
      fetchWorkerProfile(workerIdx),
      fetchWorkerDocs(workerIdx),
      fetchWorkerDeployments(workerIdx),
    ])
    const p = unwrapWorkerDetailPayload(rawP)
    let accidents = []
    try {
      const raw = await fetchWorkerAccidents(workerIdx)
      accidents = Array.isArray(raw) ? raw : []
    } catch {
      accidents = []
    }
    const att = await loadAttendanceMonth(
      workerIdx,
      attendanceCalYear.value,
      attendanceCalMonth.value,
    )
    profile.value = buildWorkerProfile(p, docs, dep, att, accidents)
    activeWorkerIdx.value = workerIdx
  } catch (e) {
    console.warn('[WorkerProfile] 상세 로드 실패', e)
    profile.value = null
    activeWorkerIdx.value = null
  } finally {
    loading.value = false
    suppressAttendanceMonthWatch = false
  }
}

watch(
  () => route.params.id,
  (id) => {
    if (id == null || id === '') {
      profile.value = null
      activeWorkerIdx.value = null
      return
    }
    const n = Number(id)
    if (Number.isNaN(n)) {
      profile.value = null
      activeWorkerIdx.value = null
      return
    }
    loadWorkerFromApi(n)
  },
  { immediate: true },
)

const attendanceCalYear = ref(new Date().getFullYear())
const attendanceCalMonth = ref(new Date().getMonth() + 1)

watch(
  () => profile.value,
  async (p) => {
    if (!p?.attendanceRows?.length) return
    const dates = p.attendanceRows.map((r) => r.date).sort()
    const last = dates[dates.length - 1]
    const m = last && String(last).match(/^(\d{4})-(\d{2})/)
    if (m) {
      suppressAttendanceMonthWatch = true
      attendanceCalYear.value = Number(m[1])
      attendanceCalMonth.value = Number(m[2])
      await nextTick()
      suppressAttendanceMonthWatch = false
    }
  },
  { immediate: true },
)

watch([attendanceCalYear, attendanceCalMonth], async () => {
  if (suppressAttendanceMonthWatch) return
  const wid = activeWorkerIdx.value
  if (wid == null || profile.value == null) return
  try {
    const rows = await loadAttendanceMonth(wid, attendanceCalYear.value, attendanceCalMonth.value)
    profile.value = { ...profile.value, attendanceRows: rows }
  } catch (e) {
    console.warn('[WorkerProfile] 출결 월 갱신 실패', e)
  }
})

/** 출결 캘린더 조회 월 — 해당 월 일별 행의 공수 합 */
const attendanceMonthManSum = computed(() => {
  const rows = profile.value?.attendanceRows
  if (!Array.isArray(rows) || rows.length === 0) return 0
  const y = attendanceCalYear.value
  const mo = attendanceCalMonth.value
  const prefix = `${y}-${String(mo).padStart(2, '0')}`
  return rows.reduce((acc, r) => {
    const d = r.date != null ? String(r.date) : ''
    if (d.length < 7 || !d.startsWith(prefix)) return acc
    const v = Number(r.manDays)
    return acc + (Number.isFinite(v) ? v : 0)
  }, 0)
})

const attendanceByDate = computed(() => {
  const p = profile.value
  if (!p?.attendanceRows?.length) return {}
  const o = {}
  for (const r of p.attendanceRows) {
    o[r.date] = r
  }
  return o
})

const attendanceCalendarWeeks = computed(() => {
  const y = attendanceCalYear.value
  const m = attendanceCalMonth.value
  const mi = m - 1
  const first = new Date(y, mi, 1)
  const lastDay = new Date(y, mi + 1, 0).getDate()
  const pad = first.getDay()
  const map = attendanceByDate.value
  const pad2 = (n) => String(n).padStart(2, '0')
  const dateKey = (d) => `${y}-${pad2(m)}-${pad2(d)}`
  const weeks = []
  let week = []
  for (let i = 0; i < pad; i++) week.push({ kind: 'pad' })
  for (let d = 1; d <= lastDay; d++) {
    const dk = dateKey(d)
    week.push({ kind: 'day', day: d, dateKey: dk, row: map[dk] ?? null })
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  while (week.length > 0 && week.length < 7) week.push({ kind: 'pad' })
  if (week.length) weeks.push(week)
  return weeks
})

function shiftAttendanceMonth(delta) {
  let y = attendanceCalYear.value
  let mo = attendanceCalMonth.value + delta
  while (mo > 12) {
    mo -= 12
    y += 1
  }
  while (mo < 1) {
    mo += 12
    y -= 1
  }
  attendanceCalYear.value = y
  attendanceCalMonth.value = mo
}

function zoneForAttendanceDay(dateKey, row) {
  const p = profile.value
  if (!p) return '—'
  if (row?.zone) return row.zone
  const z = p.zoneHistory?.find((h) => h.date === dateKey)
  return z?.zone ?? '—'
}

function goBack() {
  router.push({ name: 'siteWorkerManagement' })
}

async function downloadDocument(doc) {
  const url = doc.fileUrl != null ? String(doc.fileUrl).trim() : ''
  if (!url) return
  const name = doc.storedFileName || `${sanitizeFilename(doc.title)}.pdf`
  if (url.startsWith('blob:')) {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return
  }
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('fetch failed')
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, '_blank', 'noopener')
  }
}

const avatarLetter = computed(() => {
  const n = profile.value?.name
  return n ? n.charAt(0) : '?'
})

/** 프로필 카드 — 조회 중인 출결 월에 금일 행이 있으면 근태 태그 */
const todayAttendanceChip = computed(() => {
  const p = profile.value
  const mutedCls = 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/90'
  if (!p?.attendanceRows?.length) return { tag: '당월 미조회', cls: mutedCls }
  const key = localTodayISODate()
  const row = p.attendanceRows.find((r) => r.date === key)
  if (!row) return { tag: '금일 기록 없음', cls: mutedCls }
  const tag = deriveAttendanceTag({
    attendanceStatus: row.attendanceStatus,
    clockIn: row.clockIn,
    clockOut: row.clockOut,
    status: '',
  })
  return { tag, cls: attendanceTagBadgeClass(tag) }
})
</script>

<template>
  <div
    v-if="loading"
    class="rounded-2xl border border-forena-100/90 bg-white/95 p-16 text-center shadow-card"
  >
    <Loader2 class="mx-auto h-8 w-8 animate-spin text-flare-600" aria-hidden="true" />
    <p class="mt-4 text-sm font-semibold text-forena-700">{{ T.loading }}</p>
  </div>

  <div v-else-if="profile" class="space-y-6 pb-10">
    <div class="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-widest text-flare-600">투입 관리</p>
        <h1 class="truncate text-xl font-bold text-forena-900 md:text-2xl">{{ T.title }}</h1>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-flare-200 bg-flare-50 px-3 py-1.5 text-xs font-semibold text-forena-800 transition hover:bg-flare-100"
          :aria-label="T.backList"
          @click="goBack"
        >
          <ChevronLeft class="h-3.5 w-3.5" />
          {{ T.backList }}
        </button>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-12 lg:items-start">
      <aside class="space-y-6 lg:col-span-4">
        <div
          class="overflow-hidden rounded-2xl border border-forena-100/90 bg-white/95 p-6 shadow-card"
        >
          <div class="flex flex-col items-center text-center">
            <div
              class="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-forena-600 to-forena-900 text-3xl font-bold text-white shadow-lg ring-4 ring-flare-200/40"
            >
              {{ avatarLetter }}
            </div>
            <div class="mt-4 flex items-center justify-center gap-2">
              <span
                class="inline-flex rounded-lg px-2.5 py-1 text-[10px] font-bold"
                :class="jobRankBadgeClass(profile.jobRank)"
              >{{ profile.jobRank }}</span>
              <h2 class="text-lg font-bold text-forena-900">{{ profile.name }}</h2>
            </div>
            <p class="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
              {{ profile.metaAffiliationLine }}
            </p>
            <div class="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span class="text-[11px] font-semibold text-slate-500">{{ T.todayAttendance }}</span>
              <span
                class="inline-flex rounded-full px-3 py-1 text-[11px] font-bold"
                :class="todayAttendanceChip.cls"
              >
                {{ todayAttendanceChip.tag }}
              </span>
            </div>
          </div>
          <dl class="mt-6 space-y-3 border-t border-forena-100 pt-6 text-sm">
            <div class="flex justify-between gap-2">
              <dt class="shrink-0 text-slate-500">{{ T.contact }}</dt>
              <dd class="font-medium tabular-nums text-forena-900">{{ profile.phone }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="shrink-0 text-slate-500">{{ T.emergencyPhone }}</dt>
              <dd class="min-w-0 text-right font-medium tabular-nums text-forena-900">
                {{ profile.emergencyPhone }}
              </dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="shrink-0 text-slate-500">{{ T.emergencyRelation }}</dt>
              <dd class="min-w-0 text-right font-medium text-forena-900">
                {{ profile.emergencyRelation }}
              </dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="shrink-0 text-slate-500">{{ T.employmentKind }}</dt>
              <dd class="font-medium text-forena-900">{{ profile.employmentKindLabel }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="shrink-0 text-slate-500">{{ T.blood }}</dt>
              <dd class="font-bold text-rose-600">{{ profile.bloodType }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="shrink-0 text-slate-500">{{ T.registered }}</dt>
              <dd class="font-medium tabular-nums text-forena-900">{{ profile.registeredAt }}</dd>
            </div>
            <div v-if="profile.fatigue" class="space-y-3 border-t border-forena-100 pt-4">
              <div class="flex items-start justify-between gap-2">
                <dt class="shrink-0 pt-0.5 text-slate-500">{{ T.fatigueScore }}</dt>
                <dd class="flex flex-wrap items-center justify-end gap-1.5">
                  <span
                    class="font-bold tabular-nums"
                    :class="profile.fatigue.highRisk ? 'text-rose-600' : 'text-forena-900'"
                  >
                    {{ profile.fatigue.total }} / 100
                  </span>
                  <button
                    type="button"
                    class="inline-flex shrink-0 items-center justify-center rounded-md border border-forena-200 bg-white p-1 text-forena-600 shadow-sm transition hover:bg-forena-50 hover:text-forena-800"
                    :aria-label="T.fatigueCriteriaAriaLabel"
                    :title="T.fatigueCriteriaAriaLabel"
                    @click="openFatigueCriteriaModal"
                  >
                    <Eye class="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </dd>
              </div>
              <div
                v-if="profile.fatigue.highRisk"
                class="rounded-lg bg-rose-50 px-2.5 py-2 text-center text-[11px] font-semibold text-rose-900 ring-1 ring-rose-200/80"
              >
                {{ T.fatigueHighRiskBadge }}
              </div>
              <p v-if="profile.fatigue.calculatedAtLabel" class="text-[10px] text-slate-400">
                {{ T.fatigueCalcAt }} · {{ profile.fatigue.calculatedAtLabel }}
              </p>
            </div>
          </dl>
        </div>

        <div
          class="overflow-hidden rounded-2xl border border-forena-100/90 bg-white/95 shadow-card"
        >
          <div
            class="flex items-center gap-2 border-b border-forena-100 bg-forena-50/55 px-4 py-3 sm:px-5"
          >
            <ShieldAlert class="h-5 w-5 shrink-0 text-orange-600" />
            <h2 class="text-sm font-bold text-forena-900 sm:text-base">{{ T.tabAccident }}</h2>
          </div>
          <div class="p-4 sm:p-5">
            <div
              v-if="!profile.accidents || profile.accidents.length === 0"
              class="rounded-xl border border-dashed border-forena-200 bg-forena-50/40 py-12 text-center text-sm text-slate-500"
            >
              {{ T.emptyAccident }}
            </div>
            <div v-else class="overflow-x-auto rounded-xl border border-forena-100">
              <table class="w-full min-w-[300px] text-left text-sm">
                <thead
                  class="border-b border-forena-100 bg-forena-50/70 text-[10px] font-bold uppercase text-forena-500"
                >
                  <tr>
                    <th class="px-3 py-3">{{ T.colDate }}</th>
                    <th class="px-3 py-3">{{ T.colType }}</th>
                    <th class="px-3 py-3">{{ T.colZone }}</th>
                    <th class="px-3 py-3">{{ T.colResolution }}</th>
                  </tr>
                </thead>
                <tbody class="text-forena-800">
                  <tr
                    v-for="(ac, ai) in profile.accidents"
                    :key="ai"
                    class="border-b border-forena-50 text-xs last:border-0"
                  >
                    <td class="px-3 py-3 tabular-nums text-slate-600">{{ ac.date }}</td>
                    <td class="px-3 py-3 font-semibold">{{ ac.accidentType }}</td>
                    <td class="px-3 py-3">{{ ac.zone }}</td>
                    <td class="max-w-[140px] px-3 py-3 text-slate-700">{{ ac.resolution }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div
          class="overflow-hidden rounded-2xl border border-forena-100/90 bg-white/95 shadow-card"
        >
          <div
            class="flex flex-wrap items-center gap-2 border-b border-forena-100 bg-forena-50/55 px-4 py-3 sm:px-5"
          >
            <FileText class="h-5 w-5 shrink-0 text-flare-600" />
            <h2 class="text-sm font-bold text-forena-900 sm:text-base">{{ T.tabDocs }}</h2>
            <span class="text-xs text-slate-500 sm:text-sm">· {{ T.docsSection }}</span>
          </div>
          <div class="p-4 sm:p-5">
            <ul class="divide-y divide-forena-100 rounded-xl border border-forena-100 bg-white">
              <li
                v-for="(doc, i) in profile.documents"
                :key="i"
                class="flex flex-col gap-3 px-4 py-4"
              >
                <div class="flex min-w-0 items-start gap-3">
                  <FileText class="mt-0.5 h-5 w-5 shrink-0 text-flare-600" />
                  <div class="min-w-0">
                    <p class="font-semibold text-forena-900">{{ doc.title }}</p>
                    <p v-if="doc.storedFileName" class="mt-1 truncate text-[11px] text-slate-500">
                      {{ doc.storedFileName }}
                    </p>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2 pl-8">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold shadow-sm transition"
                    :class="
                      doc.fileUrl && String(doc.fileUrl).trim()
                        ? 'border-forena-200 bg-white text-forena-700 hover:border-flare-300 hover:bg-flare-50/50'
                        : 'cursor-not-allowed border-forena-100 bg-forena-50/80 text-slate-400'
                    "
                    :disabled="!doc.fileUrl || !String(doc.fileUrl).trim()"
                    :title="
                      doc.fileUrl && String(doc.fileUrl).trim() ? '' : T.docNoFileUrl
                    "
                    @click="downloadDocument(doc)"
                  >
                    <Download class="h-3.5 w-3.5" />
                    {{ T.docBtnDownload }}
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <section class="lg:col-span-8">
        <div class="space-y-6">
          <div
            class="overflow-hidden rounded-2xl border border-forena-100/90 bg-white/95 shadow-card"
          >
            <div
              class="flex items-center gap-2 border-b border-forena-100 bg-forena-50/55 px-4 py-3 sm:px-5"
            >
              <ClipboardList class="h-5 w-5 shrink-0 text-flare-600" />
              <h2 class="text-sm font-bold text-forena-900 sm:text-base">{{ T.tabAttendance }}</h2>
            </div>
            <div class="p-4 sm:p-5">
              <p class="text-sm font-bold text-emerald-800">
                {{ T.monthAcc }} ({{ attendanceCalYear }}년 {{ attendanceCalMonth }}월):
                <span class="tabular-nums">{{ formatManDaysSum(attendanceMonthManSum) }}</span>
                {{ T.manUnit }}
              </p>
              <div class="mt-4 overflow-x-auto rounded-xl border border-forena-100 bg-white">
                <div class="min-w-[320px] p-3 sm:min-w-0 sm:p-4">
                  <div class="mb-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-forena-200 bg-white text-forena-600 shadow-sm transition hover:bg-forena-50"
                      :aria-label="T.calPrevMonth"
                      @click="shiftAttendanceMonth(-1)"
                    >
                      <ChevronLeft class="h-5 w-5" />
                    </button>
                    <p class="text-center text-sm font-bold text-forena-900 sm:text-base">
                      {{ attendanceCalYear }}년 {{ attendanceCalMonth }}월
                    </p>
                    <button
                      type="button"
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-forena-200 bg-white text-forena-600 shadow-sm transition hover:bg-forena-50"
                      :aria-label="T.calNextMonth"
                      @click="shiftAttendanceMonth(1)"
                    >
                      <ChevronRight class="h-5 w-5" />
                    </button>
                  </div>
                  <div class="grid grid-cols-7 gap-0.5 border-b border-forena-100 pb-2">
                    <div
                      v-for="(wd, wi) in weekDayLabels"
                      :key="wi"
                      class="py-1 text-center text-[10px] font-bold text-forena-500"
                    >
                      {{ wd }}
                    </div>
                  </div>
                  <div class="mt-1 space-y-0.5">
                    <div
                      v-for="(week, wwi) in attendanceCalendarWeeks"
                      :key="wwi"
                      class="grid grid-cols-7 gap-0.5"
                    >
                      <div
                        v-for="(cell, cci) in week"
                        :key="cci"
                        class="min-h-[4.25rem] rounded-lg border border-transparent p-0.5 sm:min-h-[5.25rem] sm:p-1"
                        :class="
                          cell.kind === 'day' && cell.row
                            ? 'border-forena-100 bg-forena-50/70 shadow-sm'
                            : ''
                        "
                      >
                        <template v-if="cell.kind === 'pad'" />
                        <template v-else>
                          <div
                            class="text-right text-[10px] font-bold tabular-nums text-slate-500 sm:text-xs"
                            :class="cell.row ? 'text-forena-600' : ''"
                          >
                            {{ cell.day }}
                          </div>
                          <template v-if="cell.row">
                            <p
                              class="mt-0.5 line-clamp-2 text-[9px] font-semibold leading-snug text-forena-800 sm:text-[10px]"
                              :title="zoneForAttendanceDay(cell.dateKey, cell.row)"
                            >
                              {{ zoneForAttendanceDay(cell.dateKey, cell.row) }}
                            </p>
                            <div
                              class="mt-0.5 line-clamp-2 font-mono text-[9px] leading-tight text-forena-700 sm:text-[10px]"
                            >
                              <span class="font-semibold text-flare-700">{{
                                cell.row.clockIn
                              }}</span>
                              <span class="text-slate-400">—</span>
                              <span>{{ cell.row.clockOut }}</span>
                            </div>
                            <p
                              class="mt-0.5 text-[9px] font-bold tabular-nums text-emerald-800 sm:text-[10px]"
                            >
                              {{ cell.row.manDays }} {{ T.manUnit }}
                            </p>
                          </template>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid gap-6 lg:grid-cols-2">
            <div
              class="overflow-hidden rounded-2xl border border-forena-100/90 bg-white/95 shadow-card"
            >
              <div
                class="flex items-center gap-2 border-b border-forena-100 bg-forena-50/55 px-4 py-3 sm:px-5"
              >
                <MapPin class="h-5 w-5 shrink-0 text-flare-600" />
                <h2 class="text-sm font-bold text-forena-900 sm:text-base">{{ T.tabZone }}</h2>
              </div>
              <div class="p-4 sm:p-5">
                <div class="overflow-x-auto rounded-xl border border-forena-100">
                  <table class="w-full min-w-[340px] text-left text-sm">
                    <thead
                      class="border-b border-forena-100 bg-forena-50/70 text-[10px] font-bold uppercase text-forena-500"
                    >
                      <tr>
                        <th class="px-4 py-3 whitespace-nowrap">{{ T.colDateTime }}</th>
                        <th class="px-4 py-3">{{ T.colZone }}</th>
                        <th class="px-4 py-3">{{ T.colNote }}</th>
                      </tr>
                    </thead>
                    <tbody class="text-forena-800">
                      <tr
                        v-for="(z, zi) in profile.zoneHistory"
                        :key="zi"
                        class="border-b border-forena-50 last:border-0"
                      >
                        <td class="px-4 py-3 tabular-nums text-xs text-slate-600 whitespace-nowrap">{{ z.date }}</td>
                        <td class="px-4 py-3 text-xs font-semibold">{{ z.zone }}</td>
                        <td class="px-4 py-3 text-xs">{{ z.note }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  </div>

  <div
    v-else
    class="rounded-2xl border border-forena-100/90 bg-white/95 p-10 text-center shadow-card"
  >
    <p class="font-semibold text-forena-900">{{ T.notFound }}</p>
    <button
      type="button"
      class="mt-4 rounded-xl bg-gradient-to-r from-forena-700 to-forena-900 px-5 py-2.5 text-sm font-bold text-white"
      @click="goBack"
    >
      {{ T.backList }}
    </button>
  </div>

  <FatigueCriteriaModal
    :open="fatigueCriteriaModalOpen"
    :fatigue="profile?.fatigue"
    :T="T"
    @close="closeFatigueCriteriaModal"
  />
</template>
