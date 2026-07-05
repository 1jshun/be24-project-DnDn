import { calcExpectedDelayDays, parseDate, roundPct } from './analysisUtils.js'
import { getPlanId } from './redistributionPlanner.js'

export function mapProgressItem(item) {
  return {
    id: item.tradeProcessId,
    name: item.name,
    tradeName: item.tradeName ?? item.trade ?? item.tradeProcessTradeName ?? '',
    plannedPct: item.plannedPct ?? 0,
    actualPct: item.actualPct ?? 0,
    plannedStart: item.plannedStart ?? '',
    plannedEnd: item.plannedEnd ?? '',
    actualStart: item.actualStart ?? '',
    forecastEnd: item.forecastEnd ?? '',
    actualSource: item.actualSource ?? 'NONE',
    latestReportDate: item.latestReportDate ?? '',
    analysisDate: item.analysisDate ?? item.latestReportDate ?? '',
    status: item.status ?? '정상',
    risk: item.risk ?? '낮음',
    partner: item.partner ?? '-',
    actualWorkers: item.actualWorkers ?? 0,
  }
}

export function progressSourceLabel(source) {
  return source === 'DAILY_REPORT' ? '공사일보 기준' : '공사일보 미작성'
}

export function hasDailyReportProgress(item) {
  return item?.actualSource === 'DAILY_REPORT' || item?.hasReport === true
}

export function inferRepresentativeTradeName(record) {
  const explicit = [
    record?.tradeProcessTradeName,
    record?.tradeProcess?.tradeName,
    record?.tradeName,
    record?.majorTradeName,
  ]
    .map((value) => String(value ?? '').trim())
    .find((value) => value && value !== '기타' && value !== 'ETC')
  if (explicit) return explicit

  const text = [record?.name, record?.tradeProcessName, record?.processName, record?.trade]
    .filter(Boolean)
    .join(' ')

  if (/현장 개설|가설|타워크레인|리프트|양중/.test(text)) return '공통/가설'
  if (/지장물|부지정리|흙막이|터파기|토사|되메우기|굴착/.test(text)) return '토공사'
  if (/PHC|파일|지반보강|기초/.test(text)) return '지정/기초'
  if (/골조|철근콘크리트|철근|거푸집|콘크리트|지하층|지상/.test(text)) return '골조공사'
  if (
    /방수|조적|미장|단열|창호|유리|석공|금속|잡철|타일|수장|도장|목공|가구|내장|인테리어|마감/.test(
      text,
    )
  )
    return '건축마감'
  if (/위생|급수|배수|난방|환기|공조|소방기계|기계실|자동제어|BMS|설비/.test(text))
    return '기계/설비'
  if (/수변전|간선|전기|조명|통신|홈네트워크|CCTV|소방전기|비상방송|수전/.test(text))
    return '전기/통신'
  if (/부대토목|우오수|상하수도|도로|주차장|포장|조경|식재|놀이터/.test(text)) return '토목/조경'
  if (/커미셔닝|품질점검|사용승인|준공|검사|시운전/.test(text)) return '준공/검사'

  return '기타'
}

function riskFromDiff(diff, ended, actualPct) {
  // 차이 = 실제 진척률 - 계획 진척률
  // 차이 >= 0%p: 정상
  // -3%p < 차이 < 0%p: 낮음/주의
  // 차이 <= -3%p: 지연 위험
  // 종료일 초과 + 미완료: 지연 발생
  if (ended && actualPct < 100) return '매우 높음'
  if (diff <= -3) return '높음'
  if (diff < 0) return '보통'
  return '낮음'
}

function statusFromDiff(diff, ended, actualPct, startDate, baseDate = new Date()) {
  const start = parseDate(startDate)
  const base = parseDate(baseDate)
  if (start && base && base < start) return '시작 전'
  if (actualPct >= 100) return '완료'
  if (ended && actualPct < 100) return '지연'
  if (diff <= -3) return '지연 위험'
  if (diff < 0) return '주의'
  return '정상'
}

export function mapDelayTaskItem(
  item,
  {
    findMonthlyPlanForTask,
    findDetailSchedulesForMonthly,
    buildRedistributionPlan,
    onMapped = () => {},
  },
) {
  const monthlyPlan = findMonthlyPlanForTask(item)
  const monthlyPlanId =
    getPlanId(monthlyPlan) || Number(item.workPlanId ?? item.idx ?? item.id ?? 0)
  const detailSchedules = findDetailSchedulesForMonthly(monthlyPlanId)

  const plannedPct = roundPct(item.plannedPct ?? 0, 1)
  const actualPct = roundPct(item.actualPct ?? 0, 1)
  const diff = Math.round((actualPct - plannedPct) * 10) / 10
  const plannedStart =
    monthlyPlan?.startDate ?? item.plannedStart ?? item.startDate ?? item.originalStart ?? ''
  const plannedEnd =
    monthlyPlan?.endDate ??
    item.plannedEnd ??
    item.endDate ??
    item.originalEnd ??
    item.effectiveEnd ??
    ''
  const analysisDate = item.analysisDate ?? item.latestReportDate ?? ''
  const statusBaseDate = analysisDate || new Date()
  const ended = !!(
    parseDate(plannedEnd) &&
    parseDate(statusBaseDate) > parseDate(plannedEnd) &&
    actualPct < 100
  )
  const risk = riskFromDiff(diff, ended, actualPct)
  const status = statusFromDiff(diff, ended, actualPct, plannedStart, statusBaseDate)

  const mapped = {
    id: item.workPlanId,
    workPlanId: item.workPlanId,
    process:
      [inferRepresentativeTradeName(item), inferRepresentativeTradeName(monthlyPlan)]
        .find((name) => name && name !== '기타') ||
      item.process ||
      item.tradeName ||
      '세부 작업',
    name: item.name ?? '',
    location: item.location ?? '',
    partner: item.partner ?? '-',
    plannedPct,
    actualPct,
    actualSource: item.actualSource ?? 'NONE',
    latestReportDate: item.latestReportDate ?? '',
    analysisDate,
    dailyReportId: item.dailyReportId ?? null,
    diff,
    status,
    expectedDelayDays:
      item.expectedDelayDays ??
      calcExpectedDelayDays(plannedStart, plannedEnd, plannedPct, actualPct),
    risk: item.risk ?? risk,
    cause: item.cause || '공사일보 기준 진척률 미달',
    followEffect: item.followEffect || '후속 공정 영향 검토 필요',
    isCritical: item.isCritical ?? false,
    originalEnd: plannedEnd,
    effectiveEnd: item.effectiveEnd ?? plannedEnd,
    plannedStart,
    plannedEnd,
    actualWorkers: item.actualWorkers ?? 0,
    hasReport: item.hasReport ?? item.actualSource === 'DAILY_REPORT',
    monthlyWorkPlanId: monthlyPlanId || null,
    detailSchedules,
  }

  mapped.redistribution = buildRedistributionPlan(mapped)

  onMapped(mapped)

  return mapped
}
