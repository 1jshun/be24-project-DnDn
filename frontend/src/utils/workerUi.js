/** 근무자 관련 화면 공통: 소속 분류·근태 칩·구역 표시 문자열 */

/** @typedef {'direct' | 'partner' | 'agency'} AffiliationKind */

// 소속: 출처 문자열 → UI 구분
export function getAffiliationKind(text) {
  const s = String(text ?? '')
  if (s.includes('본사')) return 'direct'
  if (s.includes('인력사무소')) return 'agency'
  if (s.includes('협력사')) return 'partner'
  return 'partner'
}

// 카드 등 표시용 (협력사 (회사명) → 회사명만)
export function formatAffiliationDisplay(text) {
  const s = String(text ?? '')
  const m = s.match(/^협력사\s*\(([^)]+)\)\s*$/)
  if (m) return m[1].trim()
  return s
}

// 필터·그룹용 협력사명 추출
export function getPartnerCompanyName(affiliation, affiliationLine) {
  const s = String(affiliation ?? '')
  const m = s.match(/^협력사\s*\(([^)]+)\)\s*$/)
  if (m) return m[1].trim()
  if (getAffiliationKind(s) !== 'partner') return ''
  const line = String(affiliationLine ?? '').trim()
  if (line) {
    const seg = line.split('/')[0].trim()
    if (seg) return seg
  }
  const disp = formatAffiliationDisplay(s)
  if (disp && !/^협력사\s*$/i.test(disp)) return disp
  return ''
}

/** MANAGEMENT — 근태 행 `employmentKind`(REGULAR|DAILY) → 목록·헤더 한글 */
export function employmentKindDisplay(kindRaw) {
  const k = String(kindRaw ?? '').toUpperCase()
  if (k === 'DAILY') return '일용'
  return '상용'
}

export function displayWorkerAffiliation(p) {
  const kind = String(p?.affiliationKind ?? '').toUpperCase()
  if (kind === 'DIRECT') return '본사'
  const pc = String(p?.partnerCompany ?? '').trim()
  if (pc.includes('인력사무소')) return '인력'
  return pc || '—'
}

export function pickWorkerTradeSubLabel(w) {
  if (!w || typeof w !== 'object') return ''
  const keys = ['subLabel', 'sub_label', 'tradeName', 'trade', 'tradeType', 'occupation', 'jobType']
  for (const k of keys) {
    const v = w[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

export function displayWorkerTradeLine(p) {
  const kind = String(p?.affiliationKind ?? '').toUpperCase()
  if (kind === 'DIRECT') return '직영'
  const sub = pickWorkerTradeSubLabel(p)
  return sub || '기타'
}

/** @param {AffiliationKind} kind */
export function affiliationKindBadgeClass(kind) {
  if (kind === 'direct') return 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200/80'
  if (kind === 'agency') return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/90'
  return 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/80'
}

// 근태: 정시 출근 기준(이후 → 목록에서 지각)
export const ATTENDANCE_ON_TIME_END = '07:00'

function timeStrToMinutes(s) {
  if (!s || s === '-' || typeof s !== 'string') return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!m) return null
  const h = Number(m[1])
  const mi = Number(m[2])
  if (Number.isNaN(h) || Number.isNaN(mi)) return null
  return h * 60 + mi
}

function hasClockOut(record) {
  const cout = record.clockOut
  if (cout == null) return false
  const s = String(cout).trim()
  return s !== '' && s !== '-'
}

// API가 PRESENT/LATE 유지 + clockOut만 채우는 경우 화면은 clockOut으로 퇴근 표시
export function deriveAttendanceTag(record) {
  const api = String(record.attendanceStatus ?? '').toUpperCase()
  if (api === 'PENDING') return '출근 전'
  if (api === 'ABSENT') return '결근'
  if (api === 'EARLY_LEAVE') return '조퇴'

  if (hasClockOut(record) && (api === 'PRESENT' || api === 'LATE')) return '퇴근'

  if (api === 'LATE') return '지각'
  if (api === 'PRESENT') {
    const cin = record.clockIn
    if (!cin || cin === '-') return '결근'
    const inM = timeStrToMinutes(cin)
    const limitM = timeStrToMinutes(ATTENDANCE_ON_TIME_END)
    if (inM != null && limitM != null && inM > limitM) return '지각'
    return '출근'
  }
  const cin = record.clockIn
  if (!cin || cin === '-') return '결근'
  if (hasClockOut(record)) return '퇴근'
  const st = String(record.status ?? '')
  if (st.includes('조퇴')) return '조퇴'
  const inM = timeStrToMinutes(cin)
  const limitM = timeStrToMinutes(ATTENDANCE_ON_TIME_END)
  if (inM != null && limitM != null && inM > limitM) return '지각'
  return '출근'
}

/** @param {string} tag */
export function attendanceTagBadgeClass(tag) {
  if (tag === '출근 전') return 'bg-violet-50 text-violet-900 ring-1 ring-violet-200/80'
  if (tag === '출근') return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80'
  if (tag === '지각') return 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/80'
  if (tag === '조퇴') return 'bg-rose-50 text-rose-800 ring-1 ring-rose-200/80'
  if (tag === '퇴근') return 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/80'
  return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/90'
}

// 구역: zoneMain · zoneSub (레거시 단일 zone은 세 번째 인자)
export function formatWorkerZoneDisplay(zoneMain, zoneSub, legacyZone) {
  const m = zoneMain != null && String(zoneMain).trim() !== '' ? String(zoneMain).trim() : ''
  const s = zoneSub != null && String(zoneSub).trim() !== '' ? String(zoneSub).trim() : ''
  if (m && s) return `${m} · ${s}`
  if (m) return m
  if (s) return s
  const leg =
    legacyZone != null && String(legacyZone).trim() !== '' ? String(legacyZone).trim() : ''
  if (leg === '' || leg === '-') return '—'
  return leg
}
