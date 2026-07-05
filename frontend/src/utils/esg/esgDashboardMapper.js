import {
  ESG_CATEGORY_WEIGHTS,
  ESG_METRIC_CARD_WEIGHTS,
  METRIC_COLOR_CLASS,
  buildEsgMetrics,
  buildTotalScore,
  clampNumber,
  clampPercent,
  clampScore,
  createEmptyMetrics,
  firstNonBlank,
  isHighRiskEquipment,
  normalizeCount,
  resolveLevel,
} from './esgScoreCalculator.js'

// esgZoneMapper
export function buildDashboardZones(equipments, context = {}) {
  const supportZones = buildSupportZones(equipments, context)
  const workZones = buildWorkLocationZones(equipments, context)
  return rankZones([...supportZones, ...workZones])
}

export function buildStaticMonitoringZones(equipments, context = {}) {
  return buildSupportZones(equipments, context)
}

function resolveContextSiteId(context = {}) {
  const siteId = context.currentProjectId ?? context.projectId ?? context.siteId
  return siteId !== null && siteId !== undefined && siteId !== '' ? String(siteId) : 'current-site'
}

function positiveMetricInputValue(input, key) {
  const value = Number(input?.[key])
  return Number.isFinite(value) && value > 0 ? value : 0
}

function hasPositiveMetricInputField(input, keys) {
  return keys.some((key) => positiveMetricInputValue(input, key) > 0)
}

function hasMetricInputForZone(metricInputs, zoneName) {
  const inputs = Array.isArray(metricInputs) ? metricInputs : []
  const matchedInputs = inputs.filter((input) => firstNonBlank(input?.zoneName) === zoneName)

  if (zoneName === '민원 구역') {
    return matchedInputs.some((input) => hasPositiveMetricInputField(input, [
      'complaintCount',
      'complaintResolvedCount',
    ]))
  }

  if (zoneName === '세척장') {
    return matchedInputs.some((input) => hasPositiveMetricInputField(input, [
      'carbonKg',
      'washWaterLiters',
      'wastewaterLiters',
      'wastewaterRecoveryRate',
      'powerUsageKwh',
      'powerSavingKwh',
      'safetyEducationRate',
      'staffingRate',
      'reportRate',
      'actionTrackingRate',
      'dataLinkRate',
    ]))
  }

  return matchedInputs.some((input) => hasPositiveMetricInputField(input, [
    'carbonKg',
    'powerUsageKwh',
    'powerSavingKwh',
    'washWaterLiters',
    'wastewaterLiters',
    'wastewaterRecoveryRate',
    'fineDustValue',
    'complaintCount',
    'complaintResolvedCount',
    'safetyEducationRate',
    'staffingRate',
    'reportRate',
    'actionTrackingRate',
    'dataLinkRate',
  ]))
}


function reportMatchesAny(report, keywords = []) {
  const text = [
    report?.title,
    report?.location,
    report?.process,
    report?.issue,
    report?.todayWork,
    report?.tomorrowPlan,
    report?.content,
    report?.memo,
  ].map((value) => String(value || '').toLowerCase()).join(' ')

  return keywords.some((keyword) => text.includes(String(keyword || '').toLowerCase()))
}

function hasSupportZoneReport(reports, zoneName) {
  const reportList = Array.isArray(reports) ? reports : []
  if (zoneName === '세척장') {
    return reportList.some((report) => reportMatchesAny(report, ['세척장', '세륜', '세척']))
  }

  if (zoneName === '민원 구역') {
    return reportList.some((report) => reportMatchesAny(report, ['민원', '주민', '비산', '분진', '소음']))
  }

  return false
}

function hasWashOperationSource(metrics, context = {}) {
  return Number(metrics?.totalEquipmentCount || 0) > 0
    || hasMetricInputForZone(context.metricInputs, '세척장')
    || hasSupportZoneReport(context.reports, '세척장')
}

function hasComplaintOperationSource(metrics, context = {}) {
  return Number(metrics?.complaintCount || 0) > 0
    || Number(metrics?.complaintResolvedCount || 0) > 0
    || hasMetricInputForZone(context.metricInputs, '민원 구역')
    || hasSupportZoneReport(context.reports, '민원 구역')
}

function resetMetricScoreFields(metrics = {}) {
  return {
    ...metrics,
    supportOperationActive: false,
    environmentScore: 0,
    socialScore: 0,
    governanceScore: 0,
    totalScore: 0,
    carbonScore: 0,
    waterScore: 0,
    fineDustScore: 0,
    powerScore: 0,
    idleReductionScore: 0,
    weatherProtectionScore: 0,
    routeSafetyScore: 0,
    reportRate: 0,
    actionTrackingRate: 0,
    dataLinkRate: 0,
    missingCheckCount: 0,
    checkScore: 0,
    complaintCount: 0,
    complaintResolvedCount: 0,
    unresolvedComplaintCount: 0,
    complaintResolutionRate: 0,
    complaintRisk: 0,
    workerCount: 0,
    assignedWorkerCount: 0,
    requiredWorkerCount: 0,
    trainedWorkerCount: 0,
    staffingRate: 0,
    safetyEducationRate: 0,
  }
}

