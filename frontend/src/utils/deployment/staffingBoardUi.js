import { resolveStaffingTradeCategory } from '@/utils/staffingAdapter'
import { fatigueTotalFromWorker } from '@/utils/fatigueUi'
import { employmentKindDisplay } from '@/utils/workerUi'
import { staffingTradeLabel } from '@/utils/deployment/staffingBoardTexts'

export function rosterDateToday() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function cloneWorker(w) {
  return {
    ...w,
    skills: Array.isArray(w.skills) ? [...w.skills] : ['labor'],
    fatigue: w.fatigue ? { ...w.fatigue } : { nightShiftYesterday: false, consecutiveDays: 0 },
  }
}

export function workerTagOk(w) {
  return w.workerTag === '작업자' && w.attendanceTag === '출근'
}

export function fatigueScore(w) {
  return fatigueTotalFromWorker(w)
}

export function staffingTradeCell(T, w) {
  const line = String(w?.affiliationLine ?? '').trim()
  const idx = line.indexOf('/')
  if (idx !== -1) {
    const right = line.slice(idx + 1).trim()
    if (right) return right
  }
  const skills = Array.isArray(w?.skills) ? w.skills : []
  if (!skills.length) return '—'
  return skills.map((k) => staffingTradeLabel(T, k)).join(', ')
}

export function poolEmploymentDisplay(w) {
  return employmentKindDisplay(w?.employmentKind)
}

export function poolEmploymentBadgeClass(label) {
  if (label === '상용') {
    return 'inline-flex rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-900 ring-1 ring-sky-200/80'
  }
  return 'inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200/80'
}

export function zoneFillRatio(subZone) {
  if (!subZone.required) return 1
  return Math.min(subZone.workers.length / subZone.required, 1)
}

export function zoneBarClass(subZone) {
  const r = zoneFillRatio(subZone)
  if (r >= 1) return 'bg-emerald-500'
  if (r >= 0.5) return 'bg-amber-500'
  if (r > 0) return 'bg-rose-500'
  return 'bg-white ring-1 ring-inset ring-slate-200/80'
}

export function subZoneCardBorderClass(subZone) {
  const r = zoneFillRatio(subZone)
  if (r >= 1) return 'border border-emerald-200/90'
  if (r >= 0.5) return 'border border-amber-200/90'
  if (r > 0) return 'border border-rose-200/90'
  return 'border border-slate-200/70'
}

export function zoneGroupRequiredSum(group) {
  const subZones = group?.subZones ?? []
  return subZones.reduce((s, z) => s + Math.max(0, Number(z.required) || 0), 0)
}

export function zoneGroupAssignedSum(group) {
  const subZones = group?.subZones ?? []
  return subZones.reduce((s, z) => s + (z.workers?.length ?? 0), 0)
}

export function zoneGroupFillRatio(group) {
  const need = zoneGroupRequiredSum(group)
  const assigned = zoneGroupAssignedSum(group)
  if (!need) return 1
  return Math.min(assigned / need, 1)
}

export function zoneGroupCardBorderClass(group) {
  const r = zoneGroupFillRatio(group)
  if (r >= 1) return 'border border-emerald-200/90'
  if (r >= 0.5) return 'border border-amber-200/90'
  if (r > 0) return 'border border-rose-200/90'
  return 'border border-white ring-1 ring-slate-200/75'
}

export function tradeGroupRequiredSum(tg) {
  const entries = tg?.entries ?? []
  return entries.reduce((s, e) => s + Math.max(0, Number(e?.sz?.required) || 0), 0)
}

export function tradeGroupAssignedSum(tg) {
  const entries = tg?.entries ?? []
  return entries.reduce((s, e) => s + (e?.sz?.workers?.length ?? 0), 0)
}

export function tradeGroupFillRatio(tg) {
  const need = tradeGroupRequiredSum(tg)
  const assigned = tradeGroupAssignedSum(tg)
  if (!need) return 1
  return Math.min(assigned / need, 1)
}

export function tradeGroupCardBorderClass(tg) {
  const r = tradeGroupFillRatio(tg)
  if (r >= 1) return 'border border-emerald-200/90'
  if (r >= 0.5) return 'border border-amber-200/90'
  if (r > 0) return 'border border-rose-200/90'
  return 'border border-white ring-1 ring-slate-200/75'
}

export function countTradeInZone(subZone, trade) {
  return subZone.workers.filter((w) => (w.skills || []).includes(trade)).length
}

export function zoneTradeProgress(T, subZone) {
  const needs = subZone.tradeNeeds || []
  return needs.map((tn) => ({
    trade: tn.trade,
    label: staffingTradeLabel(T, tn.trade),
    need: tn.need,
    fill: countTradeInZone(subZone, tn.trade),
  }))
}

export function shouldWarnTradeMismatch(subZone, worker) {
  const needs = subZone.tradeNeeds || []
  if (!needs.length) return false
  const needSet = new Set(needs.map((n) => n.trade))
  const skills = worker.skills || []
  if (!skills.length) return false
  return !skills.some((s) => needSet.has(s))
}

export function toastClass(v) {
  if (v === 'danger') return 'border-rose-200 bg-rose-50 text-rose-900'
  if (v === 'info') return 'border-sky-200 bg-sky-50 text-sky-900'
  return 'border-amber-200 bg-amber-50 text-amber-950'
}

export function resolveTradeCategory(raw) {
  return resolveStaffingTradeCategory(raw)
}

export function groupZonesByTrade(zoneGroups) {
  const map = new Map()
  for (const g of zoneGroups ?? []) {
    for (const sz of g?.subZones ?? []) {
      const category = resolveTradeCategory(sz.tradeName)
      if (!map.has(category)) map.set(category, [])
      map.get(category).push({ sz, group: g })
    }
  }
  const categories = [...map.keys()].sort((a, b) => {
    if (a === '기타') return 1
    if (b === '기타') return -1
    return a.localeCompare(b, 'ko')
  })
  return categories.map((tradeName) => ({
    tradeName,
    entries: map.get(tradeName) ?? [],
  }))
}
