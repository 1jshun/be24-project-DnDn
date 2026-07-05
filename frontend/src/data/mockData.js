// ──────────────────────────────────────────
// 공사 일정 관리 시스템 — Mock Data
// ──────────────────────────────────────────

// ── 공정표 관리 ──────────────────────────
export const projectInfo = {
  name: '강남 복합개발 1공구 신축공사',
  startDate: '2025-03-01',
  endDate: '2026-09-30',
  plannedProgress: 62,
  baselineStatus: '확정',
  lastModified: '2026-04-15',
}

export const baselineTasks = [
  { id: 1, trade: '토목', name: '터파기 및 흙막이', start: '2025-03-01', end: '2025-04-15', isCritical: true,  weight: 8,  confidence: 95, reviewStatus: '승인', durWeeks: 6 },
  { id: 2, trade: '토목', name: '기초 콘크리트',    start: '2025-04-16', end: '2025-05-31', isCritical: true,  weight: 10, confidence: 92, reviewStatus: '승인', durWeeks: 6 },
  { id: 3, trade: '골조', name: 'B3 ~ B1 골조',    start: '2025-06-01', end: '2025-08-31', isCritical: true,  weight: 15, confidence: 88, reviewStatus: '승인', durWeeks: 13 },
  { id: 4, trade: '골조', name: '지상 1~5층 골조',  start: '2025-09-01', end: '2025-11-30', isCritical: true,  weight: 12, confidence: 90, reviewStatus: '수정 요청', durWeeks: 13 },
  { id: 5, trade: '전기', name: '전기 간선 배관',   start: '2025-09-15', end: '2025-12-31', isCritical: false, weight: 6,  confidence: 82, reviewStatus: '검토 중', durWeeks: 15 },
  { id: 6, trade: '설비', name: '급배수 배관',      start: '2025-10-01', end: '2026-02-28', isCritical: false, weight: 7,  confidence: 85, reviewStatus: '검토 중', durWeeks: 21 },
  { id: 7, trade: '골조', name: '지상 6~15층 골조', start: '2025-12-01', end: '2026-03-31', isCritical: true,  weight: 14, confidence: 78, reviewStatus: '미검토', durWeeks: 17 },
  { id: 8, trade: '마감', name: '외벽 커튼월',      start: '2026-02-01', end: '2026-06-30', isCritical: false, weight: 10, confidence: 72, reviewStatus: '미검토', durWeeks: 21 },
  { id: 9, trade: '마감', name: '내부 마감 공사',   start: '2026-04-01', end: '2026-08-31', isCritical: false, weight: 11, confidence: 75, reviewStatus: '미검토', durWeeks: 22 },
  { id:10, trade: '준공', name: '준공 검사 및 인수', start: '2026-08-01', end: '2026-09-30', isCritical: true,  weight: 7,  confidence: 80, reviewStatus: '미검토', durWeeks: 9 },
]