export function buildSupportZones(equipments, context = {}) {
  const equipmentList = Array.isArray(equipments) ? equipments : []
  const washBaseMetrics = buildEsgMetrics(equipmentList, { ...context, zoneName: '세척장' })
  const complaintBaseMetrics = buildEsgMetrics(equipmentList, { ...context, zoneName: '민원 구역' })
  const hasWashLinkedOperationData = hasWashOperationSource(washBaseMetrics, context)
  const hasComplaintLinkedOperationData = hasComplaintOperationSource(complaintBaseMetrics, context)
  const totalEquipmentCount = washBaseMetrics.totalEquipmentCount
  const highRiskEquipmentCount = washBaseMetrics.highRiskEquipmentCount
  const workLocationCount = washBaseMetrics.workLocationCount
  const gateCount = washBaseMetrics.gateCount
  const missionRate = washBaseMetrics.missionRate

  const washRisk = clampNumber(
    Math.round(
      washBaseMetrics.washTargetCount * 1.1
        + washBaseMetrics.washWaterDemandRisk * 0.7
        + washBaseMetrics.gateCongestionRisk * 0.45
        + washBaseMetrics.weatherRiskCount * 0.45,
    ),
    0,
    10,
  )
  const complaintRisk = clampNumber(
    Math.round(
      highRiskEquipmentCount * 1.1
        + workLocationCount
        + complaintBaseMetrics.fineDustRiskLevel * 1.5
        + complaintBaseMetrics.complaintRisk * 0.9
        + (complaintBaseMetrics.windSpeed >= 8 ? 1 : 0)
        + complaintBaseMetrics.weatherRiskCount * 0.4,
    ),
    0,
    10,
  )

  const washMetrics = hasWashLinkedOperationData
    ? {
        ...washBaseMetrics,
        environmentScore: clampScore(washBaseMetrics.environmentScore - washRisk * 0.7 + washBaseMetrics.waterScore * 0.12),
        socialScore: clampScore(washBaseMetrics.socialScore - washRisk * 0.35),
        governanceScore: clampScore(washBaseMetrics.governanceScore - Math.max(0, washRisk - 4) * 0.9),
        operatingRisk: washRisk,
      }
    : resetMetricScoreFields({
        ...washBaseMetrics,
        operatingRisk: 0,
      })
  washMetrics.supportOperationActive = hasWashLinkedOperationData
  washMetrics.supportZoneKind = 'wash'
  washMetrics.totalScore = hasWashLinkedOperationData ? buildTotalScore(washMetrics) : 0

  const complaintMetrics = hasComplaintLinkedOperationData
    ? {
        ...complaintBaseMetrics,
        environmentScore: clampScore(
          complaintBaseMetrics.environmentScore
            - complaintBaseMetrics.fineDustRiskLevel * 1.8,
        ),
        socialScore: clampScore(
          complaintBaseMetrics.socialScore
            - complaintRisk * 0.75,
        ),
        governanceScore: clampScore(
          complaintBaseMetrics.governanceScore
            - Math.max(0, complaintRisk - 3) * 0.8
            - Math.max(0, 100 - complaintBaseMetrics.complaintResolutionRate) * 0.08,
        ),
        operatingRisk: complaintRisk,
      }
    : resetMetricScoreFields({
        ...complaintBaseMetrics,
        operatingRisk: 0,
      })
  complaintMetrics.supportOperationActive = hasComplaintLinkedOperationData
  complaintMetrics.supportZoneKind = 'complaint'
  complaintMetrics.totalScore = hasComplaintLinkedOperationData ? buildTotalScore(complaintMetrics) : 0

  return [
    {
      id: 'wash-zone',
      siteId: resolveContextSiteId(context),
      name: '세척장',
      type: '상시 관리구역',
      score: washMetrics.totalScore,
      level: resolveLevel(washMetrics.totalScore),
      rank: 0,
      carbon: washMetrics.estimatedCarbonKg,
      powerSaving: washMetrics.powerSavingKwh,
      risk: hasWashLinkedOperationData ? washRisk : 0,
      missionRate: hasWashLinkedOperationData ? missionRate : 0,
      lead: 0,
      status: hasWashLinkedOperationData ? resolveStatus(washRisk) : '대기',
      equipmentCount: totalEquipmentCount,
      highRiskEquipmentCount,
      equipmentSummary: totalEquipmentCount
        ? `금일 입차 장비 ${totalEquipmentCount}대 · 세척 관리 ${washMetrics.washTargetCount}대`
        : '금일 입차 장비 0대',
      gateSummary: gateCount ? `${gateCount}개 게이트 입차 기준` : '게이트 0개',
      zoneType: 'support',
      metrics: washMetrics,
    },
    {
      id: 'complaint-zone',
      siteId: resolveContextSiteId(context),
      name: '민원 구역',
      type: '상시 관리구역',
      score: complaintMetrics.totalScore,
      level: resolveLevel(complaintMetrics.totalScore),
      rank: 0,
      carbon: complaintMetrics.estimatedCarbonKg,
      powerSaving: complaintMetrics.powerSavingKwh,
      risk: hasComplaintLinkedOperationData ? complaintRisk : 0,
      missionRate: hasComplaintLinkedOperationData ? missionRate : 0,
      lead: 0,
      status: hasComplaintLinkedOperationData ? resolveStatus(complaintRisk) : '대기',
      equipmentCount: totalEquipmentCount,
      highRiskEquipmentCount,
      equipmentSummary: totalEquipmentCount
        ? `작업구역 ${workLocationCount || 1}곳 · 장비 ${totalEquipmentCount}대 영향권`
        : '금일 작업지시 장비 0대',
      gateSummary: hasComplaintLinkedOperationData
        ? (complaintMetrics.fineDustValue
          ? `PM10 ${complaintMetrics.fineDustValue}㎍/㎥ 기준`
          : '미세먼지 API 연동 기준')
        : '민원 접수·처리 데이터 대기',
      zoneType: 'support',
      metrics: complaintMetrics,
    },
  ]
}

export function buildWorkLocationZones(equipments, context = {}) {
  if (!Array.isArray(equipments) || equipments.length === 0) return []

  const grouped = new Map()

  equipments.forEach((equipment) => {
    const zoneName = firstNonBlank(equipment.workLocation, '작업구역 미지정')
    const current = grouped.get(zoneName) || {
      name: zoneName,
      titles: new Set(),
      workDetails: new Set(),
      equipments: new Map(),
      equipmentList: [],
      totalCount: 0,
      gateSet: new Set(),
      highRiskEquipmentCount: 0,
    }

    if (equipment.title) current.titles.add(equipment.title)
    if (equipment.workDetail) current.workDetails.add(equipment.workDetail)
    if (equipment.gateIdx !== null && equipment.gateIdx !== undefined) {
      current.gateSet.add(equipment.gateIdx)
    }

    const equipmentName = firstNonBlank(equipment.equipmentName, '중장비')
    const equipmentCount = normalizeCount(equipment.equipmentCount)

    current.equipments.set(
      equipmentName,
      (current.equipments.get(equipmentName) || 0) + equipmentCount,
    )
    current.totalCount += equipmentCount
    current.equipmentList.push(equipment)

    if (isHighRiskEquipment(equipmentName)) {
      current.highRiskEquipmentCount += equipmentCount
    }

    grouped.set(zoneName, current)
  })

  return Array.from(grouped.values()).map((zone, index) => {
    const equipmentSummary = Array.from(zone.equipments.entries())
      .map(([name, count]) => `${name} ${count}대`)
      .join(', ')

    const gateSummary = Array.from(zone.gateSet)
      .sort((a, b) => Number(a) - Number(b))
      .map((gateIdx) => `${gateIdx}번 게이트`)
      .join(', ')

    const titleSummary = Array.from(zone.titles).slice(0, 2).join(' · ')
    const detailSummary = Array.from(zone.workDetails).slice(0, 1).join('')
    const metrics = buildEsgMetrics(zone.equipmentList, { ...context, zoneName: zone.name })
    const risk = clampNumber(
      Math.round(
        metrics.weatherRiskCount
          + Math.max(0, zone.totalCount - 1)
          + zone.highRiskEquipmentCount
          + metrics.fineDustRiskLevel * 0.7
          + metrics.washWaterDemandRisk * 0.25,
      ),
      0,
      10,
    )
    const zoneMetrics = {
      ...metrics,
      operatingRisk: risk,
      socialScore: clampScore(metrics.socialScore - risk * 0.35),
      governanceScore: clampScore(metrics.governanceScore - Math.max(0, risk - 3) * 0.7),
    }
    zoneMetrics.totalScore = buildTotalScore(zoneMetrics)

    return {
      id: `work-zone-${index + 1}`,
      siteId: resolveContextSiteId(context),
      name: zone.name,
      type: titleSummary || detailSummary || equipmentSummary || '작업지시서 연동 구역',
      score: zoneMetrics.totalScore,
      level: resolveLevel(zoneMetrics.totalScore),
      rank: 0,
      carbon: zoneMetrics.estimatedCarbonKg,
      powerSaving: zoneMetrics.powerSavingKwh,
      risk,
      missionRate: zoneMetrics.missionRate,
      lead: 0,
      status: resolveStatus(risk),
      equipmentCount: zone.totalCount,
      highRiskEquipmentCount: zone.highRiskEquipmentCount,
      equipmentSummary,
      gateSummary,
      zoneType: 'work',
      metrics: zoneMetrics,
    }
  })
}

export function calculateOperatingRiskCount(equipments, weatherRiskCount = 0) {
  if (!Array.isArray(equipments) || equipments.length === 0) return weatherRiskCount

  const highRiskCount = equipments.reduce((sum, equipment) => {
    if (!isHighRiskEquipment(equipment.equipmentName)) return sum
    return sum + normalizeCount(equipment.equipmentCount)
  }, 0)

  return weatherRiskCount + highRiskCount
}
function rankZones(zones) {
  const rankedZones = [...zones].sort((a, b) => b.score - a.score)

  rankedZones.forEach((zone, index) => {
    zone.rank = index + 1
    zone.lead = index === 0 ? 0 : Math.round((zone.score - rankedZones[0].score) * 10) / 10
  })

  return rankedZones
}

