<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Droplets,
  Factory,
  Gauge,
  HardHat,
  Leaf,
  Medal,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-vue-next'
import { getEsgDashboard, saveEsgSnapshot } from '@/api/esgDashboard.js'
import { getProjectList } from '@/api/project.js'
import { getReportsByDate } from '@/api/report.js'
import { fetchWeatherDashboard } from '@/api/weatherControl.js'
import { getStaffingWorkerPool, getStaffingZones } from '@/api/staffing.js'
import { getGateEquipments } from '@/api/workOrder.js'
import { fetchWorkerList } from '@/api/worker.js'
import { useAuthStore } from '@/stores/authStore.js'
import EsgDailySummaryTable from '@/components/esg/EsgDailySummaryTable.vue'
import EsgGrowthPanel from '@/components/esg/EsgGrowthPanel.vue'
import EsgHeroSection from '@/components/esg/EsgHeroSection.vue'
import EsgMissionSafetySection from '@/components/esg/EsgMissionSafetySection.vue'
import EsgScoreBreakdownPanel from '@/components/esg/EsgScoreBreakdownPanel.vue'
import EsgSiteRankingPanel from '@/components/esg/EsgSiteRankingPanel.vue'
import {
  ESG_SITE_FLOOR_POINT,
  ESG_ZONE_FLOOR_POINT,
  formatEsgFloorProgressScore,
  getEsgFloorAbsoluteScore,
  getEsgFloorProgressByPoint,
  getNextEsgFloorPointByPoint,
  normalizeCumulativeScore,
  normalizeFloorLevel,
  normalizeFloorProgressPoint,
  resolveEsgFloor,
} from '@/utils/esg/esgScoreCalculator.js'
import {
  buildDashboardZones,
  buildEsgBreakdown,
  buildMissions,
  buildZoneMetricCards,
  calculateOperatingRiskCount,
} from '@/utils/esg/esgDashboardMapper.js'
import {
  buildProjectSiteItems,
  buildSnapshotPayload,
  calculateSafetyDays,
} from '@/utils/esg/esgSnapshotMapper.js'

const authStore = useAuthStore()
const route = useRoute()

const reportDate = ref(getTodayDateText())
const loading = ref(false)
const lastUpdatedAt = ref('')
const dashboard = ref(null)
const selectedProjectId = ref(resolveInitialProjectId())
const selectedZoneId = ref('')
const activeEsgKey = ref('E')
let refreshTimer = null
let loadRunning = false
let loadQueued = false

const projects = ref([])
const backendRankings = ref([])
const backendCurrentProject = ref(null)
const backendCurrentSnapshot = ref(null)
const backendCurrentZoneSnapshots = ref([])
const backendTodaySnapshot = ref(null)
const backendMetricInputs = ref([])
const sites = ref([])

const equipmentsData = ref([])
const equipmentScopeProjectId = ref(null)
const workPlansData = ref([])
const reportsData = ref([])
const workersData = ref([])
const staffingWorkersData = ref([])
const staffingZonesData = ref([])

const selectedSiteId = computed(() =>
  String(selectedProjectId.value ?? currentProject.value?.idx ?? ''),
)
const currentProject = computed(() => {
  return (
    projects.value.find((project) => String(project.idx) === String(selectedProjectId.value)) ??
    backendCurrentProject.value ??
    projects.value[0] ??
    null
  )
})
const currentProjectId = computed(
  () => currentProject.value?.idx ?? selectedProjectId.value ?? null,
)
const todayDateText = computed(() => getTodayDateText())
const reportDateState = computed(() => {
  if (reportDate.value < todayDateText.value) return 'past'
  if (reportDate.value > todayDateText.value) return 'future'
  return 'today'
})
const isPastReportDate = computed(() => reportDateState.value === 'past')
const isFutureReportDate = computed(() => reportDateState.value === 'future')
const displayCurrentSnapshot = computed(() => {
  return isFutureReportDate.value ? backendTodaySnapshot.value : backendCurrentSnapshot.value
})

const weatherToday = computed(() => dashboard.value?.today ?? null)
const weatherAnalysis = computed(() => dashboard.value?.analysis ?? null)
const airQuality = computed(() => dashboard.value?.airQuality ?? null)
const equipmentRisks = computed(() => normalizeArray(dashboard.value?.equipmentRisks))
const planRisks = computed(() => normalizeArray(dashboard.value?.planRisks))

const weatherRiskCount = computed(
  () => (equipmentRisks.value?.length ?? 0) + (planRisks.value?.length ?? 0),
)

const gateEquipmentsForCurrentProject = computed(() => {
  return equipmentsData.value.filter((equipment) => {
    const dateMatched = normalizeDateText(equipment.workDate) === reportDate.value
    if (!dateMatched) return false

    if (equipment.siteIdx != null && currentProjectId.value != null) {
      return String(equipment.siteIdx) === String(currentProjectId.value)
    }

    if (equipmentScopeProjectId.value != null && currentProjectId.value != null) {
      return String(equipmentScopeProjectId.value) === String(currentProjectId.value)
    }

    return Boolean(currentProjectId.value)
  })
})

const workPlanEquipmentsForCurrentProject = computed(() => {
  if (!currentProjectId.value) return []
  return buildWorkPlanEquipmentRows(workPlansData.value, reportDate.value)
})

const filteredEquipments = computed(() => gateEquipmentsForCurrentProject.value)

const realMissionRate = computed(() => {
  const equipments = filteredEquipments.value
  if (!equipments.length) return 0
  const working = equipments.filter((equipment) => equipment.statusLabel === '작업중').length
  return Math.round((working / equipments.length) * 100)
})

const safetyDays = computed(() => {
  return (
    backendCurrentProject.value?.safetyDays ??
    backendCurrentSnapshot.value?.safetyDays ??
    calculateSafetyDays(currentProject.value, reportDate.value)
  )
})