// ── 작업 계획 ────────────────────────────
// start/end : 계획 시작/종료일
// actualStart/actualEnd : 실적 시작/종료일 (있는 경우만 간트차트에 빨간 라인 표시)
// sourceFile : 원본 계획서 파일명
export const workPlans = [
  // ── 3월 ─────────────────────────────────
  { id: 101, name: '지상 14층 슬라브 콘크리트 타설', start: '2026-03-02', end: '2026-03-04', actualStart: '2026-03-02', actualEnd: '2026-03-05', sourceFile: '3월1주_타설계획.pdf',
    location: '14층 전체', trade: '골조', workers: ['목수 6명', '콘크리트공 4명'], equipment: ['콘크리트 펌프카 1대', '타워크레인 1대'], requiredCount: 10, status: '확정' },
  { id: 102, name: '지상 14층 거푸집 해체', start: '2026-03-05', end: '2026-03-09', actualStart: '2026-03-06', actualEnd: '2026-03-10', sourceFile: '3월1주_타설계획.pdf',
    location: '14층 전체', trade: '형틀', workers: ['목수 4명'], equipment: [], requiredCount: 4, status: '확정' },
  { id: 103, name: '지상 15층 철근 조립', start: '2026-03-09', end: '2026-03-16', actualStart: '2026-03-10', actualEnd: '2026-03-17', sourceFile: '3월2주_철근계획.xlsx',
    location: '15층 기둥/보', trade: '철근', workers: ['철근공 5명'], equipment: ['타워크레인 1대'], requiredCount: 5, status: '확정' },
  { id: 104, name: '지상 15층 거푸집 설치', start: '2026-03-12', end: '2026-03-20', actualStart: '2026-03-13', actualEnd: '2026-03-21', sourceFile: '3월2주_형틀계획.pdf',
    location: '15층 전체', trade: '형틀', workers: ['목수 6명', '보통인부 2명'], equipment: ['타워크레인 1대'], requiredCount: 8, status: '확정' },
  { id: 105, name: '저층부 외벽 단열재 시공', start: '2026-03-16', end: '2026-03-30', actualStart: '2026-03-18', actualEnd: '2026-04-01', sourceFile: '외벽단열_시공계획.pdf',
    location: '1~3층 외벽', trade: '방수', workers: ['단열공 3명'], equipment: ['고소작업차 1대'], requiredCount: 3, status: '확정' },
  { id: 106, name: '지상 15층 콘크리트 타설', start: '2026-03-21', end: '2026-03-23', actualStart: '2026-03-22', actualEnd: '2026-03-24', sourceFile: '3월3주_타설계획.pdf',
    location: '15층 전체', trade: '골조', workers: ['콘크리트공 5명', '목수 4명'], equipment: ['콘크리트 펌프카 1대'], requiredCount: 9, status: '확정' },
  { id: 107, name: 'B2층 전기 간선 1차 배선', start: '2026-03-23', end: '2026-04-05', actualStart: '2026-03-24', actualEnd: '2026-04-08', sourceFile: '전기간선_배선계획.xlsx',
    location: 'B2층 EPS실', trade: '전기', workers: ['전기공 4명'], equipment: [], requiredCount: 4, status: '확정' },
  { id: 108, name: '코어 엘리베이터 가이드레일 설치', start: '2026-03-25', end: '2026-04-15', actualStart: '2026-03-27', actualEnd: '2026-04-18', sourceFile: 'EV_가이드레일_시공계획.pdf',
    location: '코어부 1~10층', trade: '설비', workers: ['승강기공 3명'], equipment: ['타워크레인 1대'], requiredCount: 3, status: '진행 중' },

  // ── 4월 (현재 달) ───────────────────────
  { id: 109, name: 'B3층 주차장 바닥 평탄화', start: '2026-04-01', end: '2026-04-04', actualStart: '2026-04-01', actualEnd: '2026-04-05', sourceFile: '4월1주_토목계획.pdf',
    location: 'B3층 주차구역', trade: '골조', workers: ['보통인부 4명'], equipment: ['미니굴삭기 1대'], requiredCount: 4, status: '확정' },
  { id: 110, name: 'B2층 급배수 메인 배관', start: '2026-04-02', end: '2026-04-12', actualStart: '2026-04-03', actualEnd: '2026-04-14', sourceFile: '설비배관_시공계획.xlsx',
    location: 'B2층 PS', trade: '설비', workers: ['배관공 3명'], equipment: [], requiredCount: 3, status: '확정' },
  { id: 111, name: '지상 1~3층 외벽 커튼월 1차', start: '2026-04-05', end: '2026-04-22', actualStart: '2026-04-07', actualEnd: '2026-04-25', sourceFile: '커튼월_시공계획_4월.pdf',
    location: '1~3층 외벽', trade: '방수', workers: ['커튼월공 4명'], equipment: ['고소작업차 2대'], requiredCount: 4, status: '진행 중' },
  { id: 112, name: 'B1층 슬라브 철근 박·고정', start: '2026-04-08', end: '2026-04-14', actualStart: '2026-04-09', actualEnd: '2026-04-15', sourceFile: '샘플_철근_슬라브_3F.pdf',
    location: 'B1층 전체', trade: '철근', workers: ['철근공 5명'], equipment: ['타워크레인 1대'], requiredCount: 5, status: '확정' },
  { id: 113, name: 'A-2 구간 파일 거제', start: '2026-04-10', end: '2026-04-18', actualStart: '2026-04-12', actualEnd: '2026-04-20', sourceFile: '샘플_A2단지_파일계획.xlsx',
    location: 'A-2 구역', trade: '골조', workers: ['파일공 3명'], equipment: ['파일드라이버 1대'], requiredCount: 3, status: '진행 중' },
  { id: 114, name: '지하 방수 공', start: '2026-04-12', end: '2026-04-24', actualStart: '2026-04-14', actualEnd: '2026-04-26', sourceFile: '샘플_지하방수_시공계획.pdf',
    location: 'B3층 외벽', trade: '방수', workers: ['방수공 3명', '보통인부 2명'], equipment: [], requiredCount: 5, status: '진행 중' },
  { id: 115, name: 'Joint Pipe EV PIT', start: '2026-04-15', end: '2026-04-25', actualStart: '2026-04-16', actualEnd: '2026-04-27', sourceFile: '샘플_EV_PIT_논문.pdf',
    location: 'EV PIT', trade: '설비', workers: ['배관공 2명'], equipment: [], requiredCount: 2, status: '진행 중' },
  { id: 116, name: '톤넛 내 배관 시공', start: '2026-04-18', end: '2026-04-30', actualStart: '2026-04-19', actualEnd: null, sourceFile: '톤넛_배관시공계획.pdf',
    location: '톤넛 구간', trade: '설비', workers: ['배관공 3명'], equipment: [], requiredCount: 3, status: '진행 중' },
  { id: 117, name: '전기 라이저 베이스 및 동선', start: '2026-04-16', end: '2026-04-26', actualStart: '2026-04-18', actualEnd: '2026-04-28', sourceFile: '샘플_전기_라이저_설선.csv',
    location: 'EPS 1~5층', trade: '전기', workers: ['전기공 3명'], equipment: [], requiredCount: 3, status: '진행 중' },
  { id: 118, name: '본동 3층 슬라브 철근 박·고정', start: '2026-04-20', end: '2026-04-30', actualStart: '2026-04-22', actualEnd: null, sourceFile: '샘플_철근_슬라브_3F.pdf',
    location: '본동 3층', trade: '철근', workers: ['철근공 6명'], equipment: ['타워크레인 1대'], requiredCount: 6, status: '진행 중' },

  // ── 4월 말 ~ 5월 초 ────────────────────
  { id: 1, name: 'B1층 슬라브 형틀 조립', start: '2026-04-28', end: '2026-05-02', actualStart: '2026-04-28', actualEnd: null, sourceFile: '4월5주_작업계획서.pdf',
    location: 'B1층 전체', trade: '형틀', workers: ['목수 4명'], equipment: ['타워크레인 1대'], requiredCount: 6, status: '진행 중' },
  { id: 2, name: 'B2층 전기 배관 설치', start: '2026-04-28', end: '2026-04-30', actualStart: '2026-04-28', actualEnd: '2026-04-30', sourceFile: '4월5주_작업계획서.pdf',
    location: 'B2층 전기실', trade: '전기', workers: ['전기공 3명'], equipment: [], requiredCount: 3, status: '확정' },
  { id: 3, name: '지하주차장 방수 공사 (1구간)', start: '2026-04-29', end: '2026-05-03', actualStart: '2026-04-29', actualEnd: null, sourceFile: '4월5주_작업계획서.pdf',
    location: 'B3층 주차구역 A', trade: '방수', workers: ['방수공 2명', '보통인부 2명'], equipment: [], requiredCount: 4, status: '진행 중' },
  { id: 4, name: '1층 외벽 거푸집 설치', start: '2026-04-30', end: '2026-05-05', actualStart: null, actualEnd: null, sourceFile: '4월5주_작업계획서.pdf',
    location: '1층 외벽', trade: '형틀', workers: ['목수 5명', '보통인부 3명'], equipment: ['고소작업차 1대'], requiredCount: 8, status: '검토 중' },
  { id: 5, name: '급배수 수직 배관 (B1~1F)', start: '2026-05-01', end: '2026-05-06', actualStart: null, actualEnd: null, sourceFile: '5월1주_설비계획.xlsx',
    location: 'PS 구역', trade: '설비', workers: ['배관공 3명'], equipment: [], requiredCount: 3, status: '계획' },
  { id: 6, name: '철근 조립 — 1층 기둥', start: '2026-05-02', end: '2026-05-07', actualStart: null, actualEnd: null, sourceFile: '5월1주_철근계획.pdf',
    location: '1층 기둥', trade: '철근', workers: ['철근공 4명'], equipment: [], requiredCount: 4, status: '확정' },

  // ── 5월 ─────────────────────────────────
  { id: 119, name: '1층 콘크리트 타설', start: '2026-05-08', end: '2026-05-10', actualStart: null, actualEnd: null, sourceFile: '5월2주_타설계획.pdf',
    location: '1층 전체', trade: '골조', workers: ['콘크리트공 5명', '목수 4명'], equipment: ['콘크리트 펌프카 1대'], requiredCount: 9, status: '확정' },
  { id: 120, name: '2층 거푸집 설치', start: '2026-05-11', end: '2026-05-18', actualStart: null, actualEnd: null, sourceFile: '5월2주_형틀계획.pdf',
    location: '2층 전체', trade: '형틀', workers: ['목수 6명'], equipment: ['타워크레인 1대'], requiredCount: 6, status: '계획' },
  { id: 121, name: 'B3 주차장 도장 시공', start: '2026-05-12', end: '2026-05-22', actualStart: null, actualEnd: null, sourceFile: '주차장_도장계획.pdf',
    location: 'B3층 전체', trade: '방수', workers: ['도장공 3명'], equipment: [], requiredCount: 3, status: '계획' },
  { id: 122, name: '2층 철근 조립', start: '2026-05-15', end: '2026-05-22', actualStart: null, actualEnd: null, sourceFile: '5월3주_철근계획.pdf',
    location: '2층 기둥/보', trade: '철근', workers: ['철근공 5명'], equipment: ['타워크레인 1대'], requiredCount: 5, status: '계획' },
  { id: 123, name: '4~6층 외벽 커튼월 2차', start: '2026-05-18', end: '2026-06-05', actualStart: null, actualEnd: null, sourceFile: '커튼월_시공계획_5월.pdf',
    location: '4~6층 외벽', trade: '방수', workers: ['커튼월공 4명'], equipment: ['고소작업차 2대'], requiredCount: 4, status: '검토 중' },
  { id: 124, name: 'B1~1F 전기 분전반 설치', start: '2026-05-20', end: '2026-05-30', actualStart: null, actualEnd: null, sourceFile: '전기_분전반_설치계획.xlsx',
    location: 'EPS실', trade: '전기', workers: ['전기공 3명'], equipment: [], requiredCount: 3, status: '계획' },
  { id: 125, name: '2층 콘크리트 타설', start: '2026-05-25', end: '2026-05-27', actualStart: null, actualEnd: null, sourceFile: '5월4주_타설계획.pdf',
    location: '2층 전체', trade: '골조', workers: ['콘크리트공 5명', '목수 4명'], equipment: ['콘크리트 펌프카 1대'], requiredCount: 9, status: '확정' },
  { id: 126, name: '소방 배관 시공 (B3~1F)', start: '2026-05-25', end: '2026-06-12', actualStart: null, actualEnd: null, sourceFile: '소방_배관계획.pdf',
    location: '전 층 PS', trade: '설비', workers: ['배관공 3명', '용접공 1명'], equipment: [], requiredCount: 4, status: '검토 중' },

  // ── 6월 ─────────────────────────────────
  { id: 127, name: '3층 거푸집 설치', start: '2026-06-01', end: '2026-06-08', actualStart: null, actualEnd: null, sourceFile: '6월1주_형틀계획.pdf',
    location: '3층 전체', trade: '형틀', workers: ['목수 6명'], equipment: ['타워크레인 1대'], requiredCount: 6, status: '계획' },
  { id: 128, name: '3층 철근 조립', start: '2026-06-05', end: '2026-06-12', actualStart: null, actualEnd: null, sourceFile: '6월1주_철근계획.pdf',
    location: '3층 기둥/보', trade: '철근', workers: ['철근공 5명'], equipment: ['타워크레인 1대'], requiredCount: 5, status: '계획' },
  { id: 129, name: 'B1층 마감 — 천장 경량철골', start: '2026-06-08', end: '2026-06-22', actualStart: null, actualEnd: null, sourceFile: 'B1층_마감계획.pdf',
    location: 'B1층 천장', trade: '형틀', workers: ['목수 4명'], equipment: [], requiredCount: 4, status: '계획' },
  { id: 130, name: '3층 콘크리트 타설', start: '2026-06-15', end: '2026-06-17', actualStart: null, actualEnd: null, sourceFile: '6월3주_타설계획.pdf',
    location: '3층 전체', trade: '골조', workers: ['콘크리트공 5명', '목수 4명'], equipment: ['콘크리트 펌프카 1대'], requiredCount: 9, status: '계획' },
  { id: 131, name: '7~9층 외벽 커튼월 3차', start: '2026-06-08', end: '2026-06-30', actualStart: null, actualEnd: null, sourceFile: '커튼월_시공계획_6월.pdf',
    location: '7~9층 외벽', trade: '방수', workers: ['커튼월공 4명'], equipment: ['고소작업차 2대'], requiredCount: 4, status: '계획' },
  { id: 132, name: '4층 거푸집 설치', start: '2026-06-20', end: '2026-06-28', actualStart: null, actualEnd: null, sourceFile: '6월4주_형틀계획.pdf',
    location: '4층 전체', trade: '형틀', workers: ['목수 6명'], equipment: ['타워크레인 1대'], requiredCount: 6, status: '계획' },

  // ── 7월 ─────────────────────────────────
  { id: 133, name: '4층 철근 조립', start: '2026-07-01', end: '2026-07-08', actualStart: null, actualEnd: null, sourceFile: '7월1주_철근계획.pdf',
    location: '4층 기둥/보', trade: '철근', workers: ['철근공 5명'], equipment: ['타워크레인 1대'], requiredCount: 5, status: '계획' },
  { id: 134, name: '4층 콘크리트 타설', start: '2026-07-10', end: '2026-07-12', actualStart: null, actualEnd: null, sourceFile: '7월2주_타설계획.pdf',
    location: '4층 전체', trade: '골조', workers: ['콘크리트공 5명', '목수 4명'], equipment: ['콘크리트 펌프카 1대'], requiredCount: 9, status: '계획' },
  { id: 135, name: '엘리베이터 본체 설치', start: '2026-07-06', end: '2026-07-25', actualStart: null, actualEnd: null, sourceFile: 'EV_본체설치_계획.pdf',
    location: '코어부', trade: '설비', workers: ['승강기공 4명'], equipment: ['타워크레인 1대'], requiredCount: 4, status: '검토 중' },
  { id: 136, name: '5층 거푸집 설치', start: '2026-07-15', end: '2026-07-22', actualStart: null, actualEnd: null, sourceFile: '7월3주_형틀계획.pdf',
    location: '5층 전체', trade: '형틀', workers: ['목수 6명'], equipment: ['타워크레인 1대'], requiredCount: 6, status: '계획' },
  { id: 137, name: 'B1~3F 마감 — 도장 1차', start: '2026-07-20', end: '2026-08-10', actualStart: null, actualEnd: null, sourceFile: '내부도장_1차계획.pdf',
    location: 'B1~3층 내부', trade: '방수', workers: ['도장공 4명'], equipment: [], requiredCount: 4, status: '계획' },
]

