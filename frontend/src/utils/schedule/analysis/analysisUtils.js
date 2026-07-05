export const DAY_MS = 24 * 60 * 60 * 1000

export function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  d.setHours(0, 0, 0, 0)
  return d
}

export function toDateKey(value = new Date()) {
  const d = value instanceof Date ? value : parseDate(value)
  if (!d) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function addDays(dateValue, days) {
  const d = parseDate(dateValue)
  if (!d) return null
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}

export function daysInclusive(startDate, endDate) {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (!start || !end) return 1
  return Math.max(1, Math.round((end - start) / DAY_MS) + 1)
}

export function clampPct(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

export function roundPct(value, digits = 1) {
  const scale = 10 ** digits
  return Math.round(clampPct(value) * scale) / scale
}

export function calcExpectedDelayDays(startDate, endDate, plannedPct, actualPct) {
  const lack = Math.max(0, Number(plannedPct || 0) - Number(actualPct || 0))
  if (lack <= 0) return 0
  const dailyAllocation = 100 / daysInclusive(startDate, endDate)
  return Math.max(1, Math.ceil(lack / dailyAllocation))
}

export function normalizeListResponse(res) {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data?.data)) return res.data.data
  if (Array.isArray(res?.data)) return res.data
  return []
}
