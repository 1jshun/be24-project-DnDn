export const EQUIPMENT_ENUM_MAP = {
  굴삭기: 'EXCAVATOR',
  미니굴삭기: 'MINI_EXCAVATOR',
  백호: 'BACKHOE_LOADER',
  드래그라인: 'DRAGLINE_EXCAVATOR',
  덤프트럭: 'DUMP_TRUCK',
  '트럭 믹서': 'CONCRETE_MIXER_TRUCK',
  트랙터: 'TRACTOR',
  트레일러: 'TRAILER',
  스크레이퍼: 'SCRAPER',
  타워크레인: 'TOWER_CRANE',
  '모바일 크레인': 'MOBILE_CRANE',
  '크롤러 크레인': 'CRAWLER_CRANE',
  지게차: 'FORKLIFT',
  리프트: 'CONSTRUCTION_HOIST',
  불도저: 'BULLDOZER',
  '모터 그레이더': 'MOTOR_GRADER',
  롤러: 'ROAD_ROLLER',
  콤팩터: 'PLATE_COMPACTOR',
  '아스팔트 피니셔': 'ASPHALT_PAVER',
  '밀링 머신': 'MILLING_MACHINE',
  살수차: 'WATER_TRUCK',
  '노면 절단기': 'CONCRETE_CUTTER',
  '파일 드라이버': 'PILE_DRIVER',
  보링머신: 'BORING_MACHINE',
  어스오거: 'EARTH_AUGER',
  RCD: 'REVERSE_CIRCULATION_DRILL',
  '콘크리트 펌프카': 'CONCRETE_PUMP_TRUCK',
  '배치 플랜트': 'BATCHING_PLANT',
  바이브레이터: 'CONCRETE_VIBRATOR',
  브레이커: 'HYDRAULIC_BREAKER',
  니블러: 'NIBBLER',
  크러셔: 'CRUSHER',
  고소작업차: 'AERIAL_WORK_PLATFORM',
  TBM: 'TUNNEL_BORING_MACHINE',
}

export const ENUM_TO_KOR_MAP = Object.fromEntries(
  Object.entries(EQUIPMENT_ENUM_MAP).map(([k, v]) => [v, k]),
)

export const ROLES = { MANAGER: 'site_manager', WORKER: 'process_owner' }

export const DEFAULT_TRADE_OPTIONS = [
  '공통/가설',
  '토공사',
  '지정/기초',
  '골조공사',
  '건축마감',
  '기계/설비',
  '전기/통신',
  '토목/조경',
  '준공/검사',
]

export const TRADE_LABEL_MAP = {
  EARTHWORK: '토공사',
  FRAME: '골조공사',
  REBAR: '골조공사',
  FORM: '골조공사',
  ELECTRIC: '전기/통신',
  FACILITY: '기계/설비',
  MASONRY: '건축마감',
  WATERPROOF: '건축마감',
  PLASTER: '건축마감',
  TILE: '건축마감',
  PAINT: '건축마감',
  PAVEMENT: '토목/조경',
  LANDSCAPE: '토목/조경',
  ETC: '기타',
  COMMON: '공통/가설',
  TEMPORARY: '공통/가설',
  COMMON_TEMP: '공통/가설',
  FOUNDATION: '지정/기초',
  FINISH: '건축마감',
  MECHANICAL: '기계/설비',
  CIVIL: '토목/조경',
  INSPECTION: '준공/검사',
  공통: '공통/가설',
  가설: '공통/가설',
  '공통/가설': '공통/가설',
  지정: '지정/기초',
  기초: '지정/기초',
  '지정/기초': '지정/기초',
  준공: '준공/검사',
  검사: '준공/검사',
  '준공/검사': '준공/검사',
  토공: '토공사',
  토공사: '토공사',
  골조: '골조공사',
  골조공사: '골조공사',
  철근: '골조공사',
  형틀: '골조공사',
  전기: '전기/통신',
  통신: '전기/통신',
  '전기/통신': '전기/통신',
  설비: '기계/설비',
  기계: '기계/설비',
  '기계/설비': '기계/설비',
  마감: '건축마감',
  건축마감: '건축마감',
  조경: '토목/조경',
  토목: '토목/조경',
  '토목/조경': '토목/조경',
}