// ── 연간 작업 계획 ───────────────────────
// 연간 계획서에서 확정되는 큰 단위 공정. 연간 탭 전용 간트차트에 사용.
export const yearlyWorkPlans = [
  { id: 9001, name: '지하층 구조체 공사', start: '2026-01-05', end: '2026-03-31', actualStart: '2026-01-08', actualEnd: '2026-04-10', sourceFile: '2026_연간_작업계획서.pdf',
    location: 'B3~B1층', trade: '골조', workers: ['형틀공 12명', '철근공 10명', '콘크리트공 8명'], equipment: ['타워크레인 1대', '콘크리트 펌프카 1대'], requiredCount: 30, status: '확정' },
  { id: 9002, name: '지상 저층부 골조 공사', start: '2026-04-01', end: '2026-06-30', actualStart: '2026-04-03', actualEnd: null, sourceFile: '2026_연간_작업계획서.pdf',
    location: '1~5층', trade: '골조', workers: ['형틀공 14명', '철근공 12명', '콘크리트공 8명'], equipment: ['타워크레인 1대', '콘크리트 펌프카 1대'], requiredCount: 34, status: '진행 중' },
  { id: 9003, name: '지상 고층부 골조 공사', start: '2026-07-01', end: '2026-09-30', actualStart: null, actualEnd: null, sourceFile: '2026_연간_작업계획서.pdf',
    location: '6~15층', trade: '골조', workers: ['형틀공 14명', '철근공 12명', '콘크리트공 8명'], equipment: ['타워크레인 1대'], requiredCount: 34, status: '계획' },
  { id: 9004, name: '외장 및 창호 공사', start: '2026-05-15', end: '2026-10-31', actualStart: null, actualEnd: null, sourceFile: '2026_연간_작업계획서.pdf',
    location: '전면 외벽', trade: '방수', workers: ['커튼월공 8명', '실링공 4명'], equipment: ['고소작업차 2대'], requiredCount: 12, status: '계획' },
  { id: 9005, name: '기계/전기 간선 공사', start: '2026-04-15', end: '2026-11-15', actualStart: '2026-04-20', actualEnd: null, sourceFile: '2026_연간_작업계획서.pdf',
    location: '전 층 EPS/PS', trade: '설비', workers: ['배관공 6명', '전기공 6명'], equipment: [], requiredCount: 12, status: '진행 중' },
  { id: 9006, name: '내부 마감 공사', start: '2026-08-01', end: '2026-12-15', actualStart: null, actualEnd: null, sourceFile: '2026_연간_작업계획서.pdf',
    location: 'B1~15층', trade: '형틀', workers: ['목수 8명', '도장공 6명', '타일공 4명'], equipment: [], requiredCount: 18, status: '계획' },
  { id: 9007, name: '준공 검사 및 인수인계', start: '2026-12-01', end: '2026-12-31', actualStart: null, actualEnd: null, sourceFile: '2026_연간_작업계획서.pdf',
    location: '전체 구역', trade: '골조', workers: ['검측 담당 3명', '협력사 담당 5명'], equipment: [], requiredCount: 8, status: '계획' },
]

