export const LEVEL_THRESHOLDS = [0, 30, 50, 65, 78, 88, 95, 100]
export const ESG_SITE_FLOOR_POINT = 300
export const ESG_ZONE_FLOOR_POINT = 500
export const ESG_FLOOR_POINT = ESG_SITE_FLOOR_POINT
export const WHEEL_WASH_REPLENISHMENT_LITERS_PER_EQUIPMENT = 3
export const ESG_CATEGORY_WEIGHTS = Object.freeze({ E: 50, S: 30, G: 20 })
export const ESG_METRIC_CARD_WEIGHTS = Object.freeze([40, 30, 20, 10])

export const HIGH_RISK_EQUIPMENT_KEYWORDS = [
  '타워크레인',
  '크레인',
  '리프트',
  '펌프카',
  '덤프트럭',
  '고소작업대',
  '고소작업차',
  '굴착기',
]


export const DUST_WORK_KEYWORDS = [
  '굴착',
  '토사',
  '반출',
  '절단',
  '연마',
  '외부',
  '마감',
  '도장',
]

export const EQUIPMENT_CARBON_FACTORS = [
  { keywords: ['콘크리트펌프카', '펌프카'], factor: 2.2 },
  { keywords: ['굴착기'], factor: 2.0 },
  { keywords: ['덤프트럭'], factor: 2.0 },
  { keywords: ['타워크레인', '크레인'], factor: 1.7 },
  { keywords: ['카고트럭'], factor: 1.6 },
  { keywords: ['고소작업차', '고소작업대', '리프트'], factor: 1.5 },
  { keywords: ['지게차'], factor: 1.2 },
]

export const METRIC_COLOR_CLASS = {
  emerald: { icon: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500', score: 'text-emerald-800' },
  sky: { icon: 'bg-sky-50 text-sky-700', bar: 'bg-sky-500', score: 'text-sky-800' },
  violet: { icon: 'bg-violet-50 text-violet-700', bar: 'bg-violet-500', score: 'text-violet-800' },
  amber: { icon: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500', score: 'text-amber-700' },
  rose: { icon: 'bg-rose-50 text-rose-700', bar: 'bg-rose-500', score: 'text-rose-700' },
}

export function resolveLevel(score) {
  const normalizedScore = Number(score) || 0
  if (normalizedScore <= 0) return 0

  let level = 1

  for (let index = 0; index < LEVEL_THRESHOLDS.length; index += 1) {
    if (normalizedScore >= LEVEL_THRESHOLDS[index]) {
      level = index + 1
    }
  }

  return Math.max(1, Math.min(7, level))
}

export function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0) * 10) / 10))
}

export function normalizeCumulativeScore(value) {
  const score = Number(value)
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.round(score * 10) / 10)
}

export function normalizeFloorLevel(value) {
  const level = Number(value)
  if (!Number.isFinite(level)) return 0
  return Math.max(0, Math.floor(level))
}

export function normalizeFloorProgressPoint(score, floorPoint = ESG_SITE_FLOOR_POINT) {
  const safeScore = normalizeCumulativeScore(score)
  const safeFloorPoint = normalizeFloorPoint(floorPoint)
  return Math.round((safeScore % safeFloorPoint) * 10) / 10
}

export function getEsgFloorAbsoluteScore(level, pointScore, floorPoint = ESG_SITE_FLOOR_POINT) {
  const safeFloorPoint = normalizeFloorPoint(floorPoint)
  const safeLevel = normalizeFloorLevel(level)
  const safePointScore = normalizeFloorProgressPoint(pointScore, safeFloorPoint)
  return Math.round(((safeLevel * safeFloorPoint) + safePointScore) * 10) / 10
}

export function getEsgFloorProgressByPoint(pointScore, floorPoint = ESG_SITE_FLOOR_POINT) {
  const safeFloorPoint = normalizeFloorPoint(floorPoint)
  return Math.min(100, Math.round((normalizeFloorProgressPoint(pointScore, safeFloorPoint) / safeFloorPoint) * 100))
}

