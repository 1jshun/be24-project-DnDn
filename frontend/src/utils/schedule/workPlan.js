export const trades = ['형틀', '전기', '방수', '골조', '설비', '철근']
export const statuses = ['진행 예정', '진행 중']

export const statusClass = (s) => {
  if (s === '진행 중') return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
  return 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
}

export function workPlanStatus(plan) {
  if (!plan?.start) return '진행 예정'
  return formatDateLocal(new Date()) >= plan.start ? '진행 중' : '진행 예정'
}

export function isDateInRange(start, end, date = formatDateLocal(new Date())) {
  if (!start || !end) return false
  return start <= date && date <= end
}

export function isYearlyProcessInProgress(item) {
  if (isDateInRange(item?.baselineStart, item?.baselineEnd)) return true
  return (item?.workPlans ?? []).some((plan) => isDateInRange(plan?.start, plan?.end))
}

export function isMonthlyProcessInProgress(item) {
  if (isDateInRange(item?.baselineStart, item?.baselineEnd)) return true
  return (item?.details ?? []).some(
    (detail) =>
      isDateInRange(detail?.start, detail?.end) ||
      isDateInRange(detail?.plannedStart, detail?.plannedEnd),
  )
}

export function isWorkPlanGroupInProgress(group) {
  return (group?.items ?? []).some(
    (item) => isYearlyProcessInProgress(item) || isMonthlyProcessInProgress(item),
  )
}

export function getWeekStart(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

export function formatDateLocal(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function displayWorkTime(plan) {
  if (plan?.workTime) return plan.workTime

  const note = String(plan?.note || '')
  const timeRange = '(\\d{1,2}:\\d{2})\\s*[~～]\\s*(\\d{1,2}:\\d{2})'
  const changed = note.match(
    new RegExp(`작업시간\\s*:?\\s*${timeRange}\\s*(?:->|→)\\s*${timeRange}`),
  )
  if (changed) return `${changed[3]} ~ ${changed[4]}`

  const bracket = note.match(new RegExp(`\\[작업시간\\]\\s*${timeRange}`))
  if (bracket) return `${bracket[1]} ~ ${bracket[2]}`

  const labeled = note.match(new RegExp(`작업시간\\s*:?\\s*${timeRange}`))
  if (labeled) return `${labeled[1]} ~ ${labeled[2]}`

  return '-'
}

export const HOLIDAY_DATES = new Set([
  '2026-01-01',
  '2026-02-16',
  '2026-02-17',
  '2026-02-18',
  '2026-03-01',
  '2026-03-02',
  '2026-05-01',
  '2026-05-05',
  '2026-05-24',
  '2026-05-25',
  '2026-06-03',
  '2026-06-06',
  '2026-08-15',
  '2026-08-17',
  '2026-09-24',
  '2026-09-25',
  '2026-09-26',
  '2026-10-03',
  '2026-10-05',
  '2026-10-09',
  '2026-12-25',
])

export function isHolidayDate(dateStr) {
  return HOLIDAY_DATES.has(dateStr)
}

export function dayTextClass(day) {
  if (day.isHoliday || day.isSunday) return 'text-rose-600'
  if (day.isSaturday) return 'text-blue-600'
  return 'text-forena-600'
}

export function weeklyDayHeaderClass(day) {
  if (day.isHoliday || day.isSunday) return 'bg-rose-50 text-rose-600'
  if (day.isSaturday) return 'bg-blue-50 text-blue-600'
  if (day.isToday) return 'bg-flare-500 text-white'
  return 'bg-forena-50 text-forena-600'
}

export function monthlyDayHeaderClass(day) {
  if (day.isHoliday || day.isSunday) return 'bg-rose-50 text-rose-600'
  if (day.isSaturday) return 'bg-blue-50 text-blue-600'
  if (day.isToday) return 'bg-flare-50 text-flare-700'
  return 'text-forena-500'
}

export function monthlyDayCellClass(day) {
  if (day.isHoliday || day.isSunday) return 'bg-rose-50/40'
  if (day.isSaturday) return 'bg-blue-50/40'
  return ''
}

export function generateMockParseRows(category) {
  if (category === '연간') {
    return [
      {
        id: 'r1',
        name: '본동 골조 공사',
        trade: '골조',
        location: '본동 1~10층',
        start: '2026-03-01',
        end: '2026-08-31',
        issue: null,
      },
      {
        id: 'r2',
        name: '지하주차장 방수',
        trade: '방수',
        location: '지하 1~3층',
        start: '2026-04-15',
        end: '2026-06-30',
        issue: null,
      },
      {
        id: 'r3',
        name: '전기 간선 설치',
        trade: '전기',
        location: '전 층',
        start: '2026-05-01',
        end: '2026-09-15',
        issue: 'warning',
      },
      {
        id: 'r4',
        name: '외부 마감',
        trade: '형틀',
        location: '외벽',
        start: '',
        end: '2026-10-31',
        issue: 'error',
      },
    ]
  }
  return [
    {
      id: 'm1',
      name: 'B2층 전기 배관 설치',
      trade: '전기',
      location: 'B2층 전기실',
      start: '2026-04-29',
      end: '2026-05-08',
      issue: null,
    },
    {
      id: 'm2',
      name: '본동 3층 슬라브 철근 박·고정',
      trade: '철근',
      location: '본동 3층',
      start: '2026-04-25',
      end: '2026-05-02',
      issue: null,
    },
    {
      id: 'm3',
      name: 'B1층 슬라브 형틀 조립',
      trade: '형틀',
      location: 'B1층 전체',
      start: '2026-04-28',
      end: '2026-05-05',
      issue: null,
    },
    {
      id: 'm4',
      name: '지하주차장 방수 공사',
      trade: '방수',
      location: '지하 주차구역 A',
      start: '2026-05-03',
      end: '',
      issue: 'error',
    },
  ]
}

export const WORKER_TRADES = [
  '전공',
  '보통공',
  '철근공',
  '형틀공',
  '목수',
  '미장공',
  '조적공',
  '도장공',
  '방수공',
  '타일공',
  '전기공',
  '배관공',
  '용접공',
  '기타',
]

export const EQUIPMENT_GROUPS = [
  { label: '굴착·토공', items: ['굴삭기', '미니굴삭기', '백호', '드래그라인'] },
  {
    label: '운반',
    items: ['덤프트럭', '트럭 믹서', '트랙터', '트레일러', '스크레이퍼'],
  },
  {
    label: '하역·양중',
    items: ['타워크레인', '모바일 크레인', '크롤러 크레인', '지게차', '리프트'],
  },
  { label: '정지·다짐', items: ['불도저', '모터 그레이더', '롤러', '콤팩터'] },
  {
    label: '도로·포장',
    items: ['아스팔트 피니셔', '밀링 머신', '살수차', '노면 절단기'],
  },
  {
    label: '기초·파일',
    items: ['파일 드라이버', '보링머신', '어스오거', 'RCD'],
  },
  { label: '콘크리트', items: ['콘크리트 펌프카', '배치 플랜트', '바이브레이터'] },
  {
    label: '철거·특수',
    items: ['브레이커', '니블러', '크러셔', '고소작업차', 'TBM'],
  },
  { label: '기타', items: ['기타'] },
]

export const GANTT_DAY_W = 42
export const GANTT_MONTH_W = 108
export const NAME_COL_W = 280
