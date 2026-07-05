const KOREAN_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export const WEATHER_CONTROL_TEXT = {
  title: '기상 관제',
  desc: '기상 변화에 따른 위험 공정 통제와 작업 계획 조정 포인트를 한 화면에서 확인합니다.',
  catRisk: 'AI 위험 통제 추천',
  catRiskSub: '오늘 날씨와 작업 계획·중장비를 비교해 AI가 우선 검토 항목을 제안합니다.',
  row2Title: '위험 장비 통제',
  row3Title: '계획 대비 위험 경고',
  demoToday: '오늘 현장 요약',
  demoWeek: '기상 영향도',
  demoRain: '강수 확률',
  fineDustTitle: '금일 미세먼지',
  liveRisk: '현장 즉시 조치 체크리스트',
  liveRiskSub: '오늘 기상 기준 안전관리자가 지금 바로 진행해야 할 액션입니다.',
  tabWeek: '주간 7일',
  tabMonth: '월간',
}

export function getTodayDateText() {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

export function getSourceLabel(sourceType) {
  if (sourceType === 'KMA_FORECAST') return { label: '기상청 단기예보', tone: 'text-sky-700 bg-sky-50 border-sky-200' }
  if (sourceType === 'KMA_MID') return { label: '기상청 중기예보', tone: 'text-sky-700 bg-sky-50 border-sky-200' }
  if (sourceType === 'ASOS_DAILY') return { label: '기상청 ASOS 실측', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
  if (sourceType === 'DERIVED') return { label: '추정값', tone: 'text-amber-700 bg-amber-50 border-amber-200' }
  return { label: '데이터 없음', tone: 'text-slate-600 bg-slate-50 border-slate-200' }
}

export function calculateRainPercent(analysis, rain) {
  const fromAnalysis = analysis?.precipitationProbability
  if (fromAnalysis != null) return Number(fromAnalysis)

  const fromCard = Number(String(rain?.value || '').replace(/[^0-9]/g, ''))
  return Number.isFinite(fromCard) ? fromCard : 0
}

export function getFineDustValue(analysis, airQuality) {
  return analysis?.fineDustValue ?? airQuality?.value ?? null
}

export function getWindTone(analysis, alertLabels = []) {
  const windSpeed = Number(analysis?.maxWindSpeed ?? 0)
  const hasStrongWindWarning = hasWeatherAlert(alertLabels, ['강풍'])

  if (!analysis) {
    return {
      color: 'border-slate-100 bg-slate-50',
      iconColor: 'text-slate-400',
      textColor: 'text-slate-700',
      labelColor: 'text-slate-600',
      descriptionColor: 'text-slate-600',
      statusLabel: '정보 없음',
      alertLabel: '',
    }
  }

  if (windSpeed < 4 && !hasStrongWindWarning) {
    return {
      color: 'border-violet-100 bg-gradient-to-br from-violet-50 via-white to-purple-50',
      iconColor: 'text-violet-400',
      textColor: 'text-violet-700',
      labelColor: 'text-violet-500',
      descriptionColor: 'text-violet-600/80',
      statusLabel: '바람 약함',
      alertLabel: '',
    }
  }

  if (windSpeed < 8 && !hasStrongWindWarning) {
    return {
      color: 'border-violet-200 bg-gradient-to-br from-violet-50 to-purple-100',
      iconColor: 'text-violet-500',
      textColor: 'text-violet-800',
      labelColor: 'text-violet-600',
      descriptionColor: 'text-violet-700/80',
      statusLabel: '작업 가능 풍속',
      alertLabel: '',
    }
  }

  if (windSpeed < 12 && !hasStrongWindWarning) {
    return {
      color: 'border-violet-300 bg-gradient-to-br from-violet-100 to-fuchsia-100',
      iconColor: 'text-violet-700',
      textColor: 'text-violet-900',
      labelColor: 'text-violet-700',
      descriptionColor: 'text-violet-900/80',
      statusLabel: '양중 작업 주의',
      alertLabel: '',
    }
  }

  return {
    color: 'border-rose-200 bg-gradient-to-br from-rose-50 via-white to-violet-50',
    iconColor: 'text-rose-600',
    textColor: 'text-rose-800',
    labelColor: 'text-rose-700',
    descriptionColor: 'text-rose-800/85',
    statusLabel: windSpeed >= 12 ? '강풍 통제 검토' : windSpeed >= 8 ? '양중 작업 주의' : '바람 약함',
    alertLabel: hasStrongWindWarning ? '강풍주의보' : '',
  }
}

export function getFineDustTone(fineDustValue, airQuality) {
  if (fineDustValue == null) {
    return {
      card: 'border-slate-100 bg-slate-50',
      icon: 'text-slate-400',
      value: 'text-slate-700',
      title: 'text-slate-700',
      desc: 'text-slate-600/80',
      label: airQuality?.label || 'API 미연동',
    }
  }

  if (fineDustValue <= 30) {
    return {
      card: 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50',
      icon: 'text-emerald-500',
      value: 'text-emerald-800',
      title: 'text-emerald-800',
      desc: 'text-emerald-700/80',
      label: '좋음',
    }
  }

  if (fineDustValue <= 80) {
    return {
      card: 'border-amber-100 bg-gradient-to-br from-amber-50 to-yellow-50',
      icon: 'text-amber-500',
      value: 'text-amber-800',
      title: 'text-amber-800',
      desc: 'text-amber-700/85',
      label: '보통',
    }
  }

  if (fineDustValue <= 150) {
    return {
      card: 'border-orange-200 bg-gradient-to-br from-orange-50 to-red-50',
      icon: 'text-orange-600',
      value: 'text-orange-800',
      title: 'text-orange-800',
      desc: 'text-orange-700/85',
      label: '나쁨',
    }
  }

  return {
    card: 'border-rose-200 bg-gradient-to-br from-rose-50 to-red-100',
    icon: 'text-rose-600',
    value: 'text-rose-800',
    title: 'text-rose-800',
    desc: 'text-rose-700/85',
    label: '매우 나쁨',
  }
}

export function getRiskLevel(analysis) {
  if (!analysis) return { label: '데이터 없음', tone: 'text-slate-600 bg-slate-100 border-slate-200' }

  let score = 0
  if (hasMeaningfulRain(analysis) || (analysis.precipitationProbability ?? 0) >= 60) score += 2
  if (analysis.windRisk || (analysis.maxWindSpeed ?? 0) >= 8) score += 2
  if (analysis.hasSnow) score += 2
  if (analysis.heatRisk) score += 1
  if (analysis.coldRisk) score += 1
  if (analysis.fineDustRisk) score += 1

  if (score >= 4) return { label: '높음', tone: 'text-rose-700 bg-rose-100 border-rose-200' }
  if (score >= 2) return { label: '보통', tone: 'text-amber-700 bg-amber-100 border-amber-200' }
  return { label: '낮음', tone: 'text-emerald-700 bg-emerald-100 border-emerald-200' }
}

export function normalizeText(value) {
  return String(value || '').toLowerCase()
}

export function includesAny(text, keywords) {
  const normalized = normalizeText(text)
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword)))
}