export function getNextEsgFloorPointByPoint(pointScore, floorPoint = ESG_SITE_FLOOR_POINT) {
  const safeFloorPoint = normalizeFloorPoint(floorPoint)
  const safePointScore = normalizeFloorProgressPoint(pointScore, safeFloorPoint)
  return Math.round((safeFloorPoint - safePointScore) * 10) / 10
}

export function formatEsgFloorProgressScore(
  level,
  pointScore,
  { decimals = 1, showMax = false, floorPoint = ESG_SITE_FLOOR_POINT } = {},
) {
  const safeFloorPoint = normalizeFloorPoint(floorPoint)
  const safeLevel = normalizeFloorLevel(level)
  const safePointScore = normalizeFloorProgressPoint(pointScore, safeFloorPoint)
  const pointText = Number(safePointScore.toFixed(decimals)).toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  const suffix = showMax ? ` / ${safeFloorPoint}점` : ''
  return `${safeLevel}층 ${pointText}점${suffix}`
}

export function formatEsgFloorProgressScoreCompact(
  level,
  pointScore,
  floorPoint = ESG_SITE_FLOOR_POINT,
) {
  const safeFloorPoint = normalizeFloorPoint(floorPoint)
  const safeLevel = normalizeFloorLevel(level)
  const safePointScore = Math.round(normalizeFloorProgressPoint(pointScore, safeFloorPoint))
  return `${safeLevel}층${safePointScore}점`
}

function normalizeFloorPoint(value, fallback = ESG_SITE_FLOOR_POINT) {
  const floorPoint = Number(value)
  return Number.isFinite(floorPoint) && floorPoint > 0 ? floorPoint : fallback
}

export function resolveEsgFloor(score, floorPoint = ESG_SITE_FLOOR_POINT) {
  const safeScore = normalizeCumulativeScore(score)
  const safeFloorPoint = normalizeFloorPoint(floorPoint)
  return Math.floor(safeScore / safeFloorPoint)
}

export function getEsgFloorPoint(score, floorPoint = ESG_SITE_FLOOR_POINT) {
  const safeScore = normalizeCumulativeScore(score)
  const safeFloorPoint = normalizeFloorPoint(floorPoint)
  return Math.round((safeScore % safeFloorPoint) * 10) / 10
}

export function getEsgFloorProgress(score, floorPoint = ESG_SITE_FLOOR_POINT) {
  const safeFloorPoint = normalizeFloorPoint(floorPoint)
  return Math.min(100, Math.round((getEsgFloorPoint(score, safeFloorPoint) / safeFloorPoint) * 100))
}

export function getNextEsgFloorPoint(score, floorPoint = ESG_SITE_FLOOR_POINT) {
  const safeFloorPoint = normalizeFloorPoint(floorPoint)
  return Math.round((safeFloorPoint - getEsgFloorPoint(score, safeFloorPoint)) * 10) / 10
}

export function formatEsgFloorScore(
  score,
  { decimals = 1, showMax = false, floorPoint = ESG_SITE_FLOOR_POINT } = {},
) {
  const safeFloorPoint = normalizeFloorPoint(floorPoint)
  const floor = resolveEsgFloor(score, safeFloorPoint)
  const point = getEsgFloorPoint(score, safeFloorPoint)
  const pointText = Number(point.toFixed(decimals)).toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  const suffix = showMax ? ` / ${safeFloorPoint}점` : ''
  return `${floor}층 ${pointText}점${suffix}`
}

