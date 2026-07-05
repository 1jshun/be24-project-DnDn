import { DAY_MS, parseDate, roundPct } from './analysisUtils.js'

export function normalizeRequestStatus(status = '') {
  const s = String(status || '').trim()
  if (['pending', 'approved', 'applied', 'rejected'].includes(s)) return s

  return (
    {
      '승인 대기': 'pending',
      '승인 완료': 'approved',
      '일정 반영 완료': 'applied',
      반려: 'rejected',
    }[s] || s
  )
}

export function mapAttachment(urlOrFile) {
  if (!urlOrFile) return null
  if (typeof urlOrFile === 'object') return urlOrFile

  const text = String(urlOrFile)
  return {
    name: text.split('/').pop() || text,
    url: text,
  }
}

export function actionFromStatus(status) {
  return (
    {
      approved: '승인',
      applied: '일정 반영',
      rejected: '반려',
    }[normalizeRequestStatus(status)] || '처리'
  )
}

export function mapScheduleChange(item, historyMode = false) {
  const status = normalizeRequestStatus(item.status)
  const attachments = Array.isArray(item.attachmentUrls)
    ? item.attachmentUrls.map(mapAttachment).filter(Boolean)
    : Array.isArray(item.attachments)
      ? item.attachments
      : []

  return {
    id: item.idx ?? item.id,
    process: item.process || item.changeSummary?.process || '',
    task: item.taskName ?? item.task ?? '',
    requester: item.requester || '',
    requestDate: item.requestDate || '',
    oldStart: item.oldStart || '',
    oldEnd: item.oldEnd || '',
    newStart: item.newStart || '',
    newEnd: item.newEnd || '',
    reason:
      historyMode && status === 'rejected'
        ? item.rejectReason || item.reason || ''
        : item.reason || '',
    changeSummary: item.changeSummary || null,
    detailChanges: Array.isArray(item.detailChanges) ? item.detailChanges : [],
    aiApplied: !!item.aiApplied,
    status,
    statusLabel: item.statusLabel || requestStatusLabel(status),
    attachments,
    rejectReason: item.rejectReason || '',
    approver: item.approver || '',
    processedAt: item.processedAt || '',
    action: historyMode ? actionFromStatus(status) : undefined,
    tradeProcessId: item.tradeProcessId ?? null,
    workPlanId: item.workPlanId ?? null,
  }
}

export function scheduleChangeDedupeKey(item, includeStatus = false) {
  const detailIds = Array.isArray(item.detailChanges)
    ? item.detailChanges
        .map(
          (detail) =>
            detail.workPlanId || detail.date || detail.originalName || detail.recommendedName,
        )
        .filter(Boolean)
        .join(',')
    : ''

  const targetId =
    item.workPlanId ||
    item.changeSummary?.targetWorkPlanId ||
    item.changeSummary?.workPlanId ||
    item.tradeProcessId ||
    detailIds

  if (!targetId && !item.task && !item.newStart && !item.newEnd) {
    return `id:${item.id}`
  }

  return [
    includeStatus ? item.status : '',
    item.process || '',
    targetId || '',
    item.requester || '',
    item.task || '',
    item.oldStart || '',
    item.oldEnd || '',
    item.newStart || '',
    item.newEnd || '',
  ].join('|')
}

export function dedupeScheduleChanges(items, includeStatus = false) {
  const seen = new Set()
  return items.filter((item) => {
    const key = scheduleChangeDedupeKey(item, includeStatus)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function clonePlain(value) {
  if (value == null) return value
  return JSON.parse(JSON.stringify(value))
}

export const requestStatusLabel = (s) =>
  ({
    pending: '승인 대기',
    approved: '승인 완료',
    applied: '일정 반영 완료',
    rejected: '반려',
  })[s] || s

export function diffDays(startDate, endDate) {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (!start || !end) return 0
  return Math.round((end - start) / DAY_MS)
}

export function formatDayDelta(days) {
  const n = Number(days || 0)
  if (n > 0) return `+${n}일`
  if (n < 0) return `${n}일`
  return '납기 유지'
}

export function formatPct(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return `${roundPct(n, 1)}%`
}

export function requestDetailChanges(request) {
  return Array.isArray(request?.detailChanges) ? request.detailChanges : []
}

export function requestApprovalSummary(request) {
  const details = requestDetailChanges(request)
  const summary = request?.changeSummary || {}
  const workerChanges = details.filter(
    (d) => Number(d.originalRequiredCount || 0) !== Number(d.recommendedRequiredCount || 0),
  )
  const workTimeChanges = details.filter(
    (d) =>
      String(d.originalWorkTime || '') &&
      String(d.recommendedWorkTime || '') &&
      String(d.originalWorkTime || '') !== String(d.recommendedWorkTime || ''),
  )
  const totalAdditionalManHours = details.reduce(
    (sum, d) => sum + Number(d.additionalManHours || 0),
    0,
  )
  const addDays =
    summary.addDays ??
    diffDays(summary.oldEnd || request?.oldEnd, summary.newEnd || request?.newEnd)

  return {
    proposalCount: summary.proposalCount ?? details.length,
    oldEnd: summary.oldEnd || request?.oldEnd || '',
    newEnd: summary.newEnd || request?.newEnd || '',
    addDays,
    workerChangeCount: summary.workerChangeCount ?? workerChanges.length,
    workTimeChangeCount: summary.workTimeChangeCount ?? workTimeChanges.length,
    totalAdditionalManHours: Number(summary.totalAdditionalManHours ?? totalAdditionalManHours),
    firstWorkerChange: workerChanges[0] || null,
    firstWorkTimeChange: workTimeChanges[0] || null,
    plannedPct: summary.plannedPct,
    actualPct: summary.actualPct,
    diffPct: summary.diffPct,
    risk: summary.risk || '',
    cause: summary.cause || '',
    redistributionLevel: summary.redistributionLevel || '',
    normalReturnDate: summary.normalReturnDate || '',
    expectedEffect: summary.expectedEffect || '',
    basis: summary.basis || '',
  }
}

export function hasApprovalData(request) {
  return !!request?.changeSummary || requestDetailChanges(request).length > 0
}