function toSafeNumber(value, defaultValue = 0) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : defaultValue
}

function hasMeaningfulRain(analysis, rainPercent = null) {
  if (!analysis) return false
  const rain = toSafeNumber(rainPercent ?? analysis?.precipitationProbability, 0)
  return Boolean(analysis?.hasRain) && rain >= 20
}

const LEVEL_ORDER = { 경고: 0, 위험: 0, 제한: 0, 주의: 1, 보통: 2, 양호: 3 }

function sortByRiskLevel(items) {
  return [...items].sort((a, b) => {
    const aOrder = LEVEL_ORDER[a?.level] ?? 2
    const bOrder = LEVEL_ORDER[b?.level] ?? 2
    if (aOrder !== bOrder) return aOrder - bOrder
    return String(a?.title || a?.label || '').localeCompare(String(b?.title || b?.label || ''), 'ko')
  })
}

function cleanAlertLabel(value) {
  const text = cleanAiText(value)
    .replace(/발표/g, '')
    .replace(/확인/g, '')
    .replace(/특보 활성/g, '')
    .replace(/[·,，]+$/g, '')
    .trim()

  if (text.includes('호우')) return '호우주의보'
  if (text.includes('강풍')) return '강풍주의보'
  if (text.includes('대설')) return '대설주의보'
  if (text.includes('폭염')) return '폭염주의보'
  if (text.includes('한파')) return '한파주의보'
  return text
}

function shouldKeepWeatherAlertLabel(label, analysis = null) {
  if (!label) return false
  if (!analysis) return true

  const rain = Number(analysis?.precipitationProbability ?? 0)
  const wind = Number(analysis?.maxWindSpeed ?? 0)
  const fineDust = Number(analysis?.fineDustValue ?? 0)

  if (includesAny(label, ['호우', '우천', '비'])) {
    return hasMeaningfulRain(analysis, rain) || rain >= 40
  }
  if (includesAny(label, ['강풍'])) {
    return wind >= 8
  }
  if (includesAny(label, ['대설', '눈'])) {
    return Boolean(analysis?.hasSnow)
  }
  if (includesAny(label, ['폭염'])) {
    return Boolean(analysis?.heatRisk) || Number(analysis?.maxTemperature ?? 0) >= 33
  }
  if (includesAny(label, ['한파'])) {
    return Boolean(analysis?.coldRisk) || Number(analysis?.minTemperature ?? 99) <= -5
  }
  if (includesAny(label, ['미세먼지', '황사'])) {
    return fineDust >= 80
  }

  return true
}

export function getWeatherAlertLabels(dashboard, analysis = null) {
  const alerts = Array.isArray(dashboard?.alerts) ? dashboard.alerts : []
  const labels = alerts
    .map((alert) => cleanAlertLabel(`${alert?.title || ''} ${alert?.message || ''}`))
    .filter(Boolean)
    .filter((label) => shouldKeepWeatherAlertLabel(label, analysis))

  return [...new Set(labels)]
}

