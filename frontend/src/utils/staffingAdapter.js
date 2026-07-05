/** API ↔ 인력 배치 화면 모델 (STAFFING.md / StaffingDto) */

/** STAFFING_001 `SaveSummaryRes` — 배치 성공·잔여 미배치 수 */
export function normalizeSaveSummaryRes(raw) {
  if (!raw || typeof raw !== 'object') {
    return { assignedCount: 0, unassignedCount: 0 }
  }
  const assigned =
    typeof raw.assignedCount === 'number'
      ? raw.assignedCount
      : Number(raw.assigned_count) || 0
  const unassigned =
    typeof raw.unassignedCount === 'number'
      ? raw.unassignedCount
      : Number(raw.unassigned_count) || 0
  return { assignedCount: assigned, unassignedCount: unassigned }
}

export const TRADE_UI_TO_API = {
  carpenter: 'CARPENTER',
  rebar: 'REBAR',
  welder: 'WELDER',
  labor: 'TILE',
}

export const TRADE_API_TO_UI = {
  CARPENTER: 'carpenter',
  REBAR: 'rebar',
  WELDER: 'welder',
  TILE: 'labor',
}

function affiliationKindToUiString(kind, partnerCompany) {
  const k = String(kind ?? '').toUpperCase()
  const pc = String(partnerCompany ?? '').trim()
  if (k === 'DIRECT') return '본사 소속'
  if (k === 'AGENCY') return '인력사무소 (개인)'
  if (k === 'PARTNER') return pc ? `협력사 (${pc})` : '협력사'
  return pc ? `협력사 (${pc})` : '협력사'
}

export function inferSkillsFromAffiliationLine(line) {
  const s = String(line ?? '').toLowerCase()
  const skills = []
  if (s.includes('목공') || s.includes('목수') || s.includes('형틀')) skills.push('carpenter')
  if (s.includes('철근')) skills.push('rebar')
  if (s.includes('용접')) skills.push('welder')
  if (s.includes('타일')) skills.push('labor')
  if (s.includes('인부')) skills.push('labor')
  if (s.includes('보통공')) skills.push('labor')
  if (s.includes('토공')) skills.push('labor')
  if (s.includes('굴착')) skills.push('labor')
  if (s.includes('배수')) skills.push('labor')
  if (s.includes('정리')) skills.push('labor')
  if (s.includes('장비')) skills.push('labor')
  if (!skills.length) skills.push('labor')
  return [...new Set(skills)]
}

/** AssignedWorkerRes → 테이블/workerTagOk용 행 */
export function mapAssignedWorkerRes(apiRow) {
  const idx = apiRow.workerIdx
  const affiliation = affiliationKindToUiString(apiRow.affiliationKind, apiRow.partnerCompany)
  const score = typeof apiRow.fatigueScore === 'number' ? apiRow.fatigueScore : 0
  return {
    workerIdx: idx,
    id: String(idx),
    profileId: idx,
    name: apiRow.name ?? '',
    affiliation,
    affiliationLine: apiRow.affiliationLine ?? '',
    partnerCompanyDetail: apiRow.partnerCompanyDetail ?? '',
    employmentKind: apiRow.employmentKind,
    fatigueScore: score,
    fatigueHighRisk: apiRow.fatigueHighRisk === true || apiRow.fatigue_high_risk === true,
    fatiguePtAccident: apiRow.fatiguePtAccident ?? apiRow.fatigue_pt_accident,
    fatiguePtStreak: apiRow.fatiguePtStreak ?? apiRow.fatigue_pt_streak,
    fatiguePtOvernight: apiRow.fatiguePtOvernight ?? apiRow.fatigue_pt_overnight,
    fatiguePtTradeRisk: apiRow.fatiguePtTradeRisk ?? apiRow.fatigue_pt_trade_risk,
    fatigue: { nightShiftYesterday: false, consecutiveDays: 0 },
    workerTag: '작업자',
    attendanceTag: '출근',
    nationality: '내국인',
    skills: inferSkillsFromAffiliationLine(apiRow.affiliationLine),
  }
}

/** ZoneSubRes.tradeNeeds → 화면 tradeNeeds ({ trade: carpenter|…, need }) */
export function tradeNeedsFromZoneSubRes(rows) {
  if (!Array.isArray(rows)) return []
  return rows.map((tn) => ({
    trade: TRADE_API_TO_UI[tn.trade] ?? String(tn.trade ?? '').toLowerCase(),
    need: tn.need,
  }))
}

/** 구역 수정 PATCH 바디 (Trade enum 문자열) */
export function buildZoneUpdateBody(title, tradeRows) {
  const merged = {}
  for (const row of tradeRows || []) {
    const need = Math.max(0, Math.floor(Number(row.need) || 0))
    if (!row.trade || need <= 0) continue
    const apiTrade = TRADE_UI_TO_API[row.trade] ?? 'TILE'
    merged[apiTrade] = (merged[apiTrade] || 0) + need
  }
  const tradeNeeds = Object.entries(merged).map(([trade, need]) => ({ trade, need }))
  return { title: String(title ?? '').trim(), tradeNeeds }
}

/** WorkTrade label(공정) → 공종 카테고리 — 백엔드 zone.tradeName 과 계정 trade 매칭용 */
const STAFFING_TRADE_CATEGORY_MAP = {
  형틀: '골조공사',
  철근: '골조공사',
  골조: '골조공사',
  목공: '골조공사',
  목수: '골조공사',
  용접: '골조공사',
  미장: '마감공사',
  조적: '마감공사',
  도장: '마감공사',
  타일: '마감공사',
  건축마감: '마감공사',
  마감: '마감공사',
  마감공사: '마감공사',
  골조공사: '골조공사',
  전기: '전기공사',
  설비: '설비공사',
  방수: '방수공사',
  토공: '토공사',
  조경: '조경공사',
  포장: '포장공사',
}

export function resolveStaffingTradeCategory(raw) {
  const name = String(raw ?? '').trim()
  return STAFFING_TRADE_CATEGORY_MAP[name] ?? (name || '기타')
}

/** 백엔드 AuthAccessService.tradeMatches 와 동일한 느슨한 공종 매칭 */
export function tradeMatchesStaffing(recordTrade, assignedTrade) {
  const left = String(recordTrade ?? '').trim()
  const right = String(assignedTrade ?? '').trim()
  if (!right) return true
  if (!left) return false
  if (left === right || left.includes(right) || right.includes(left)) return true
  const leftCat = resolveStaffingTradeCategory(left)
  const rightCat = resolveStaffingTradeCategory(right)
  if (leftCat === '기타' || rightCat === '기타') return false
  return leftCat === rightCat || leftCat.includes(rightCat) || rightCat.includes(leftCat)
}

/** 계정 생성·수정 공종 드롭다운에서 제외할 라벨 (마일스톤 행 등) */
const EXCLUDED_ACCOUNT_TRADE_NAMES = new Set([
  '준공',
  '착공',
  '마일스톤',
  '주요 마일스톤',
  '주요마일스톤',
  '핵심 마일스톤',
  '핵심마일스톤',
])

export function sanitizeAccountTradeOptions(list) {
  return (Array.isArray(list) ? list : [])
    .map((s) => String(s ?? '').trim())
    .filter((t) => t && !EXCLUDED_ACCOUNT_TRADE_NAMES.has(t) && !t.includes('마일스톤'))
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .sort((a, b) => a.localeCompare(b, 'ko'))
}