function resolveStatus(risk) {
  if (risk >= 7) return '위험'
  if (risk >= 4) return '관리'
  return '우수'
}


// esgMissionMapper
export function buildZoneMissions(zone, currentSite = {}) {
  const siteName = currentSite.shortName || currentSite.name || '현장'

  if (!zone) {
    return [
      buildMissionItem({
        id: 'mission-empty-e',
        title: '주간 환경 미션 연동 대기',
        description: '선택 구역의 환경 데이터를 불러오면 주간 관리 미션을 표시합니다.',
        tag: 'E',
        progress: 0,
        progressLabel: '0점',
        progressCaption: '환경 데이터 대기',
        color: 'emerald',
      }),
      buildMissionItem({
        id: 'mission-empty-s',
        title: '주간 안전 미션 연동 대기',
        description: '선택 구역의 안전·인력 데이터를 불러오면 주간 관리 미션을 표시합니다.',
        tag: 'S',
        progress: 0,
        progressLabel: '0점',
        progressCaption: '안전 데이터 대기',
        color: 'sky',
      }),
      buildMissionItem({
        id: 'mission-empty-g',
        title: '주간 기록 미션 연동 대기',
        description: '선택 구역의 기록·조치 데이터를 불러오면 주간 관리 미션을 표시합니다.',
        tag: 'G',
        progress: 0,
        progressLabel: '0점',
        progressCaption: '기록 데이터 대기',
        color: 'violet',
      }),
    ]
  }

  const zoneKind = resolveZoneMetricKind(zone)
  const metrics = normalizeSupportMetricsForDisplay(zone.metrics ?? createEmptyMetrics(), zoneKind)

  if (zone.name === '세척장') {
    return buildWashZoneWeeklyMissions(metrics)
  }

  if (zone.name === '민원 구역') {
    return buildComplaintZoneWeeklyMissions(metrics)
  }

  return buildWorkZoneWeeklyMissions(zone, metrics, siteName)
}

function buildWashZoneWeeklyMissions(metrics) {
  if (!isSupportMetricsActive(metrics, 'wash')) {
    return [
      buildMissionItem({
        id: 'wash-weekly-e',
        title: '세척장 주간 운영 관리',
        description: '작업지시 장비나 세척장 운영 기록이 들어오면 세척장 환경 미션을 계산합니다.',
        tag: 'E',
        progress: 0,
        progressLabel: '0점',
        progressCaption: '세척장 운영 데이터 대기',
        color: 'emerald',
      }),
      buildMissionItem({
        id: 'wash-weekly-s',
        title: '세척장 주간 작업자·동선 안전',
        description: '세척장 운영 데이터가 들어오면 교육, 배치, 동선 안전 미션을 계산합니다.',
        tag: 'S',
        progress: 0,
        progressLabel: '0점',
        progressCaption: '세척장 안전 데이터 대기',
        color: 'sky',
      }),
      buildMissionItem({
        id: 'wash-weekly-g',
        title: '세척장 주간 점검·조치 기록',
        description: '세척장 관련 공사일보나 조치 기록이 들어오면 기록 미션을 계산합니다.',
        tag: 'G',
        progress: 0,
        progressLabel: '0점',
        progressCaption: '세척장 기록 데이터 대기',
        color: 'violet',
      }),
    ]
  }

  return [
    buildMissionItem({
      id: 'wash-weekly-e',
      title: '세척장 주간 운영 관리',
      description: '입차 중장비 대수와 세척 필요 장비를 함께 보며 세척장 운영 상태를 주간 기준으로 점검합니다.',
      tag: 'E',
      progress: metrics.environmentScore,
      progressLabel: `${clampPercent(metrics.environmentScore)}점`,
      progressCaption: `세척 필요 장비 ${metrics.washTargetCount || 0}대 · 장비 ${metrics.totalEquipmentCount || 0}대`,
      color: 'emerald',
    }),
    buildMissionItem({
      id: 'wash-weekly-s',
      title: '세척장 주간 작업자·동선 안전',
      description: '세척 대기 차량과 작업자 동선이 겹치지 않도록 안전교육, 배치율, 보호조치를 함께 관리합니다.',
      tag: 'S',
      progress: metrics.socialScore,
      progressLabel: `${clampPercent(metrics.socialScore)}점`,
      progressCaption: `교육 ${clampPercent(metrics.safetyEducationRate || 0)}% · 배치 ${clampPercent(metrics.staffingRate || 0)}%`,
      color: 'sky',
    }),
    buildMissionItem({
      id: 'wash-weekly-g',
      title: '세척장 주간 점검·조치 기록',
      description: '세척장 점검일보와 운영 이행 기록이 누락 없이 남는지 확인합니다.',
      tag: 'G',
      progress: metrics.governanceScore,
      progressLabel: `${clampPercent(metrics.governanceScore)}점`,
      progressCaption: `기록 ${clampPercent(metrics.reportRate || 0)}% · 조치 ${clampPercent(metrics.actionTrackingRate || 0)}%`,
      color: 'violet',
    }),
  ]
}

function buildComplaintZoneWeeklyMissions(metrics) {
  if (!isSupportMetricsActive(metrics, 'complaint')) {
    return [
      buildMissionItem({
        id: 'complaint-weekly-e',
        title: '민원구역 주간 분진 영향 관리',
        description: '본사 민원관리 데이터나 민원 관련 기록이 들어오면 주변 영향 미션을 계산합니다.',
        tag: 'E',
        progress: 0,
        progressLabel: '0점',
        progressCaption: '민원 접수·처리 데이터 대기',
        color: 'emerald',
      }),
      buildMissionItem({
        id: 'complaint-weekly-s',
        title: '민원구역 주간 주변 영향 완화',
        description: '민원 접수/처리 현황이 들어오면 주민 영향 대응 미션을 계산합니다.',
        tag: 'S',
        progress: 0,
        progressLabel: '0점',
        progressCaption: '민원 대응 데이터 대기',
        color: 'sky',
      }),
      buildMissionItem({
        id: 'complaint-weekly-g',
        title: '민원구역 주간 대응 이력 관리',
        description: '민원 조치 이력이나 관련 기록이 들어오면 대응 이력 미션을 계산합니다.',
        tag: 'G',
        progress: 0,
        progressLabel: '0점',
        progressCaption: '민원 기록 데이터 대기',
        color: 'violet',
      }),
    ]
  }

  return [
    buildMissionItem({
      id: 'complaint-weekly-e',
      title: '민원구역 주간 분진 영향 관리',
      description: '소음·분진 민원 접수와 처리 현황을 함께 보며 주변 영향 대응 상태를 주간 기준으로 점검합니다.',
      tag: 'E',
      progress: metrics.environmentScore,
      progressLabel: `${clampPercent(metrics.environmentScore)}점`,
      progressCaption: `접수 ${metrics.complaintCount || 0}건 · 미처리 ${metrics.unresolvedComplaintCount || 0}건`,
      color: 'emerald',
    }),
    buildMissionItem({
      id: 'complaint-weekly-s',
      title: '민원구역 주간 주변 영향 완화',
      description: '작업자 안내, 통행 분산, 민원 처리 흐름을 함께 관리해 주변 영향도를 낮춥니다.',
      tag: 'S',
      progress: metrics.socialScore,
      progressLabel: `${clampPercent(metrics.socialScore)}점`,
      progressCaption: `처리 ${metrics.complaintResolvedCount || 0}/${metrics.complaintCount || 0}건 · 배치 ${clampPercent(metrics.staffingRate || 0)}%`,
      color: 'sky',
    }),
    buildMissionItem({
      id: 'complaint-weekly-g',
      title: '민원구역 주간 대응 이력 관리',
      description: '민원 접수, 대응 조치, 관련 기록이 같은 주차 기준으로 연결되는지 확인합니다.',
      tag: 'G',
      progress: metrics.governanceScore,
      progressLabel: `${clampPercent(metrics.governanceScore)}점`,
      progressCaption: `조치 ${clampPercent(metrics.actionTrackingRate || 0)}% · 연동 ${clampPercent(metrics.dataLinkRate || 0)}%`,
      color: 'violet',
    }),
  ]
}