function hasWeatherAlert(alertLabels, keywords) {
  return (alertLabels || []).some((label) => includesAny(label, keywords))
}

function getRiskItemKey(item) {
  const text = normalizeText(`${item?.title || ''} ${item?.subtitle || ''} ${item?.reason || ''}`)

  if (includesAny(text, ['dump_truck', 'dump truck', 'dump', '덤프', '트럭', '덤프트럭'])) return 'equipment:dump-truck'
  if (includesAny(text, ['crane', '크레인', '타워크레인', '이동식크레인'])) return 'equipment:crane'
  if (includesAny(text, ['lift', '리프트', '고소작업차', '붐리프트', '시저리프트'])) return 'equipment:lift'
  if (includesAny(text, ['pump', '펌프카', '콘크리트펌프'])) return 'equipment:pump'

  return `${normalizeText(item?.title || '')}-${normalizeText(item?.reason || '')}`
}

export function normalizeRiskLevel(level, priority = null) {
  if (level === 'DANGER' || level === '위험' || level === '긴급' || priority === '긴급') return '경고'
  if (level === 'WARNING' || level === '경고' || level === '높음' || priority === '높음') return '경고'
  if (level === 'CAUTION' || level === '주의' || level === '보통' || priority === '보통') return '주의'
  if (level === 'SAFE' || level === '양호' || level === '낮음' || priority === '낮음') return '양호'
  return level || '주의'
}

export function isEquipmentRisk(risk) {
  const text = `${risk?.target || ''} ${risk?.reason || ''} ${risk?.recommendation || ''}`
  return includesAny(text, ['장비', 'crane', 'dump', 'truck', 'dump_truck', '크레인', '타워', '고소작업차', '리프트', '굴착기', '덤프트럭', '트럭', '펌프카', '펌프', '지게차', '자재 들어 올림', '양중'])
}

export function cleanAiText(text) {
  return String(text || '')
    .replaceAll('콘크리 트', '콘크리트')
    .replaceAll('작 업', '작업')
    .replaceAll('작업 반장', '작업반장')
    .replaceAll('자재 들어 올림', '양중')
    .replaceAll('자재 들어올림', '양중')
    .replaceAll('102 동', '102동')
    .replaceAll('103 동', '103동')
    .replaceAll('104 동', '104동')
    .replace(/실시한다\.?/g, '실시해 주세요.')
    .replace(/통제한다\.?/g, '통제해 주세요.')
    .replace(/점검한다\.?/g, '점검해 주세요.')
    .replace(/확인한다\.?/g, '확인해 주세요.')
    .replace(/결정한다\.?/g, '결정해 주세요.')
    .replace(/운영한다\.?/g, '운영해 주세요.')
    .replace(/이동한다\.?/g, '이동해 주세요.')
    .replace(/설치한다\.?/g, '설치해 주세요.')
    .replace(/공지한다\.?/g, '공지해 주세요.')
}

export function toWeatherRiskItem(risk) {
  const affectedWorks = Array.isArray(risk?.affectedWorks) ? risk.affectedWorks.filter(Boolean).map(cleanAiText) : []

  return {
    badge: 'AI',
    title: cleanAiText(risk?.target) || '기상 연동 위험 항목',
    subtitle: affectedWorks.join(', '),
    level: normalizeRiskLevel(risk?.level),
    reason: cleanAiText(risk?.reason) || '작업지시서와 금일 기상 조건을 비교해 위험 가능성이 감지되었습니다.',
    action: cleanAiText(risk?.recommendation) || '작업 전 안전관리자 검토가 필요합니다.',
  }
}

export function toLiveRiskAction(action, index) {
  const level = normalizeRiskLevel(action?.priority, action?.priority)

  return {
    id: `ai-action-${index}-${action?.action || 'weather'}`,
    icon: level === '경고' ? 'siren' : 'umbrella',
    label: cleanAiText(action?.action) || '현장 안전 조치 확인',
    detail: cleanAiText(action?.reason) || cleanAiText(action?.responsibleRole) || '금일 기상 기준으로 즉시 조치가 필요합니다.',
    level,
    timing: cleanAiText(action?.estimatedTime) || '작업 시작 전',
  }
}

export function mergeRiskItems(...groups) {
  const result = []
  const seen = new Set()

  groups.flat().filter(Boolean).forEach((item) => {
    const key = getRiskItemKey(item)
    if (seen.has(key)) return
    seen.add(key)
    result.push(item)
  })

  return sortByRiskLevel(result)
}

export function mergeLiveRiskActions(...groups) {
  const result = []
  const seen = new Set()

  groups.flat().filter(Boolean).forEach((item) => {
    const key = `${normalizeText(item.label || '')}-${normalizeText(item.detail || '')}`
    if (seen.has(key)) return
    seen.add(key)
    result.push(item)
  })

  return sortByRiskLevel(result)
}