const dashboardContext = computed(() => ({
  weatherAnalysis: weatherAnalysis.value,
  airQuality: airQuality.value,
  weatherRiskCount: weatherRiskCount.value,
  missionRate: realMissionRate.value,
  reports: reportsData.value,
  workOrders: filteredEquipments.value,
  workers: workersData.value,
  staffingWorkers: staffingWorkersData.value,
  staffingZones: staffingZonesData.value,
  safetyDays: safetyDays.value,
  currentProjectId: currentProjectId.value,
  metricInputs: backendMetricInputs.value,
}))

const siteZones = computed(() => {
  const runtimeZones = buildDashboardZones(filteredEquipments.value, dashboardContext.value)

  if (isFutureReportDate.value) {
    return rankVisibleZones(runtimeZones.map((zone) => zeroizeZoneScore(zone)))
  }

  if (isPastReportDate.value) {
    if (backendCurrentZoneSnapshots.value.length) {
      return buildSnapshotZones(backendCurrentZoneSnapshots.value)
    }
    return rankVisibleZones(runtimeZones)
  }

  if (backendCurrentZoneSnapshots.value.length) {
    return mergeRuntimeZonesWithSnapshot(runtimeZones, backendCurrentZoneSnapshots.value)
  }

  return rankVisibleZones(runtimeZones)
})

const selectedZone = computed(() => {
  return siteZones.value.find((zone) => zone.id === selectedZoneId.value) ?? siteZones.value[0]
})

const esgBreakdown = computed(() => {
  const iconMap = {
    E: Leaf,
    S: ShieldCheck,
    G: Gauge,
  }
  return buildEsgBreakdown(selectedZone.value, {
    airQuality: airQuality.value,
    safetyDays: safetyDays.value,
  }).map((item) => ({
    ...item,
    icon: iconMap[item.key],
  }))
})

const currentSiteSummary = computed(() => {
  const zones = siteZones.value
  const snapshot = displayCurrentSnapshot.value

  if (isFutureReportDate.value && snapshot) {
    return {
      score: snapshot.totalScore ?? 0,
      level: snapshot.level ?? resolveEsgFloor(snapshot.totalScore ?? 0, ESG_SITE_FLOOR_POINT),
      carbon: snapshot.carbonKg ?? 0,
      powerSaving: snapshot.powerSavingKwh ?? 0,
      riskCount: snapshot.riskCount ?? 0,
      missionRate: snapshot.missionRate ?? 0,
    }
  }

  if (!zones.length) {
    const cumulativeScore = normalizeCumulativeScore(snapshot?.totalScore ?? 0)
    return {
      score: cumulativeScore,
      dailyScore: 0,
      level: snapshot?.level ?? resolveEsgFloor(cumulativeScore, ESG_SITE_FLOOR_POINT),
      carbon: snapshot?.carbonKg ?? 0,
      powerSaving: snapshot?.powerSavingKwh ?? 0,
      riskCount: snapshot?.riskCount ?? 0,
      missionRate: snapshot?.missionRate ?? 0,
    }
  }

  const scoreTargetZones = selectSiteScoreZones(zones)
  const dailyAverageScore = scoreTargetZones.length
    ? Math.round(
        (scoreTargetZones.reduce(
          (sum, zone) => sum + Number(zone.dailyScore ?? zone.metrics?.totalScore ?? 0),
          0,
        ) /
          scoreTargetZones.length) *
          10,
      ) / 10
    : 0
  const cumulativeScore = normalizeCumulativeScore(snapshot?.totalScore ?? dailyAverageScore)

  return {
    score: cumulativeScore,
    dailyScore: dailyAverageScore,
    level: snapshot?.level ?? resolveEsgFloor(cumulativeScore, ESG_SITE_FLOOR_POINT),
    carbon: zones.reduce((sum, zone) => sum + Number(zone.carbon || 0), 0),
    powerSaving: zones.reduce((sum, zone) => sum + Number(zone.powerSaving || 0), 0),
    riskCount: calculateOperatingRiskCount(filteredEquipments.value, weatherRiskCount.value),
    missionRate: realMissionRate.value,
  }
})

const currentSite = computed(() => {
  const fallback = sites.value.find((site) => site.id === selectedSiteId.value) ?? sites.value[0]
  return {
    ...fallback,
    id: selectedSiteId.value || fallback?.id || 'current-site',
    projectId: currentProjectId.value,
    name:
      backendCurrentProject.value?.name ??
      fallback?.name ??
      currentProject.value?.name ??
      '현장명 미지정',
    shortName: fallback?.shortName ?? backendCurrentProject.value?.name ?? '현장',
    address:
      backendCurrentProject.value?.location ??
      fallback?.address ??
      currentProject.value?.location ??
      '',
    snapshotSaved: displayCurrentSnapshot.value?.snapshotSaved ?? fallback?.snapshotSaved ?? false,
    startDate:
      backendCurrentProject.value?.startDate ??
      fallback?.startDate ??
      currentProject.value?.startDate ??
      null,
    endDate:
      backendCurrentProject.value?.endDate ??
      fallback?.endDate ??
      currentProject.value?.endDate ??
      null,
    ...currentSiteSummary.value,
  }
})

const activeScore = computed(() => selectedZone.value?.score ?? currentSite.value.score)
const activeLevel = computed(() =>
  normalizeFloorLevel(selectedZone.value?.level ?? currentSite.value.level ?? 0),
)
const levelProgress = computed(() =>
  getEsgFloorProgressByPoint(activeScore.value, ESG_ZONE_FLOOR_POINT),
)
const nextLevelPoint = computed(() =>
  getNextEsgFloorPointByPoint(activeScore.value, ESG_ZONE_FLOOR_POINT).toFixed(1),
)
const activeFloorPoint = computed(() =>
  normalizeFloorProgressPoint(activeScore.value, ESG_ZONE_FLOOR_POINT),
)
const activeFloorScoreLabel = computed(() =>
  formatEsgFloorProgressScore(activeLevel.value, activeScore.value, {
    decimals: 1,
    showMax: false,
    floorPoint: ESG_ZONE_FLOOR_POINT,
  }),
)
const buildingFloors = computed(() =>
  Array.from({ length: Math.min(8, Math.max(1, activeLevel.value)) }, (_, index) => index + 1),
)

