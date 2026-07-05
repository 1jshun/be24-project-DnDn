/**
 * STAFFING.md §9 피로도 — 화면 표시·프로필 정규화
 * 총점 상한 100, 고위험 기준 80
 */

export const FATIGUE_HIGH_RISK_THRESHOLD = 80

export const FATIGUE_BREAKDOWN_META = [
  {
    key: 'accident',
    label: '안전사고',
    desc: '기준일 포함 최근 30일 내 안전사고 기록이 있으면 최대 20점입니다.',
  },
  {
    key: 'streak',
    label: '연속 근무',
    desc:
      '기준일 포함 역방향으로 출근·지각이 이어진 캘린더 연속 일수에 따라 10~40점(여러 구간 중 가장 높은 한 구간만 적용)입니다.',
  },
  {
    key: 'overnight',
    label: '전날·근접 교대',
    desc: '전일 퇴근과 금일 출근 사이 휴게가 10시간 미만이면 30점입니다.',
  },
  {
    key: 'trade',
    label: '공종 위험도',
    desc: '직종별 가중으로 용접 20·목공 17·목수 16·형틀 15·철근 14·장비 12·굴착 10·토목 9·토공 8·배수 7·타일 6·마감·인부·보통공 5·정리 4점이며, 매칭 실패 시 5점입니다.',
  },
]

function num(x) {
  if (x == null || x === '') return 0
  const n = Number(x)
  return Number.isFinite(n) ? n : 0
}

/** 명단 행(worker 객체)에서 표시용 총점 */
export function fatigueTotalFromWorker(w) {
  if (!w || typeof w !== 'object') return 0
  if (typeof w.fatigueScore === 'number') {
    return Math.min(100, Math.max(0, Math.round(w.fatigueScore)))
  }
  const f = w.fatigue || {}
  let s = (f.consecutiveDays ?? 0) * 12
  if (f.nightShiftYesterday) s += 28
  return Math.min(100, Math.round(s))
}

export function fatigueIsHighRisk(score, worker) {
  if (worker?.fatigueHighRisk === true) return true
  return score >= FATIGUE_HIGH_RISK_THRESHOLD
}

/**
 * MANAGEMENT_004 프로필 원본 → 사이드바 표시용
 * @param {object} p API 프로필 루트 (중첩 fatigue 또는 플랫 fatigue* 필드 허용)
 */
export function normalizeFatigueFromProfileApi(p) {
  if (!p || typeof p !== 'object') return null

  const inner = p.fatigue != null && typeof p.fatigue === 'object' ? p.fatigue : {}

  const ptAccident = num(
    inner.ptAccident ??
      inner.fatiguePtAccident ??
      inner.fatigue_pt_accident ??
      p.fatiguePtAccident ??
      p.fatigue_pt_accident ??
      inner.accidentScore,
  )
  const ptStreak = num(
    inner.ptStreak ??
      inner.fatiguePtStreak ??
      p.fatiguePtStreak ??
      p.fatigue_pt_streak ??
      inner.streakScore,
  )
  const ptOvernight = num(
    inner.ptOvernight ??
      inner.fatiguePtOvernight ??
      p.fatiguePtOvernight ??
      p.fatigue_pt_overnight ??
      inner.overnightScore,
  )
  const ptTrade = num(
    inner.ptTradeRisk ??
      inner.fatiguePtTradeRisk ??
      p.fatiguePtTradeRisk ??
      p.fatigue_pt_trade_risk ??
      inner.tradeRiskScore,
  )

  let total = num(
    inner.totalScore ??
      inner.fatigueScoreTotal ??
      p.fatigueScoreTotal ??
      inner.score ??
      p.fatigueScore,
  )
  const sumParts = ptAccident + ptStreak + ptOvernight + ptTrade
  if (!(total > 0) && sumParts > 0) total = Math.min(100, sumParts)
  total = Math.min(100, Math.max(0, Math.round(total)))

  const highRisk =
    inner.highRisk === true ||
    inner.fatigueHighRisk === true ||
    p.fatigueHighRisk === true ||
    p.fatigue_high_risk === true ||
    total >= FATIGUE_HIGH_RISK_THRESHOLD

  const rawAt =
    inner.calculatedAt ??
    inner.fatigueCalculatedAt ??
    p.fatigueCalculatedAt
  let calculatedAtLabel = ''
  if (rawAt != null && rawAt !== '') {
    const s = String(rawAt)
    calculatedAtLabel = s.length >= 16 ? s.slice(0, 16).replace('T', ' ') : s
  }

  const breakdownRows = FATIGUE_BREAKDOWN_META.map((m) => {
    let points = 0
    if (m.key === 'accident') points = ptAccident
    else if (m.key === 'streak') points = ptStreak
    else if (m.key === 'overnight') points = ptOvernight
    else if (m.key === 'trade') points = ptTrade
    return {
      key: m.key,
      label: m.label,
      points,
      desc: m.desc,
    }
  })

  return {
    total,
    highRisk,
    breakdownRows,
    calculatedAtLabel,
  }
}

/** 구역·현황 표 셀용 title (항목 점수가 있으면 요약) */
export function fatigueTooltipForWorker(w) {
  const score = fatigueTotalFromWorker(w)
  const pa = num(w?.fatiguePtAccident ?? w?.fatigue_pt_accident)
  const ps = num(w?.fatiguePtStreak ?? w?.fatigue_pt_streak)
  const po = num(w?.fatiguePtOvernight ?? w?.fatigue_pt_overnight)
  const pt = num(w?.fatiguePtTradeRisk ?? w?.fatigue_pt_trade_risk)
  const bits = []
  if (pa > 0) bits.push(`안전사고 ${pa}`)
  if (ps > 0) bits.push(`연속근무 ${ps}`)
  if (po > 0) bits.push(`교대간격 ${po}`)
  if (pt > 0) bits.push(`공종 ${pt}`)
  const base = `피로도 ${score}점 (상한 100). 고위험 ${FATIGUE_HIGH_RISK_THRESHOLD}점 이상.`
  if (!bits.length) {
    return `${base} 항목별 점수는 프로필 조회 시 갱신된 스냅샷에 포함될 수 있습니다.`
  }
  return `${base} 반영: ${bits.join(', ')}.`
}