function buildWorkZoneWeeklyMissions(zone, metrics, siteName) {
  return [
    buildMissionItem({
      id: `work-weekly-e-${zone.id}`,
      title: `${zone.name} 주간 환경부하 관리`,
      description: `${siteName} 작업구역의 장비 부하, 작업 전후 정돈, 분진성 작업을 묶어 주간 환경 상태를 점검합니다.`,
      tag: 'E',
      progress: metrics.environmentScore,
      progressLabel: `${clampPercent(metrics.environmentScore)}점`,
      progressCaption: `탄소 ${metrics.estimatedCarbonKg || 0}kg · PM10 ${metrics.fineDustValue || 0}㎍/㎥`,
      color: 'emerald',
    }),
    buildMissionItem({
      id: `work-weekly-s-${zone.id}`,
      title: `${zone.name} 주간 안전·인력 운영`,
      description: '안전교육 이수율, 인력 배치율, 기상 위험 보호 수준을 함께 보며 현장 안전을 관리합니다.',
      tag: 'S',
      progress: metrics.socialScore,
      progressLabel: `${clampPercent(metrics.socialScore)}점`,
      progressCaption: `교육 ${clampPercent(metrics.safetyEducationRate || 0)}% · 배치 ${clampPercent(metrics.staffingRate || 0)}%`,
      color: 'sky',
    }),
    buildMissionItem({
      id: `work-weekly-g-${zone.id}`,
      title: `${zone.name} 주간 기록·조치 정합성`,
      description: '작업지시, 공사일보, 위험 조치 기록이 같은 구역 기준으로 연결되는지 주간 단위로 확인합니다.',
      tag: 'G',
      progress: metrics.governanceScore,
      progressLabel: `${clampPercent(metrics.governanceScore)}점`,
      progressCaption: `일보 ${clampPercent(metrics.reportRate || 0)}% · 조치 ${clampPercent(metrics.actionTrackingRate || 0)}%`,
      color: 'violet',
    }),
  ]
}

function buildMissionItem({
  id,
  title,
  description,
  tag,
  progress,
  progressLabel,
  progressCaption,
  color,
}) {
  return {
    id,
    title,
    description,
    tag,
    progress: clampPercent(progress),
    progressLabel: progressLabel || `${clampPercent(progress)}점`,
    progressCaption: progressCaption || '',
    color,
  }
}

export function getZoneMissionBundle(zone, context = {}) {
  const missions = buildZoneMissions(zone, context.currentSite ?? {})

  return {
    weeklyMission: missions[0]?.description ?? '관리구역 데이터를 불러오면 ESG 미션을 표시합니다.',
    cards: missions.map((mission) => ({
      title: mission.title,
      badge: mission.tag,
      description: mission.description,
    })),
  }
}
export function buildMissions(zone, currentSite = {}) {
  return buildZoneMissions(zone, currentSite)
}

// esgPanelMapper
export function buildRankingItems(sites, currentSiteId) {
  const items = [...sites].sort((a, b) => b.score - a.score)
  const currentIndex = items.findIndex((site) => site.id === currentSiteId)
  const currentRank = currentIndex + 1
  const currentSite = items[currentIndex]

  if (!currentSite || currentIndex < 0) {
    return {
      items,
      currentRank: 0,
      comparison: '순위 계산 중입니다.',
    }
  }

  if (currentIndex === 0) {
    const nextSite = items[1]
    const comparison = nextSite
      ? `${nextSite.name}보다 ${(currentSite.score - nextSite.score).toFixed(1)}점 앞섬`
      : '단독 1위입니다.'

    return { items, currentRank, comparison }
  }

  const upperSite = items[currentIndex - 1]

  return {
    items,
    currentRank,
    comparison: `${upperSite.name}까지 ${(upperSite.score - currentSite.score).toFixed(1)}점 부족`,
  }
}

export function getZoneGrowthTitle(zone) {
  return `${zone?.name ?? '관리구역'}의 ESG 빌딩 성장`
}

export function getGrowthTitle(zone) {
  return getZoneGrowthTitle(zone)
}

export function getZoneStage(zone) {
  if (!zone) {
    return {
      title: '단계 분석 대기',
      label: '단계 분석 대기',
      description: '관리구역 데이터를 불러오면 시공단계를 표시합니다.',
      guide: '관리구역 연동 후 단계별 개선 포인트를 확인할 수 있습니다.',
      progress: 0,
    }
  }

  if (zone.name === '세척장') {
    const title = zone.level >= 5 ? '세척 운영 안정화 단계' : '세척 운영 정비 단계'

    return {
      title,
      label: title,
      description: '장비 세척 흐름, 세척 필요 장비, 게이트 분산을 중점 관리합니다.',
      guide: '세척장 대기 동선을 분리하고 점검일보를 꾸준히 남기면 다음 레벨에 가까워집니다.',
      progress: Math.min(100, zone.level * 14),
    }
  }

  if (zone.name === '민원 구역') {
    const title = zone.level >= 5 ? '민원 대응 안정 관리 단계' : '민원 대응 집중 관리 단계'

    return {
      title,
      label: title,
      description: '분진·장비 동선·민원 대응 수준을 단계별로 관리합니다.',
      guide: '살수, 방진막, 장비 통행 시간을 함께 관리하면 민원 리스크가 줄어듭니다.',
      progress: Math.min(100, zone.level * 14),
    }
  }

  if (zone.level >= 6) {
    return {
      title: '시공 안정 운영 단계',
      label: '시공 안정 운영 단계',
      description: '공정과 장비가 안정적으로 운영되는 상위 수준입니다.',
      guide: '현재 장비 동선과 작업 기록률을 유지하면 ESG 점수 하락을 방지할 수 있습니다.',
      progress: 92,
    }
  }

  if (zone.level >= 4) {
    return {
      title: '시공 관리 강화 단계',
      label: '시공 관리 강화 단계',
      description: '장비 동선과 공정 품질을 동시에 관리하는 핵심 구간입니다.',
      guide: '작업구역별 위험 조치 결과를 작업일보와 함께 남기면 다음 레벨로 올라가기 쉽습니다.',
      progress: 74,
    }
  }

  return {
    title: '시공 준비·관리 단계',
    label: '시공 준비·관리 단계',
    description: '초기 공정 준비 및 안전 기준 정착이 필요한 단계입니다.',
    guide: '장비 배치, 작업지시, 기상 위험 조치 기록을 먼저 안정화해야 합니다.',
    progress: 52,
  }
}

export function getConstructionStage(zone) {
  return getZoneStage(zone)
}