export const TRADE_SORT_ORDER = [
  '공통/가설',
  '토공사',
  '지정/기초',
  '골조공사',
  '건축마감',
  '기계/설비',
  '전기/통신',
  '토목/조경',
  '준공/검사',
]

export function normalizeTradeName(value) {
  if (!value) return ''
  const raw = String(value)
    .trim()
    .replace(/\s*공정$/, '')
    .replace(/\s*공종$/, '')
  return TRADE_LABEL_MAP[raw] || raw
}

export function sortTrades(list) {
  return [...list].sort((a, b) => {
    const ai = TRADE_SORT_ORDER.indexOf(a)
    const bi = TRADE_SORT_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b, 'ko')
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export function unwrapApiData(response) {
  const payload = response?.data ?? response
  const data = payload?.data ?? payload
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.list)) return data.list
  if (Array.isArray(data?.items)) return data.items
  return []
}

export function inferTradeNameFromTaskName(value) {
  const text = String(value || '')
  if (!text) return ''

  if (/가설|현장\s*개설|울타리|사무실|타워크레인|리프트/.test(text)) return '공통/가설'
  if (/토공|터파기|되메우기|흙막이|토사|굴착/.test(text)) return '토공사'
  if (/지정|기초|파일|말뚝|버림|매트/.test(text)) return '지정/기초'
  if (/골조|철근|콘크리트|거푸집|형틀|슬라브|보강|PHC/.test(text)) return '골조공사'
  if (/조적|방수|미장|타일|도장|마감|창호|석고|수장|도배/.test(text)) return '건축마감'
  if (/기계|설비|배관|덕트|위생|소방/.test(text)) return '기계/설비'
  if (/전기|통신|전력|조명|수배전|케이블/.test(text)) return '전기/통신'
  if (/토목|조경|포장|도로|배수|외부/.test(text)) return '토목/조경'
  if (/준공|검사|청소|정리|인수|시운전/.test(text)) return '준공/검사'
  return ''
}

export function getTradeNameFromPlan(plan) {
  const directTradeCandidates = [
    plan?.tradeProcessTradeName,
    plan?.tradeProcess?.tradeName,
    plan?.tradeProcess?.trade,
    plan?.tradeProcess?.tradeType,
    plan?.tradeProcess?.category,
    plan?.tradeProcess?.majorTrade,
    plan?.tradeProcess?.majorTradeName,
    plan?.processTrade,
    plan?.processTradeName,
    plan?.tradeName,
    plan?.trade,
    plan?.tradeType,
    plan?.tradeCode,
    plan?.category,
    plan?.majorTrade,
    plan?.majorTradeName,
  ]

  for (const candidate of directTradeCandidates) {
    const normalized = normalizeTradeName(candidate)
    if (normalized && normalized !== '기타') return normalized
  }

  const processText = [
    plan?.tradeProcessName,
    plan?.tradeProcess?.name,
    plan?.name,
    plan?.processName,
    plan?.title,
    plan?.workName,
  ]
    .filter(Boolean)
    .join(' ')
  const inferred = inferTradeNameFromTaskName(processText)
  return inferred && inferred !== '기타' ? inferred : ''
}

export const equipmentList = {
  '굴착·토공': ['굴삭기', '미니굴삭기', '백호', '드래그라인'],
  운반: ['덤프트럭', '트럭 믹서', '트랙터', '트레일러', '스크레이퍼'],
  '하역·양중': ['타워크레인', '모바일 크레인', '크롤러 크레인', '지게차', '리프트'],
  '정지·다짐': ['불도저', '모터 그레이더', '롤러', '콤팩터'],
  '도로·포장': ['아스팔트 피니셔', '밀링 머신', '살수차', '노면 절단기'],
  '기초·파일': ['파일 드라이버', '보링머신', '어스오거', 'RCD'],
  콘크리트: ['콘크리트 펌프카', '배치 플랜트', '바이브레이터'],
  '철거·특수': ['브레이커', '니블러', '크러셔', '고소작업차', 'TBM'],
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
export function fmtKor(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})`
}

export function makeId() {
  return `WO-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