export function formatEsgFloorScoreCompact(score, floorPoint = ESG_SITE_FLOOR_POINT) {
  const safeFloorPoint = normalizeFloorPoint(floorPoint)
  const floor = resolveEsgFloor(score, safeFloorPoint)
  const point = Math.round(getEsgFloorPoint(score, safeFloorPoint))
  return `${floor}층${point}점`
}
function resolveMetricInput(context = {}) {
  const metricInputs = normalizeList(context.metricInputs)
  const zoneName = firstNonBlank(context.zoneName)

  if (!metricInputs.length) {
    return {}
  }

  const matchedZoneInput = metricInputs.find((item) => {
    return zoneName && firstNonBlank(item.zoneName) === zoneName
  })

  if (matchedZoneInput) {
    return matchedZoneInput
  }

  return metricInputs.find((item) => {
    const inputZoneName = firstNonBlank(item.zoneName)
    return !inputZoneName || inputZoneName === '전체 현장' || inputZoneName === 'SITE'
  }) ?? {}
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    const number = Number(value)
    if (Number.isFinite(number)) return number
  }
  return null
}

export function buildEsgMetrics(equipments, context = {}) {
  const equipmentList = Array.isArray(equipments) ? equipments : []
  const analysis = context.weatherAnalysis ?? {}
  const airQuality = context.airQuality ?? {}
  const metricInput = resolveMetricInput(context)
  const missionRate = Number.isFinite(context.missionRate) ? Number(context.missionRate) : 0
  const weatherRiskCount = Number.isFinite(context.weatherRiskCount) ? Number(context.weatherRiskCount) : 0
  const reportRate = Number.isFinite(context.reportRate) ? Number(context.reportRate) : null
  const actionTrackingRate = Number.isFinite(context.actionTrackingRate) ? Number(context.actionTrackingRate) : null
  const dataLinkRate = Number.isFinite(context.dataLinkRate) ? Number(context.dataLinkRate) : null
  const safetyDays = Number.isFinite(context.safetyDays) ? Number(context.safetyDays) : 1
  const workerMetrics = buildWorkerMetrics(context.workers, context.staffingWorkers, context.staffingZones, context.zoneName)

  const totalEquipmentCount = equipmentList.reduce((sum, equipment) => {
    return sum + normalizeCount(equipment.equipmentCount)
  }, 0)
  const highRiskEquipmentCount = equipmentList.reduce((sum, equipment) => {
    if (!isHighRiskEquipment(equipment.equipmentName)) return sum
    return sum + normalizeCount(equipment.equipmentCount)
  }, 0)
  const washTargetCount = totalEquipmentCount
  const carbonLoadIndex = roundOne(equipmentList.reduce((sum, equipment) => {
    return sum + getEquipmentCarbonFactor(equipment.equipmentName) * normalizeCount(equipment.equipmentCount)
  }, 0))
  const workLocationCount = new Set(
    equipmentList.map((equipment) => firstNonBlank(equipment.workLocation)).filter(Boolean),
  ).size
  const gateCount = new Set(
    equipmentList
      .map((equipment) => equipment.gateIdx)
      .filter((gateIdx) => gateIdx !== null && gateIdx !== undefined),
  ).size
  const gateEquipmentCounts = equipmentList.reduce((counts, equipment) => {
    const gateIdx = equipment.gateIdx
    if (gateIdx === null || gateIdx === undefined || gateIdx === '') {
      return counts
    }

    const key = String(gateIdx)
    counts.set(key, (counts.get(key) ?? 0) + normalizeCount(equipment.equipmentCount))
    return counts
  }, new Map())
  const assignedGateEquipmentCount = Array.from(gateEquipmentCounts.values()).reduce((sum, count) => sum + count, 0)
  const maxGateEquipmentCount = Math.max(0, ...Array.from(gateEquipmentCounts.values()))
  const gateConcentrationRate = assignedGateEquipmentCount
    ? Math.round((maxGateEquipmentCount / assignedGateEquipmentCount) * 100)
    : 0
  const idealGateShare = gateCount > 0 ? 100 / gateCount : 100
  const singleGatePenalty = gateCount <= 1 && assignedGateEquipmentCount >= 4
    ? Math.min(40, (assignedGateEquipmentCount - 3) * 5)
    : 0
  const gateImbalancePenalty = gateCount >= 2
    ? Math.max(0, gateConcentrationRate - idealGateShare - 15) * 0.8
    : 0
  const gateCongestionRisk = clampNumber(
    Math.round((singleGatePenalty + gateImbalancePenalty) / 10),
    0,
    10,
  )
  const idleReductionScore = clampScore(100 - singleGatePenalty - gateImbalancePenalty)
  const dustWorkCount = buildDustWorkCount(equipmentList)

  const rainPercent = Number(analysis.precipitationProbability ?? 0)
  const windSpeed = Number(analysis.maxWindSpeed ?? 0)
  const fineDustValue = Number(firstFiniteNumber(metricInput.fineDustValue, airQuality.value, analysis.fineDustValue) ?? 0)
  const estimatedWashWaterLiters = Math.round(
    washTargetCount * WHEEL_WASH_REPLENISHMENT_LITERS_PER_EQUIPMENT,
  )
  const washWaterDemandRisk = clampNumber(
    Math.round(
      washTargetCount * 0.55
        + (rainPercent >= 60 ? 1 : 0)
        + (fineDustValue >= 80 ? 1 : 0),
    ),
    0,
    10,
  )
  const fineDustRiskLevel = fineDustValue >= 151 ? 4 : fineDustValue >= 81 ? 3 : fineDustValue >= 31 ? 1 : 0
  const complaintCount = Math.max(0, Math.round(firstFiniteNumber(metricInput.complaintCount, context.complaintCount) ?? 0))
  const complaintResolvedCount = Math.max(0, Math.round(firstFiniteNumber(metricInput.complaintResolvedCount, context.complaintResolvedCount) ?? 0))
  const validComplaintResolvedCount = Math.min(complaintCount, complaintResolvedCount)
  const unresolvedComplaintCount = Math.max(0, complaintCount - validComplaintResolvedCount)
  const complaintResolutionRate = complaintCount > 0
    ? clampScore((validComplaintResolvedCount / complaintCount) * 100)
    : 100
  const complaintRisk = clampNumber(
    Math.round(
      unresolvedComplaintCount * 1.5
        + complaintCount * 0.35
        + fineDustRiskLevel * 0.8,
    ),
    0,
    10,
  )
  const powerPeakRisk = clampNumber(
    Math.round(
      gateCount * 0.8
        + Math.max(0, totalEquipmentCount - 4) * 0.6
        + (rainPercent >= 60 || fineDustValue >= 80 ? 1 : 0)
        + washTargetCount * 0.25,
    ),
    0,
    10,
  )
  const actualCarbonKg = firstFiniteNumber(metricInput.carbonKg, context.actualCarbonKg)
  const estimatedCarbonKg = actualCarbonKg !== null
    ? Math.max(0, Math.round(actualCarbonKg))
    : Math.max(0, Math.round(carbonLoadIndex * 6.8 + highRiskEquipmentCount * 2.5))
  const actualPowerSavingKwh = firstFiniteNumber(metricInput.powerSavingKwh, context.actualPowerSavingKwh)
  const powerSavingKwh = actualPowerSavingKwh !== null
    ? Math.max(0, Math.round(actualPowerSavingKwh))
    : (totalEquipmentCount > 0 ? Math.max(0, Math.round(42 + gateCount * 7 + Math.max(0, 10 - powerPeakRisk) * 3)) : 0)

  const carbonScore = clampScore(100 - Math.min(40, carbonLoadIndex * 4))
  const waterScore = clampScore(100 - Math.min(35, washWaterDemandRisk * 3.5))
  const fineDustScore = clampScore(100 - fineDustRiskLevel * 12 - dustWorkCount * 2)
  const powerScore = clampScore(100 - Math.min(25, powerPeakRisk * 2.5))
  const environmentScore = buildWeightedMetricScore([
    carbonScore,
    waterScore,
    fineDustScore,
    idleReductionScore,
  ])

  const staffingRate = firstFiniteNumber(metricInput.staffingRate, workerMetrics.staffingRate) ?? (totalEquipmentCount > 0 ? missionRate : 0)
  const safetyEducationRate = firstFiniteNumber(metricInput.safetyEducationRate, workerMetrics.safetyEducationRate) ?? (totalEquipmentCount > 0 ? missionRate : 0)
  const weatherProtectionScore = clampScore(100 - weatherRiskCount * 6 - fineDustRiskLevel * 4 - (windSpeed >= 8 ? 6 : 0))
  const routeSafetyScore = clampScore(100 - Math.min(35, highRiskEquipmentCount * 4 + gateCount * 1.5))
  const socialScore = buildWeightedMetricScore([
    safetyEducationRate,
    staffingRate,
    weatherProtectionScore,
    routeSafetyScore,
  ])

  const reportMetrics = buildReportMetrics(context.reports, equipmentList, context.zoneName, weatherRiskCount)
  const resolvedReportRate = firstFiniteNumber(metricInput.reportRate, reportRate, reportMetrics.reportRate) ?? 0
  const resolvedActionTrackingRate = firstFiniteNumber(metricInput.actionTrackingRate, actionTrackingRate, reportMetrics.actionTrackingRate) ?? 0
  const resolvedDataLinkRate = firstFiniteNumber(metricInput.dataLinkRate, dataLinkRate, buildDefaultDataLinkRate(context, totalEquipmentCount)) ?? 0
  const missingCheckCount = Math.max(
    0,
    Math.round((100 - resolvedReportRate) / 25) + Math.max(0, weatherRiskCount - 2),
  )
  const checkScore = clampScore(100 - missingCheckCount * 8)
  const governanceScore = buildWeightedMetricScore([
    resolvedReportRate,
    resolvedActionTrackingRate,
    resolvedDataLinkRate,
    checkScore,
  ])

  const metrics = {
    totalEquipmentCount,
    highRiskEquipmentCount,
    washTargetCount,
    workLocationCount,
    gateCount,
    assignedGateEquipmentCount,
    maxGateEquipmentCount,
    gateConcentrationRate,
    gateCongestionRisk,
    idleReductionScore,
    dustWorkCount,
    weatherRiskCount,
    missionRate,
    rainPercent,
    windSpeed,
    fineDustValue,
    fineDustRiskLevel,
    complaintCount,
    complaintResolvedCount: validComplaintResolvedCount,
    unresolvedComplaintCount,
    complaintResolutionRate,
    complaintRisk,
    carbonLoadIndex,
    estimatedCarbonKg,
    carbonScore,
    estimatedWashWaterLiters,
    washWaterDemandRisk,
    waterScore,
    fineDustScore,
    powerPeakRisk,
    powerSavingKwh,
    powerScore,
    staffingRate,
    safetyEducationRate,
    weatherProtectionScore,
    routeSafetyScore,
    reportRate: clampScore(resolvedReportRate),
    actionTrackingRate: clampScore(resolvedActionTrackingRate),
    dataLinkRate: clampScore(resolvedDataLinkRate),
    missingCheckCount,
    checkScore,
    safetyDays,
    workerCount: workerMetrics.workerCount,
    assignedWorkerCount: workerMetrics.assignedWorkerCount,
    requiredWorkerCount: workerMetrics.requiredWorkerCount,
    trainedWorkerCount: workerMetrics.trainedWorkerCount,
    environmentScore,
    socialScore,
    governanceScore,
    operatingRisk: 0,
  }
  metrics.totalScore = buildTotalScore(metrics)

  return metrics
}

