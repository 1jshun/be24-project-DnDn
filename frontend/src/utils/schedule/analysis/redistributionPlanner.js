import {
  DAY_MS,
  addDays,
  calcExpectedDelayDays,
  clampPct,
  daysInclusive,
  parseDate,
  roundPct,
  toDateKey,
} from './analysisUtils.js'

export function getPlanId(plan) {
  return Number(plan?.idx ?? plan?.id ?? plan?.workPlanId ?? 0)
}

function isActionableDetailSchedule(schedule) {
  const id = getPlanId(schedule)
  const requiredCount = Number(schedule?.requiredCount ?? 0)
  const date = schedule?.startDate || schedule?.date
  return !!id && !!date && requiredCount > 0
}

function isSameOrAfter(dateValue, baseValue) {
  const d = parseDate(dateValue)
  const b = parseDate(baseValue)
  if (!d || !b) return false
  return d >= b
}

function hasTodayReportForMonthlyTask(detailSchedules, hasTodayReportForSchedule) {
  return (
    Array.isArray(detailSchedules) &&
    detailSchedules.some((schedule) => hasTodayReportForSchedule(schedule))
  )
}

const DEFAULT_WORK_START_TIME = '07:00'
const DEFAULT_WORK_END_TIME = '17:00'
const REST_HOURS = 2 // 07:00~17:00을 실작업 8시간으로 보기 위한 휴게시간
const MAX_WORK_HOURS = 10 // 하루 실작업 최대 권장 시간
const MAX_EXTRA_WORKERS_RATIO = 0.3 // 기존 인력 대비 최대 30% 증원 권장

function parseWorkTimeFromNote(note = '') {
  const text = String(note || '')

  const match = text.match(/\[작업시간\]\s*(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})/)

  if (!match) {
    return {
      startTime: DEFAULT_WORK_START_TIME,
      endTime: DEFAULT_WORK_END_TIME,
      workHours: calcWorkHours(DEFAULT_WORK_START_TIME, DEFAULT_WORK_END_TIME),
      source: 'DEFAULT',
    }
  }

  const startTime = match[1]
  const endTime = match[2]

  return {
    startTime,
    endTime,
    workHours: calcWorkHours(startTime, endTime),
    source: 'NOTE',
  }
}

function calcWorkHours(startTime, endTime) {
  const [sh, sm] = String(startTime).split(':').map(Number)
  const [eh, em] = String(endTime).split(':').map(Number)

  const startMinutes = sh * 60 + sm
  const endMinutes = eh * 60 + em
  const diffHours = Math.max(0, (endMinutes - startMinutes) / 60)

  // 예: 07:00~17:00 = 10시간 체류 - 휴게 2시간 = 실작업 8시간
  return Math.max(1, diffHours - REST_HOURS)
}

function addWorkHoursToStartTime(startTime, workHours) {
  const [sh, sm] = String(startTime).split(':').map(Number)

  // 실작업시간 + 휴게시간을 포함해서 종료 시각 계산
  const totalMinutes = sh * 60 + sm + Math.round((workHours + REST_HOURS) * 60)

  const hh = Math.floor(totalMinutes / 60)
  const mm = totalMinutes % 60

  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function calcManHours(workerCount, workHours) {
  return Number((Number(workerCount || 0) * Number(workHours || 0)).toFixed(1))
}

function parseWorkTimeRange(timeRange = '') {
  const text = String(timeRange || '')
  const match = text.match(/(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})/)

  if (!match) {
    return {
      startTime: DEFAULT_WORK_START_TIME,
      endTime: DEFAULT_WORK_END_TIME,
      workHours: calcWorkHours(DEFAULT_WORK_START_TIME, DEFAULT_WORK_END_TIME),
    }
  }

  return {
    startTime: match[1],
    endTime: match[2],
    workHours: calcWorkHours(match[1], match[2]),
  }
}

