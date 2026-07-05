import {
  ESG_SITE_FLOOR_POINT,
  ESG_ZONE_FLOOR_POINT,
  clampScore,
  normalizeCumulativeScore,
  normalizeFloorLevel,
  normalizeList,
  resolveEsgFloor,
  roundOne,
} from './esgScoreCalculator.js'

function buildShortSiteName(name = '') {
  const cleaned = String(name || '').replace(/신축|재건축|공구|공사|현장/g, '').trim()
  return cleaned.split(/\s+/).slice(0, 2).join(' ') || String(name || '현장').trim()
}
export function parseProjectDisplayName(rawName = '') {
  const normalized = String(rawName || '').trim()
  const matched = normalized.match(/^\s*\[([^\]]+)]\s*(.*)$/)
  if (!matched) {
    return {
      siteCode: '',
      displayName: normalized || '현장명 미지정',
      shortName: buildShortSiteName(normalized || '현장'),
    }
  }

  const displayName = matched[2]?.trim() || normalized
  return {
    siteCode: matched[1]?.trim() || '',
    displayName,
    shortName: buildShortSiteName(displayName),
  }
}

export function buildProjectSiteItems(projects = [], rankings = [], currentProjectId = null, fallbackSite = null) {
  const projectList = normalizeList(projects)
  const rankingList = normalizeList(rankings)
  const projectMap = new Map(
    projectList.map((item) => [String(item.idx ?? item.projectId ?? item.id), item]),
  )
  const rankingMap = new Map(
    rankingList.map((item) => [String(item.projectId ?? item.idx ?? item.id), item]),
  )

  // 서버 rankings는 본사와 현장 계정에 동일하게 내려오는 전체 현장 순위 데이터다.
  // 계정 권한에 따라 범위가 달라지는 projects가 아니라 rankings를 우선 기준으로 사용한다.
  const sourceItems = rankingList.length ? rankingList : projectList
  const siteItems = sourceItems.map((item, index) => {
    const projectId = item.projectId ?? item.idx ?? item.id
    const project = projectMap.get(String(projectId)) ?? {}
    const ranking = rankingMap.get(String(projectId)) ?? {}
    const parsed = parseProjectDisplayName(ranking.name ?? project.name ?? '')
    const displayName = String(ranking.name ?? project.name ?? parsed.displayName ?? '').trim()
    const totalScore = Number(ranking.score ?? ranking.totalScore ?? project.score ?? 0)
    const hasSnapshot = Boolean(
      ranking.snapshotSaved ?? ranking.hasSnapshot ?? project.snapshotSaved ?? totalScore > 0,
    )

    return {
      id: String(projectId),
      projectId,
      siteCode: String(ranking.code ?? project.code ?? parsed.siteCode ?? '').trim(),
      name: displayName || '현장명 미지정',
      shortName:
        String(ranking.shortName ?? project.shortName ?? '').trim() ||
        buildShortSiteName(displayName || '현장'),
      address: ranking.location ?? project.location ?? ranking.address ?? project.address ?? '',
      contractor: ranking.contractor ?? project.contractor ?? '',
      manager: ranking.manager ?? project.manager ?? '',
      score: normalizeCumulativeScore(totalScore),
      level: normalizeFloorLevel(
        ranking.level ?? project.level ?? resolveEsgFloor(totalScore, ESG_SITE_FLOOR_POINT),
      ),
      carbon: Math.round(Number(ranking.carbonKg ?? ranking.carbon ?? project.carbonKg ?? 0)),
      powerSaving: Math.round(
        Number(ranking.powerSavingKwh ?? ranking.powerSaving ?? project.powerSavingKwh ?? 0),
      ),
      riskCount: Math.round(Number(ranking.riskCount ?? project.riskCount ?? 0)),
      missionRate: Math.round(Number(ranking.missionRate ?? project.missionRate ?? 0)),
      trend: Number(ranking.trend ?? project.trend ?? 0),
      accent: ['emerald', 'sky', 'violet', 'amber'][index % 4],
      snapshotSaved: hasSnapshot,
      startDate: project.startDate ?? ranking.startDate ?? null,
      endDate: project.endDate ?? ranking.endDate ?? null,
    }
  })

  if (siteItems.length) return siteItems
  return fallbackSite ? [fallbackSite] : []
}