export function createEmptyMetrics() {
  return {
    totalEquipmentCount: 0,
    highRiskEquipmentCount: 0,
    washTargetCount: 0,
    workLocationCount: 0,
    gateCount: 0,
    assignedGateEquipmentCount: 0,
    maxGateEquipmentCount: 0,
    gateConcentrationRate: 0,
    gateCongestionRisk: 0,
    idleReductionScore: 0,
    dustWorkCount: 0,
    weatherRiskCount: 0,
    missionRate: 0,
    rainPercent: 0,
    windSpeed: 0,
    fineDustValue: 0,
    fineDustRiskLevel: 0,
    complaintCount: 0,
    complaintResolvedCount: 0,
    unresolvedComplaintCount: 0,
    complaintResolutionRate: 0,
    complaintRisk: 0,
    carbonLoadIndex: 0,
    estimatedCarbonKg: 0,
    carbonScore: 0,
    estimatedWashWaterLiters: 0,
    washWaterDemandRisk: 0,
    waterScore: 0,
    fineDustScore: 0,
    powerPeakRisk: 0,
    powerSavingKwh: 0,
    powerScore: 0,
    staffingRate: 0,
    safetyEducationRate: 0,
    weatherProtectionScore: 0,
    routeSafetyScore: 0,
    reportRate: 0,
    actionTrackingRate: 0,
    dataLinkRate: 0,
    missingCheckCount: 0,
    checkScore: 0,
    safetyDays: 1,
    workerCount: 0,
    assignedWorkerCount: 0,
    requiredWorkerCount: 0,
    trainedWorkerCount: 0,
    environmentScore: 0,
    socialScore: 0,
    governanceScore: 0,
    totalScore: 0,
    operatingRisk: 0,
  }
}