// ── 작업 지시 (오늘) ─────────────────────
export const todayInstructions = [
  { id: 1, name: 'B1층 슬라브 형틀 조립', location: 'B1층 전체', assignedCount: 5, requiredEquip: '타워크레인 1대', workHours: '07:00~17:00', caution: '고소 작업 시 안전벨트 착용 필수. 크레인 신호수 배치 확인.', status: '진행 중' },
  { id: 2, name: 'B2층 전기 배관 설치',   location: 'B2층 전기실', assignedCount: 3, requiredEquip: '-', workHours: '08:00~17:00', caution: '활선 주의. 접지 확인 후 작업 시작.', status: '대기' },
  { id: 3, name: '지하주차장 방수 1구간', location: 'B3층 주차구역 A', assignedCount: 4, requiredEquip: '-', workHours: '07:30~16:30', caution: '방수재 취급 시 환기 유지. 유증기 주의.', status: '진행 중' },
]

// ── 작업 실적 ────────────────────────────
export const workResults = [
  { id: 1, name: 'B1층 슬라브 형틀 조립',      plannedProgress: 20, actualProgress: 15, plannedWorkers: 6, actualWorkers: 5, workStatus: '일부 완료', incompleteReason: '인력 부족', note: '목수 1명 조기 귀가. 내일 보완 예정.' },
  { id: 2, name: 'B2층 전기 배관 설치',         plannedProgress: 40, actualProgress: 40, plannedWorkers: 3, actualWorkers: 3, workStatus: '완료',     incompleteReason: '',     note: '예정대로 완료.' },
  { id: 3, name: '지하주차장 방수 공사 (1구간)', plannedProgress: 30, actualProgress: 10, plannedWorkers: 4, actualWorkers: 4, workStatus: '미완료',   incompleteReason: '자재 지연', note: '방수재 입고 지연으로 내일 재개.' },
]