export function getZoneFocusMetric(zone, context = {}) {
  const metrics = zone?.metrics ?? createEmptyMetrics()
  const weather = context.weatherAnalysis ?? {}
  const airQuality = context.airQuality ?? {}
  const rain = Number(weather.precipitationProbability ?? metrics.rainPercent ?? 0)
  const wind = Number(weather.maxWindSpeed ?? metrics.windSpeed ?? 0)
  const fineDust = Number(airQuality.value ?? weather.fineDustValue ?? metrics.fineDustValue ?? 0)

  if (!zone) {
    return {
      title: '중점 관리',
      value: '확인 중',
      unit: '',
      caption: '관리구역 데이터를 불러오는 중입니다.',
    }
  }

  if (zone.name === '세척장') {
    return {
      title: '세척 운영 관리',
      value: metrics.estimatedWashWaterLiters ? `${metrics.estimatedWashWaterLiters}` : '0',
      unit: 'L',
      caption: rain >= 60
        ? '우천일에는 세척 필요 장비와 출입 동선을 우선 점검합니다.'
        : '세척 대상 장비와 게이트 분산 상태를 함께 관리합니다.',
    }
  }

  if (zone.name === '민원 구역') {
    return {
      title: '민원 리스크',
      value: fineDust >= 80 || wind >= 8 ? '강화' : '점검',
      unit: '',
      caption: wind >= 8
        ? '강풍 기준 비산먼지·소음 확산 통제 필요'
        : '장비 동선·살수·안내 표지 점검',
    }
  }

  return {
    title: '탄소 부하',
    value: `${metrics.carbonLoadIndex}`,
    unit: 'pt',
    caption: zone.gateSummary
      ? `${zone.gateSummary} 기준 장비 공회전·동선 관리`
      : '작업구역 장비 배치 기준 탄소 영향 추정',
  }
}

export function getPriorityFocus(zone, context = {}) {
  const metric = getZoneFocusMetric(zone, context)

  return {
    title: metric.title,
    value: `${metric.value}${metric.unit ?? ''}`,
    description: metric.caption,
  }
}
function zeroEnvironmentMetricFields(metrics = {}) {
  return {
    ...metrics,
    environmentScore: 0,
    carbonScore: 0,
    waterScore: 0,
    fineDustScore: 0,
    powerScore: 0,
    idleReductionScore: 0,
    carbonLoadIndex: 0,
    estimatedCarbonKg: 0,
    estimatedWashWaterLiters: 0,
    washWaterDemandRisk: 0,
    gateCongestionRisk: 0,
    gateConcentrationRate: 0,
  }
}

function zeroSocialMetricFields(metrics = {}) {
  return {
    ...metrics,
    socialScore: 0,
    staffingRate: 0,
    safetyEducationRate: 0,
    weatherProtectionScore: 0,
    routeSafetyScore: 0,
    workerCount: 0,
    assignedWorkerCount: 0,
    requiredWorkerCount: 0,
    trainedWorkerCount: 0,
  }
}

function zeroGovernanceMetricFields(metrics = {}) {
  return {
    ...metrics,
    governanceScore: 0,
    reportRate: 0,
    actionTrackingRate: 0,
    dataLinkRate: 0,
    missingCheckCount: 0,
    checkScore: 0,
  }
}

function isSupportMetricsActive(metrics = {}, zoneKind = 'work') {
  if (zoneKind === 'wash') {
    return metrics.supportOperationActive === true
      || Number(metrics.totalEquipmentCount || 0) > 0
      || Number(metrics.washTargetCount || 0) > 0
      || Number(metrics.carbonLoadIndex || 0) > 0
      || Number(metrics.reportRate || 0) > 0
      || Number(metrics.actionTrackingRate || 0) > 0
      || Number(metrics.dataLinkRate || 0) > 0
  }

  if (zoneKind === 'complaint') {
    return metrics.supportOperationActive === true
      || Number(metrics.complaintCount || 0) > 0
      || Number(metrics.complaintResolvedCount || 0) > 0
      || Number(metrics.reportRate || 0) > 0
      || Number(metrics.actionTrackingRate || 0) > 0
      || Number(metrics.dataLinkRate || 0) > 0
  }

  return true
}

function zeroSupportDisplayMetricFields(metrics = {}, zoneKind = 'work') {
  const zeroedBase = {
    ...metrics,
    supportOperationActive: false,
    totalScore: 0,
    operatingRisk: 0,
    missionRate: 0,
  }

  let zeroed = zeroGovernanceMetricFields(zeroSocialMetricFields(zeroEnvironmentMetricFields(zeroedBase)))

  if (zoneKind === 'wash') {
    zeroed = {
      ...zeroed,
      totalEquipmentCount: 0,
      highRiskEquipmentCount: 0,
      washTargetCount: 0,
      gateCount: 0,
      assignedGateEquipmentCount: 0,
      maxGateEquipmentCount: 0,
      gateCongestionRisk: 0,
      gateConcentrationRate: 0,
    }
  }

  if (zoneKind === 'complaint') {
    zeroed = {
      ...zeroed,
      complaintCount: 0,
      complaintResolvedCount: 0,
      unresolvedComplaintCount: 0,
      complaintResolutionRate: 0,
      complaintRisk: 0,
    }
  }

  return zeroed
}

function normalizeSupportMetricsForDisplay(metrics = {}, zoneKind = 'work') {
  if (zoneKind !== 'wash' && zoneKind !== 'complaint') {
    return metrics
  }

  if (!isSupportMetricsActive(metrics, zoneKind)) {
    return zeroSupportDisplayMetricFields(metrics, zoneKind)
  }

  const normalized = { ...metrics, supportOperationActive: true }
  normalized.totalScore = buildTotalScore(normalized)
  return normalized
}

export function buildEsgBreakdown(zone, context = {}) {
  const zoneKind = resolveZoneMetricKind(zone)
  const metrics = normalizeSupportMetricsForDisplay(zone?.metrics ?? createEmptyMetrics(), zoneKind)
  const fineDustValue = metrics.fineDustValue || context.airQuality?.value || 0
  const safetyDays = Math.max(1, Number(context.safetyDays || metrics.safetyDays || 1))

  // 작업구역 점수 = E × 0.50 + S × 0.30 + G × 0.20 (esgScoreCalculator buildTotalScore 기준)
  const eScoreRounded = Math.round(metrics.environmentScore)
  const sScoreRounded = Math.round(metrics.socialScore)
  const gScoreRounded = Math.round(metrics.governanceScore)

  return [
    {
      key: 'E',
      title: 'Environment',
      subtitle: '탄소 · 세척 운영 · PM10 · 게이트 분산',
      score: metrics.environmentScore,
      weight: ESG_CATEGORY_WEIGHTS.E,
      weightedScore: Math.round(eScoreRounded * ESG_CATEGORY_WEIGHTS.E) / 100,
      color: 'emerald',
      description: '장비 부하, 세척장 운영 관리, PM10, 게이트 분산·공회전 저감 운영을 합산한 환경 점수입니다.',
      details: [
        { label: '탄소 부하지수', value: `${metrics.carbonLoadIndex}pt`, caption: '장비 종류와 대수 기반 운영 추정' },
        { label: '세척 필요 장비', value: `${metrics.washTargetCount}대`, caption: '작업지시 장비와 우천/미세먼지 조건 반영' },
        { label: 'PM10', value: `${fineDustValue}㎍/㎥`, caption: '분진·살수 관리 기준' },
        { label: '게이트 분산', value: `${Math.round(metrics.idleReductionScore || 0)}점`, caption: `최대 게이트 집중 ${metrics.gateConcentrationRate || 0}%` },
      ],
      guide: '작업지시 장비·세척 필요 장비·PM10·게이트 분산 상태로 환경 운영 점수를 산정합니다.',
    },
    {
      key: 'S',
      title: 'Social',
      subtitle: '안전교육 · 인력 배치 · 기상 보호 · 출입 동선',
      score: metrics.socialScore,
      weight: ESG_CATEGORY_WEIGHTS.S,
      weightedScore: Math.round(sScoreRounded * ESG_CATEGORY_WEIGHTS.S) / 100,
      color: 'sky',
      description: '작업자 안전교육, 구역별 배치, 기상 위험 보호, 민원·동선 안전을 반영한 사회 점수입니다.',
      details: [
        { label: '무사고 일수', value: `${safetyDays}일`, caption: '현장 공사 시작일 기준' },
        { label: '구역 배치율', value: `${Math.round(metrics.staffingRate || 0)}%`, caption: '인력 배치 데이터 기준' },
        { label: '안전교육', value: metrics.safetyEducationRate ? `${Math.round(metrics.safetyEducationRate)}%` : '0%', caption: '교육 이수 필드가 들어오면 자동 반영' },
      ],
      guide: '작업구역 배치와 교육 이수 데이터가 명확해질수록 S 점수가 구역별로 더 정밀해집니다.',
    },
    {
      key: 'G',
      title: 'Governance',
      subtitle: '작업일보 · 위험 조치 · 데이터 완결성 · 점검 누락',
      score: metrics.governanceScore,
      weight: ESG_CATEGORY_WEIGHTS.G,
      weightedScore: Math.round(gScoreRounded * ESG_CATEGORY_WEIGHTS.G) / 100,
      color: 'violet',
      description: '작업일보 기록률, 위험 조치 기록, 데이터 연동률, 점검 누락 여부를 반영한 거버넌스 점수입니다.',
      details: [
        { label: '작업일보 기록률', value: `${Math.round(metrics.reportRate || 0)}%`, caption: '선택일 공사일보 저장 기준' },
        { label: '위험 조치 기록률', value: `${Math.round(metrics.actionTrackingRate || 0)}%`, caption: '조치/통제/점검/확인 키워드 기준' },
        { label: '데이터 연동률', value: `${Math.round(metrics.dataLinkRate || 0)}%`, caption: '날씨·작업지시·일보·인력 연동 기준' },
      ],
      guide: '기상 위험 조치 결과를 작업일보에 남기면 G 점수가 가장 직접적으로 올라갑니다.',
    },
  ]
}