export function buildTotalScore(metrics) {
  return clampScore(
    (Number(metrics.environmentScore || 0) * ESG_CATEGORY_WEIGHTS.E
      + Number(metrics.socialScore || 0) * ESG_CATEGORY_WEIGHTS.S
      + Number(metrics.governanceScore || 0) * ESG_CATEGORY_WEIGHTS.G) / 100,
  )
}

function buildWeightedMetricScore(scores = []) {
  const safeWeights = ESG_METRIC_CARD_WEIGHTS
  const weightSum = safeWeights.reduce((sum, weight) => sum + Number(weight || 0), 0)
  if (!weightSum) return 0

  const weightedScore = safeWeights.reduce((sum, weight, index) => {
    return sum + clampScore(scores[index] ?? 0) * Number(weight || 0)
  }, 0)

  return clampScore(weightedScore / weightSum)
}

function buildWorkerMetrics(workers, staffingWorkers, staffingZones, zoneName = '') {
  const workerList = normalizeList(workers)
  const staffingList = normalizeList(staffingWorkers)
  const mergedWorkers = staffingList.length ? staffingList : workerList
  const scopedWorkers = filterWorkersByZone(mergedWorkers, zoneName)
  const staffingSummary = buildStaffingZoneSummary(staffingZones, zoneName)
  const workerCount = scopedWorkers.length
  const assignedWorkerCount = staffingSummary.assignedCount ?? scopedWorkers.filter(isAssignedWorker).length
  const requiredWorkerCount = staffingSummary.requiredCount ?? workerCount
  const educationKnown = scopedWorkers.some(hasSafetyEducationSignal)
  const trainedWorkerCount = educationKnown ? scopedWorkers.filter(isSafetyEducationCompleted).length : 0

  const staffingRate = requiredWorkerCount > 0
    ? clampScore((assignedWorkerCount / requiredWorkerCount) * 100)
    : workerCount > 0
      ? clampScore((assignedWorkerCount / workerCount) * 100)
      : null

  return {
    workerCount,
    assignedWorkerCount,
    requiredWorkerCount,
    trainedWorkerCount,
    staffingRate,
    safetyEducationRate: educationKnown && workerCount > 0
      ? Math.round((trainedWorkerCount / workerCount) * 100)
      : null,
  }
}

