import { displayWorkerTradeLine, employmentKindDisplay } from '@/utils/workerUi'

export const JOB_RANK_SITE_DIRECTOR = '현장 총 책임자'
export const JOB_RANK_SECTION_LEADER = '공종 책임자'
export const JOB_RANK_FIELD_SUPERVISOR = '현장 관리자'
export const JOB_RANK_WORKER = '작업자'

export const WORKER_MANAGEMENT_TEXTS = {
  pageTitle: '근무자 관리',
  heroDesc:
    '본사 직영과 협력사 소속 작업자를 동일 현장에서 관리할 수 있도록, 출입·근태 및 공수 현황을 조회하고 보정합니다.',
  sectionAttendance: '작업자 근태 현황',
  triggerSync: '전체 동기화',
  triggerSyncLoading: '동기화 중...',
  seedHistory: '이전 출결내역 불러오기',
  seedHistoryLoading: '적용 중...',
  bulkOverride: '일괄 적용',
  bulkOverrideLoading: '적용 중...',
  kicker: '현장 운영',
  title: '출입 / 근태 관리',
  desc: '작업자 출퇴근과 공수 산정 현황을 일일별로 조회하고 보정할 수 있습니다.',
  breadcrumb: '현장 관리 / 출입·근태',
  filterAffil: '공종 구분',
  filterSearch: '작업자 이름',
  filterSearchPh: '이름을 입력하세요',
  colContact: '이름 / 연락처',
  colAffil: '소속',
  colEmployment: '상용 / 일용',
  colRank: '직급',
  colTrade: '공종',
  colTime: '출·퇴근',
  colStatus: '상태',
  empty: '조회된 근태 내역이 없습니다.',
  manSuffix: '공수',
  colDetail: '상세보기',
  listFilteredStats: '목록 집계',
  employmentFilterHint: '고용',
  attendanceFilterHint: '근태',
  todayWorkerTotal: '금일 작업자',
  countPeople: '명',
}

export function jobRankBadgeClass(rank) {
  if (rank === JOB_RANK_SITE_DIRECTOR) return 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200/80'
  if (rank === JOB_RANK_SECTION_LEADER) return 'bg-purple-50 text-purple-900 ring-1 ring-purple-200/80'
  if (rank === JOB_RANK_FIELD_SUPERVISOR) return 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/80'
  return 'bg-slate-50 text-slate-800 ring-1 ring-slate-200/80'
}

export function kpiTagCounts(kpi) {
  if (!kpi) return { '출근 전': 0, 출근: 0, 지각: 0, 조퇴: 0, 퇴근: 0, 결근: 0 }
  return {
    '출근 전': kpi.pending ?? 0,
    출근: kpi.present ?? 0,
    지각: kpi.late ?? 0,
    조퇴: kpi.earlyLeave ?? 0,
    퇴근: kpi.leave ?? 0,
    결근: kpi.absent ?? 0,
  }
}

export function localTodayISODate() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODateLocal(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd ?? '').trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (Number.isNaN(dt.getTime())) return null
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return dt
}

export function employmentBadgeClass(c) {
  if (c === '상용') return 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/80'
  return 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/80'
}

function formatApiTime(t) {
  if (t == null || t === '') return '-'
  const s = String(t)
  if (s === '-') return '-'
  const m = /^(\d{1,2}):(\d{2})/.exec(s)
  if (!m) return '-'
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

function mapJobRankFromApi(rank) {
  const r = String(rank ?? '').toUpperCase()
  if (r === 'SITE_DIRECTOR') return JOB_RANK_SITE_DIRECTOR
  if (r === 'SECTION_LEADER') return JOB_RANK_SECTION_LEADER
  if (r === 'FIELD_SUPERVISOR') return JOB_RANK_FIELD_SUPERVISOR
  return JOB_RANK_WORKER
}

function buildAffiliationFromApi(row) {
  const kind = String(row.affiliationKind ?? '').toUpperCase()
  if (kind === 'DIRECT') {
    return { affiliationType: '본사 소속', primaryContractor: '본사' }
  }
  const company = (row.partnerCompany && String(row.partnerCompany).trim()) || '협력사'
  return {
    affiliationType: `협력사 (${company})`,
    primaryContractor: company,
  }
}

function estimateManDays(clockInStr, clockOutStr, statusUpper) {
  if (statusUpper === 'PENDING') return 0
  if (clockInStr === '-' || statusUpper === 'ABSENT') return 0
  if (statusUpper === 'EARLY_LEAVE') return 0.5
  if (clockOutStr && clockOutStr !== '-') return 1.0
  return 0
}

function deriveStatusLabel(attendanceStatus, clockInStr, clockOutStr) {
  const st = String(attendanceStatus ?? '').toUpperCase()
  if (st === 'PENDING') return '출근 전'
  if (st === 'ABSENT' || clockInStr === '-') return '결근'
  if (st === 'EARLY_LEAVE') return '조퇴'
  if (clockOutStr && clockOutStr !== '-') return '퇴근'
  return '작업 중'
}

export function mapWorkerResToAttendance(row) {
  const clockInStr = formatApiTime(row.clockIn)
  const clockOutStr = formatApiTime(row.clockOut)
  const statusUpper = String(row.attendanceStatus ?? '').toUpperCase()
  const { affiliationType, primaryContractor } = buildAffiliationFromApi(row)
  const tradeLabel = displayWorkerTradeLine(row)

  const manDays =
    row.manDays != null && row.manDays !== ''
      ? Number(row.manDays)
      : estimateManDays(clockInStr, clockOutStr, statusUpper)

  return {
    id: row.idx,
    name: row.name ?? '',
    phone: row.phone ?? '—',
    jobRank: mapJobRankFromApi(row.jobRank),
    employmentClass: employmentKindDisplay(row.employmentKind),
    affiliationType,
    primaryContractor,
    affiliationKindApi: row.affiliationKind,
    partnerCompanyApi: row.partnerCompany,
    affiliationSubLabel: tradeLabel,
    site: row.site || '—',
    clockIn: clockInStr,
    clockOut: clockOutStr,
    manDays,
    attendanceStatus: statusUpper,
    status: deriveStatusLabel(row.attendanceStatus, clockInStr, clockOutStr),
    isClosed: false,
    monthTotalMan: 0,
    clockHistory: [],
  }
}
