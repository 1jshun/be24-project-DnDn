import { refreshProposalManHours } from './redistributionPlanner.js'

export function buildDetailScheduleEditProposals(redistribution) {
  if (!redistribution?.days?.length) return []

  return redistribution.days
    .filter((d) => d.id)
    .map((d) => {
      const originalName = d.name || '세부일정'
      const hasCarryOver = d.carryOver || Number(d.catchUpPct || 0) > 0
      const recommendedName = hasCarryOver ? `${originalName} 및 전일 미완료분 보완` : originalName

      const baseNote = String(d.originalNote || '').trim()
      const aiNoteLines = [
        baseNote,
        hasCarryOver ? `전일 미완료분을 반영하여 ${d.date} 작업에서 우선 처리합니다.` : '',
        d.recommendedWorkTime && d.originalWorkTime !== d.recommendedWorkTime
          ? `작업시간 ${d.originalWorkTime} → ${d.recommendedWorkTime} 조정 검토.`
          : '',
      ].filter(Boolean)

      return {
        workPlanId: d.id,
        date: d.date,
        location: d.location || '',
        originalName,
        recommendedName,
        originalRequiredCount: Number(d.currentRequiredCount || 0),
        recommendedRequiredCount: Number(d.recommendedRequiredCount || d.currentRequiredCount || 0),
        normalTargetPct: d.normalTargetPct,
        targetPct: d.targetPct,
        catchUpPct: d.catchUpPct,
        carryOver: hasCarryOver,
        originalNote: baseNote,
        recommendedNote: aiNoteLines.join('\n'),
        originalWorkTime: d.originalWorkTime,
        recommendedWorkTime: d.recommendedWorkTime,
        originalWorkHours: d.originalWorkHours,
        recommendedWorkHours: d.recommendedWorkHours,
        originalManHours: d.originalManHours,
        recommendedManHours: d.recommendedManHours,
        additionalManHours: d.additionalManHours,
        addedWorkers: d.addedWorkers,
        addedWorkHours: d.addedWorkHours,
        manHourAdjustmentReason: d.manHourAdjustmentReason,
        trade: d.trade || '',
        partner: d.partner || '',
        manager: d.manager || '',
        contact: d.contact || '',
        parentWorkPlanId: d.parentWorkPlanId || null,
        tradeProcessId: d.tradeProcessId || null,
        isEditing: false,
        isUserEdited: false,
      }
    })
}

export function startEditProposal(proposal) {
  if (!proposal) return
  proposal._backup = {
    recommendedName: proposal.recommendedName,
    recommendedRequiredCount: proposal.recommendedRequiredCount,
    recommendedWorkTime: proposal.recommendedWorkTime,
    recommendedWorkHours: proposal.recommendedWorkHours,
    recommendedManHours: proposal.recommendedManHours,
    additionalManHours: proposal.additionalManHours,
    addedWorkers: proposal.addedWorkers,
    addedWorkHours: proposal.addedWorkHours,
    recommendedNote: proposal.recommendedNote,
  }
  proposal.isEditing = true
}

export function cancelEditProposal(proposal) {
  if (!proposal) return
  if (proposal._backup) {
    proposal.recommendedName = proposal._backup.recommendedName
    proposal.recommendedRequiredCount = proposal._backup.recommendedRequiredCount
    proposal.recommendedWorkTime = proposal._backup.recommendedWorkTime
    proposal.recommendedWorkHours = proposal._backup.recommendedWorkHours
    proposal.recommendedManHours = proposal._backup.recommendedManHours
    proposal.additionalManHours = proposal._backup.additionalManHours
    proposal.addedWorkers = proposal._backup.addedWorkers
    proposal.addedWorkHours = proposal._backup.addedWorkHours
    proposal.recommendedNote = proposal._backup.recommendedNote
  }
  proposal.isEditing = false
  delete proposal._backup
}

export function confirmEditProposal(proposal) {
  if (!proposal) return
  proposal.recommendedRequiredCount = Math.max(0, Number(proposal.recommendedRequiredCount || 0))
  proposal.recommendedName = String(proposal.recommendedName || '').trim() || proposal.originalName
  proposal.recommendedWorkTime = String(
    proposal.recommendedWorkTime || proposal.originalWorkTime || '',
  ).trim()
  refreshProposalManHours(proposal)
  proposal.recommendedNote = String(proposal.recommendedNote || '').trim()
  proposal.isEditing = false
  proposal.isUserEdited = true
  delete proposal._backup
}