function buildStaffingZoneSummary(staffingZones, zoneName = '') {
  const zoneRoots = normalizeList(staffingZones)
  const cleanZone = String(zoneName || '').trim()
  if (!cleanZone || cleanZone === '세척장' || cleanZone === '민원 구역') {
    return { requiredCount: null, assignedCount: null }
  }

  const matchedSubZones = zoneRoots.flatMap((zoneRoot) => normalizeList(zoneRoot?.subZones))
    .filter((subZone) => {
      const location = firstNonBlank(subZone.location)
      const title = firstNonBlank(subZone.title)
      return location === cleanZone || title.includes(cleanZone)
    })

  if (!matchedSubZones.length) {
    return { requiredCount: null, assignedCount: null }
  }

  return matchedSubZones.reduce((summary, subZone) => {
    return {
      requiredCount: summary.requiredCount + Math.max(0, Number(subZone.required) || 0),
      assignedCount: summary.assignedCount + Math.max(0, Number(subZone.assignedCount) || 0),
    }
  }, { requiredCount: 0, assignedCount: 0 })
}

function buildReportMetrics(reports, equipments, zoneName = '', weatherRiskCount = 0) {
  const reportList = scopeReportsByZone(normalizeList(reports), zoneName)
  const equipmentList = normalizeList(equipments)
  const workOrderRefs = new Set(
    equipmentList
      .map((equipment) => equipment.workOrderIdx ?? equipment.workOrderId ?? equipment.workOrderRef)
      .filter((value) => value !== null && value !== undefined && value !== ''),
  )
  const expectedReportCount = workOrderRefs.size || (equipmentList.length ? 1 : 0)
  const reportRate = expectedReportCount > 0
    ? Math.min(100, Math.round((reportList.length / expectedReportCount) * 100))
    : reportList.length
      ? 100
      : 0

  const progressValues = reportList
    .map((report) => firstFiniteNumber(report.todayProgress, report.progressIncrementPct, report.actualProgress))
    .filter((progress) => progress !== null)
    .map((progress) => clampScore(progress))
  const actionTrackingRate = progressValues.length
    ? Math.round(progressValues.reduce((sum, progress) => sum + progress, 0) / progressValues.length)
    : 0

  return {
    reportRate,
    actionTrackingRate: weatherRiskCount > 0 || reportList.length ? actionTrackingRate : 0,
  }
}