export function buildSnapshotPayload({ reportDate, currentSite, siteZones, esgBreakdown, safetyDays }) {
  const zones = normalizeList(siteZones).filter(shouldPersistSnapshotZone)
  const scores = normalizeList(esgBreakdown)
  const scoreTargets = selectSiteScoreZones(zones)
  const targetCount = scoreTargets.length
  const averageBy = (selector) => {
    if (!targetCount) return 0
    const sum = scoreTargets.reduce((total, zone) => total + Number(selector(zone) || 0), 0)
    return clampScore(sum / targetCount)
  }

  const environmentScore = averageBy((zone) => zone.metrics?.environmentScore)
  const socialScore = averageBy((zone) => zone.metrics?.socialScore)
  const governanceScore = averageBy((zone) => zone.metrics?.governanceScore)
  const totalScore = targetCount
    ? clampScore(scoreTargets.reduce((sum, zone) => sum + Number(zone.dailyScore ?? zone.metrics?.totalScore ?? zone.score ?? 0), 0) / targetCount)
    : clampScore(currentSite?.dailyScore ?? currentSite?.score ?? 0)
  const contributionWeight = targetCount ? roundOne(100 / targetCount) : 0
  const scoreTargetIds = new Set(scoreTargets.map((zone) => zone.id))
  const zoneSnapshots = zones.map((zone) => {
    const contributesToSiteScore = scoreTargetIds.has(zone.id)
    const zoneScore = clampScore(zone.dailyScore ?? zone.metrics?.totalScore ?? zone.score ?? 0)

    return {
      zoneName: zone.name,
      zoneType: zone.zoneType ?? 'work',
      environmentScore: clampScore(zone.metrics?.environmentScore ?? 0),
      socialScore: clampScore(zone.metrics?.socialScore ?? 0),
      governanceScore: clampScore(zone.metrics?.governanceScore ?? 0),
      totalScore: zoneScore,
      level: resolveEsgFloor(zoneScore, ESG_ZONE_FLOOR_POINT),
      carbonKg: Math.round(Number(zone.carbon || zone.metrics?.estimatedCarbonKg || 0)),
      powerSavingKwh: Math.round(Number(zone.powerSaving || zone.metrics?.powerSavingKwh || 0)),
      riskCount: Math.round(Number(zone.risk || zone.metrics?.operatingRisk || 0)),
      missionRate: Math.round(Number(zone.missionRate || zone.metrics?.missionRate || 0)),
      equipmentCount: Math.round(Number(zone.equipmentCount || zone.metrics?.totalEquipmentCount || 0)),
      highRiskEquipmentCount: Math.round(Number(zone.highRiskEquipmentCount || zone.metrics?.highRiskEquipmentCount || 0)),
      contributionWeight: contributesToSiteScore ? contributionWeight : 0,
      contributionScore: contributesToSiteScore && targetCount ? clampScore(zoneScore / targetCount) : 0,
      snapshotJson: JSON.stringify({
        id: zone.id,
        name: zone.name,
        type: zone.type,
        zoneType: zone.zoneType,
        rank: zone.rank,
        status: zone.status,
        equipmentSummary: zone.equipmentSummary,
        gateSummary: zone.gateSummary,
        metrics: zone.metrics,
      }),
    }
  })

  return {
    projectId: currentSite?.projectId ?? Number(currentSite?.id),
    reportDate,
    totalScore,
    level: resolveEsgFloor(totalScore, ESG_SITE_FLOOR_POINT),
    environmentScore,
    socialScore,
    governanceScore,
    carbonKg: Math.round(zones.reduce((sum, zone) => sum + Number(zone.carbon || 0), 0)),
    powerSavingKwh: Math.round(zones.reduce((sum, zone) => sum + Number(zone.powerSaving || 0), 0)),
    riskCount: Math.round(zones.reduce((sum, zone) => sum + Number(zone.risk || 0), 0)),
    missionRate: scoreTargets.length
      ? Math.round(scoreTargets.reduce((sum, zone) => sum + Number(zone.missionRate || 0), 0) / scoreTargets.length)
      : Math.round(Number(currentSite?.missionRate || 0)),
    zoneCount: zones.length,
    safetyDays: Math.max(1, Math.round(Number(safetyDays || 1))),
    zones: zoneSnapshots,
    snapshotJson: JSON.stringify({
      site: currentSite,
      zones,
      scores,
      siteScore: {
        targetZoneIds: Array.from(scoreTargetIds),
        targetCount,
        contributionWeight,
        environmentScore,
        socialScore,
        governanceScore,
        totalScore,
      },
    }),
  }
}

