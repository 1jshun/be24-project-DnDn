import { computed, ref, watch } from 'vue'
import { planStore } from '@/data/planStore'
import {
  GANTT_DAY_W,
  GANTT_MONTH_W,
  formatDateLocal,
  isHolidayDate,
  isMonthlyProcessInProgress,
  isWorkPlanGroupInProgress,
  workPlanStatus,
} from '@/utils/schedule/workPlan.js'
import { tradeMatches } from '@/utils/authScope'

export function useWorkPlanGantt({
  baselinePlans,
  monthlyPlans,
  annualPlans,
  filterTrade,
  filterStatus,
  viewMode,
  selectedPlan,
  effectiveEnd,
}) {
  // =========================
  const today = new Date()
  const viewYear = ref(today.getFullYear())
  const viewMonth = ref(today.getMonth() + 1)

  function prevYear() {
    viewYear.value -= 1
  }
  function nextYear() {
    viewYear.value += 1
  }

  function prevMonth() {
    if (viewMonth.value === 1) {
      viewMonth.value = 12
      viewYear.value -= 1
    } else viewMonth.value -= 1
  }
  function nextMonth() {
    if (viewMonth.value === 12) {
      viewMonth.value = 1
      viewYear.value += 1
    } else viewMonth.value += 1
  }
  function goToday() {
    const t = new Date()
    viewYear.value = t.getFullYear()
    viewMonth.value = t.getMonth() + 1
  }

  const monthMeta = computed(() => {
    const y = viewYear.value
    const m = viewMonth.value - 1
    const last = new Date(y, m + 1, 0)
    const today = new Date()
    const days = []
    for (let d = 1; d <= last.getDate(); d++) {
      const dt = new Date(y, m, d)
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dow = dt.getDay()
      days.push({
        day: d,
        date: dateStr,
        dow,
        isHoliday: isHolidayDate(dateStr),
        isSunday: dow === 0,
        isSaturday: dow === 6,
        isWeekend: dow === 0 || dow === 6,
        isToday: dt.toDateString() === today.toDateString(),
      })
    }
    return {
      year: y,
      month: m + 1,
      daysInMonth: last.getDate(),
      days,
      firstDate: `${y}-${String(m + 1).padStart(2, '0')}-01`,
      lastDate: `${y}-${String(m + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`,
    }
  })

  const isCurrentMonth = computed(() => {
    const t = new Date()
    return viewYear.value === t.getFullYear() && viewMonth.value === t.getMonth() + 1
  })

  const isCurrentYear = computed(() => {
    const t = new Date()
    return viewYear.value === t.getFullYear()
  })

  // 이번 달과 겹치는 작업 (연장된 종료일까지 고려)
  const monthlyGanttSource = computed(() => {
    let r = [...baselinePlans.value, ...monthlyPlans.value]

    if (filterStatus.value) {
      r = r.filter((p) => workPlanStatus(p) === filterStatus.value)
    }

    return r
  })

  const yearlyGanttSource = computed(() => {
    let r = [...baselinePlans.value, ...annualPlans.value]

    if (filterStatus.value) {
      r = r.filter((p) => workPlanStatus(p) === filterStatus.value)
    }

    return r
  })

  const ganttPlans = computed(() => {
    const { firstDate, lastDate } = monthMeta.value

    return monthlyGanttSource.value.filter(
      (p) => !(effectiveEnd(p) < firstDate || p.start > lastDate),
    )
  })

  const yearlyPlans = computed(() => {
    const { firstDate, lastDate } = yearMeta.value

    return yearlyGanttSource.value.filter(
      (p) => !(effectiveEnd(p) < firstDate || p.start > lastDate),
    )
  })

  const yearMeta = computed(() => {
    const y = viewYear.value
    return {
      year: y,
      months: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        label: `${i + 1}월`,
        firstDate: `${y}-${String(i + 1).padStart(2, '0')}-01`,
        lastDate: `${y}-${String(i + 1).padStart(2, '0')}-${String(new Date(y, i + 1, 0).getDate()).padStart(2, '0')}`,
        isCurrent: y === today.getFullYear() && i === today.getMonth(),
      })),
      firstDate: `${y}-01-01`,
      lastDate: `${y}-12-31`,
    }
  })

  // 막대 위치/너비 계산 — 이번 달 영역 내로 클리핑
  function barStyle(startStr, endStr) {
    if (!startStr || !endStr) return null
    const { firstDate, lastDate, daysInMonth } = monthMeta.value
    if (endStr < firstDate || startStr > lastDate) return null
    const s = startStr < firstDate ? firstDate : startStr
    const e = endStr > lastDate ? lastDate : endStr
    const sd = Number(s.slice(8, 10))
    const ed = Number(e.slice(8, 10))
    const span = Math.max(1, ed - sd + 1)
    const leftPct = ((sd - 1) / daysInMonth) * 100
    const widthPct = (span / daysInMonth) * 100
    return {
      left: `${leftPct}%`,
      width: `${Math.max(0.2, widthPct)}%`,
    }
  }

  function monthCellCenterStyle(dateStr) {
    if (!dateStr) return null
    const { firstDate, lastDate, daysInMonth } = monthMeta.value
    if (dateStr < firstDate || dateStr > lastDate) return null
    const day = Number(dateStr.slice(8, 10))
    return { left: `${((day - 0.5) / daysInMonth) * 100}%` }
  }

  function yearBarStyle(startStr, endStr) {
    if (!startStr || !endStr) return null
    const { firstDate, lastDate, year } = yearMeta.value
    if (endStr < firstDate || startStr > lastDate) return null
    const s = startStr < firstDate ? firstDate : startStr
    const e = endStr > lastDate ? lastDate : endStr
    const sm = Number(s.slice(5, 7))
    const em = Number(e.slice(5, 7))
    const startDay = Number(s.slice(8, 10))
    const endDay = Number(e.slice(8, 10))
    const startMonthDays = new Date(year, sm, 0).getDate()
    const endMonthDays = new Date(year, em, 0).getDate()
    const leftMonthOffset = (startDay - 1) / startMonthDays
    const rightMonthOffset = endDay / endMonthDays
    const leftPct = (((sm - 1) + leftMonthOffset) / 12) * 100
    const rightPct = (((em - 1) + rightMonthOffset) / 12) * 100
    return {
      left: `${leftPct}%`,
      width: `${Math.max(0.2, rightPct - leftPct)}%`,
    }
  }

  function actualLineRange(p) {
    return {
      start: p.actualStart || p.start,
      end: effectiveEnd(p),
    }
  }

  function progressFillEnd(p) {
    const range = actualLineRange(p)
    const t = formatDateLocal(new Date())
    if (t < range.start) return null
    return t > range.end ? range.end : t
  }

  function progressPctOf(p) {
    const raw = p?.raw || p || {}
    const value =
      raw.actualPct ??
      raw.progressPct ??
      raw.progress ??
      raw.processProgress ??
      raw.actualProgress ??
      p?.actualPct ??
      p?.progressPct ??
      p?.progress ??
      p?.processProgress ??
      p?.actualProgress
    const n = Number(value)
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null
  }

  function progressBarStyle(p, styleFn) {
    const full = styleFn(p.start, p.end)
    if (!full) return { width: '0px' }

    const fillEnd = progressFillEnd(p)
    if (!fillEnd) return { width: '0px' }

    const fill = styleFn(p.start, fillEnd)
    if (!fill) return { width: '0px' }

    const fullLeft = parseFloat(full.left)
    const fullWidth = parseFloat(full.width)
    const fillLeft = parseFloat(fill.left)
    const fillWidth = parseFloat(fill.width)
    const width = Math.max(0, Math.min(fullWidth, fillLeft + fillWidth - fullLeft))
    const pct = fullWidth > 0 ? (width / fullWidth) * 100 : 0

    return { width: `${Math.max(0, Math.min(100, pct))}%` }
  }

  function progressDotStyle(p, styleFn) {
    const widthValue = progressBarStyle(p, styleFn).width
    const width = parseFloat(widthValue)

    if (!Number.isFinite(width) || width <= 0) return { display: 'none' }
    return { left: `calc(${Math.max(0, Math.min(100, width))}% - 4px)` }
  }

  // 오늘 라인
  const todayLineStyle = computed(() => {
    const t = new Date()
    const { year, month, daysInMonth } = monthMeta.value
    if (t.getFullYear() !== year || t.getMonth() + 1 !== month) return null
    return { left: `${((t.getDate() - 0.5) / daysInMonth) * 100}%` }
  })

  const chartWidth = computed(() => `max(100%, ${monthMeta.value.daysInMonth * GANTT_DAY_W}px)`)
  const yearChartWidth = computed(() => `${12 * GANTT_MONTH_W}px`)

  // 화면 상단/필터 바 — 활성 연장 개수
  const extensionCount = computed(() => Object.keys(planStore.extensions).length)

  function selectViewMode(mode) {
    viewMode.value = mode
    selectedPlan.value = null
  }

  // =========================
  // 공종 → 공정 → 위치별 실행계획 (3단 그룹핑)
  // =========================
  // trade_process / work_plan 양쪽 응답 형태가 다양할 수 있어
  // 가능한 필드명을 모두 폴백으로 처리한다.
  function baseId(b) {
    return b.tradeProcessId ?? b.idx ?? b.id ?? null
  }
  function baseTradeName(b) {
    return b.tradeName ?? b.trade ?? '미분류'
  }
  function baseProcessName(b) {
    return b.processName ?? b.name ?? '(공정명 없음)'
  }
  function baseStart(b) {
    return b.plannedStart ?? b.baselineStart ?? b.start ?? null
  }
  function baseEnd(b) {
    return b.plannedEnd ?? b.baselineEnd ?? b.end ?? null
  }
  function baseWeight(b) {
    return b.weightPct ?? b.weight ?? null
  }
  function baseIsMilestone(b) {
    return b.isMilestone ?? b.milestone ?? false
  }
  function workPlanTradeProcessId(w) {
    return w.tradeProcessId ?? w.trade_process_id ?? w.baseId ?? null
  }

  // 공종 그룹핑 공통 함수
  // plans: work_plan 목록 (annual 또는 monthly)
  // returns: [{ group, items: [{ ...baseline, workPlans: [...] }] }]
  function buildGroups(plans) {
    // 공종 → 공정 맵 구성 (baselinePlans 기준)
    const tradeMap = new Map()

    for (const b of baselinePlans.value) {
      // 마일스톤은 연간 계획 행으로 보여주면 안 됨
      if (baseIsMilestone(b)) continue

      if (filterTrade.value && !tradeMatches(baseTradeName(b), filterTrade.value)) continue

      const trade = baseTradeName(b)
      if (!tradeMap.has(trade)) tradeMap.set(trade, [])
      tradeMap.get(trade).push({
        id: baseId(b),
        tradeProcessId: baseId(b),
        name: baseProcessName(b),
        trade,
        weightPct: baseWeight(b),
        baselineStart: baseStart(b),
        baselineEnd: baseEnd(b),
        isMilestone: baseIsMilestone(b),
        raw: b,
        workPlans: [],
      })
    }

    // 미연결 work_plan 보관용
    const orphans = []

    // work_plan들을 해당 trade_process에 매칭
    for (const w of plans) {
      const tpid = workPlanTradeProcessId(w)
      if (tpid == null) {
        console.warn('[WorkPlanView] tradeProcessId 없는 work_plan:', w)
        if (!filterTrade.value || tradeMatches(w.trade, filterTrade.value)) {
          orphans.push(w)
        }
        continue
      }

      let matched = null
      for (const arr of tradeMap.values()) {
        const found = arr.find((it) => String(it.tradeProcessId) === String(tpid))
        if (found) {
          matched = found
          break
        }
      }
      if (!matched) {
        console.warn('[WorkPlanView] 매칭되는 trade_process 없음:', w)
        if (!filterTrade.value || tradeMatches(w.trade, filterTrade.value)) {
          orphans.push(w)
        }
        continue
      }

      if (filterStatus.value && workPlanStatus(w) !== filterStatus.value) continue

      matched.workPlans.push({
        id: w.id,
        name: w.name,
        location: w.location || '',
        start: w.start,
        end: effectiveEnd(w),
        status: workPlanStatus(w),
        raw: w,
      })
    }

    // work_plan이 없는 공정은 기준 일정을 기본 실행 일정으로 세팅
    for (const arr of tradeMap.values()) {
      for (const item of arr) {
        if (item.workPlans.length === 0 && item.baselineStart && item.baselineEnd) {
          item.workPlans.push({
            id: `__default-${item.id}`,
            name: item.name,
            location: '기본 실행 일정',
            start: item.baselineStart,
            end: item.baselineEnd,
            status: '진행 예정',
            isDefault: true, // 기준 일정에서 복제된 기본값임을 표시
            raw: null,
          })
        }
      }
    }

    // 그룹 배열로 변환
    const groups = []
    for (const [trade, items] of tradeMap.entries()) {
      groups.push({ group: trade, items })
    }

    // 미연결 실행계획 그룹
    if (orphans.length) {
      groups.push({
        group: '미연결 실행계획',
        isOrphan: true,
        items: [
          {
            id: '__orphan__',
            tradeProcessId: null,
            name: '기준 공정에 연결되지 않은 실행계획',
            trade: '미연결',
            weightPct: null,
            baselineStart: null,
            baselineEnd: null,
            isMilestone: false,
            workPlans: orphans.map((w) => ({
              id: w.id,
              name: w.name,
              location: w.location || '',
              start: w.start,
              end: effectiveEnd(w),
              status: workPlanStatus(w),
              raw: w,
            })),
          },
        ],
      })
    }

    return groups
  }

  // 월간 work_plan에서 "월간계획서 기준 일정"(파란선) 가져오기
  // 백엔드 스키마 변경 전: plannedStart/plannedEnd 없으면 실행 start/end로 폴백 (두 선이 겹쳐 보임)
  function workPlanPlannedStart(w) {
    return w.plannedStart ?? w.planned_start ?? w.start ?? null
  }
  function workPlanPlannedEnd(w) {
    return w.plannedEnd ?? w.planned_end ?? effectiveEnd(w) ?? null
  }

  // 연간 work_plan들에서 공정별 "마일스톤 종료일" 계산
  // = 같은 tradeProcessId의 연간 work_plan들 중 가장 늦은 종료일
  function buildProcessMilestones() {
    const m = new Map() // tradeProcessId -> { date, source }
    for (const w of annualPlans.value) {
      const tpid = workPlanTradeProcessId(w)
      if (tpid == null) continue
      const end = effectiveEnd(w)
      if (!end) continue
      const prev = m.get(tpid)
      if (!prev || end > prev.date) {
        m.set(tpid, { date: end, source: w })
      }
    }
    return m
  }

  // 월간 전용: 공종 → 공정 → 세부계획(work_plan) 3단 구조
  // 연간 buildGroups와 차이점:
  //  - 공정 행: baseline 막대가 아닌 "마일스톤 점"(연간 빨간선 종료일) 표시
  //  - 세부계획 행: 파란선(월간계획서 기준 plannedStart/End) + 빨간선(실행 start/end)
  function buildMonthlyGroups(plans) {
    const tradeMap = new Map()
    const milestones = buildProcessMilestones()

    // 1) baseline(trade_process) 기준으로 공종 → 공정 골격 생성
    for (const b of baselinePlans.value) {
      // 마일스톤은 연간 계획 행으로 보여주면 안 됨
      if (baseIsMilestone(b)) continue

      if (filterTrade.value && !tradeMatches(baseTradeName(b), filterTrade.value)) continue

      const trade = baseTradeName(b)
      const tpid = baseId(b)
      if (!tradeMap.has(trade)) tradeMap.set(trade, [])
      const milestone = milestones.get(tpid)
      tradeMap.get(trade).push({
        id: tpid,
        tradeProcessId: tpid,
        name: baseProcessName(b),
        trade,
        weightPct: baseWeight(b),
        baselineStart: baseStart(b),
        baselineEnd: baseEnd(b),
        // 공정 마일스톤: 연간 work_plan의 가장 늦은 종료일 (없으면 baselineEnd)
        milestoneDate: milestone ? milestone.date : baseEnd(b),
        milestoneFromAnnual: !!milestone,
        isMilestone: baseIsMilestone(b),
        raw: b,
        details: [], // 세부계획(월간 work_plan)들
      })
    }

    // 2) 월간 work_plan들을 세부계획으로 매칭
    const orphans = []
    for (const w of plans) {
      const tpid = workPlanTradeProcessId(w)
      if (tpid == null) {
        if (!filterTrade.value || tradeMatches(w.trade, filterTrade.value)) {
          orphans.push(w)
        }
        continue
      }
      let matched = null
      for (const arr of tradeMap.values()) {
        const found = arr.find((it) => it.tradeProcessId === tpid)
        if (found) {
          matched = found
          break
        }
      }
      if (!matched) {
        if (!filterTrade.value || tradeMatches(w.trade, filterTrade.value)) {
          orphans.push(w)
        }
        continue
      }
      if (filterStatus.value && workPlanStatus(w) !== filterStatus.value) continue

      matched.details.push({
        id: w.id,
        name: w.name || '(세부계획명 없음)',
        location: w.location || '',
        // 파란선 = 월간계획서 기준 일정
        plannedStart: workPlanPlannedStart(w),
        plannedEnd: workPlanPlannedEnd(w),
        // 빨간선 = 실행 일정 (주간/지시서/일보로 갱신됨)
        start: w.start,
        end: effectiveEnd(w),
        status: workPlanStatus(w),
        raw: w,
      })
    }

    // 3) 그룹 배열로 변환
    const groups = []
    for (const [trade, items] of tradeMap.entries()) {
      groups.push({ group: trade, items })
    }

    // 4) 미연결 실행계획
    if (orphans.length) {
      groups.push({
        group: '미연결 실행계획',
        isOrphan: true,
        items: [
          {
            id: '__orphan__',
            tradeProcessId: null,
            name: '기준 공정에 연결되지 않은 세부계획',
            trade: '미연결',
            weightPct: null,
            baselineStart: null,
            baselineEnd: null,
            milestoneDate: null,
            milestoneFromAnnual: false,
            isMilestone: false,
            details: orphans.map((w) => ({
              id: w.id,
              name: w.name,
              location: w.location || '',
              plannedStart: workPlanPlannedStart(w),
              plannedEnd: workPlanPlannedEnd(w),
              start: w.start,
              end: effectiveEnd(w),
              status: workPlanStatus(w),
              raw: w,
            })),
          },
        ],
      })
    }

    return groups
  }

  // 연간: 공종 → 공정 → 위치별 실행계획 (3단)
  const yearlyGroups = computed(() => buildGroups(annualPlans.value))
  // 월간: 공종 → 공정(마일스톤) → 세부계획(파란/빨간선) (3단)
  const monthlyGroups = computed(() => buildMonthlyGroups(monthlyPlans.value))

  // 공종 그룹 펼침 상태
  const groupOpen = ref({})

  // 월간: 공정별 펼침 상태 (공정 ID 기준)
  const monthlyProcessOpen = ref({})

  watch(
    [yearlyGroups, monthlyGroups],
    () => {
      const all = [...yearlyGroups.value, ...monthlyGroups.value]

      groupOpen.value = Object.fromEntries(all.map((g) => [g.group, isWorkPlanGroupInProgress(g)]))

      // 월간 공정도 오늘 진행 중인 공정만 기본 펼침
      monthlyProcessOpen.value = Object.fromEntries(
        monthlyGroups.value.flatMap((g) =>
          g.items.map((item) => [item.id, isMonthlyProcessInProgress(item)]),
        ),
      )
    },
    { immediate: true },
  )

  // 공정 한 줄의 고정 높이 (좌측 컨텐츠와 우측 차트 행이 정확히 일치하도록)
  // 좌측 컨텐츠 실측:
  //   - py-2 위아래 = 16px
  //   - 공정명 줄 = 20px
  //   - 기준기간 줄 = 14px
  //   - gap-0.5 = 2px × 2 = 4px
  //   - workPlans ul: mt-1 (4px) + 각 wp 14px + space-y-0.5 (2px)
  // 우측 차트:
  //   - 기준선 top:14, 실행선 top:34부터 20px 간격
  function processRowHeight(item) {
    const wp = item.workPlans?.length || 0
    // 헤더부(공정명+기준기간+padding) 약 60px + workPlans 영역
    const wpArea = wp === 0 ? 18 : 4 + wp * 18 // mt-1 + 줄당 약 18px
    const left = 60 + wpArea
    // 우측 차트가 모든 실행선을 보여주려면 (workPlanTop(last) + 6) 이상 필요
    const right = wp === 0 ? 48 : workPlanTop(wp - 1) + 14
    return Math.max(left, right, 56)
  }

  // 월간: 공정 헤더 행 한 줄 높이 (공정명 + 마일스톤 표시)
  const MONTHLY_PROCESS_HEADER_H = 44
  // 월간: 세부계획 한 줄 높이 (파란선 + 빨간선 한 쌍 들어갈 공간)
  const MONTHLY_DETAIL_ROW_H = 32

  function monthlyProcessHeaderHeight() {
    return MONTHLY_PROCESS_HEADER_H
  }
  function monthlyDetailRowHeight() {
    return MONTHLY_DETAIL_ROW_H
  }

  // work_plan 실행선의 top 위치
  function workPlanTop(idx) {
    return 34 + idx * 20
  }

  // 기준선 클릭 (수정 불가 안내)
  function onClickBaseline(item) {
    selectedPlan.value = {
      __baseline: true,
      id: `base-${item.id}`,
      name: item.name,
      trade: item.trade,
      start: item.baselineStart,
      end: item.baselineEnd,
      weightPct: item.weightPct,
      location: '',
    }
  }

  // 실행선 클릭 (기존 selectedPlan 동작)
  function onClickWorkPlan(wp) {
    if (wp.isDefault) {
      // 기본 실행 일정 = 기준 일정과 동일하므로 baseline 안내로 표시
      selectedPlan.value = {
        __baseline: true,
        id: `default-${wp.id}`,
        name: wp.name,
        trade: '',
        start: wp.start,
        end: wp.end,
        weightPct: null,
        location: wp.location,
      }
      return
    }
    selectedPlan.value = wp.raw
  }

  return {
    viewYear,
    viewMonth,
    prevYear,
    nextYear,
    prevMonth,
    nextMonth,
    goToday,
    monthMeta,
    isCurrentMonth,
    isCurrentYear,
    monthlyGanttSource,
    yearlyGanttSource,
    ganttPlans,
    yearlyPlans,
    yearMeta,
    barStyle,
    monthCellCenterStyle,
    yearBarStyle,
    actualLineRange,
    progressFillEnd,
    progressPctOf,
    progressBarStyle,
    progressDotStyle,
    todayLineStyle,
    chartWidth,
    yearChartWidth,
    extensionCount,
    selectViewMode,
    baseIsMilestone,
    yearlyGroups,
    monthlyGroups,
    groupOpen,
    monthlyProcessOpen,
    processRowHeight,
    monthlyProcessHeaderHeight,
    monthlyDetailRowHeight,
    workPlanTop,
    onClickBaseline,
    onClickWorkPlan,
  }
}