export function buildEquipmentRiskReason(equipment, cause) {
  const name = equipment.equipmentName || '중장비'
  const count = equipment.equipmentCount ?? 1
  const gateText = equipment.gateIdx != null ? `${equipment.gateIdx}번 게이트` : '게이트 미배정'
  return `${name} ${count}대가 ${gateText}로 투입 예정입니다. ${cause}`
}

export function buildEquipmentRisksFromWorkOrders(analysis, equipments) {
  if (!analysis || !equipments.length) return []

  const rain = analysis.precipitationProbability ?? 0
  const wind = analysis.maxWindSpeed ?? 0
  const fineDust = analysis.fineDustValue ?? 0
  const result = []

  equipments.forEach((equipment) => {
    const name = equipment.equipmentName || ''

    if (wind >= 8 && includesAny(name, ['크레인', '자재 들어 올림', '자재 들어올림', '양중', '리프트', '고소', '붐', '타워'])) {
      result.push({
        badge: 'AI',
        title: `${name} 풍속 통제`,
        subtitle: cleanAiText(equipment.title) || equipment.workLocation || '작업구역 미지정',
        level: wind >= 10 ? '경고' : '주의',
        reason: buildEquipmentRiskReason(equipment, `예보 풍속 ${Number(wind).toFixed(1)}m/s와 기상특보를 함께 보면 자재 흔들림, 장비 균형 저하, 신호 전달 혼선이 생길 수 있습니다.`),
        action: '투입 직전 풍속을 재확인하고, 자재 결속·신호수 위치·작업 발판 상태를 먼저 점검한 뒤 기준을 넘으면 작업 대기 또는 순연으로 전환하는 것이 안전합니다.',
      })
    }

    if ((hasMeaningfulRain(analysis, rain) || rain >= 60 || analysis.hasSnow) && includesAny(name, ['굴착', '덤프', '트럭', 'dump', 'truck', 'dump_truck', '펌프', '지게차', '카고', '로더'])) {
      result.push({
        badge: 'AI',
        title: `${name} 진입 동선 점검`,
        subtitle: cleanAiText(equipment.title) || equipment.workLocation || '작업구역 미지정',
        level: analysis.hasSnow || rain >= 70 ? '경고' : '주의',
        reason: buildEquipmentRiskReason(equipment, '우천 예보가 있어 진입로와 회차 구간이 미끄럽거나 진흙으로 변할 수 있고, 시야 저하로 장비 이동 중 접촉 위험이 커질 수 있습니다.'),
        action: '장비 투입 전 진입로 배수와 회차 구간 노면을 먼저 확인하고, 유도원 위치와 보행자 분리선을 확정한 뒤 물고임이 있으면 순차 투입 또는 우회 동선을 적용하는 것이 좋습니다.',
      })
    }

    if (fineDust >= 80 && includesAny(name, ['굴착', '절단', '연마', '덤프', '트럭', 'dump', 'truck', 'dump_truck', '천공'])) {
      result.push({
        badge: 'AI',
        title: `${name} 분진 저감 운용`,
        subtitle: cleanAiText(equipment.title) || equipment.workLocation || '작업구역 미지정',
        level: fineDust >= 150 ? '경고' : '주의',
        reason: buildEquipmentRiskReason(equipment, `PM10 ${fineDust}㎍/㎥ 수준에서는 장비 운행과 굴착·절단 작업이 겹칠 때 작업자 체감 분진 농도가 높아질 수 있습니다.`),
        action: '장비 운행 전 살수 구간을 먼저 지정하고, 작업자 방진마스크 착용을 확인한 뒤 분진 발생 작업은 시간대를 나누어 진행하는 것이 좋습니다.',
      })
    }
  })

  if (!result.length && equipments.length && (wind >= 10 || rain >= 70 || analysis.hasSnow)) {
    const first = equipments[0]
    result.push({
      badge: 'AI',
      title: '금일 장비 투입 전 안전 확인',
      subtitle: first.workLocation || '작업구역 미지정',
      level: '주의',
      reason: `금일 작업지시서에 ${equipments.length}건의 장비 투입이 있고, 기상 조건이 평시보다 불안정합니다.`,
      action: '게이트 입차 전에 노면·풍속·시야 상태를 먼저 확인하고, 위험 구간이 보이면 투입 순서를 나누거나 작업 책임자 승인 후 진행하는 것이 좋습니다.',
    })
  }

  return result.slice(0, 5)
}


function uniqueNonBlank(values = []) {
  return [...new Set(values.map((value) => cleanAiText(value).trim()).filter(Boolean))]
}

function summarizeEquipmentList(equipments = []) {
  const counts = new Map()
  equipments.forEach((equipment) => {
    const name = cleanAiText(equipment?.equipmentName || '').trim()
    if (!name) return
    const count = Number(equipment?.equipmentCount ?? 1)
    counts.set(name, (counts.get(name) || 0) + (Number.isFinite(count) && count > 0 ? count : 1))
  })

  return Array.from(counts.entries())
    .map(([name, count]) => `${name} ${count}대`)
    .join(', ')
}

