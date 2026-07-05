export function buildGroupProgress(visibleProcesses, inferRepresentativeTradeName) {
  const grouped = new Map()

  visibleProcesses.forEach((p) => {
    const tradeName = inferRepresentativeTradeName(p)
    if (!tradeName || tradeName === '기타') return

    if (!grouped.has(tradeName)) {
      grouped.set(tradeName, {
        id: `trade:${tradeName}`,
        tradeProcessIds: [],
        group: tradeName,
        planSum: 0,
        actualSum: 0,
        count: 0,
        started: false,
        hasDelayed: false,
        hasWarning: false,
        hasCompleted: false,
        partnerSet: new Set(),
        riskRank: 0,
        plannedEnd: '',
        forecastEnd: '',
      })
    }

    const g = grouped.get(tradeName)
    const plan = Math.max(0, Math.min(100, Number(p.plannedPct ?? 0)))
    const actual = Math.max(0, Math.min(100, Number(p.actualPct ?? 0)))

    g.tradeProcessIds.push(p.id)
    g.planSum += plan
    g.actualSum += actual
    g.count += 1
    g.started = g.started || actual > 0 || !!p.actualStart
    g.hasDelayed = g.hasDelayed || p.status === '지연' || p.status === '지연 위험'
    g.hasWarning = g.hasWarning || p.status === '주의'
    g.hasCompleted = g.hasCompleted || p.status === '완료'
    if (p.partner && p.partner !== '-') g.partnerSet.add(p.partner)
    g.plannedEnd =
      !g.plannedEnd || String(p.plannedEnd ?? '') > g.plannedEnd ? p.plannedEnd : g.plannedEnd
    g.forecastEnd =
      !g.forecastEnd || String(p.forecastEnd ?? '') > g.forecastEnd ? p.forecastEnd : g.forecastEnd

    const rank = p.risk === '매우 높음' ? 3 : p.risk === '높음' ? 2 : p.risk === '보통' ? 1 : 0
    g.riskRank = Math.max(g.riskRank, rank)
  })

  return Array.from(grouped.values()).map((g) => {
    const plan = g.count ? Math.round((g.planSum / g.count) * 10) / 10 : 0
    const actual = g.count ? Math.round((g.actualSum / g.count) * 10) / 10 : 0
    const diff = Math.round((actual - plan) * 10) / 10
    const statusLabel = !g.started
      ? '미착수'
      : g.hasDelayed
        ? '지연 위험'
        : diff < 0
          ? '주의'
          : '정상'

    return {
      id: g.id,
      tradeProcessIds: g.tradeProcessIds,
      group: g.group,
      plan,
      actual,
      diff,
      started: !!g.started,
      isDelayed: g.hasDelayed || diff <= -3,
      statusLabel,
      partner: g.partnerSet.size ? Array.from(g.partnerSet).join(', ') : '협력사 미지정',
      risk:
        g.riskRank === 3
          ? '매우 높음'
          : g.riskRank === 2
            ? '높음'
            : g.riskRank === 1
              ? '보통'
              : '낮음',
      plannedEnd: g.plannedEnd,
      forecastEnd: g.forecastEnd,
    }
  })
}

export function arcPath(percent) {
  const pct = Math.max(0, Math.min(100, percent))
  if (pct === 0) return ''
  const r = 36
  const cx = 50
  const cy = 50
  // 12시 방향에서 시작하여 시계방향
  const angle = (pct / 100) * 2 * Math.PI
  const endX = cx + r * Math.sin(angle)
  const endY = cy - r * Math.cos(angle)
  const largeArc = pct > 50 ? 1 : 0
  if (pct >= 100) {
    // 100%는 두 개의 호로 나눠 그림 (path가 닫혀버리지 않게)
    const midX = cx + r * Math.sin(Math.PI)
    const midY = cy - r * Math.cos(Math.PI)
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${midX} ${midY} A ${r} ${r} 0 1 1 ${cx} ${cy - r - 0.01}`
  }
  return `M ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`
}

// ─── KPI ─────────────────────────────────────────────────────────────────

export function buildScheduleKpi(visibleProcesses, visibleRequests) {
  const src = visibleProcesses
  const total = src.length || 1
  const delayCount = src.filter((p) => p.status === '지연').length
  const riskCount = src.filter((p) => p.status === '지연 위험').length
  const completeCount = src.filter((p) => p.status === '완료').length
  const avgPlanned = Math.round(src.reduce((a, p) => a + p.plannedPct, 0) / total)
  const avgActual = Math.round(src.reduce((a, p) => a + p.actualPct, 0) / total)
  const reqCount = visibleRequests.length
  const pendingCount = visibleRequests.filter((r) => r.status === 'pending').length
  return {
    delayCount,
    riskCount,
    completeCount,
    avgPlanned,
    avgActual,
    diff: avgPlanned - avgActual,
    reqCount,
    pendingCount,
    totalProcesses: src.length,
  }
}