export function refreshProposalManHours(proposal) {
  if (!proposal) return

  const originalRange = parseWorkTimeRange(proposal.originalWorkTime)
  const recommendedRange = parseWorkTimeRange(proposal.recommendedWorkTime)
  const originalWorkers = Number(proposal.originalRequiredCount || 0)
  const recommendedWorkers = Number(proposal.recommendedRequiredCount || 0)

  proposal.originalWorkHours = originalRange.workHours
  proposal.recommendedWorkHours = recommendedRange.workHours
  proposal.originalManHours = calcManHours(originalWorkers, originalRange.workHours)
  proposal.recommendedManHours = calcManHours(recommendedWorkers, recommendedRange.workHours)
  proposal.additionalManHours = Number(
    Math.max(0, proposal.recommendedManHours - proposal.originalManHours).toFixed(1),
  )
  proposal.addedWorkers = Math.max(0, recommendedWorkers - originalWorkers)
  proposal.addedWorkHours = Number(
    Math.max(0, proposal.recommendedWorkHours - proposal.originalWorkHours).toFixed(1),
  )
}

function buildManHourAdjustment(schedule, targetRatio) {
  const currentWorkers = Number(schedule?.requiredCount ?? 0)
  const workTime = parseWorkTimeFromNote(schedule?.note || '')

  const originalWorkHours = workTime.workHours
  const originalManHours = calcManHours(currentWorkers, originalWorkHours)

  if (!currentWorkers || targetRatio <= 1) {
    return {
      originalWorkTime: `${workTime.startTime} ~ ${workTime.endTime}`,
      recommendedWorkTime: `${workTime.startTime} ~ ${workTime.endTime}`,
      originalWorkHours,
      recommendedWorkHours: originalWorkHours,
      originalManHours,
      recommendedManHours: originalManHours,
      additionalManHours: 0,
      recommendedRequiredCount: currentWorkers,
      addedWorkers: 0,
      addedWorkHours: 0,
      adjustmentReason: '추가 공수 조정 없이 기존 계획 유지가 가능합니다.',
    }
  }

  const requiredManHours = originalManHours * targetRatio
  const shortageManHours = Math.max(0, requiredManHours - originalManHours)

  let recommendedWorkers = currentWorkers
  let recommendedWorkHours = originalWorkHours

  // 1순위: 작업시간을 먼저 소폭 늘림
  if (targetRatio <= 1.15) {
    recommendedWorkHours = Math.min(MAX_WORK_HOURS, originalWorkHours + 1)
  }
  // 2순위: 인력 소폭 추가 + 작업시간 연장
  else if (targetRatio <= 1.35) {
    recommendedWorkers = currentWorkers + 1
    recommendedWorkHours = Math.min(MAX_WORK_HOURS, originalWorkHours + 1)
  }
  // 3순위: 인력 1~2명 추가 + 작업시간 1.5~2시간 연장
  else {
    const maxExtraWorkers = Math.max(1, Math.ceil(currentWorkers * MAX_EXTRA_WORKERS_RATIO))
    const estimatedExtraWorkers = Math.ceil(currentWorkers * Math.min(0.3, (targetRatio - 1) * 0.5))

    recommendedWorkers = currentWorkers + Math.min(maxExtraWorkers, estimatedExtraWorkers)
    recommendedWorkHours = Math.min(MAX_WORK_HOURS, originalWorkHours + 1.5)
  }

  const recommendedEndTime = addWorkHoursToStartTime(workTime.startTime, recommendedWorkHours)
  const recommendedManHours = calcManHours(recommendedWorkers, recommendedWorkHours)

  return {
    originalWorkTime: `${workTime.startTime} ~ ${workTime.endTime}`,
    recommendedWorkTime: `${workTime.startTime} ~ ${recommendedEndTime}`,
    originalWorkHours,
    recommendedWorkHours,
    originalManHours,
    recommendedManHours,
    additionalManHours: Number((recommendedManHours - originalManHours).toFixed(1)),
    shortageManHours: Number(shortageManHours.toFixed(1)),
    recommendedRequiredCount: recommendedWorkers,
    addedWorkers: Math.max(0, recommendedWorkers - currentWorkers),
    addedWorkHours: Number((recommendedWorkHours - originalWorkHours).toFixed(1)),
    adjustmentReason:
      targetRatio > 1.35
        ? '미달분이 커서 인력 소폭 증원과 작업시간 연장을 함께 검토하는 방식이 적절합니다.'
        : targetRatio > 1.15
          ? '작업시간 연장만으로는 부족할 수 있어 인력 1명 추가와 작업시간 연장을 함께 검토합니다.'
          : '미달분이 크지 않아 인력 증원보다 작업시간 소폭 연장 중심의 만회가 적절합니다.',
  }
}