function cleanWorkEvidenceText(value) {
  return cleanAiText(value)
    .replace(/단지\s*외부/g, '')
    .replace(/현장\s*외부/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[·,，\s-]+|[·,，\s-]+$/g, '')
    .trim()
}

function getRainSensitiveWorkLabel(targetText) {
  if (includesAny(targetText, ['콘크리트', '타설', '골조', '철근', '벽체'])) return '콘크리트·골조 작업'
  if (includesAny(targetText, ['도장', '방수', '마감'])) return '외부 도장·방수 작업'
  if (includesAny(targetText, ['굴착', '토공', '부대토목', 'landscape', '조경'])) return '부대토목·굴착 작업'
  if (includesAny(targetText, ['운반', '자재'])) return '외부 자재 운반 작업'
  return '우천 민감 작업'
}

function buildRainPlanRiskDetail(order, targetText) {
  const workLabel = getRainSensitiveWorkLabel(targetText)
  const workSummary = cleanWorkEvidenceText(order?.workDetail || '')
  const contextText = workSummary
    ? ` 세부 작업 내용은 ${workSummary}입니다.`
    : ''

  if (workLabel.includes('콘크리트')) {
    return {
      title: '콘크리트·골조 작업 우천 위험 점검',
      reason: `작업지시서에서 콘크리트·골조 작업이 확인됩니다.${contextText} 우천 시 타설면 고임수, 레이턴스, 철근 작업면 미끄럼으로 품질 저하와 작업자 이동 위험이 함께 커질 수 있습니다.`,
      action: '타설 포함 여부를 먼저 확인하고, 타설이 있으면 보양 범위·배수 상태·작업 발판 미끄럼 요소를 점검한 뒤 우천 시간대와 겹치면 타설 시간 조정 또는 순연을 검토하는 것이 좋습니다.',
    }
  }

  if (workLabel.includes('도장') || workLabel.includes('방수')) {
    return {
      title: '외부 도장·방수 작업 우천 위험 점검',
      reason: `작업지시서에서 외부 도장·방수 작업이 확인됩니다.${contextText} 우천 시 작업면 수분, 건조 지연, 부착 불량으로 마감 품질과 재작업 위험이 커질 수 있습니다.`,
      action: '작업면 건조 상태와 보양 범위를 먼저 확인하고, 우천 시작 전 중지 기준을 공유한 뒤 외부 마감은 실내 공정 전환 또는 작업 순연을 검토하는 것이 좋습니다.',
    }
  }

  if (workLabel.includes('부대토목') || workLabel.includes('굴착')) {
    return {
      title: '부대토목·굴착 작업 우천 위험 점검',
      reason: `작업지시서에서 부대토목·굴착 작업이 확인됩니다.${contextText} 우천 시 굴착면 배수 불량, 임시 통로 미끄럼, 되메움·정리 지연이 발생해 작업 품질과 이동 동선 안전에 지장이 생길 수 있습니다.`,
      action: '굴착면 배수로와 임시 통로 노면을 먼저 확인하고, 장비 회차 구간·작업면 정리 구간·보행자 분리선을 점검한 뒤 물고임이 있으면 작업 순서를 조정하는 것이 좋습니다.',
    }
  }

  if (workLabel.includes('운반')) {
    return {
      title: '외부 자재 운반 작업 우천 위험 점검',
      reason: `작업지시서에서 외부 자재 운반 작업이 확인됩니다.${contextText} 우천 시 운반로 진흙, 시야 저하, 자재 보양 누락으로 운반 지연과 접촉 위험이 커질 수 있습니다.`,
      action: '자재 보양 상태와 운반로 배수를 먼저 확인하고, 차량 진입 순서와 보행자 동선을 분리한 뒤 운반량이 많으면 시간대를 나누는 것이 좋습니다.',
    }
  }

  return {
    title: '우천 민감 작업 사전 점검',
    reason: `작업지시서에서 우천 영향을 받을 수 있는 작업이 확인됩니다.${contextText} 작업면 미끄럼, 자재 보양, 운반로 상태, 품질 저하 위험을 함께 확인해야 합니다.`,
    action: '배수 상태와 보양 계획을 먼저 확인하고, 작업면 정리 상태와 이동 동선을 점검한 뒤 위험 구간이 있으면 작업 시간 조정 또는 순연을 검토하는 것이 좋습니다.',
  }
}