export const workStatusOptions = ['완료', '일부 완료', '미완료', '작업 중지']
export const incompleteReasonOptions = ['인력 부족', '자재 지연', '장비 문제', '날씨 영향', '선행 공정 지연', '기타']

// ── 공정 분석 ────────────────────────────
export const analysisKpi = {
  delayRiskCount: 4,
  cpImpactCount: 2,
  avgProgressDiff: -8.3,
  expectedDelayDays: 12,
}

// 지연 위험 작업 — workPlanId 로 workPlans와 연결됨
// originalEnd / suggestedAddDays : "일정 연장" 승인 시 사용되는 정보
export const delayRiskTasks = [
  { id: 1, workPlanId: 1, name: 'B1층 슬라브 형틀 조립',
    plannedPct: 20, actualPct: 15, diff: -5,  plannedWorkers: 6, actualWorkers: 5,
    expectedDelayDays: 3, suggestedAddDays: 3, originalEnd: '2026-05-02',
    risk: '중', isCritical: true },
  { id: 2, workPlanId: 3, name: '지하주차장 방수 공사 (1구간)',
    plannedPct: 30, actualPct: 10, diff: -20, plannedWorkers: 4, actualWorkers: 4,
    expectedDelayDays: 7, suggestedAddDays: 7, originalEnd: '2026-05-03',
    risk: '고', isCritical: false },
  { id: 3, workPlanId: 4, name: '1층 외벽 거푸집 설치',
    plannedPct: 10, actualPct: 0,  diff: -10, plannedWorkers: 8, actualWorkers: 0,
    expectedDelayDays: 5, suggestedAddDays: 5, originalEnd: '2026-05-05',
    risk: '고', isCritical: true },
  { id: 4, workPlanId: 5, name: '급배수 수직 배관 (B1~1F)',
    plannedPct: 15, actualPct: 10, diff: -5,  plannedWorkers: 3, actualWorkers: 3,
    expectedDelayDays: 2, suggestedAddDays: 2, originalEnd: '2026-05-06',
    risk: '저', isCritical: false },
]