const weatherImpact = computed(() => {
  const analysis = weatherAnalysis.value
  if (!analysis) {
    return {
      label: '기상 데이터 연결 대기',
      tone: 'text-slate-700 bg-slate-100 border-slate-200',
      score: 0,
    }
  }

  let score = 0
  if (analysis.hasRain || (analysis.precipitationProbability ?? 0) >= 60) score += 2
  if (analysis.windRisk || (analysis.maxWindSpeed ?? 0) >= 8) score += 2
  if (analysis.hasSnow) score += 2
  if (analysis.heatRisk) score += 1
  if (analysis.coldRisk) score += 1
  if (analysis.fineDustRisk) score += 1

  if (score >= 4)
    return { label: '통제 필요', tone: 'text-rose-700 bg-rose-50 border-rose-200', score }
  if (score >= 2)
    return { label: '주의 관찰', tone: 'text-amber-700 bg-amber-50 border-amber-200', score }
  return { label: '정상 운영', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200', score }
})

const zoneMetricCards = computed(() =>
  buildZoneMetricCards(
    selectedZone.value,
    activeEsgKey.value,
    { AlertTriangle, Droplets, Factory, Gauge, HardHat, Leaf, Medal, ShieldCheck, Users, Zap },
    { safetyDays: safetyDays.value },
  ),
)

const missions = computed(() => buildMissions(selectedZone.value, currentSite.value))

const siteRankingItems = computed(() => {
  const current = currentSite.value
  const merged = sites.value
    .filter((site) => isRankingEligibleSite(site))
    .map((site) => {
      if (String(site.id) !== String(current.id)) return site
      return {
        ...site,
        ...current,
      }
    })

  if (
    isRankingEligibleSite(current) &&
    !merged.find((site) => String(site.id) === String(current.id))
  ) {
    merged.push(current)
  }

  return merged.sort((a, b) => {
    if (a.snapshotSaved !== b.snapshotSaved) return a.snapshotSaved ? -1 : 1
    const levelGap = normalizeFloorLevel(b.level) - normalizeFloorLevel(a.level)
    if (levelGap !== 0) return levelGap
    return Number(b.score ?? 0) - Number(a.score ?? 0)
  })
})
const currentSiteRankIndex = computed(() => {
  return siteRankingItems.value.findIndex(
    (site) => String(site.id) === String(selectedSiteId.value),
  )
})
const currentSiteRank = computed(() => currentSiteRankIndex.value + 1)
const upperRankingSite = computed(() => {
  if (currentSiteRankIndex.value <= 0) return null
  return siteRankingItems.value[currentSiteRankIndex.value - 1] ?? null
})
const nextRankingSite = computed(() => {
  if (currentSiteRankIndex.value !== 0) return null
  return siteRankingItems.value[1] ?? null
})
const rankingComparison = computed(() => {
  if (!siteRankingItems.value.length || currentSiteRankIndex.value < 0) {
    return '현장 ESG 순위를 불러오는 중입니다.'
  }

  if (currentSiteRank.value === 1) {
    if (!nextRankingSite.value) return '현재 현장만 순위 산정 중입니다.'
    if (!nextRankingSite.value.snapshotSaved) return '현재 현장이 산정 완료 현장 중 1위입니다.'

    const leadPoint = buildFloorGapLabel(
      getSiteAccumulatedScore(currentSite.value) - getSiteAccumulatedScore(nextRankingSite.value),
    )
    return `${nextRankingSite.value.name}보다 ${leadPoint} 앞서고 있습니다.`
  }

  const upperSite = upperRankingSite.value
  const gapPoint = buildFloorGapLabel(
    getSiteAccumulatedScore(upperSite ?? currentSite.value) -
      getSiteAccumulatedScore(currentSite.value),
  )
  return `${currentSiteRank.value - 1}위 ${upperSite?.name ?? '상위 현장'}까지 ${gapPoint} 차이입니다.`
})

function isRankingEligibleSite(site) {
  const endDate = String(site?.endDate ?? '').trim()
  if (!endDate) return true
  return endDate >= reportDate.value
}

function getSiteAccumulatedScore(site) {
  return getEsgFloorAbsoluteScore(site?.level ?? 0, site?.score ?? 0, ESG_SITE_FLOOR_POINT)
}

function buildFloorGapLabel(scoreGap) {
  const safeGap = Math.max(0, Math.round(Number(scoreGap || 0)))
  const floorGap = Math.floor(safeGap / ESG_SITE_FLOOR_POINT)
  const pointGap = safeGap % ESG_SITE_FLOOR_POINT

  if (floorGap > 0 && pointGap > 0) return `${floorGap}층, ${pointGap}점`
  if (floorGap > 0) return `${floorGap}층`
  return `${pointGap}점`
}

const riskActions = computed(() => {
  const risks = [...equipmentRisks.value, ...planRisks.value].slice(0, 3)
  if (risks.length) {
    return risks.map((risk, index) => ({
      id: `risk-${index}`,
      title: risk.title || risk.reason || '기상 연동 위험 항목',
      detail: risk.action || risk.subtitle || '작업 계획과 장비 운용 조건을 다시 확인하세요.',
      level: risk.level || '주의',
    }))
  }

  if (weatherImpact.value.score >= 2) {
    return [
      {
        id: 'weather',
        title: '기상 조건에 따른 작업 순서 조정',
        detail: '강수·풍속·미세먼지 기준을 반영해 외부 작업 우선순위를 조정하세요.',
        level: weatherImpact.value.score >= 4 ? '경고' : '주의',
      },
    ]
  }

  return [
    {
      id: 'stable',
      title: '현재 기상 조건은 평시 운용 범위',
      detail: '장비 대기시간과 세척 운영·게이트 분산 관리 미션 중심으로 운영하면 됩니다.',
      level: '양호',
    },
  ]
})

async function loadAll() {
  if (loadRunning) {
    loadQueued = true
    return
  }

  loadRunning = true
  loading.value = true

  try {
    do {
      loadQueued = false
      await runDashboardLoad()
    } while (loadQueued)
  } finally {
    loadRunning = false
    loading.value = false
  }
}

async function runDashboardLoad() {
  await loadEsgDashboardMeta()

  if (isFutureReportDate.value) {
    clearOperationalData()
    await loadDashboard()
    // 미래 날짜: 첫 번째 loadEsgDashboardMeta 호출에서 오늘 기준선 포함 모든 데이터를 이미 조회하므로 재호출 불필요
    lastUpdatedAt.value = formatTime(new Date())
    return
  }

  if (isPastReportDate.value && backendCurrentZoneSnapshots.value.length) {
    clearOperationalData()
    await loadDashboard()
    // 과거 날짜(스냅샷 존재): 첫 번째 호출 이후 데이터 변경이 없으므로 재호출 불필요
    lastUpdatedAt.value = formatTime(new Date())
    return
  }

  await Promise.all([loadDashboard(), loadEquipments(), loadReports(), loadWorkers()])
  workPlansData.value = []

  await persistCurrentSnapshot()
  // 저장 후 서버 기준 누적점수/층수와 구역 스냅샷을 다시 반영한다.
  await loadEsgDashboardMeta(false)
  lastUpdatedAt.value = formatTime(new Date())
}

function clearOperationalData() {
  equipmentsData.value = []
  equipmentScopeProjectId.value = null
  workPlansData.value = []
  reportsData.value = []
  workersData.value = []
  staffingWorkersData.value = []
  staffingZonesData.value = []
}

async function loadEsgDashboardMeta(useCurrentSelection = true) {
  try {
    const response = await getEsgDashboard({
      reportDate: reportDate.value,
      projectId: useCurrentSelection ? selectedProjectId.value : currentProjectId.value,
    })
    const payload = unwrapPayload(response)
    let baselinePayload = null

    if (isFutureReportDate.value) {
      try {
        const baselineResponse = await getEsgDashboard({
          reportDate: todayDateText.value,
          projectId: useCurrentSelection ? selectedProjectId.value : currentProjectId.value,
        })
        baselinePayload = unwrapPayload(baselineResponse)
      } catch {
        baselinePayload = null
      }
    }

    backendCurrentProject.value = payload?.currentProject ?? baselinePayload?.currentProject ?? null
    backendCurrentSnapshot.value = payload?.currentSnapshot ?? null
    backendTodaySnapshot.value = baselinePayload?.currentSnapshot ?? null
    backendCurrentZoneSnapshots.value = normalizeArray(
      payload?.currentZoneSnapshots ?? payload?.currentSnapshot?.zones,
    )
    projects.value = normalizeArray(payload?.projects ?? baselinePayload?.projects)
    backendRankings.value = normalizeArray(baselinePayload?.rankings ?? payload?.rankings)
    backendMetricInputs.value = isFutureReportDate.value
      ? []
      : normalizeArray(payload?.currentMetricInputs)

    if (!selectedProjectId.value) {
      selectedProjectId.value =
        backendCurrentProject.value?.idx ?? authStore.projectId ?? projects.value[0]?.idx ?? null
    }

    sites.value = buildProjectSiteItems(
      projects.value,
      backendRankings.value,
      selectedProjectId.value,
    )
  } catch {
    projects.value = await loadProjectFallback()
    backendCurrentZoneSnapshots.value = []
    backendTodaySnapshot.value = null
    backendMetricInputs.value = []
    sites.value = buildProjectSiteItems(projects.value, [], selectedProjectId.value)
  }
}

async function loadProjectFallback() {
  try {
    return normalizeArray(await getProjectList())
  } catch {
    return []
  }
}

function resolveCurrentSiteCode() {
  const candidates = [
    authStore.siteCode,
    backendCurrentProject.value?.siteCode,
    backendCurrentProject.value?.projectCode,
    backendCurrentProject.value?.code,
    backendCurrentProject.value?.siteCd,
    currentProject.value?.siteCode,
    currentProject.value?.projectCode,
    currentProject.value?.code,
    currentProject.value?.siteCd,
  ]

  return candidates.find((value) => String(value ?? '').trim().length > 0) ?? undefined
}

async function loadDashboard() {
  try {
    const response = await fetchWeatherDashboard(reportDate.value)
    dashboard.value = unwrapPayload(response)
  } catch {
    dashboard.value = null
  }
}

async function loadEquipments() {
  if (!currentProjectId.value) {
    equipmentsData.value = []
    equipmentScopeProjectId.value = null
    return
  }

  const scopedProjectId = currentProjectId.value

  try {
    const response = await getGateEquipments(reportDate.value, scopedProjectId)

    if (String(scopedProjectId) !== String(currentProjectId.value)) {
      equipmentsData.value = []
      equipmentScopeProjectId.value = null
      return
    }

    equipmentScopeProjectId.value = scopedProjectId
    equipmentsData.value = normalizeArray(response)
  } catch {
    equipmentsData.value = []
    equipmentScopeProjectId.value = null
  }
}

async function loadWorkPlans() {
  workPlansData.value = []
}

async function loadReports() {
  try {
    const response = await getReportsByDate(reportDate.value)
    reportsData.value = normalizeArray(response)
  } catch {
    reportsData.value = []
  }
}

async function loadWorkers() {
  const siteCode = resolveCurrentSiteCode()
  const [workerResponse, staffingResponse, staffingZoneResponse] = await Promise.allSettled([
    fetchWorkerList(siteCode, reportDate.value),
    getStaffingWorkerPool({ siteCode, rosterDate: reportDate.value }),
    getStaffingZones({ siteCode, rosterDate: reportDate.value }),
  ])

  workersData.value =
    workerResponse.status === 'fulfilled'
      ? normalizeArray(workerResponse.value?.rows ?? workerResponse.value)
      : []
  staffingWorkersData.value =
    staffingResponse.status === 'fulfilled'
      ? normalizeArray(staffingResponse.value?.rows ?? staffingResponse.value)
      : []
  staffingZonesData.value =
    staffingZoneResponse.status === 'fulfilled'
      ? normalizeArray(staffingZoneResponse.value?.rows ?? staffingZoneResponse.value)
      : []
}

async function persistCurrentSnapshot() {
  if (reportDateState.value !== 'today') return
  if (!currentProjectId.value || !siteZones.value.length) return

  const persistableSiteZones = getPersistableSiteZones(siteZones.value)
  if (!persistableSiteZones.length) return

  try {
    const payload = buildSnapshotPayload({
      reportDate: reportDate.value,
      currentSite: currentSite.value,
      siteZones: persistableSiteZones,
      esgBreakdown: esgBreakdown.value,
      safetyDays: safetyDays.value,
    })
    backendCurrentSnapshot.value = await saveEsgSnapshot(payload)
  } catch {
    // ESG 스냅샷 저장 실패는 화면 표시를 막지 않는다.
  }
}

function getPersistableSiteZones(zones) {
  return normalizeArray(zones).filter((zone) => !isInactiveResettableZone(zone))
}

function isInactiveResettableZone(zone) {
  if (!isResettableSupportLikeZone(zone)) return false
  return !hasActiveSnapshotZone(zone)
}

function isResettableSupportLikeZone(zone) {
  if (!zone) return false

  const zoneType = String(zone.zoneType ?? zone.type ?? '').trim().toLowerCase()
  const zoneName = String(zone.name ?? zone.zoneName ?? '').trim()

  return (
    zoneType === 'support' ||
    zoneType === 'outdoor' ||
    ['세척장', '민원 구역', '민원구역'].includes(zoneName)
  )
}

function resolveSummaryZoneStatus(score, risk) {
  const safeScore = normalizePositiveNumber(score, 0)
  const safeRisk = normalizePositiveNumber(risk, 0)

  if (safeScore <= 0) return '대기'
  if (safeRisk >= 7) return '위험'
  if (safeRisk >= 4) return '관리'
  return '우수'
}

function buildSnapshotZones(zoneSnapshots) {
  return rankVisibleZones(normalizeArray(zoneSnapshots).map((snapshot, index) => {
    const score = normalizePositiveNumber(snapshot.totalScore, 0)
    const metrics = buildSnapshotMetrics(snapshot)
    const dailyScore = normalizePositiveNumber(metrics.totalScore, 0)

    return {
      id: `snapshot-zone-${snapshot.idx ?? index}`,
      siteId: String(snapshot.projectId ?? currentProjectId.value ?? ''),
      name: firstText(snapshot.zoneName, `관리구역 ${index + 1}`),
      type: firstText(resolveSnapshotJsonText(snapshot, 'type'), snapshot.zoneType, '저장된 ESG 작업구역'),
      score,
      dailyScore,
      level: snapshot.level ?? resolveEsgFloor(score, ESG_ZONE_FLOOR_POINT),
      rank: index + 1,
      carbon: normalizePositiveNumber(snapshot.carbonKg, 0),
      powerSaving: normalizePositiveNumber(snapshot.powerSavingKwh, 0),
      risk: normalizePositiveNumber(snapshot.riskCount, 0),
      missionRate: normalizePositiveNumber(snapshot.missionRate, 0),
      lead: 0,
      status: resolveSummaryZoneStatus(dailyScore, normalizePositiveNumber(snapshot.riskCount, 0)),
      equipmentCount: normalizePositiveNumber(snapshot.equipmentCount, 0),
      highRiskEquipmentCount: normalizePositiveNumber(snapshot.highRiskEquipmentCount, 0),
      equipmentSummary: resolveSnapshotJsonText(snapshot, 'equipmentSummary'),
      gateSummary: resolveSnapshotJsonText(snapshot, 'gateSummary'),
      zoneType: snapshot.zoneType ?? 'work',
      metrics,
    }
  }))
}

function mergeRuntimeZonesWithSnapshot(zones, zoneSnapshots) {
  const snapshots = normalizeArray(zoneSnapshots)
  const cumulativeByName = new Map(
    snapshots.map((snapshot) => [String(snapshot.zoneName || '').trim(), snapshot]),
  )

  const snapshotZonesByName = new Map(
    buildSnapshotZones(snapshots).map((zone) => [String(zone.name || '').trim(), zone]),
  )

  const runtimeZones = normalizeArray(zones).map((zone) => {
    const zoneName = String(zone.name || '').trim()
    const snapshot = cumulativeByName.get(zoneName)
    const snapshotZone = snapshotZonesByName.get(zoneName)
    const dailyScore = calculateDailyScore(zone)
    const resetProgress = shouldResetProgressForRuntimeZone(zone, dailyScore)

    if (resetProgress && hasActiveSnapshotZone(snapshotZone)) {
      return {
        ...snapshotZone,
        rank: zone.rank ?? snapshotZone.rank,
      }
    }

    const cumulativeScore = resetProgress
      ? 0
      : normalizeCumulativeScore(snapshot?.totalScore ?? zone.score ?? dailyScore)

    return {
      ...zone,
      dailyScore,
      score: cumulativeScore,
      level: resetProgress
        ? 0
        : snapshot?.level ?? resolveEsgFloor(cumulativeScore, ESG_ZONE_FLOOR_POINT),
      status: resetProgress ? '대기' : zone.status,
    }
  })

  const runtimeZoneNames = new Set(
    runtimeZones.map((zone) => String(zone.name || '').trim()).filter(Boolean),
  )

  const snapshotOnlyZones = Array.from(snapshotZonesByName.values())
    .filter((zone) => !runtimeZoneNames.has(String(zone.name || '').trim()))
    .map((zone) => {
      const dailyScore = calculateDailyScore(zone)
      const resetProgress = shouldResetProgressForRuntimeZone(zone, dailyScore)

      if (resetProgress && !hasActiveSnapshotZone(zone)) {
        return zeroizeZoneScore({ ...zone, dailyScore: 0, score: 0, level: 0 })
      }

      return {
        ...zone,
        dailyScore,
      }
    })

  return rankVisibleZones([...runtimeZones, ...snapshotOnlyZones])
}

function calculateDailyScore(zone) {
  const metrics = zone?.metrics ?? {}
  const environmentScore = normalizePositiveNumber(metrics.environmentScore, 0)
  const socialScore = normalizePositiveNumber(metrics.socialScore, 0)
  const governanceScore = normalizePositiveNumber(metrics.governanceScore, 0)

  return Math.round((environmentScore * 0.5 + socialScore * 0.3 + governanceScore * 0.2) * 10) / 10
}

function shouldResetProgressForRuntimeZone(zone, dailyScore = calculateDailyScore(zone)) {
  if (!zone) return true

  const zoneType = String(zone.zoneType ?? '').trim().toLowerCase()
  const zoneName = String(zone.name ?? zone.zoneName ?? '').trim()
  const resettableZone =
    zoneType === 'support' ||
    zoneType === 'outdoor' ||
    ['세척장', '민원 구역', '민원구역'].includes(zoneName)

  if (!resettableZone) return false

  const metrics = zone.metrics ?? {}
  const hasOperationalData =
    dailyScore > 0 ||
    metrics.supportOperationActive === true ||
    normalizePositiveNumber(zone.equipmentCount ?? metrics.totalEquipmentCount, 0) > 0 ||
    normalizePositiveNumber(zone.highRiskEquipmentCount ?? metrics.highRiskEquipmentCount, 0) > 0 ||
    normalizePositiveNumber(zone.risk ?? metrics.operatingRisk ?? metrics.weatherRiskCount, 0) > 0 ||
    normalizePositiveNumber(zone.missionRate ?? metrics.missionRate, 0) > 0 ||
    normalizePositiveNumber(metrics.reportCount, 0) > 0 ||
    normalizePositiveNumber(metrics.complaintCount, 0) > 0 ||
    normalizePositiveNumber(metrics.complaintResolvedCount, 0) > 0 ||
    normalizePositiveNumber(metrics.workerCount, 0) > 0 ||
    normalizePositiveNumber(metrics.assignedWorkerCount, 0) > 0 ||
    normalizePositiveNumber(metrics.requiredWorkerCount, 0) > 0 ||
    normalizePositiveNumber(metrics.trainedWorkerCount, 0) > 0

  return !hasOperationalData
}

function hasActiveSnapshotZone(zone) {
  if (!zone) return false

  const metrics = zone.metrics ?? {}
  const zoneName = String(zone.name ?? zone.zoneName ?? '').trim()
  const zoneType = String(zone.zoneType ?? zone.type ?? '').trim().toLowerCase()
  const isSupportLikeZone =
    zoneType === 'support' ||
    zoneType === 'outdoor' ||
    ['세척장', '민원 구역', '민원구역'].includes(zoneName)

  if (!isSupportLikeZone) return false

  return (
    metrics.supportOperationActive === true ||
    calculateDailyScore(zone) > 0 ||
    normalizePositiveNumber(zone.score, 0) > 0 ||
    normalizePositiveNumber(zone.equipmentCount ?? metrics.totalEquipmentCount, 0) > 0 ||
    normalizePositiveNumber(zone.highRiskEquipmentCount ?? metrics.highRiskEquipmentCount, 0) > 0 ||
    normalizePositiveNumber(zone.risk ?? metrics.operatingRisk ?? metrics.weatherRiskCount, 0) > 0 ||
    normalizePositiveNumber(zone.missionRate ?? metrics.missionRate, 0) > 0 ||
    normalizePositiveNumber(metrics.reportCount, 0) > 0 ||
    normalizePositiveNumber(metrics.complaintCount, 0) > 0 ||
    normalizePositiveNumber(metrics.complaintResolvedCount, 0) > 0 ||
    normalizePositiveNumber(metrics.workerCount, 0) > 0 ||
    normalizePositiveNumber(metrics.assignedWorkerCount, 0) > 0 ||
    normalizePositiveNumber(metrics.requiredWorkerCount, 0) > 0 ||
    normalizePositiveNumber(metrics.trainedWorkerCount, 0) > 0
  )
}

function rankVisibleZones(zones) {
  const rankedZones = [...normalizeArray(zones)].sort((left, right) => {
    return Number(right.score ?? 0) - Number(left.score ?? 0)
  })

  return rankedZones.map((zone, index) => ({
    ...zone,
    rank: index + 1,
  }))
}

function buildSnapshotMetrics(snapshot) {
  const storedMetrics = readSnapshotMetrics(snapshot)
  const environmentScore = normalizePositiveNumber(snapshot.environmentScore, storedMetrics.environmentScore ?? 0)
  const socialScore = normalizePositiveNumber(snapshot.socialScore, storedMetrics.socialScore ?? 0)
  const governanceScore = normalizePositiveNumber(snapshot.governanceScore, storedMetrics.governanceScore ?? 0)
  const calculatedDailyScore = Math.round(
    (environmentScore * 0.5 + socialScore * 0.3 + governanceScore * 0.2) * 10,
  ) / 10
  const totalScore = calculatedDailyScore

  return {
    ...storedMetrics,
    totalEquipmentCount: normalizePositiveNumber(storedMetrics.totalEquipmentCount, snapshot.equipmentCount ?? 0),
    highRiskEquipmentCount: normalizePositiveNumber(storedMetrics.highRiskEquipmentCount, snapshot.highRiskEquipmentCount ?? 0),
    weatherRiskCount: normalizePositiveNumber(storedMetrics.weatherRiskCount, snapshot.riskCount ?? 0),
    missionRate: normalizePositiveNumber(storedMetrics.missionRate, snapshot.missionRate ?? 0),
    estimatedCarbonKg: normalizePositiveNumber(storedMetrics.estimatedCarbonKg, snapshot.carbonKg ?? 0),
    powerSavingKwh: normalizePositiveNumber(storedMetrics.powerSavingKwh, snapshot.powerSavingKwh ?? 0),
    safetyDays: safetyDays.value,
    environmentScore,
    socialScore,
    governanceScore,
    totalScore,
    operatingRisk: normalizePositiveNumber(storedMetrics.operatingRisk, snapshot.riskCount ?? 0),
  }
}

function readSnapshotJson(snapshot) {
  if (!snapshot?.snapshotJson) return {}
  try {
    return JSON.parse(snapshot.snapshotJson)
  } catch {
    return {}
  }
}

function readSnapshotMetrics(snapshot) {
  const parsed = readSnapshotJson(snapshot)
  return parsed && typeof parsed.metrics === 'object' && parsed.metrics !== null ? parsed.metrics : {}
}

function resolveSnapshotJsonText(snapshot, key) {
  const parsed = readSnapshotJson(snapshot)
  return firstText(parsed?.[key])
}

function isSiteScoreZone(zone) {
  const zoneType = String(zone?.zoneType ?? '').trim().toLowerCase()
  if (zoneType === 'support' || zoneType === 'outdoor') return false
  const name = String(zone?.name ?? '').trim()
  if (['세척장', '민원 구역', '민원구역'].includes(name)) return false
  return zoneType === 'work' || Number(zone?.equipmentCount ?? zone?.metrics?.totalEquipmentCount ?? 0) > 0
}

function selectSiteScoreZones(zones) {
  return normalizeArray(zones).filter(isSiteScoreZone)
}

function zeroizeZoneScore(zone) {
  const metrics = {
    ...(zone.metrics ?? {}),
    supportOperationActive: false,
    totalEquipmentCount: 0,
    highRiskEquipmentCount: 0,
    washTargetCount: 0,
    workLocationCount: 0,
    gateCount: 0,
    assignedGateEquipmentCount: 0,
    maxGateEquipmentCount: 0,
    gateConcentrationRate: 0,
    gateCongestionRisk: 0,
    dustWorkCount: 0,
    weatherRiskCount: 0,
    operatingRisk: 0,
    workerCount: 0,
    assignedWorkerCount: 0,
    requiredWorkerCount: 0,
    trainedWorkerCount: 0,
    complaintCount: 0,
    complaintResolvedCount: 0,
    unresolvedComplaintCount: 0,
    complaintResolutionRate: 0,
    complaintRisk: 0,
    carbonScore: 0,
    waterScore: 0,
    fineDustScore: 0,
    powerScore: 0,
    idleReductionScore: 0,
    staffingRate: 0,
    safetyEducationRate: 0,
    weatherProtectionScore: 0,
    routeSafetyScore: 0,
    reportRate: 0,
    actionTrackingRate: 0,
    dataLinkRate: 0,
    checkScore: 0,
    environmentScore: 0,
    socialScore: 0,
    governanceScore: 0,
    totalScore: 0,
  }

  return {
    ...zone,
    score: 0,
    dailyScore: 0,
    level: 0,
    carbon: 0,
    powerSaving: 0,
    risk: 0,
    missionRate: 0,
    status: '대기',
    metrics,
  }
}

function buildWorkPlanEquipmentRows(workPlans, targetDate) {
  const scopedPlans = normalizeArray(workPlans).filter((plan) =>
    isDateInPlanRange(
      targetDate,
      plan.startDate ?? plan.start,
      plan.endDate ?? plan.end ?? plan.effectiveEnd,
    ),
  )
  const weeklyPlans = scopedPlans.filter((plan) => normalizePlanType(plan.planType) === 'WEEKLY')
  const monthlyPlans = scopedPlans.filter((plan) => normalizePlanType(plan.planType) === 'MONTHLY')
  const selectedPlans = weeklyPlans.length ? weeklyPlans : monthlyPlans

  return selectedPlans.flatMap((plan) => {
    const equipmentEntries = parseEquipmentEntries(
      plan.equipmentDisplay ?? plan.equipmentText,
      plan.equipment,
    )
    if (!equipmentEntries.length) {
      return [
        {
          idx: `plan-${plan.idx ?? plan.id}-default`,
          workOrderIdx: null,
          workOrderRef: plan.idx ? `WP-${plan.idx}` : 'WP',
          title: firstText(plan.name, plan.tradeProcessName, '작업 계획'),
          tradeType: firstText(plan.trade, plan.tradeProcessName, ''),
          workDetail: firstText(plan.note, plan.name, ''),
          workDate: targetDate,
          workLocation: firstText(plan.location, plan.zone, '작업구역 미지정'),
          gateIdx: null,
          equipmentName: '장비 미지정',
          equipmentType: '중장비',
          equipmentCount: 1,
          statusLabel:
            plan.status === '진행 중' || plan.status === 'IN_PROGRESS' ? '작업중' : '입차예정',
        },
      ]
    }

    return equipmentEntries.map((equipment, index) => ({
      idx: `plan-${plan.idx ?? plan.id}-${index}`,
      workOrderIdx: null,
      workOrderRef: plan.idx ? `WP-${plan.idx}` : 'WP',
      title: firstText(plan.name, plan.tradeProcessName, '작업 계획'),
      tradeType: firstText(plan.trade, plan.tradeProcessName, ''),
      workDetail: firstText(plan.note, plan.name, ''),
      workDate: targetDate,
      workLocation: firstText(plan.location, plan.zone, '작업구역 미지정'),
      gateIdx: null,
      equipmentName: equipment.name,
      equipmentType: equipment.name,
      equipmentCount: equipment.count,
      statusLabel:
        plan.status === '진행 중' || plan.status === 'IN_PROGRESS' ? '작업중' : '입차예정',
    }))
  })
}

function normalizePlanType(value) {
  const type = String(value || '').toUpperCase()
  if (type.includes('WEEK') || type === '주간') return 'WEEKLY'
  if (type.includes('MONTH') || type === '월간') return 'MONTHLY'
  if (type.includes('YEAR') || type === '연간') return 'YEARLY'
  return type
}

function parseEquipmentEntries(displayText, rawEquipment) {
  if (Array.isArray(rawEquipment) && rawEquipment.length) {
    return rawEquipment
      .map((equipment) => {
        if (typeof equipment === 'string') return parseEquipmentText(equipment)
        return {
          name: firstText(equipment.type, equipment.equipmentName, equipment.name, '중장비'),
          count: normalizePositiveNumber(equipment.count ?? equipment.equipmentCount, 1),
        }
      })
      .filter((equipment) => equipment.name)
  }

  return String(displayText ?? '')
    .split(',')
    .map((text) => parseEquipmentText(text))
    .filter((equipment) => equipment.name)
}

function parseEquipmentText(text) {
  const normalized = String(text ?? '').trim()
  if (!normalized) return { name: '', count: 0 }

  const match = normalized.match(/^(.+?)\s*(\d+)\s*대?$/)
  if (!match) return { name: normalized, count: 1 }

  return {
    name: match[1].trim(),
    count: normalizePositiveNumber(match[2], 1),
  }
}

function isDateInPlanRange(targetDate, startDate, endDate) {
  const target = normalizeDateText(targetDate)
  const start = normalizeDateText(startDate)
  const end = normalizeDateText(endDate || startDate)
  if (!target || !start) return false
  return target >= start && target <= (end || start)
}

function firstText(...values) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() ?? ''
}

function normalizePositiveNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

function normalizeProjectId(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function resolveInitialProjectId() {
  // 로그인 방식과 관계없이 authStore.projectId를 공통 ESG 화면의 기준값으로 사용한다.
  // 본사/관리자는 선택한 현장 ID가, 현장 계정은 로그인 시 매핑된 고정 현장 ID가 저장된다.
  const authProjectId = normalizeProjectId(authStore.projectId)
  if (authProjectId) return authProjectId

  // 새로고침 직후 저장값이 아직 복원되지 않은 예외 상황에서만 URL 값을 보조로 사용한다.
  return (
    normalizeProjectId(route.query.projectId) ??
    normalizeProjectId(route.query.projectIdx) ??
    normalizeProjectId(route.query.siteId) ??
    null
  )
}

function getTodayDateText() {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function unwrapPayload(payload) {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    ('success' in payload || 'isSuccess' in payload)
  ) {
    return payload.data
  }
  return payload
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.content)) return value.content
  if (Array.isArray(value?.list)) return value.list
  if (Array.isArray(value?.rows)) return value.rows
  if (Array.isArray(value?.workers)) return value.workers
  return []
}

function normalizeDateText(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function colorClass(color, type) {
  const map = {
    emerald: {
      icon: 'bg-emerald-100 text-emerald-700',
      text: 'text-emerald-800',
      bar: 'bg-emerald-500',
      soft: 'bg-emerald-50 border-emerald-100',
    },
    sky: {
      icon: 'bg-sky-100 text-sky-700',
      text: 'text-sky-800',
      bar: 'bg-sky-500',
      soft: 'bg-sky-50 border-sky-100',
    },
    violet: {
      icon: 'bg-violet-100 text-violet-700',
      text: 'text-violet-800',
      bar: 'bg-violet-500',
      soft: 'bg-violet-50 border-violet-100',
    },
    lime: {
      icon: 'bg-lime-100 text-lime-700',
      text: 'text-lime-800',
      bar: 'bg-lime-500',
      soft: 'bg-lime-50 border-lime-100',
    },
  }
  return map[color]?.[type] ?? map.emerald[type]
}

function levelTone(level) {
  if (level === '경고' || level === '위험') return 'bg-rose-100 text-rose-800 border-rose-200'
  if (level === '주의' || level === '관리' || level === '대기')
    return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-emerald-100 text-emerald-800 border-emerald-200'
}

onMounted(() => {
  loadAll()
  refreshTimer = setInterval(
    () => {
      loadAll()
    },
    30 * 60 * 1000,
  )
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

watch(reportDate, () => {
  loadAll()
})

watch(
  () => [route.query.projectId, route.query.projectIdx, route.query.siteId, authStore.projectId],
  () => {
    const nextProjectId = resolveInitialProjectId()
    if (!nextProjectId || String(nextProjectId) === String(selectedProjectId.value)) return

    selectedProjectId.value = nextProjectId
    selectedZoneId.value = ''
    backendCurrentProject.value = null
    backendCurrentSnapshot.value = null
    backendCurrentZoneSnapshots.value = []
    backendTodaySnapshot.value = null
    backendMetricInputs.value = []
    equipmentsData.value = []
    equipmentScopeProjectId.value = null
    workPlansData.value = []
    reportsData.value = []
    workersData.value = []
    staffingWorkersData.value = []
    staffingZonesData.value = []
    loadAll()
  },
)

watch(
  siteZones,
  (zones) => {
    if (!zones.length) return
    if (!zones.find((zone) => zone.id === selectedZoneId.value)) {
      selectedZoneId.value = zones[0].id
    }
  },
  { immediate: true },
)
</script>

<template>
  <div
    class="min-h-screen space-y-5 bg-gradient-to-br from-slate-50 via-emerald-50/50 to-sky-50/50 p-5 pb-10"
  >
    <EsgHeroSection
      v-model:report-date="reportDate"
      :current-site="currentSite"
      :selected-zone="selectedZone"
      :last-updated-at="lastUpdatedAt"
      :loading="loading"
      :air-quality="airQuality"
      :safety-days="safetyDays"
      @refresh="loadAll"
    />

    <section
      class="grid items-stretch gap-4 min-[1440px]:grid-cols-[340px_minmax(560px,1fr)_340px] min-[1720px]:grid-cols-[380px_minmax(0,1fr)_380px]"
    >
      <EsgGrowthPanel
        :active-level="activeLevel"
        :active-score="activeScore"
        :active-floor-point="activeFloorPoint"
        :active-floor-score-label="activeFloorScoreLabel"
        :next-level-point="nextLevelPoint"
        :level-progress="levelProgress"
        :building-floors="buildingFloors"
      />

      <EsgScoreBreakdownPanel
        v-model:selected-zone-id="selectedZoneId"
        v-model:active-esg-key="activeEsgKey"
        :selected-zone="selectedZone"
        :site-zones="siteZones"
        :esg-breakdown="esgBreakdown"
        :zone-metric-cards="zoneMetricCards"
      />

      <EsgSiteRankingPanel
        :current-site-rank="currentSiteRank"
        :ranking-comparison="rankingComparison"
        :site-ranking-items="siteRankingItems"
        :selected-site-id="selectedSiteId"
      />
    </section>

    <EsgMissionSafetySection :missions="missions" :safety-days="safetyDays" />

    <EsgDailySummaryTable :current-site="currentSite" :site-zones="siteZones" />
  </div>
</template>