function scopeReportsByZone(reports, zoneName = '') {
  const reportList = normalizeList(reports)
  const cleanZone = String(zoneName || '').trim()
  if (!cleanZone) return reportList

  if (cleanZone === '세척장') {
    return reportList.filter((report) => reportMatchesAny(report, ['세척장', '세륜', '세척']))
  }

  if (cleanZone === '민원 구역') {
    return reportList.filter((report) => reportMatchesAny(report, ['민원', '주민', '비산', '분진', '소음']))
  }

  return reportList.filter((report) => {
    const location = firstNonBlank(report.location)
    return location === cleanZone || reportMatchesAny(report, [cleanZone])
  })
}

function reportMatchesAny(report, keywords = []) {
  const text = [
    report.location,
    report.process,
    report.issue,
    report.todayWork,
    report.tomorrowPlan,
  ].map((value) => String(value || '')).join(' ')
  return containsAny(text, keywords)
}

export function hasEsgOperationData(metrics, context = {}) {
  return metrics.totalEquipmentCount > 0
    || normalizeList(context.reports).length > 0
    || normalizeList(context.workOrders).length > 0
    || normalizeList(context.workers).length > 0
    || normalizeList(context.staffingWorkers).length > 0
    || normalizeList(context.staffingZones).length > 0
    || (Number(metrics.complaintCount || 0) > 0 || Number(metrics.complaintResolvedCount || 0) > 0)
}

function buildDefaultDataLinkRate(context, equipmentCount) {
  const checks = [
    context.weatherAnalysis != null,
    equipmentCount > 0,
    normalizeList(context.reports).length > 0,
    normalizeList(context.workOrders).length > 0,
    normalizeList(context.workers).length > 0 || normalizeList(context.staffingWorkers).length > 0 || normalizeList(context.staffingZones).length > 0,
  ]
  const linked = checks.filter(Boolean).length
  return Math.round((linked / checks.length) * 100)
}
export function firstNonBlank(...values) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() ?? ''
}

export function normalizeCount(value) {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? count : 1
}

export function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))))
}

