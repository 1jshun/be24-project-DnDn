export const ROLES = {
  MANAGER: 'site_manager',
  WORKER: 'process_owner',
}

export const ALL_PROCESSES = [
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

const TRADE_ENUM_MAP = {
  EARTHWORK: '토공사',
  FORM: '골조공사',
  FRAME: '골조공사',
  REBAR: '골조공사',
  CONCRETE: '골조공사',
  FACILITY: '기계/설비',
  ELECTRIC: '전기/통신',
  TELECOM: '전기/통신',
  WATERPROOF: '건축마감',
  MASONRY: '건축마감',
  PLASTER: '건축마감',
  TILE: '건축마감',
  PAINT: '건축마감',
  LANDSCAPE: '토목/조경',
  PAVEMENT: '토목/조경',
  ETC: '기타',
}

const EXTRACTED_TRADE_NAME_MAP = {
  공통: '공통',
  토목기초: '토목/기초',
  '토목/기초': '토목/기초',
  건축: '건축',
  MEP: 'MEP',
  엠이피: 'MEP',
  부대조경: '부대/조경',
  '부대/조경': '부대/조경',
  준공관리: '준공/관리',
  '준공/관리': '준공/관리',
  조경: '조경',
  기계: '기계',
}

export function normalizeTradeName(value) {
  const raw = String(value || '').trim()
  if (!raw) return null

  const upper = raw.toUpperCase()
  if (TRADE_ENUM_MAP[upper]) return TRADE_ENUM_MAP[upper]

  const compact = raw.replace(/\s+/g, '')
  const compactWithoutSuffix = compact.replace(/공종$/, '')
  const extractedTradeName =
    EXTRACTED_TRADE_NAME_MAP[upper] ||
    EXTRACTED_TRADE_NAME_MAP[compact] ||
    EXTRACTED_TRADE_NAME_MAP[compactWithoutSuffix]
  if (extractedTradeName) return extractedTradeName

  if (
    ['공통/가설', '공통가설', '가설공사'].includes(compact) ||
    /가설|현장개설|울타리|가설사무실|가설전기|가설수도/.test(raw)
  )
    return '공통/가설'
  if (
    ['토공', '토공사'].includes(compact) ||
    /토공|터파기|토사|굴착|되메우기|흙막이|토목굴착/.test(raw)
  )
    return '토공사'
  if (
    ['지정/기초', '지정기초', '기초공사', '지정공사'].includes(compact) ||
    /지정|기초|파일|PHC|지반|말뚝/.test(raw)
  )
    return '지정/기초'
  if (
    ['골조', '골조공사', '철근', '콘크리트', '형틀', '거푸집'].includes(compact) ||
    /골조|철근|콘크리트|거푸집|형틀|타설|RC/.test(raw)
  )
    return '골조공사'
  if (
    ['건축마감', '마감', '마감공사'].includes(compact) ||
    /마감|조적|방수|미장|타일|도장|창호|석고|수장|도배|단열|내장/.test(raw)
  )
    return '건축마감'
  if (
    ['기계/설비', '기계설비', '설비', '기계'].includes(compact) ||
    /기계|설비|배관|위생|소방|공조|환기|급수|배수/.test(raw)
  )
    return '기계/설비'
  if (
    ['전기/통신', '전기통신', '전기', '통신'].includes(compact) ||
    /전기|통신|조명|배선|전력|약전|수배전/.test(raw)
  )
    return '전기/통신'
  if (
    ['토목/조경', '토목조경', '조경', '포장'].includes(compact) ||
    /토목|조경|포장|외부|부대토목|도로/.test(raw)
  )
    return '토목/조경'
  if (
    ['준공/검사', '준공검사', '준공', '검사'].includes(compact) ||
    /준공|검사|시운전|사용승인|청소|인수인계/.test(raw)
  )
    return '준공/검사'

  return null
}

export function getTradeNameFromRecord(record) {
  if (!record) return null
  return normalizeTradeName(
    record.tradeProcessTradeName ||
      record.tradeProcess?.tradeName ||
      record.tradeName ||
      record.majorTradeName ||
      record.tradeType ||
      record.trade ||
      record.category ||
      record.process ||
      record.tradeProcess?.tradeType ||
      record.tradeProcess?.trade ||
      record.tradeProcess?.category ||
      record.tradeProcessName ||
      record.name ||
      record.title,
  )
}

export function getAllTradeOptions() {
  return ALL_PROCESSES
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

const EQ_ENUM_MAP = {
  EXCAVATOR: '굴삭기',
  MINI_EXCAVATOR: '미니굴삭기',
  BACKHOE: '백호',
  DRAGLINE: '드래그라인',
  DUMP_TRUCK: '덤프트럭',
  TRUCK_MIXER: '트럭 믹서',
  TRACTOR: '트랙터',
  TRAILER: '트레일러',
  SCRAPER: '스크레이퍼',
  TOWER_CRANE: '타워크레인',
  MOBILE_CRANE: '모바일 크레인',
  CRAWLER_CRANE: '크롤러 크레인',
  FORKLIFT: '지게차',
  LIFT: '리프트',
  BULLDOZER: '불도저',
  MOTOR_GRADER: '모터 그레이더',
  ROLLER: '롤러',
  COMPACTOR: '콤팩터',
  ASPHALT_FINISHER: '아스팔트 피니셔',
  MILLING_MACHINE: '밀링 머신',
  WATER_TRUCK: '살수차',
  ROAD_CUTTER: '노면 절단기',
  PILE_DRIVER: '파일 드라이버',
  BORING_MACHINE: '보링머신',
  EARTH_AUGER: '어스오거',
  RCD: 'RCD',
  CONCRETE_PUMP: '콘크리트 펌프카',
  BATCH_PLANT: '배치 플랜트',
  VIBRATOR: '바이브레이터',
  BREAKER: '브레이커',
  NIBBLER: '니블러',
  CRUSHER: '크러셔',
  AERIAL_WORK_PLATFORM: '고소작업차',
  TBM: 'TBM',
}

export function getEqKorName(name) {
  if (!name) return '장비'
  return EQ_ENUM_MAP[name.toUpperCase()] || name
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
export function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
export function fmtKor(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})`
}

export function toDateString(dateVal) {
  if (Array.isArray(dateVal)) {
    return `${dateVal[0]}-${String(dateVal[1]).padStart(2, '0')}-${String(dateVal[2]).padStart(2, '0')}`
  }
  return dateVal ? String(dateVal).slice(0, 10) : ''
}

export function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function getPlanId(record) {
  const id = Number(record?.idx ?? record?.id ?? record?.workPlanId)
  return Number.isFinite(id) ? id : null
}

export function getPlanDate(record) {
  return toDateString(record?.startDate || record?.date || record?.reportDate)
}

export function unwrapApiList(res) {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data)) return res.data
  if (Array.isArray(res?.data?.data)) return res.data.data
  return []
}

export function normalizeScheduleChangeStatus(status) {
  const value = String(status || '')
    .trim()
    .toLowerCase()
  if (['approved', '승인 완료', '승인완료'].includes(value)) return 'approved'
  if (['applied', '일정 반영 완료', '일정반영완료', '반영 완료', '반영완료'].includes(value))
    return 'applied'
  if (['pending', '승인 대기', '승인대기'].includes(value)) return 'pending'
  if (['rejected', '반려'].includes(value)) return 'rejected'
  return value
}

export function parseScheduleTime(value) {
  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value
    return new Date(year, month - 1, day, hour, minute, second).getTime()
  }
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}