export const aiRecommendations = {
  1: {
    summary: '형틀 목수 인력 부족으로 일정 지연 위험. CP 상 후속 공정(철근 조립) 3일 영향 예상.',
    affectedTasks: ['철근 조립 — 1층 기둥', '1층 콘크리트 타설'],
    recommendation: '목수 2명 추가 투입 (내일~모레) 또는 작업 시간 1시간 연장(07:00~18:00) 권고.',
    workerSuggestion: '김철수 (목수), 이영희 (목수) — 현재 대기 중',
    status: 'pending',
  },
  2: {
    summary: '방수재 자재 지연으로 진척률 -20%. 완료 예정일 2026-05-10 → 2026-05-17 재산정.',
    affectedTasks: ['지하주차장 바닥 마감', '기계실 설비 설치'],
    recommendation: '대체 방수재 긴급 발주 또는 타 구간(B구역) 선행 작업으로 순서 변경 검토.',
    workerSuggestion: '현 인원 유지. 자재 확보 후 잔업 투입 권고.',
    status: 'pending',
  },
  3: {
    summary: '1층 외벽 거푸집 미착수. CP 공정으로 전체 일정 5일 지연 영향.',
    affectedTasks: ['1층 외벽 콘크리트', '2층 골조 시작'],
    recommendation: '내일 즉시 착수. 목수 5명 + 보통인부 3명 전원 07:00 집결 지시 필요.',
    workerSuggestion: '박반장 (목수 반장), 보통인부 3명 배치 가능.',
    status: 'pending',
  },
  4: {
    summary: '배관공 1명 자재 누락으로 진척률 -5%. 일정 2일 지연 예상.',
    affectedTasks: ['1층 PS 마감'],
    recommendation: '자재 보충 후 야간 잔업 1일 또는 일정 2일 연장 검토.',
    workerSuggestion: '서기술 (배관공) 잔업 가능.',
    status: 'pending',
  },
}