export function buildZoneMetricCards(zone, activeKey, icons = {}, context = {}) {
  const zoneKind = resolveZoneMetricKind(zone)
  const metrics = normalizeSupportMetricsForDisplay(zone?.metrics ?? createEmptyMetrics(), zoneKind)
  const safetyDays = Math.max(1, Number(context.safetyDays || metrics.safetyDays || 1))
  const fineDustLabel = metrics.fineDustValue > 0 ? `${metrics.fineDustValue}㎍/㎥` : '0㎍/㎥'
  const zoneName = zone?.name || '작업구역'
  const weights = ESG_METRIC_CARD_WEIGHTS

  if (activeKey === 'S') {
    return buildSocialMetricCards({ metrics, safetyDays, icons, zoneKind, zoneName, weights })
  }

  if (activeKey === 'G') {
    return buildGovernanceMetricCards({ metrics, icons, zoneKind, zoneName, weights })
  }

  return buildEnvironmentMetricCards({ metrics, fineDustLabel, icons, zoneKind, zoneName, weights })
}

function resolveZoneMetricKind(zone) {
  if (zone?.name === '세척장') return 'wash'
  if (zone?.name === '민원 구역') return 'complaint'
  return 'work'
}

function buildEnvironmentMetricCards({ metrics, fineDustLabel, icons, zoneKind, zoneName, weights }) {
  const supportActive = isSupportMetricsActive(metrics, zoneKind)
  const complaintImpactScore = zoneKind === 'complaint' && !supportActive
    ? 0
    : clampScore(
      (metrics.fineDustScore || 0) * 0.45
        + (100 - (metrics.complaintRisk || 0) * 10) * 0.35
        + (100 - Math.min(45, (metrics.dustWorkCount || 0) * 6 + (metrics.highRiskEquipmentCount || 0) * 3)) * 0.2,
    )
  const complaintMitigationScore = zoneKind === 'complaint' && !supportActive
    ? 0
    : clampScore(
      (metrics.complaintResolutionRate || 0) * 0.55
        + (metrics.waterScore || 0) * 0.25
        + (metrics.idleReductionScore || 0) * 0.2,
    )

  const cardsByZone = {
    wash: [
      {
        id: 'wash-equipment-load',
        title: '세척 필요 장비 부하',
        subtitle: `${weights[0]}% · 관리 대상 ${metrics.washTargetCount || 0}대 · 장비부하지수 ${metrics.carbonLoadIndex}pt`,
        rawScore: metrics.carbonScore,
        weight: weights[0],
        badge: metrics.carbonScore >= 80 ? '우수' : '관리',
        icon: icons.HardHat,
        color: 'emerald',
      },
      {
        id: 'wash-operation-management',
        title: '세척장 운영 관리',
        subtitle: `${weights[1]}% · 운영 부담지수 ${metrics.washWaterDemandRisk}/10 · 장비 ${metrics.totalEquipmentCount || 0}대`,
        rawScore: metrics.waterScore,
        weight: weights[1],
        badge: metrics.washWaterDemandRisk >= 6 ? '주의' : '관리',
        icon: icons.Droplets,
        color: metrics.washWaterDemandRisk >= 6 ? 'amber' : 'emerald',
      },
      {
        id: 'wash-dust-impact',
        title: '비산먼지·세척 영향 관리',
        subtitle: `${weights[2]}% · PM10 ${fineDustLabel} · 분진성 작업 ${metrics.dustWorkCount || 0}건`,
        rawScore: metrics.fineDustScore,
        weight: weights[2],
        badge: metrics.fineDustRiskLevel >= 3 ? '주의' : '관리',
        icon: icons.Factory,
        color: metrics.fineDustRiskLevel >= 3 ? 'amber' : 'emerald',
      },
      {
        id: 'wash-flow-management',
        title: '세척장 대기 동선 관리',
        subtitle: `${weights[3]}% · 최대 게이트 집중 ${metrics.gateConcentrationRate || 0}% · 혼잡 ${metrics.gateCongestionRisk}/10`,
        rawScore: metrics.idleReductionScore || 0,
        weight: weights[3],
        badge: metrics.gateCongestionRisk >= 5 ? '주의' : '관리',
        icon: icons.Zap,
        color: metrics.gateCongestionRisk >= 5 ? 'rose' : 'amber',
      },
    ],
    complaint: [
      {
        id: 'complaint-noise-dust-impact',
        title: '소음·분진 민원 영향',
        subtitle: `접수 ${metrics.complaintCount || 0}건 · 미처리 ${metrics.unresolvedComplaintCount || 0}건 · PM10 ${fineDustLabel}`,
        rawScore: complaintImpactScore,
        weight: 60,
        badge: metrics.complaintRisk >= 5 || metrics.unresolvedComplaintCount > 0 ? '주의' : '관리',
        icon: icons.AlertTriangle,
        color: metrics.complaintRisk >= 5 || metrics.unresolvedComplaintCount > 0 ? 'rose' : 'amber',
      },
      {
        id: 'complaint-mitigation-operation',
        title: '민원 저감 조치 운영',
        subtitle: `처리율 ${Math.round(metrics.complaintResolutionRate || 0)}% · 동선분산 ${Math.round(metrics.idleReductionScore || 0)}점`,
        rawScore: complaintMitigationScore,
        weight: 40,
        badge: (metrics.complaintResolutionRate || 0) >= 80 ? '우수' : '관리',
        icon: icons.ShieldCheck,
        color: (metrics.complaintResolutionRate || 0) >= 80 ? 'emerald' : 'amber',
      },
    ],
    work: [
      {
        id: 'work-equipment-load',
        title: `${zoneName} 작업 장비 부하`,
        subtitle: `${weights[0]}% · 장비 ${metrics.totalEquipmentCount || 0}대 · 장비부하지수 ${metrics.carbonLoadIndex}pt`,
        rawScore: metrics.carbonScore,
        weight: weights[0],
        badge: metrics.carbonScore >= 80 ? '우수' : '관리',
        icon: icons.Leaf,
        color: 'emerald',
      },
      {
        id: 'work-dust-pm10',
        title: `${zoneName} PM10·분진 관리`,
        subtitle: `${weights[1]}% · ${fineDustLabel} · 분진성 작업 ${metrics.dustWorkCount || 0}건`,
        rawScore: metrics.fineDustScore,
        weight: weights[1],
        badge: metrics.fineDustRiskLevel >= 3 ? '주의' : '관리',
        icon: icons.Factory,
        color: metrics.fineDustRiskLevel >= 3 ? 'amber' : 'emerald',
      },
      {
        id: 'work-weather-operation',
        title: `${zoneName} 기상 리스크 작업 조정`,
        subtitle: `${weights[2]}% · 기상 위험 ${metrics.weatherRiskCount}건 · 풍속 ${metrics.windSpeed || 0}m/s`,
        rawScore: metrics.weatherProtectionScore,
        weight: weights[2],
        badge: metrics.weatherProtectionScore < 70 ? '주의' : '관리',
        icon: icons.AlertTriangle,
        color: metrics.weatherProtectionScore < 70 ? 'rose' : 'amber',
      },
      {
        id: 'work-gate-distribution',
        title: `${zoneName} 게이트 분산·공회전 저감`,
        subtitle: `${weights[3]}% · 게이트 ${metrics.gateCount || 0}곳 · 최대 집중 ${metrics.gateConcentrationRate || 0}%`,
        rawScore: metrics.idleReductionScore || 0,
        weight: weights[3],
        badge: metrics.gateCongestionRisk >= 5 ? '주의' : '관리',
        icon: icons.Zap,
        color: metrics.gateCongestionRisk >= 5 ? 'rose' : 'amber',
      },
    ],
  }

  return cardsByZone[zoneKind].map(buildScoreCard)
}