export function buildDetailedAiRecommendationText(task, redistribution, detailEditProposals = []) {
  const proposal = detailEditProposals[0]
  const delayedProgress = Number(redistribution?.delayedProgress || 0)
  const normalTarget = Number(proposal?.normalTargetPct || redistribution?.normalDailyRate || 0)
  const targetPct = Number(proposal?.targetPct || redistribution?.focusedTargetRate || 0)
  const targetRatio =
    normalTarget > 0 ? targetPct / normalTarget : Number(redistribution?.ratio || 1)

  if (!proposal) {
    return (
      `${task.name} 월간 세부계획은 현재 계획 ${task.plannedPct}% 대비 실제 ${task.actualPct}%로 ` +
      `${Math.abs(Number(task.diff || 0)).toFixed(1)}%p 차이가 있습니다. ` +
      `${redistribution?.action || '공사일보 제출 후 세부일정 기준으로 재분배 가능 여부를 다시 확인하세요.'}`
    )
  }

  const originalWorkers = Number(proposal.originalRequiredCount || 0)
  const recommendedWorkers = Number(proposal.recommendedRequiredCount || originalWorkers)
  const originalWorkHours = Number(proposal.originalWorkHours || 0)
  const recommendedWorkHours = Number(proposal.recommendedWorkHours || originalWorkHours)
  const originalManHours = Number(
    proposal.originalManHours || originalWorkers * originalWorkHours || 0,
  )
  const recommendedManHours = Number(
    proposal.recommendedManHours || recommendedWorkers * recommendedWorkHours || originalManHours,
  )
  const additionalManHours = Number(
    proposal.additionalManHours || Math.max(0, recommendedManHours - originalManHours),
  )
  const estimatedCompletedManHours = Number((originalManHours * (task.actualPct / 100)).toFixed(1))
  const estimatedRemainingManHours = Number(
    Math.max(0, originalManHours - estimatedCompletedManHours).toFixed(1),
  )
  const requiredManHours = Number((originalManHours * targetRatio).toFixed(1))

  return [
    `${task.name}은 현재 계획 ${task.plannedPct}% 대비 실제 ${task.actualPct}%로 ${Math.abs(Number(task.diff || 0)).toFixed(1)}%p 부족합니다.`,
    `선택된 만회 대상 세부일정(${proposal.date} · ${proposal.originalName})은 기존 인력 ${originalWorkers}명, 실작업 ${originalWorkHours}시간 기준으로 계획되어 있어 기본 공수는 ${originalWorkers}명 × ${originalWorkHours}시간 = ${originalManHours}인시입니다.`,
    `현재 실제 진척률 ${task.actualPct}%를 단순 공수 기준으로 환산하면 약 ${estimatedCompletedManHours}인시가 수행된 것으로 볼 수 있고, 기존 계획 공수 기준 약 ${estimatedRemainingManHours}인시가 남아 있는 상태입니다.`,
    `기존 목표 진척률 ${normalTarget}%를 ${targetPct}%로 회복하려면 해당 세부일정의 작업 강도를 약 ${targetRatio.toFixed(2)}배로 높여야 하며, 필요 공수는 약 ${requiredManHours}인시 수준으로 추정됩니다.`,
    `따라서 AI는 인력만 크게 늘리기보다 인력 ${originalWorkers}명 → ${recommendedWorkers}명, 작업시간 ${proposal.originalWorkTime || '-'} → ${proposal.recommendedWorkTime || '-'} 조정을 통해 총 ${recommendedManHours}인시를 확보하는 방안을 추천합니다. 추가 확보 공수는 약 ${additionalManHours}인시입니다.`,
    proposal.manHourAdjustmentReason
      ? `판단 근거: ${proposal.manHourAdjustmentReason}`
      : '판단 근거: 작업 공간과 순서 제약을 고려해 인력 증원과 작업시간 조정을 함께 검토하는 방식이 적절합니다.',
  ].join('\n')
}

export function buildOperationalRecommendationText(task, redistribution, proposals = []) {
  const shortage = Math.abs(Number(task.diff || 0)).toFixed(1)
  const latestReportDate = task.latestReportDate || task.analysisDate || '최근 보고일'
  const expectedDelayDays = Number(task.expectedDelayDays || 0)

  if (!proposals.length) {
    return (
      `최신 보고일 ${latestReportDate} 기준 계획 ${task.plannedPct}%, 실제 ${task.actualPct}%로 ` +
      `${shortage}%p 부족합니다. 현재 조정 가능한 하위 세부일정이 없어 월간 세부계획 매핑과 작업지시서 발급 상태를 먼저 확인해야 합니다.`
    )
  }

  const ids = proposals
    .map((proposal) => proposal.workPlanId)
    .filter(Boolean)
    .join(', ')
  const dates = proposals
    .map((proposal) => proposal.date)
    .filter(Boolean)
    .join(', ')
  const targetText = proposals
    .map(
      (proposal) => `${proposal.date || '-'} ${proposal.normalTargetPct}%→${proposal.targetPct}%`,
    )
    .join(', ')

  return [
    `최신 보고일 ${latestReportDate} 기준 계획 ${task.plannedPct}%, 실제 ${task.actualPct}%로 ${shortage}%p 부족하며 예상 지연은 ${expectedDelayDays}일입니다.`,
    `가까운 실행 가능 작업 ${ids ? `${ids}번` : ''}${dates ? `(${dates})` : ''}에 미달분을 분산 반영합니다.`,
    `목표 진척률은 ${targetText} 기준으로 관리하고, 작업명은 기존 세부작업명을 유지한 상태에서 인력·작업시간·비고만 검토합니다.`,
    redistribution?.normalReturnDate
      ? `${redistribution.normalReturnDate} 이후 일정은 기존 목표율로 복귀하는 것을 기준으로 합니다.`
      : '남은 일정은 기존 목표율 복귀를 기준으로 확인합니다.',
  ].join('\n')
}

