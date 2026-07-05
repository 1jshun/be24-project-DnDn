import { formatWorkerZoneDisplay, employmentKindDisplay, pickWorkerTradeSubLabel, displayWorkerTradeLine } from '@/utils/workerUi'
import { normalizeFatigueFromProfileApi } from '@/utils/fatigueUi'

export function formatApiTime(t) {
  if (t == null || t === '') return '-'
  const s = String(t)
  if (s === '-') return '-'
  const m = /^(\d{1,2}):(\d{2})/.exec(s)
  if (!m) return '-'
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

export function normalizeApiDate(d) {
  if (d == null) return ''
  if (typeof d === 'string') return d.length >= 10 ? d.slice(0, 10) : d
  if (Array.isArray(d) && d.length >= 3) {
    const [y, mo, day] = d
    return `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  return String(d)
}

export function normalizeApiDateTime(dt) {
  if (dt == null) return ''
  if (typeof dt === 'string') {
    const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(dt)
    return m ? `${m[1]} ${m[2]}` : dt.slice(0, 16)
  }
  if (Array.isArray(dt) && dt.length >= 5) {
    const [y, mo, day, h, min] = dt
    return `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }
  return String(dt)
}

export function formatRegisteredAt(raw) {
  const s = normalizeApiDate(raw)
  if (!s) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (m) return `${m[1]}.${m[2]}.${m[3]}`
  return s
}

export function mapJobRankKo(rank) {
  const r = String(rank ?? '').toUpperCase()
  if (r === 'SITE_DIRECTOR') return '현장 총 책임자'
  if (r === 'SECTION_LEADER') return '공종 책임자'
  if (r === 'FIELD_SUPERVISOR') return '현장 관리자'
  return '작업자'
}

export function jobRankBadgeClass(rank) {
  if (rank === '현장 총 책임자') return 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200/80'
  if (rank === '공종 책임자') return 'bg-purple-50 text-purple-900 ring-1 ring-purple-200/80'
  if (rank === '현장 관리자') return 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/80'
  return 'bg-slate-50 text-slate-800 ring-1 ring-slate-200/80'
}

export function localTodayISODate() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function mapAttendanceRow(a) {
  const date = normalizeApiDate(a.date ?? a.workDate)
  const zoneLine =
    a.zoneDisplay != null && String(a.zoneDisplay).trim() !== ''
      ? String(a.zoneDisplay).trim()
      : formatWorkerZoneDisplay(a.zoneMain, a.zoneSub, a.zone)
  return {
    date,
    clockIn: formatApiTime(a.clockIn),
    clockOut: formatApiTime(a.clockOut),
    manDays: a.manDays != null ? Number(a.manDays) : 0,
    zone: zoneLine !== '' && zoneLine !== '—' ? zoneLine : '—',
    site: '—',
    attendanceStatus: a.attendanceStatus,
  }
}

export function mapDeploymentRow(d) {
  const dateTime = normalizeApiDate(d.assignedAt)
  const rawTrade = d.tradeName ?? d.assignedTrade
  const trade =
    rawTrade != null && String(rawTrade).trim() !== '' ? String(rawTrade).trim() : ''
  const note = trade || '—'
  const zoneLine =
    d.zoneDisplay != null && String(d.zoneDisplay).trim() !== ''
      ? String(d.zoneDisplay).trim()
      : formatWorkerZoneDisplay(d.zoneMain, d.zoneSub, d.zone)
  return { date: dateTime, zone: zoneLine !== '' && zoneLine !== '—' ? zoneLine : '—', note }
}

export function mapSanctionRow(s) {
  const date = normalizeApiDate(s.occurredAt)
  const description = [s.reason, s.action].filter(Boolean).join(' — ') || '—'
  return { type: s.type ?? '', date, description, active: s.active }
}

export function mapAccidentRow(a) {
  const date = normalizeApiDate(a.occurredAt)
  const zoneLine =
    a.zoneDisplay != null && String(a.zoneDisplay).trim() !== ''
      ? String(a.zoneDisplay).trim()
      : formatWorkerZoneDisplay(a.zoneMain, a.zoneSub, a.zone)
  return {
    date,
    accidentType: (a.accidentType && String(a.accidentType).trim()) || '—',
    zone: zoneLine !== '' && zoneLine !== '—' ? zoneLine : '—',
    resolution: (a.resolution && String(a.resolution).trim()) || '—',
  }
}

export function formatSanctionSummary(s) {
  const kind = (s.type && String(s.type).trim()) || ''
  const body = (s.description && String(s.description).trim()) || '—'
  if (!kind) return body
  return `[${kind}] ${body}`
}

export function tradeHintFromDeployments(deployments) {
  if (!Array.isArray(deployments) || deployments.length === 0) return ''
  const sorted = [...deployments].sort((a, b) => {
    const da = normalizeApiDate(a.assignedAt)
    const db = normalizeApiDate(b.assignedAt)
    return db.localeCompare(da)
  })
  const wt = sorted[0]?.assignedTrade
  if (!wt || !String(wt).trim()) return ''
  const first = String(wt).trim().split(/\s+/)[0]
  return first || ''
}

export function buildWorkerProfile(p, docs, deployments, attendanceRows, accidentsRows) {
  let tradeText = pickWorkerTradeSubLabel(p)
  if (!tradeText) tradeText = tradeHintFromDeployments(deployments)
  const metaAffiliationLine = tradeText || displayWorkerTradeLine(p) || '—'
  const rel = p.emergencyRelation ? String(p.emergencyRelation).trim() : ''
  const ePhone = p.emergencyPhone ? String(p.emergencyPhone).trim() : ''

  return {
    id: p.idx,
    name: p.name ?? '—',
    metaAffiliationLine,
    jobRank: mapJobRankKo(p.jobRank),
    employmentKindLabel: employmentKindDisplay(p.employmentKind),
    phone: p.phone ?? '—',
    emergencyPhone: ePhone || '—',
    emergencyRelation: rel || '—',
    bloodType: p.bloodType ?? '—',
    registeredAt: formatRegisteredAt(p.registeredAt),
    site: p.site ?? '—',
    documents: Array.isArray(docs) ? docs : [],
    attendanceRows,
    zoneHistory: Array.isArray(deployments) ? deployments.map(mapDeploymentRow) : [],
    accidents: Array.isArray(accidentsRows) ? accidentsRows.map(mapAccidentRow) : [],
    fatigue: normalizeFatigueFromProfileApi(p),
  }
}

export function unwrapWorkerDetailPayload(raw) {
  if (!raw || typeof raw !== 'object') return raw
  const inner =
    raw.worker ??
    raw.workerRes ??
    raw.workerDto ??
    (typeof raw.detail === 'object' && raw.detail ? raw.detail : null)
  if (inner && typeof inner === 'object') {
    return { ...raw, ...inner }
  }
  return raw
}

export function formatManDaysSum(n) {
  if (!Number.isFinite(n)) return '0'
  if (n === 0) return '0'
  const t = Math.round(n * 100) / 100
  return Number.isInteger(t) ? String(t) : String(t)
}

export function sanitizeFilename(s) {
  return String(s ?? 'download')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 120)
}