// ── 작업자 관리 ──────────────────────────
export const workers = [
  { id: 1, name: '김철수', company: '태양건설',   trade: '목수',  certifications: ['산업안전보건교육', '목공 기능사'], availableFrom: '2026-04-28', availableTrades: ['형틀', '골조'], deployStatus: '투입 가능' },
  { id: 2, name: '이영희', company: '우주산업',   trade: '철근공', certifications: ['철근 기능사', '비계 특별교육'], availableFrom: '2026-04-29', availableTrades: ['철근', '골조'], deployStatus: '배치 중' },
  { id: 3, name: '박민수', company: '한강인력',   trade: '보통인부', certifications: ['기초안전보건교육'], availableFrom: '2026-04-28', availableTrades: ['토목', '마감'], deployStatus: '투입 가능' },
  { id: 4, name: '정대리', company: '본사 직영', trade: '전기공', certifications: ['전기 기능사', '산업안전보건교육'], availableFrom: '2026-04-28', availableTrades: ['전기'], deployStatus: '투입 가능' },
  { id: 5, name: '최작업', company: '태양건설',   trade: '목수',  certifications: ['목공 기능사'], availableFrom: '2026-05-01', availableTrades: ['형틀'], deployStatus: '투입 불가' },
  { id: 6, name: '한현장', company: '청월건설',   trade: '방수공', certifications: ['방수 기능사', '기초안전보건교육'], availableFrom: '2026-04-28', availableTrades: ['방수', '마감'], deployStatus: '배치 중' },
  { id: 7, name: '서기술', company: '본사 직영', trade: '배관공', certifications: ['배관 기능사'], availableFrom: '2026-04-30', availableTrades: ['설비'], deployStatus: '투입 가능' },
  { id: 8, name: '오반장', company: '우주산업',   trade: '철근공', certifications: ['철근 기능사', '크레인 신호수'], availableFrom: '2026-04-28', availableTrades: ['철근', '골조'], deployStatus: '투입 가능' },
]

// ── 인력 배치 ────────────────────────────
export const allocationPlans = [
  { id: 1, name: 'B1층 슬라브 형틀 조립', requiredTrade: '목수', requiredCount: 6, assignedCount: 4, assignedWorkers: [1, 5], shortage: 2 },
  { id: 2, name: 'B2층 전기 배관 설치',   requiredTrade: '전기공', requiredCount: 3, assignedCount: 3, assignedWorkers: [4], shortage: 0 },
  { id: 3, name: '철근 조립 — 1층 기둥', requiredTrade: '철근공', requiredCount: 4, assignedCount: 2, assignedWorkers: [2, 8], shortage: 2 },
]

// ── 기상 관제 ────────────────────────────
export const todayWeather = {
  date: '2026-04-28',
  condition: '구름 많음',
  temp: 18,
  tempMin: 12,
  tempMax: 22,
  windSpeed: 8.4,
  windDir: '북서',
  humidity: 65,
  precipitation: 0,
  riskLevel: '주의',
  riskMessage: '오후 돌풍 예보 (순간 12m/s). 고소 작업 시간 단축 권고.',
}

export const weeklyForecast = [
  { day: '오늘',  date: '4/28', condition: '구름', temp: '12~22', wind: 8.4, precip: 0,   risk: '주의' },
  { day: '내일',  date: '4/29', condition: '비',   temp: '11~17', wind: 6.2, precip: 12,  risk: '경고' },
  { day: '모레',  date: '4/30', condition: '흐림', temp: '13~19', wind: 4.1, precip: 3,   risk: '보통' },
  { day: '목요일', date: '5/1',  condition: '맑음', temp: '15~24', wind: 3.2, precip: 0,   risk: '양호' },
  { day: '금요일', date: '5/2',  condition: '맑음', temp: '16~25', wind: 2.8, precip: 0,   risk: '양호' },
  { day: '토요일', date: '5/3',  condition: '흐림', temp: '14~21', wind: 5.0, precip: 1,   risk: '보통' },
  { day: '일요일', date: '5/4',  condition: '맑음', temp: '15~23', wind: 3.0, precip: 0,   risk: '양호' },
]

export const weatherAlerts = [
  { id: 1, type: '강풍', level: '주의', message: '오후 2시~6시 순간 풍속 12m/s 예보 — 타워크레인 작업 중단 검토', affectedTasks: ['B1층 슬라브 형틀 조립', '1층 외벽 거푸집 설치'] },
  { id: 2, type: '강수', level: '경고', message: '내일 오전 강수량 12mm 예상 — 철근 용접 작업 일정 조정 필요', affectedTasks: ['철근 조립 — 1층 기둥'] },
]