export function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

export function parseMaybeJson(value) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function unwrapAiApiData(response) {
  if (!isPlainObject(response)) return response
  if (
    'data' in response &&
    ('success' in response || 'isSuccess' in response || 'code' in response)
  ) {
    return response.data
  }
  return response
}

export function pickText(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export function pickNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function readAiResultParts(record) {
  const result = parseMaybeJson(record?.result ?? record ?? {})
  const resultObject = isPlainObject(result) ? result : {}
  const nestedRecommendation = isPlainObject(resultObject.recommendation)
    ? resultObject.recommendation
    : {}
  const body = { ...resultObject, ...nestedRecommendation }
  const changeSummary = isPlainObject(body.changeSummary)
    ? body.changeSummary
    : isPlainObject(resultObject.changeSummary)
      ? resultObject.changeSummary
      : {}
  const detailChanges = Array.isArray(body.detailChanges)
    ? body.detailChanges
    : Array.isArray(resultObject.detailChanges)
      ? resultObject.detailChanges
      : []

  return {
    result,
    resultObject,
    body,
    changeSummary,
    detailChanges,
  }
}

export function findFallbackProposal(proposals, change, index = 0) {
  const workPlanId = Number(change?.workPlanId ?? 0)
  if (workPlanId) {
    const byId = proposals.find((proposal) => Number(proposal.workPlanId || 0) === workPlanId)
    if (byId) return byId
  }
  return proposals[index] || {}
}

export function normalizeAiDetailProposal(task, change, fallback = {}) {
  change = isPlainObject(change) ? change : {}
  const originalRequiredCount = pickNumber(
    change.originalRequiredCount,
    pickNumber(fallback.originalRequiredCount, 0),
  )
  const recommendedRequiredCount = pickNumber(
    change.recommendedRequiredCount,
    pickNumber(fallback.recommendedRequiredCount, originalRequiredCount),
  )

  const proposal = {
    workPlanId: pickNumber(change.workPlanId, pickNumber(fallback.workPlanId, 0)),
    date: pickText(change.date, fallback.date),
    location: pickText(change.location, fallback.location),
    originalName: pickText(change.originalName, fallback.originalName, task.name),
    recommendedName: pickText(
      change.recommendedName,
      fallback.recommendedName,
      change.originalName,
      fallback.originalName,
      task.name,
    ),
    originalRequiredCount,
    recommendedRequiredCount,
    normalTargetPct: change.normalTargetPct ?? fallback.normalTargetPct,
    targetPct: change.targetPct ?? fallback.targetPct,
    catchUpPct: change.catchUpPct ?? fallback.catchUpPct,
    carryOver: Boolean(change.carryOver ?? fallback.carryOver),
    originalNote: pickText(change.originalNote, fallback.originalNote),
    recommendedNote: pickText(
      change.recommendedNote,
      fallback.recommendedNote,
      change.reason,
      change.note,
    ),
    originalWorkTime: pickText(change.originalWorkTime, fallback.originalWorkTime),
    recommendedWorkTime: pickText(
      change.recommendedWorkTime,
      fallback.recommendedWorkTime,
      change.workTime,
    ),
    originalWorkHours: pickNumber(
      change.originalWorkHours,
      pickNumber(fallback.originalWorkHours, 0),
    ),
    recommendedWorkHours: pickNumber(
      change.recommendedWorkHours,
      pickNumber(fallback.recommendedWorkHours, 0),
    ),
    originalManHours: pickNumber(change.originalManHours, pickNumber(fallback.originalManHours, 0)),
    recommendedManHours: pickNumber(
      change.recommendedManHours,
      pickNumber(fallback.recommendedManHours, 0),
    ),
    additionalManHours: pickNumber(
      change.additionalManHours,
      pickNumber(fallback.additionalManHours, 0),
    ),
    addedWorkers: pickNumber(change.addedWorkers, pickNumber(fallback.addedWorkers, 0)),
    addedWorkHours: pickNumber(change.addedWorkHours, pickNumber(fallback.addedWorkHours, 0)),
    manHourAdjustmentReason: pickText(
      change.manHourAdjustmentReason,
      change.reason,
      fallback.manHourAdjustmentReason,
    ),
    trade: pickText(change.trade, fallback.trade, task.process),
    partner: pickText(change.partner, fallback.partner),
    manager: pickText(change.manager, fallback.manager),
    contact: pickText(change.contact, fallback.contact),
    parentWorkPlanId:
      change.parentWorkPlanId ?? fallback.parentWorkPlanId ?? task.monthlyWorkPlanId ?? null,
    tradeProcessId: change.tradeProcessId ?? fallback.tradeProcessId ?? null,
    isEditing: false,
    isUserEdited: false,
  }

  refreshProposalManHours(proposal)
  return proposal
}