export function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0))
}

export function roundOne(value) {
  return Math.round(Number(value || 0) * 10) / 10
}

export function isHighRiskEquipment(equipmentName = '') {
  return HIGH_RISK_EQUIPMENT_KEYWORDS.some((keyword) => equipmentName.includes(keyword))
}


export function getEquipmentCarbonFactor(equipmentName = '') {
  const matched = EQUIPMENT_CARBON_FACTORS.find((item) => {
    return item.keywords.some((keyword) => equipmentName.includes(keyword))
  })
  return matched?.factor ?? 1
}

export function containsAny(text = '', keywords = []) {
  return keywords.some((keyword) => String(text).includes(keyword))
}

function buildDustWorkCount(equipments = []) {
  const dustWorkOrderKeys = new Set()

  normalizeList(equipments).forEach((equipment, index) => {
    const mergedText = `${equipment.workDetail ?? ''} ${equipment.title ?? ''} ${equipment.equipmentName ?? ''}`
    if (!containsAny(mergedText, DUST_WORK_KEYWORDS)) return

    const workOrderKey = [
      equipment.workOrderIdx,
      equipment.workOrderId,
      equipment.workOrderRef,
    ].find((value) => value !== null && value !== undefined && String(value).trim().length > 0)

    const fallbackKey = [
      equipment.workDate,
      equipment.workLocation,
      equipment.title,
      equipment.workDetail,
      index,
    ].map((value) => String(value ?? '').trim()).join('|')

    dustWorkOrderKeys.add(String(workOrderKey ?? fallbackKey))
  })

  return dustWorkOrderKeys.size
}

export function normalizeList(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.content)) return value.content
  if (Array.isArray(value?.list)) return value.list
  if (Array.isArray(value?.workers)) return value.workers
  if (Array.isArray(value?.rows)) return value.rows
  return []
}

function isAssignedWorker(worker) {
  const candidates = [
    worker.assigned,
    worker.isAssigned,
    worker.confirmed,
    worker.assignmentConfirmed,
    worker.zoneMain,
    worker.zoneSub,
    worker.zoneName,
    worker.workLocation,
    worker.assignedZone,
    worker.deploymentZone,
    worker.workArea,
  ]

  return candidates.some((value) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') return value.trim().length > 0 && value !== '미배치'
    return value !== null && value !== undefined
  })
}

function isSafetyEducationCompleted(worker) {
  const candidates = [
    worker.safetyEducationCompleted,
    worker.safetyTrainingCompleted,
    worker.basicSafetyTrainingCompleted,
    worker.isSafetyEducationCompleted,
    worker.educationCompleted,
    worker.safetyEducationStatus,
    worker.educationStatus,
    worker.trainingStatus,
  ]

  return candidates.some((value) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      return ['이수', '완료', 'Y', 'YES', 'true', 'completed', 'COMPLETE'].includes(value.trim())
    }
    return false
  })
}

function filterWorkersByZone(workers, zoneName = '') {
  const list = normalizeList(workers)
  const cleanZone = String(zoneName || '').trim()
  if (!cleanZone || cleanZone === '세척장' || cleanZone === '민원 구역') return list

  const matched = list.filter((worker) => {
    const fields = [
      worker.placement,
      worker.zoneMain,
      worker.zoneSub,
      worker.zoneName,
      worker.workLocation,
      worker.assignedZone,
      worker.deploymentZone,
      worker.workArea,
      worker.site,
    ]
    return fields.some((value) => String(value || '').includes(cleanZone))
  })

  return matched.length ? matched : list
}

function hasSafetyEducationSignal(worker) {
  return [
    'safetyEducationCompleted',
    'safetyTrainingCompleted',
    'basicSafetyTrainingCompleted',
    'isSafetyEducationCompleted',
    'educationCompleted',
    'safetyEducationStatus',
    'educationStatus',
    'trainingStatus',
  ].some((key) => Object.prototype.hasOwnProperty.call(worker, key))
}