export function buildPlanRisksFromWorkOrders(analysis, equipments) {
  if (!analysis || !equipments.length) return []

  const rain = analysis.precipitationProbability ?? 0
  const wind = analysis.maxWindSpeed ?? 0
  const fineDust = analysis.fineDustValue ?? 0
  const effectiveHasRain = hasMeaningfulRain(analysis, rain)
  const grouped = new Map()

  equipments.forEach((equipment) => {
    const key = equipment.workOrderIdx ?? `${equipment.workLocation}-${equipment.workDetail}-${equipment.title}`
    const previous = grouped.get(key) || {
      title: equipment.title || '작업 지시서',
      workLocation: equipment.workLocation || '',
      workDetail: equipment.workDetail || '',
      equipments: [],
    }
    previous.equipments.push(equipment)
    grouped.set(key, previous)
  })

  const result = []
  grouped.forEach((order) => {
    const workText = `${order.title} ${order.workLocation} ${order.workDetail}`
    const targetText = workText

    if ((effectiveHasRain || rain >= 60) && includesAny(workText, ['콘크리트', '타설', '도장', '방수', '외부', '굴착', '철근', '벽체', '부대토목', 'landscape', '조경', '운반', '자재'])) {
      const detail = buildRainPlanRiskDetail(order, targetText)
      result.push({
        badge: 'AI',
        title: detail.title,
        subtitle: cleanAiText(order.title),
        level: rain >= 70 ? '경고' : '주의',
        reason: detail.reason,
        action: detail.action,
      })
    }

    if (wind >= 8 && includesAny(targetText, ['자재 들어 올림', '자재 들어올림', '양중', '철골', '패널', '유리', '외부', '고소', '비계', '크레인'])) {
      result.push({
        badge: 'AI',
        title: '양중·고소 작업 풍속 점검',
        subtitle: cleanAiText(order.title),
        level: wind >= 10 ? '경고' : '주의',
        reason: '크레인·리프트 사용, 고소작업, 외부 양중 작업이 확인됩니다. 바람이 강해지면 자재 흔들림, 작업자 균형 저하, 낙하·충돌 위험이 커질 수 있습니다.',
        action: '작업 전 풍속을 다시 확인하고, 자재 결속·신호수 배치·작업 발판 상태를 점검한 뒤 풍속이 기준을 넘으면 작업 대기 또는 순연으로 전환하는 것이 좋습니다.',
      })
    }

    if (fineDust >= 80 && includesAny(targetText, ['도장', '용접', '절단', '굴착', '외부', '연마'])) {
      result.push({
        badge: 'AI',
        title: '분진 노출 작업 보호구·살수 점검',
        subtitle: cleanAiText(order.title),
        level: fineDust >= 150 ? '경고' : '주의',
        reason: `옥외·분진 발생 작업이 확인됩니다. PM10 ${fineDust}㎍/㎥ 수준에서는 작업자 보호구 착용과 비산먼지 저감 조치를 함께 확인해야 합니다.`,
        action: '살수·차폐 구간을 먼저 지정하고, 방진마스크 착용 확인 후 분진 발생 작업은 작업 시간을 분산하는 것이 좋습니다.',
      })
    }
  })

  return sortByRiskLevel(result).slice(0, 5)
}