function buildSocialMetricCards({ metrics, safetyDays, icons, zoneKind, zoneName, weights }) {
  const supportActive = isSupportMetricsActive(metrics, zoneKind)
  const residentResponseScore = zoneKind === 'complaint' && !supportActive
    ? 0
    : clampScore(
      (metrics.complaintResolutionRate || 0) * 0.65
        + (100 - Math.min(60, (metrics.unresolvedComplaintCount || 0) * 15)) * 0.35,
    )
  const complaintRouteSafetyScore = zoneKind === 'complaint' && !supportActive
    ? 0
    : clampScore(
      (metrics.routeSafetyScore || 0) * 0.45
        + (metrics.weatherProtectionScore || 0) * 0.35
        + (metrics.staffingRate || 0) * 0.2,
    )

  const cardsByZone = {
    wash: [
      {
        id: 'wash-worker-education',
        title: '세척장 작업자 교육',
        subtitle: `${weights[0]}% · 이수 ${metrics.trainedWorkerCount || 0}/${metrics.workerCount || 0}명 · 무사고 ${safetyDays}일`,
        rawScore: metrics.safetyEducationRate || 0,
        weight: weights[0],
        badge: metrics.safetyEducationRate >= 80 ? '우수' : metrics.workerCount ? '관리' : '대기',
        icon: icons.Medal,
        color: 'violet',
      },
      {
        id: 'wash-staffing',
        title: '세척장 투입 인력 배치',
        subtitle: `${weights[1]}% · 배치 ${metrics.assignedWorkerCount || 0}/${metrics.requiredWorkerCount || metrics.workerCount || 0}명`,
        rawScore: metrics.staffingRate || 0,
        weight: weights[1],
        badge: metrics.staffingRate >= 80 ? '우수' : '관리',
        icon: icons.Users,
        color: 'emerald',
      },
      {
        id: 'wash-route-separation',
        title: '세척 차량·보행 동선 분리',
        subtitle: `${weights[2]}% · 고위험 장비 ${metrics.highRiskEquipmentCount || 0}대 · 게이트 ${metrics.gateCount || 0}곳`,
        rawScore: metrics.routeSafetyScore || 0,
        weight: weights[2],
        badge: metrics.routeSafetyScore < 70 ? '주의' : '관리',
        icon: icons.ShieldCheck,
        color: metrics.routeSafetyScore < 70 ? 'rose' : 'sky',
      },
      {
        id: 'wash-weather-protection',
        title: '우천·분진 작업자 보호',
        subtitle: `${weights[3]}% · 기상 위험 ${metrics.weatherRiskCount || 0}건`,
        rawScore: metrics.weatherProtectionScore || 0,
        weight: weights[3],
        badge: metrics.weatherProtectionScore < 70 ? '주의' : '관리',
        icon: icons.AlertTriangle,
        color: metrics.weatherProtectionScore < 70 ? 'rose' : 'amber',
      },
    ],
    complaint: [
      {
        id: 'complaint-resident-response',
        title: '주민 영향 대응 상태',
        subtitle: `처리율 ${Math.round(metrics.complaintResolutionRate || 0)}% · 미처리 ${metrics.unresolvedComplaintCount || 0}건`,
        rawScore: residentResponseScore,
        weight: 60,
        badge: (metrics.complaintResolutionRate || 0) >= 80 ? '우수' : '관리',
        icon: icons.Users,
        color: (metrics.complaintResolutionRate || 0) >= 80 ? 'emerald' : 'amber',
      },
      {
        id: 'complaint-work-route-safety',
        title: '민원 발생 작업·동선 안전',
        subtitle: `고위험 장비 ${metrics.highRiskEquipmentCount || 0}대 · 기상 위험 ${metrics.weatherRiskCount || 0}건`,
        rawScore: complaintRouteSafetyScore,
        weight: 40,
        badge: complaintRouteSafetyScore < 70 ? '주의' : '관리',
        icon: icons.ShieldCheck,
        color: complaintRouteSafetyScore < 70 ? 'rose' : 'sky',
      },
    ],
    work: [
      {
        id: 'work-education',
        title: `${zoneName} 안전교육 이수율`,
        subtitle: `${weights[0]}% · 이수 ${metrics.trainedWorkerCount || 0}/${metrics.workerCount || 0}명`,
        rawScore: metrics.safetyEducationRate || 0,
        weight: weights[0],
        badge: metrics.safetyEducationRate >= 80 ? '우수' : metrics.workerCount ? '관리' : '대기',
        icon: icons.Medal,
        color: 'violet',
      },
      {
        id: 'work-staffing',
        title: `${zoneName} 필요 인력 충족률`,
        subtitle: `${weights[1]}% · 배치 ${metrics.assignedWorkerCount || 0}/${metrics.requiredWorkerCount || metrics.workerCount || 0}명`,
        rawScore: metrics.staffingRate || 0,
        weight: weights[1],
        badge: metrics.staffingRate >= 80 ? '우수' : '관리',
        icon: icons.Users,
        color: 'emerald',
      },
      {
        id: 'work-weather-protection',
        title: `${zoneName} 기상 위험 보호`,
        subtitle: `${weights[2]}% · 기상 위험 ${metrics.weatherRiskCount || 0}건`,
        rawScore: metrics.weatherProtectionScore || 0,
        weight: weights[2],
        badge: metrics.weatherProtectionScore < 70 ? '주의' : '관리',
        icon: icons.AlertTriangle,
        color: metrics.weatherProtectionScore < 70 ? 'rose' : 'amber',
      },
      {
        id: 'work-route-safety',
        title: `${zoneName} 장비 동선 안전`,
        subtitle: `${weights[3]}% · 고위험 장비 ${metrics.highRiskEquipmentCount || 0}대 · 게이트 ${metrics.gateCount || 0}곳`,
        rawScore: metrics.routeSafetyScore || 0,
        weight: weights[3],
        badge: metrics.routeSafetyScore < 70 ? '주의' : '관리',
        icon: icons.ShieldCheck,
        color: metrics.routeSafetyScore < 70 ? 'rose' : 'sky',
      },
    ],
  }

  return cardsByZone[zoneKind].map(buildScoreCard)
}