function shouldPersistSnapshotZone(zone) {
  if (!isSupportLikeSnapshotZone(zone)) return true
  return hasActiveSnapshotData(zone)
}

function isSupportLikeSnapshotZone(zone) {
  const zoneType = String(zone?.zoneType ?? zone?.type ?? '').trim().toLowerCase()
  const zoneName = String(zone?.name ?? zone?.zoneName ?? '').trim()
  return (
    zoneType === 'support' ||
    zoneType === 'outdoor' ||
    ['세척장', '민원 구역', '민원구역'].includes(zoneName)
  )
}

function hasActiveSnapshotData(zone) {
  const metrics = zone?.metrics ?? {}
  const environmentScore = Number(metrics.environmentScore ?? 0)
  const socialScore = Number(metrics.socialScore ?? 0)
  const governanceScore = Number(metrics.governanceScore ?? 0)
  const dailyScore = Number(zone?.dailyScore ?? metrics.totalScore ?? 0)
  const cumulativeScore = Number(zone?.score ?? 0)

  return (
    metrics.supportOperationActive === true ||
    environmentScore > 0 ||
    socialScore > 0 ||
    governanceScore > 0 ||
    dailyScore > 0 ||
    cumulativeScore > 0 ||
    Number(zone?.equipmentCount ?? metrics.totalEquipmentCount ?? 0) > 0 ||
    Number(zone?.highRiskEquipmentCount ?? metrics.highRiskEquipmentCount ?? 0) > 0 ||
    Number(zone?.risk ?? metrics.operatingRisk ?? metrics.weatherRiskCount ?? 0) > 0 ||
    Number(zone?.missionRate ?? metrics.missionRate ?? 0) > 0 ||
    Number(metrics.complaintCount ?? 0) > 0 ||
    Number(metrics.complaintResolvedCount ?? 0) > 0 ||
    Number(metrics.workerCount ?? 0) > 0 ||
    Number(metrics.assignedWorkerCount ?? 0) > 0 ||
    Number(metrics.requiredWorkerCount ?? 0) > 0 ||
    Number(metrics.trainedWorkerCount ?? 0) > 0
  )
}

function selectSiteScoreZones(zones) {
  const workZones = normalizeList(zones).filter((zone) => {
    const zoneType = String(zone?.zoneType ?? '').trim().toLowerCase()
    const zoneName = String(zone?.name ?? zone?.zoneName ?? '').trim()
    if (zoneType === 'support' || zoneType === 'outdoor') return false
    if (['세척장', '민원 구역', '민원구역'].includes(zoneName)) return false
    return zoneType === 'work' || Number(zone?.equipmentCount ?? zone?.metrics?.totalEquipmentCount ?? 0) > 0
  })

  return workZones
}

export function calculateSafetyDays(project, reportDate) {
  const startDateText = project?.startDate
  if (!startDateText) return 1

  const start = new Date(`${startDateText}T00:00:00`)
  const target = new Date(`${reportDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(target.getTime())) return 1
  const diff = Math.floor((target.getTime() - start.getTime()) / 86400000) + 1
  return Math.max(1, diff)
}