export const DEFAULT_WORK_TIME = '07:00 ~ 17:00'
export const DEFAULT_SAFETY_TEXT =
  '추락/낙하/화재 등 위험요인 사전 점검 및 안전조치 철저. (지시서 및 일일 TBM 준수)'

const WORK_TIME_SECTION_LABELS = ['작업시간', '작업 시간', '?묒뾽?쒓컙']
const SAFETY_SECTION_LABELS = ['안전사항', '안전 사항', '안전 유의사항', '?덉쟾?ы빆']

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sectionPattern(labels) {
  return labels.map(escapeRegExp).join('|')
}

export function parseInstructionContent(content = '') {
  const text = String(content || '')
    .replace(/\r\n/g, '\n')
    .trim()
  const workTimePattern = sectionPattern(WORK_TIME_SECTION_LABELS)
  const safetyPattern = sectionPattern(SAFETY_SECTION_LABELS)
  const workTimeMatch = text.match(
    new RegExp(
      `\\[\\s*(?:${workTimePattern})\\s*\\]\\s*([\\s\\S]*?)(?=\\n\\s*\\[\\s*(?:${safetyPattern})\\s*\\]|$)`,
    ),
  )
  const safetyMatch = text.match(new RegExp(`\\[\\s*(?:${safetyPattern})\\s*\\]\\s*([\\s\\S]*)$`))
  const metaIndexes = [workTimeMatch?.index, safetyMatch?.index].filter(
    (index) => Number.isInteger(index) && index >= 0,
  )
  const workDetail = metaIndexes.length ? text.slice(0, Math.min(...metaIndexes)).trim() : text

  return {
    workDetail,
    workTime: workTimeMatch?.[1]?.trim() || '',
    safety: safetyMatch?.[1]?.trim() || '',
  }
}

export function buildInstructionFields(order) {
  const parsed = parseInstructionContent(order.workDetail)
  const workDetail = parsed.workDetail || String(order.workDetail || '').trim()
  const safety = String(order.safety || parsed.safety || DEFAULT_SAFETY_TEXT).trim()

  return {
    instructionContent: workDetail,
    workDetail,
    workTime: order.workTime,
    safetyContent: safety,
  }
}

export function resolveWorkPlanWorkTime(plan) {
  if (plan?.workTime) return plan.workTime

  const note = String(plan?.note || '')
  const timeRange = '(\\d{1,2}:\\d{2})\\s*[~～]\\s*(\\d{1,2}:\\d{2})'
  const label = '(?:작업\\s*시간|작업시간)'
  const changed = note.match(
    new RegExp(`${label}\\s*:?\\s*${timeRange}\\s*(?:->|→)\\s*${timeRange}`),
  )
  if (changed) return `${changed[3]} ~ ${changed[4]}`

  const bracket = note.match(new RegExp(`\\[${label}\\]\\s*${timeRange}`))
  if (bracket) return `${bracket[1]} ~ ${bracket[2]}`

  const labeled = note.match(new RegExp(`${label}\\s*:?\\s*${timeRange}`))
  if (labeled) return `${labeled[1]} ~ ${labeled[2]}`

  return DEFAULT_WORK_TIME
}

export function fmtSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function fileBadge(type) {
  if (!type) return '파일'
  if (type.includes('pdf')) return 'PDF'
  if (type.includes('sheet') || type.includes('excel')) return 'XLSX'
  if (type.includes('image')) return 'IMG'
  return '파일'
}

export function toDateString(dateVal) {
  if (Array.isArray(dateVal)) {
    return `${dateVal[0]}-${String(dateVal[1]).padStart(2, '0')}-${String(dateVal[2]).padStart(2, '0')}`
  }
  return dateVal
}