export function buildRedistributionPlan(task, { hasTodayReportForSchedule = () => false } = {}) {
  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const analysisBaseDate = parseDate(task?.analysisDate || task?.latestReportDate) || today

  const start = parseDate(task?.plannedStart)
  const end = parseDate(task?.plannedEnd || task?.originalEnd)
  const plannedPct = clampPct(task?.plannedPct ?? 0)
  const actualPct = clampPct(task?.actualPct ?? 0)
  const detailSchedules = (Array.isArray(task?.detailSchedules) ? task.detailSchedules : []).filter(
    isActionableDetailSchedule,
  )

  const hasTodayReport =
    hasTodayReportForMonthlyTask(detailSchedules, hasTodayReportForSchedule) ||
    task?.hasReport === true ||
    task?.actualSource === 'DAILY_REPORT'
  const beforeWorkEnd = toDateKey(analysisBaseDate) === toDateKey(today) && now.getHours() < 17

  // 공사일보가 있으면 해당 분석 기준일의 실적은 반영된 것으로 보고, 만회 대상은 다음 날부터 시작한다.
  // 공사일보가 없으면 분석 기준일 당일 일정도 아직 진행 대상으로 포함한다.
  const redistributionBaseDate = hasTodayReport ? addDays(analysisBaseDate, 1) : analysisBaseDate
  const remainingSchedules = detailSchedules.filter((s) =>
    isSameOrAfter(s.startDate || s.date, redistributionBaseDate),
  )

  const emptyResult = (overrides = {}) => ({
    level: '계산 불가',
    remainingProgress: roundPct(100 - actualPct, 1),
    delayedProgress: roundPct(Math.max(0, plannedPct - actualPct), 1),
    remainingDays: 0,
    remainingScheduleCount: 0,
    catchUpScheduleCount: 0,
    normalDailyRate: 0,
    requiredDailyRate: 0,
    requiredPerScheduleRate: 0,
    catchUpPerScheduleRate: 0,
    focusedTargetRate: 0,
    ratio: 0,
    recommendedWorkers: 0,
    extensionDays: 0,
    hasTodayReport,
    beforeWorkEnd,
    carryOverFromToday: false,
    normalReturnDate: '',
    action: '월간 세부계획의 시작일과 종료일을 확인해야 일정 재분배를 계산할 수 있습니다.',
    days: [],
    ...overrides,
  })

  if (!start || !end) return emptyResult()

  const totalDays = daysInclusive(start, end)
  const normalDailyRate = 100 / totalDays
  const remainingProgress = Math.max(0, 100 - actualPct)
  const delayedProgress = Math.max(0, plannedPct - actualPct)
  const remainingDays = Math.max(0, Math.round((end - redistributionBaseDate) / DAY_MS) + 1)
  const carryOverFromToday = hasTodayReport && delayedProgress > 0

  if (actualPct >= 100 || remainingProgress <= 0) {
    return emptyResult({
      level: '완료',
      remainingProgress: 0,
      delayedProgress: 0,
      remainingDays,
      remainingScheduleCount: remainingSchedules.length,
      normalDailyRate: roundPct(normalDailyRate, 1),
      action: '월간 세부계획 진척률이 100%에 도달했습니다. 후속 공정 착수 가능 여부를 확인하세요.',
    })
  }

  if (remainingDays <= 0) {
    return emptyResult({
      level: '일정 변경 검토',
      remainingProgress: roundPct(remainingProgress, 1),
      delayedProgress: roundPct(delayedProgress, 1),
      remainingDays: 0,
      remainingScheduleCount: remainingSchedules.length,
      normalDailyRate: roundPct(normalDailyRate, 1),
      requiredDailyRate: roundPct(remainingProgress, 1),
      requiredPerScheduleRate: remainingSchedules.length
        ? roundPct(remainingProgress / remainingSchedules.length, 1)
        : 0,
      ratio: 999,
      extensionDays: Math.max(1, calcExpectedDelayDays(start, end, 100, actualPct)),
      carryOverFromToday,
      action: hasTodayReport
        ? '금일 공사일보는 반영되었지만 종료일까지 남은 하위 세부일정이 없습니다. 미완료분에 대한 일정 변경 요청을 검토하세요.'
        : '계획 종료일이 지났으므로 납기 내 만회가 어렵습니다. 지연 사유 확인 후 일정 변경 요청을 검토하세요.',
    })
  }

  if (!remainingSchedules.length) {
    return emptyResult({
      level: '세부일정 확인 필요',
      remainingProgress: roundPct(remainingProgress, 1),
      delayedProgress: roundPct(delayedProgress, 1),
      remainingDays,
      remainingScheduleCount: 0,
      normalDailyRate: roundPct(normalDailyRate, 1),
      requiredDailyRate: roundPct(remainingProgress / remainingDays, 1),
      action: hasTodayReport
        ? '금일 공사일보가 제출되어 오늘 일정은 실적에 반영했습니다. 미완료분을 이어받을 다음 하위 세부일정 매핑을 확인하세요.'
        : '남은 기간에 연결된 하위 세부일정이 없습니다. 월간 세부계획 아래의 주간/일일 계획 매핑을 먼저 확인하세요.',
    })
  }

  const requiredDailyRate = remainingProgress / remainingDays

  // 핵심: 남은 전체 작업량을 모든 일정에 균등 분배하지 않고,
  // 계획 대비 밀린 양(delayedProgress)만 1~3개의 가까운 하위 세부일정에 집중 만회한다.
  // 이후 일정은 기존 일일 목표 수준으로 복귀하는 것을 기본 목표로 한다.
  let targetCatchUpCount = 0
  if (delayedProgress > 0) {
    if (delayedProgress <= normalDailyRate * 0.5) targetCatchUpCount = 1
    else if (delayedProgress <= normalDailyRate * 1.0) targetCatchUpCount = 2
    else if (delayedProgress <= normalDailyRate * 1.5) targetCatchUpCount = 3
    else targetCatchUpCount = 3
  }

  const catchUpSchedules = remainingSchedules.slice(
    0,
    Math.min(targetCatchUpCount, remainingSchedules.length),
  )
  const catchUpScheduleCount = catchUpSchedules.length
  const catchUpPerScheduleRate =
    catchUpScheduleCount > 0 ? delayedProgress / catchUpScheduleCount : 0
  const focusedTargetRate =
    catchUpScheduleCount > 0 ? normalDailyRate + catchUpPerScheduleRate : normalDailyRate
  const ratio = normalDailyRate > 0 ? focusedTargetRate / normalDailyRate : 0

  let level = '기존 세부일정 유지 가능'
  let action = hasTodayReport
    ? '금일 공사일보는 이미 반영했습니다. 계획 대비 미달분이 없어 남은 하위 세부일정은 기존 목표대로 진행하면 됩니다.'
    : beforeWorkEnd
      ? '금일 작업이 아직 진행 중입니다. 현재 기준으로는 기존 세부일정 흐름을 유지하며 공사일보 제출 후 재분석하세요.'
      : '금일 공사일보가 아직 제출되지 않았습니다. 공사일보 제출 후 미달분 발생 여부를 기준으로 재분배를 확정하세요.'
  let extensionDays = 0

  if (delayedProgress > 0) {
    if (ratio > 1.5) {
      level = '집중 만회 고위험'
      action = hasTodayReport
        ? `금일 실적 반영 후 계획 대비 ${roundPct(delayedProgress, 1)}%p가 부족합니다. ${catchUpScheduleCount}개 하위 세부일정에 미완료분을 집중 반영하되, 작업 간섭이 크면 공수 조정 또는 일정 변경 검토가 필요합니다.`
        : `계획 대비 ${roundPct(delayedProgress, 1)}%p가 부족합니다. 가까운 ${catchUpScheduleCount}개 하위 세부일정에 집중 만회 계획을 배치하고, 인력과 작업시간 조정을 검토하세요.`
      extensionDays = Math.max(
        1,
        Math.ceil(delayedProgress / normalDailyRate - catchUpScheduleCount),
      )
    } else if (ratio > 1.2) {
      level = '집중 만회 추가 공수 필요'
      action = hasTodayReport
        ? `금일 미완료분 ${roundPct(delayedProgress, 1)}%p를 내일 이후 ${catchUpScheduleCount}개 하위 세부일정에 집중 반영하면 정상 일정 복귀가 가능합니다. 인력과 작업시간을 함께 조정하세요.`
        : `계획 대비 미달분 ${roundPct(delayedProgress, 1)}%p를 가까운 ${catchUpScheduleCount}개 하위 세부일정에 집중 반영하고, 인력과 작업시간 조정을 검토하세요.`
    } else if (ratio > 1.0) {
      level = '집중 만회 가능'
      action = hasTodayReport
        ? `금일 미완료분 ${roundPct(delayedProgress, 1)}%p를 다음 ${catchUpScheduleCount}개 하위 세부일정에 소폭 추가하면 정상 일정으로 복귀할 수 있습니다.`
        : `계획 대비 미달분 ${roundPct(delayedProgress, 1)}%p를 가까운 하위 세부일정에 소폭 반영하면 종료일 변경 없이 만회 가능합니다.`
    }
  }

  const days = catchUpSchedules.map((schedule) => {
    const currentRequiredCount = Number(schedule.requiredCount ?? 0)
    const manHourAdjustment = buildManHourAdjustment(schedule, ratio)

    return {
      id: getPlanId(schedule),
      date: toDateKey(schedule.startDate || schedule.date),
      name: schedule.name || schedule.processName || '세부일정',
      location: schedule.location || schedule.zone || '',
      targetPct: roundPct(focusedTargetRate, 1),
      normalTargetPct: roundPct(normalDailyRate, 1),
      catchUpPct: roundPct(catchUpPerScheduleRate, 1),
      carryOver: carryOverFromToday || delayedProgress > 0,
      note: delayedProgress > 0 ? '미완료분 집중 반영' : '',

      currentRequiredCount,
      recommendedRequiredCount: manHourAdjustment.recommendedRequiredCount,

      originalWorkTime: manHourAdjustment.originalWorkTime,
      recommendedWorkTime: manHourAdjustment.recommendedWorkTime,
      originalWorkHours: manHourAdjustment.originalWorkHours,
      recommendedWorkHours: manHourAdjustment.recommendedWorkHours,
      originalManHours: manHourAdjustment.originalManHours,
      recommendedManHours: manHourAdjustment.recommendedManHours,
      additionalManHours: manHourAdjustment.additionalManHours,
      shortageManHours: manHourAdjustment.shortageManHours,
      addedWorkers: manHourAdjustment.addedWorkers,
      addedWorkHours: manHourAdjustment.addedWorkHours,
      manHourAdjustmentReason: manHourAdjustment.adjustmentReason,

      originalNote: schedule.note || '',
      trade: schedule.trade || '',
      partner: schedule.partner || '',
      manager: schedule.manager || '',
      contact: schedule.contact || '',
      parentWorkPlanId:
        schedule.parentWorkPlanId || schedule.parent_work_plan_id || schedule.parentId || null,
      tradeProcessId: schedule.tradeProcessId || schedule.trade_process_id || null,
    }
  })

  const normalReturnDate = remainingSchedules[catchUpScheduleCount]
    ? toDateKey(
        remainingSchedules[catchUpScheduleCount].startDate ||
          remainingSchedules[catchUpScheduleCount].date,
      )
    : ''

  const maxAddedWorkers = days.length
    ? Math.max(...days.map((d) => Number(d.addedWorkers || 0)))
    : 0

  return {
    level,
    remainingProgress: roundPct(remainingProgress, 1),
    delayedProgress: roundPct(delayedProgress, 1),
    remainingDays,
    remainingScheduleCount: remainingSchedules.length,
    catchUpScheduleCount,
    normalDailyRate: roundPct(normalDailyRate, 1),
    requiredDailyRate: roundPct(requiredDailyRate, 1),
    requiredPerScheduleRate: roundPct(focusedTargetRate, 1),
    catchUpPerScheduleRate: roundPct(catchUpPerScheduleRate, 1),
    focusedTargetRate: roundPct(focusedTargetRate, 1),
    ratio: Math.round(ratio * 100) / 100,
    recommendedWorkers: maxAddedWorkers,
    extensionDays,
    hasTodayReport,
    beforeWorkEnd,
    carryOverFromToday,
    normalReturnDate,
    action,
    days,
  }
}