export function generateLiveRiskActions(analysis, dashboard, aiLiveRiskActions = [], hasWorkOrders = false) {
  if (!analysis) return mergeLiveRiskActions(aiLiveRiskActions).slice(0, 6)

  const actions = []
  const rain = analysis.precipitationProbability ?? 0
  const wind = analysis.maxWindSpeed ?? 0
  const fineDust = analysis.fineDustValue ?? 0
  const alertLabels = getWeatherAlertLabels(dashboard, analysis)
  const effectiveHasRain = hasMeaningfulRain(analysis, rain)
  const hasHeavyRainWarning = hasWeatherAlert(alertLabels, ['호우'])
  const hasStrongWindWarning = hasWeatherAlert(alertLabels, ['강풍'])
  const nowHour = new Date().getHours()

  if (hasHeavyRainWarning || hasStrongWindWarning) {
    const label = alertLabels.filter((alert) => includesAny(alert, ['호우', '강풍'])).join(' · ')
    actions.push({
      id: 'weather-alert',
      icon: 'siren',
      label: label || '기상특보 확인',
      detail: hasHeavyRainWarning && hasStrongWindWarning
        ? '외부 통로·차량 진입로·자재 보관 구간의 배수와 보양 상태를 확인하고, 고소·양중 작업은 작업책임자와 안전관리자 공유 후 진행해 주세요.'
        : hasHeavyRainWarning
          ? '외부 통로, 차량 진입로, 자재 보관 구간의 배수·보양·미끄럼 상태를 먼저 확인해 주세요.'
          : '고소 작업과 외부 양중 작업은 풍속, 자재 결속, 신호수 배치 상태를 먼저 확인해 주세요.',
      level: '경고',
      timing: '작업 전',
    })
  }

  if (hasStrongWindWarning || wind >= 10) {
    actions.push({
      id: 'wind-stop',
      icon: 'wind',
      label: '고소·양중 작업 풍속 확인',
      detail: '고소 작업, 비계 주변 작업, 외부 양중 작업은 자재 결속, 신호수 배치, 작업 발판 상태를 먼저 확인해 주세요.',
      level: hasStrongWindWarning || wind >= 12 ? '경고' : '주의',
      timing: '작업 전',
    })
  } else if (wind >= 8) {
    actions.push({
      id: 'wind-watch',
      icon: 'wind',
      label: '외부 고소 작업 풍속 재확인',
      detail: '작업 전 풍속계 재측정, 자재 결속 상태, 신호수 배치를 확인해 주세요.',
      level: '주의',
      timing: '작업 시작 전',
    })
  }

  if (hasHeavyRainWarning || rain >= 60 || effectiveHasRain) {
    actions.push({
      id: 'rain-drain-main',
      icon: 'umbrella',
      label: '외부 작업 배수·보양 확인',
      detail: '외부 통로, 작업면, 자재 보관 구간은 배수 상태와 보양 상태를 확인하고 미끄럼 위험이 있는 구간은 먼저 정리해 주세요.',
      level: hasHeavyRainWarning || rain >= 70 ? '경고' : '주의',
      timing: '작업 전',
    })
    actions.push({
      id: 'rain-access-route',
      icon: 'umbrella',
      label: '차량 진입로·회차 구간 노면 확인',
      detail: '차량 진입로와 회차 구간은 진흙, 물고임, 시야 저하가 생기기 쉬우므로 유도원 배치와 보행자 동선 분리 상태를 확인해 주세요.',
      level: hasHeavyRainWarning || rain >= 70 ? '경고' : '주의',
      timing: '작업 시작 전',
    })
  } else if (rain >= 40) {
    actions.push({
      id: 'rain-drain',
      icon: 'umbrella',
      label: '작업면 배수·미끄럼 점검',
      detail: '통로, 슬래브, 경사로, 장비 승하차 지점의 물기와 진흙 상태를 확인해 주세요.',
      level: '주의',
      timing: '작업 시작 전',
    })
  }

  if (analysis.hasSnow) {
    actions.push({
      id: 'snow-clear',
      icon: 'snow',
      label: '제설·제빙 후 출입 동선 확보',
      detail: '경사 구간 장비 진입 통제, 안전화 미끄럼 방지 장구 지급을 확인해 주세요.',
      level: '경고',
      timing: '오전 출근 전',
    })
  }

  if (analysis.heatRisk) {
    const isAfternoon = nowHour >= 12
    actions.push({
      id: 'heat',
      icon: 'sun',
      label: isAfternoon ? '폭염 시간대 옥외 작업 단축' : '12~14시 옥외 작업 휴식 편성',
      detail: `최고 ${analysis.maxTemperature ?? '--'}°C · 그늘막과 음수대를 확인해 주세요.`,
      level: '주의',
      timing: '12:00 ~ 14:00',
    })
  }

  if (analysis.coldRisk) {
    actions.push({
      id: 'cold',
      icon: 'thermometer',
      label: '저온 민감 공정 보양 점검',
      detail: `최저 ${analysis.minTemperature ?? '--'}°C · 콘크리트 양생과 배관 동결 보호 상태를 확인해 주세요.`,
      level: '주의',
      timing: '오전 작업 전',
    })
  }

  if (analysis.fineDustRisk || fineDust >= 80) {
    actions.push({
      id: 'dust',
      icon: 'mask',
      label: '보호구 지급 및 비산먼지 관리',
      detail: `PM10 ${fineDust}㎍/㎥ · 옥외 도장, 용접, 절단 작업자는 보호구와 살수 계획을 확인해 주세요.`,
      level: fineDust >= 150 ? '경고' : '주의',
      timing: '작업 시작 전',
    })
  }

  return mergeLiveRiskActions(actions, aiLiveRiskActions).slice(0, 6)
}

export function getThreeDayForecast(forecastDays, selectedDateText) {
  return forecastDays
    .filter((day) => day.date && day.date >= selectedDateText)
    .slice(0, 3)
}

export function getWeeklyForecast(forecastDays, selectedDateText) {
  return forecastDays
    .filter((day) => day.date && day.date >= selectedDateText)
    .slice(0, 7)
}

function getWeekStart(date) {
  const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  return weekStart
}

function formatMonthDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function getDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function getMonthlyForecast(forecastDays, selectedDateText) {
  if (!forecastDays.length) return []

  const dayMap = new Map()
  forecastDays.forEach((day) => {
    if (day.date) dayMap.set(day.date, day)
  })

  const selectedDate = new Date(`${selectedDateText}T00:00:00`)
  const today = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
  const thisWeekStart = getWeekStart(today)
  const weeks = []

  for (let weekIndex = 0; weekIndex < 4; weekIndex += 1) {
    const weekStart = new Date(thisWeekStart)
    weekStart.setDate(weekStart.getDate() + weekIndex * 7)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const effectiveStart = weekIndex === 0 && weekStart < today ? today : weekStart
    const days = []
    const cursor = new Date(effectiveStart)

    while (cursor <= weekEnd) {
      const key = getDateKey(cursor)
      const source = dayMap.get(key)

      days.push({
        id: key,
        date: key,
        shortDate: formatMonthDate(cursor),
        weekday: KOREAN_WEEKDAYS[cursor.getDay()],
        dayLabel: weekIndex === 0 && getDateKey(cursor) === selectedDateText ? '기준일' : KOREAN_WEEKDAYS[cursor.getDay()],
        weatherLabel: source?.weatherLabel || '예보 범위 외',
        maxTemp: source?.maxTemp ?? null,
        minTemp: source?.minTemp ?? null,
        precipitationProbability: source?.precipitationProbability ?? 0,
        windSpeed: source?.windSpeed ?? 0,
        hasData: Boolean(source),
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    const dataDays = days.filter((day) => day.hasData)
    const validMax = dataDays.map((day) => day.maxTemp).filter((value) => value != null)
    const validMin = dataDays.map((day) => day.minTemp).filter((value) => value != null)
    const maxTemp = validMax.length ? Math.max(...validMax) : null
    const minTemp = validMin.length ? Math.min(...validMin) : null
    const precipitationProbability = dataDays.length
      ? Math.round(dataDays.reduce((sum, day) => sum + day.precipitationProbability, 0) / dataDays.length)
      : 0
    const windSpeed = dataDays.length ? Math.max(...dataDays.map((day) => day.windSpeed)) : 0

    let weatherSummary = '대체로 안정'
    const hasRainLabel = dataDays.some((day) => /비|소나기/.test(day.weatherLabel))
    const hasSnowLabel = dataDays.some((day) => /눈/.test(day.weatherLabel))

    if (!dataDays.length) weatherSummary = '예보 데이터 없음'
    else if (hasSnowLabel) weatherSummary = '적설 가능'
    else if (precipitationProbability >= 60) weatherSummary = '비 예보 포함'
    else if (precipitationProbability >= 40) weatherSummary = '흐린 날 있음'
    else if (hasRainLabel) weatherSummary = '강수 일부'

    const risk = !dataDays.length
      ? '정보 없음'
      : precipitationProbability >= 60 || windSpeed >= 10
        ? '주의'
        : precipitationProbability >= 40 || windSpeed >= 8
          ? '보통'
          : '양호'
    const riskClass = risk === '주의'
      ? 'text-rose-700 bg-rose-50 border-rose-200'
      : risk === '보통'
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : risk === '양호'
          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
          : 'text-slate-600 bg-slate-50 border-slate-200'

    weeks.push({
      id: `week-${getDateKey(weekStart)}`,
      label: weekIndex === 0 ? '이번 주' : weekIndex === 1 ? '다음 주' : `${weekIndex + 1}주차`,
      dateRange: `${formatMonthDate(effectiveStart)} — ${formatMonthDate(weekEnd)}`,
      weatherSummary,
      maxTemp,
      minTemp,
      precipitationProbability,
      windSpeed,
      risk,
      riskClass,
      isCurrentWeek: weekIndex === 0,
      days,
    })
  }

  return weeks
}

export function levelBadgeClass(level) {
  if (level === '경고' || level === '위험' || level === '제한') return 'bg-rose-600 text-white'
  if (level === '주의') return 'bg-amber-100 text-amber-900'
  return 'bg-emerald-100 text-emerald-900'
}

export function getRainBarClass(rainPercent) {
  if (rainPercent >= 80) return 'bg-gradient-to-r from-sky-500 to-blue-700 shadow-lg'
  if (rainPercent >= 70) return 'bg-gradient-to-r from-sky-450 to-blue-600 shadow-md'
  if (rainPercent >= 60) return 'bg-gradient-to-r from-sky-400 to-blue-600 shadow-md'
  if (rainPercent >= 40) return 'bg-gradient-to-r from-sky-300 to-blue-500 shadow-sm'
  if (rainPercent >= 20) return 'bg-gradient-to-r from-cyan-300 to-sky-400'
  return 'bg-gradient-to-r from-cyan-200 to-sky-300'
}

export function getRainNoteDetailed(rainPercent, alertLabels = []) {
  if (hasWeatherAlert(alertLabels, ['호우'])) return '호우주의보'
  if (rainPercent >= 80) return '외부 공정 중단 검토'
  if (rainPercent >= 70) return '외부 공정 순연 검토'
  if (rainPercent >= 60) return '우천 대비 필요'
  if (rainPercent >= 40) return '작업면 상태 확인'
  if (rainPercent >= 20) return '기본 우천 대비'
  return '정상 운영'
}

export function weatherEmoji(label, rainPercent) {
  const normalizedLabel = String(label || '').replace(/\s/g, '')

  if (normalizedLabel.includes('눈')) return '❄️'
  if (normalizedLabel.includes('비') || rainPercent >= 70) return '🌧'
  if (normalizedLabel.includes('흐림') || normalizedLabel.includes('흐리고') || rainPercent >= 40) return '☁️'
  if (normalizedLabel.includes('강풍')) return '💨'
  if (normalizedLabel.includes('구름')) return '⛅'
  return '☀️'
}

export function formatWindSpeed(value) {
  if (value == null) return '-'
  const numberValue = Number(value)
  return `${numberValue.toFixed(numberValue % 1 === 0 ? 0 : 1)}m/s`
}