// ── 장비 입출차 ──────────────────────────
export const equipmentList = [
  { id: 1, name: '50톤 타워크레인', plate: '-',           entryTime: '상주',        exitTime: '-',      assignedWork: 'B1층 형틀 조립', status: '작업 중' },
  { id: 2, name: '25t 사다리차',    plate: '서울 12가 3456', entryTime: '07:20',    exitTime: '-',      assignedWork: 'B2층 자재 양중', status: '입차 완료' },
  { id: 3, name: '콘크리트 펌프카', plate: '경기 34나 7890', entryTime: '예정 없음', exitTime: '-',      assignedWork: '-',              status: '지연' },
  { id: 4, name: '5톤 덤프트럭',   plate: '인천 56다 1234', entryTime: '06:50',    exitTime: '14:30', assignedWork: '토사 반출',      status: '출차 완료' },
  { id: 5, name: '고소작업차 (15m)',plate: '서울 78라 5678', entryTime: '08:00',    exitTime: '-',      assignedWork: '외벽 거푸집',   status: '작업 중' },
]

export const equipmentStats = {
  total: 5,
  onSite: 3,
  completed: 1,
  delayed: 1,
}

// ── 업로드 문서 ──────────────────────────
export const uploadedDocs = [
  { id: 1, name: '기준 공정표 v1.0.xlsx',       type: '공정표',    uploadedAt: '2026-04-01 09:12', uploadedBy: '박현수',  aiAnalyzed: true,  reflectStatus: '반영 완료' },
  { id: 2, name: '4월 5주차 작업계획서.pdf',    type: '작업계획서', uploadedAt: '2026-04-25 14:30', uploadedBy: '김지훈',  aiAnalyzed: true,  reflectStatus: '검토 중' },
  { id: 3, name: '작업일보_20260427.pdf',       type: '작업일보',   uploadedAt: '2026-04-27 18:05', uploadedBy: '이민아',  aiAnalyzed: true,  reflectStatus: '반영 완료' },
  { id: 4, name: '공사일보_20260427.pdf',       type: '공사일보',   uploadedAt: '2026-04-27 18:22', uploadedBy: '이민아',  aiAnalyzed: false, reflectStatus: '미반영' },
  { id: 5, name: '기상 위험 보고서_4월.docx',   type: '기타',       uploadedAt: '2026-04-20 11:00', uploadedBy: '박현수',  aiAnalyzed: false, reflectStatus: '미반영' },
  { id: 6, name: '철근 납품 지연 확인서.pdf',   type: '기타',       uploadedAt: '2026-04-26 10:15', uploadedBy: '최관리',  aiAnalyzed: true,  reflectStatus: '반영 완료' },
]

// ── AI 분석 이력 ─────────────────────────
export const aiHistory = [
  {
    id: 1, analyzedAt: '2026-04-25 15:03', docName: '4월 5주차 작업계획서.pdf',
    analysisType: '작업 계획 추출', extractedCount: 6, confidence: 91,
    reviewStatus: '검토 완료', isReflected: true,
    extractedItems: [
      { item: 'B1층 슬라브 형틀 조립', value: '2026-04-28 ~ 2026-05-02', adminNote: '일정 이상 없음' },
      { item: 'B2층 전기 배관 설치',   value: '2026-04-28 ~ 2026-04-30', adminNote: '-' },
      { item: '지하주차장 방수 1구간', value: '2026-04-29 ~ 2026-05-03', adminNote: '자재 지연으로 시작일 조정' },
    ],
  },
  {
    id: 2, analyzedAt: '2026-04-27 18:31', docName: '작업일보_20260427.pdf',
    analysisType: '실적 초안 생성', extractedCount: 3, confidence: 86,
    reviewStatus: '검토 중', isReflected: false,
    extractedItems: [
      { item: 'B1층 형틀 조립 실적', value: '진척 15%, 투입 5명', adminNote: '' },
      { item: '전기 배관 실적',     value: '진척 40%, 투입 3명', adminNote: '' },
      { item: '방수 공사 실적',     value: '진척 10%, 자재 지연', adminNote: '' },
    ],
  },
  {
    id: 3, analyzedAt: '2026-04-01 09:44', docName: '기준 공정표 v1.0.xlsx',
    analysisType: '공정표 파싱', extractedCount: 10, confidence: 95,
    reviewStatus: '검토 완료', isReflected: true,
    extractedItems: [
      { item: '터파기 및 흙막이', value: '2025-03-01 ~ 2025-04-15 (CP)', adminNote: '확정' },
      { item: '기초 콘크리트',   value: '2025-04-16 ~ 2025-05-31 (CP)', adminNote: '확정' },
    ],
  },
]