function buildGovernanceMetricCards({ metrics, icons, zoneKind, zoneName, weights }) {
  const supportActive = isSupportMetricsActive(metrics, zoneKind)
  const complaintHistoryScore = zoneKind === 'complaint' && !supportActive
    ? 0
    : clampScore(
      (metrics.actionTrackingRate || 0) * 0.45
        + (metrics.reportRate || 0) * 0.25
        + (metrics.dataLinkRate || 0) * 0.2
        + (100 - Math.min(60, (metrics.unresolvedComplaintCount || 0) * 15)) * 0.1,
    )
  const riskActionRecordScore = clampScore(
    (metrics.actionTrackingRate || 0) * 0.65
      + (metrics.checkScore || 0) * 0.35,
  )

  const cardsByZone = {
    wash: [
      {
        id: 'wash-operation-log',
        title: '세척장 운영 기록률',
        subtitle: `${weights[0]}% · 선택일 관련 기록 ${Math.round(metrics.reportRate || 0)}%`,
        rawScore: metrics.reportRate || 0,
        weight: weights[0],
        badge: metrics.reportRate >= 80 ? '우수' : '관리',
        icon: icons.Gauge,
        color: 'violet',
      },
      {
        id: 'wash-action-complete',
        title: '세척 조치 이행률',
        subtitle: `${weights[1]}% · 공사일보 진척률 ${Math.round(metrics.actionTrackingRate || 0)}%`,
        rawScore: metrics.actionTrackingRate || 0,
        weight: weights[1],
        badge: metrics.actionTrackingRate >= 80 ? '우수' : '주의',
        icon: icons.ShieldCheck,
        color: 'emerald',
      },
      {
        id: 'wash-data-link',
        title: '세척 데이터 연동 완성도',
        subtitle: `${weights[2]}% · 날씨·장비·일보·인력 ${Math.round(metrics.dataLinkRate || 0)}%`,
        rawScore: metrics.dataLinkRate || 0,
        weight: weights[2],
        badge: metrics.dataLinkRate >= 80 ? '우수' : '연동',
        icon: icons.Medal,
        color: 'sky',
      },
      {
        id: 'wash-missing-check',
        title: '세척장 점검 누락 여부',
        subtitle: `${weights[3]}% · 누락 추정 ${Math.max(0, metrics.missingCheckCount || 0)}건`,
        rawScore: metrics.checkScore || 0,
        weight: weights[3],
        badge: metrics.missingCheckCount > 2 ? '위험' : '관리',
        icon: icons.AlertTriangle,
        color: metrics.missingCheckCount > 2 ? 'rose' : 'amber',
      },
    ],
    complaint: [
      {
        id: 'complaint-resolution-rate',
        title: '민원 접수·처리율',
        subtitle: `접수 ${metrics.complaintCount || 0}건 · 처리 ${metrics.complaintResolvedCount || 0}건 · ${Math.round(metrics.complaintResolutionRate || 0)}%`,
        rawScore: metrics.complaintResolutionRate || 0,
        weight: 60,
        badge: (metrics.complaintResolutionRate || 0) >= 80 ? '우수' : '관리',
        icon: icons.Gauge,
        color: (metrics.complaintResolutionRate || 0) >= 80 ? 'emerald' : 'amber',
      },
      {
        id: 'complaint-action-history',
        title: '민원 조치 이력·재발방지',
        subtitle: `조치 기록 ${Math.round(metrics.actionTrackingRate || 0)}% · 미처리 ${metrics.unresolvedComplaintCount || 0}건`,
        rawScore: complaintHistoryScore,
        weight: 40,
        badge: complaintHistoryScore >= 80 ? '우수' : '관리',
        icon: icons.ShieldCheck,
        color: complaintHistoryScore >= 80 ? 'emerald' : 'amber',
      },
    ],
    work: [
      {
        id: 'work-daily-log',
        title: `${zoneName} 작업일보 기록률`,
        subtitle: `${weights[0]}% · 선택일 공사일보 ${Math.round(metrics.reportRate || 0)}%`,
        rawScore: metrics.reportRate || 0,
        weight: weights[0],
        badge: metrics.reportRate >= 80 ? '우수' : '관리',
        icon: icons.Gauge,
        color: 'violet',
      },
      {
        id: 'work-progress-done',
        title: `${zoneName} 이행 완료율`,
        subtitle: `${weights[1]}% · 공사일보 진척률 ${Math.round(metrics.actionTrackingRate || 0)}%`,
        rawScore: metrics.actionTrackingRate || 0,
        weight: weights[1],
        badge: metrics.actionTrackingRate >= 80 ? '우수' : '주의',
        icon: icons.ShieldCheck,
        color: 'emerald',
      },
      {
        id: 'work-risk-action-log',
        title: `${zoneName} 위험 조치 기록`,
        subtitle: `${weights[2]}% · 기상 위험 ${metrics.weatherRiskCount || 0}건 · 누락 ${Math.max(0, metrics.missingCheckCount || 0)}건`,
        rawScore: riskActionRecordScore,
        weight: weights[2],
        badge: riskActionRecordScore >= 80 ? '우수' : '관리',
        icon: icons.AlertTriangle,
        color: riskActionRecordScore >= 80 ? 'sky' : 'amber',
      },
      {
        id: 'work-data-link',
        title: `${zoneName} 데이터 연동 완성도`,
        subtitle: `${weights[3]}% · 날씨·작업·일보·인력 ${Math.round(metrics.dataLinkRate || 0)}%`,
        rawScore: metrics.dataLinkRate || 0,
        weight: weights[3],
        badge: metrics.dataLinkRate >= 80 ? '우수' : '연동',
        icon: icons.Medal,
        color: 'sky',
      },
    ],
  }

  return cardsByZone[zoneKind].map(buildScoreCard)
}

function buildScoreCard({ id, title, subtitle, rawScore, weight, badge, icon, color }) {
  // 표시 점수: 0~100 정수 (사용자 화면 기준)
  // 가중 기여: 표시 점수 × 가중치 (반올림 후 합산이 ESG 점수와 일치하도록)
  const displayScore = Math.round(clampScore(rawScore || 0))
  const safeWeight = Math.max(0, Number(weight) || 0)
  const weightedScore = Math.round(displayScore * safeWeight) / 100

  return {
    id,
    title,
    subtitle,
    value: `${displayScore}점`,
    badge,
    icon,
    iconClass: METRIC_COLOR_CLASS[color]?.icon ?? METRIC_COLOR_CLASS.emerald.icon,
    valueClass: METRIC_COLOR_CLASS[color]?.score ?? METRIC_COLOR_CLASS.emerald.score,
    barClass: METRIC_COLOR_CLASS[color]?.bar ?? METRIC_COLOR_CLASS.emerald.bar,
    weight: safeWeight,
    weightLabel: `${safeWeight}%`,
    displayScore,
    weightedScore,
  }
}
