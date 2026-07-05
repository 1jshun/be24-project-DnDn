import { ref } from 'vue'
import { fetchScheduleChangeHistory, fetchScheduleChangeList } from '@/api/schedulechange.js'
import {
  getPlanDate,
  getPlanId,
  normalizeScheduleChangeStatus,
  parseScheduleTime,
  toDateString,
  toNumberOrNull,
  unwrapApiList,
} from '@/utils/schedule/dailyWorkReport.js'

export function useApprovedScheduleChanges({ currentProjectId, reports, editingReport }) {
  const approvedScheduleChanges = ref([])

  async function loadApprovedScheduleChanges() {
    try {
      const [listRes, historyRes] = await Promise.all([
        fetchScheduleChangeList({ projectId: currentProjectId.value }),
        fetchScheduleChangeHistory({ projectId: currentProjectId.value }),
      ])

      approvedScheduleChanges.value = [...unwrapApiList(listRes), ...unwrapApiList(historyRes)]
    } catch (error) {
      console.error('승인 일정 변경 조회 실패:', error)
      approvedScheduleChanges.value = []
    }
  }

  function findApprovedScheduleTarget(workPlanId, workDate) {
    const id = Number(workPlanId)
    if (!Number.isFinite(id)) return null

    const candidates = []

    approvedScheduleChanges.value.forEach((request) => {
      const status = normalizeScheduleChangeStatus(request.status)
      if (!['approved', 'applied'].includes(status)) return

      const details = Array.isArray(request.detailChanges) ? request.detailChanges : []
      details.forEach((detail) => {
        if (Number(detail.workPlanId) !== id) return

        const detailDate = toDateString(detail.date)
        if (detailDate && detailDate !== workDate) return

        const targetPct = toNumberOrNull(
          detail.targetPct ??
            detail.recommendedTargetPct ??
            detail.focusedTargetRate ??
            detail.dailyTargetPct,
        )
        if (!targetPct || targetPct <= 0) return

        const normalTargetPct = toNumberOrNull(
          detail.normalTargetPct ?? detail.originalTargetPct ?? detail.baseTargetPct,
        )

        candidates.push({
          requestId: request.idx ?? request.id ?? 0,
          status,
          targetPct,
          normalTargetPct,
          processedAt: parseScheduleTime(request.processedAt),
          requestDate: parseScheduleTime(request.requestDate),
        })
      })
    })

    if (!candidates.length) return null

    candidates.sort((a, b) => {
      const timeDiff =
        Math.max(b.processedAt, b.requestDate) - Math.max(a.processedAt, a.requestDate)
      if (timeDiff) return timeDiff
      if (Number(b.requestId) !== Number(a.requestId))
        return Number(b.requestId) - Number(a.requestId)
      const statusWeight = { applied: 2, approved: 1 }
      return (statusWeight[b.status] || 0) - (statusWeight[a.status] || 0)
    })

    return candidates[0]
  }

  function applyApprovedScheduleTarget() {
    const report = editingReport.value
    if (!report) return

    const match = findApprovedScheduleTarget(report.workPlanId, report.date)
    report.approvedDailyTargetPct = match?.targetPct ?? null
    report.normalDailyTargetPct = match?.normalTargetPct ?? null
    report.dailyTargetSource = match ? 'schedule_change' : 'duration'
  }

  function applyMonthlyScheduleWeights(childPlans = []) {
    const report = editingReport.value
    if (!report) return

    report.scheduleWeightPct = null
    report.normalScheduleWeightPct = null
    report.remainingScheduleWeightPct = null
    report.monthlyScheduleCount = 0
    report.scheduleWeightSource = report.dailyTargetSource || 'duration'

    const monthlyPlanId = Number(report.monthlyWorkPlanId)
    const currentWorkPlanId = Number(report.workPlanId)
    const start = new Date(report.startDate)
    const end = new Date(report.endDate)
    if (
      !Number.isFinite(monthlyPlanId) ||
      !Number.isFinite(currentWorkPlanId) ||
      isNaN(start.getTime()) ||
      isNaN(end.getTime())
    ) {
      return
    }

    const duration = Math.max(1, Math.round((end - start) / 86400000) + 1)
    const normalDailyWeight = 100 / duration

    const monthlyChildren = childPlans
      .filter((plan) => Number(plan?.parentWorkPlanId) === monthlyPlanId)
      .map((plan) => ({
        id: getPlanId(plan),
        date: getPlanDate(plan),
      }))
      .filter((plan) => plan.id && plan.date)

    if (!monthlyChildren.length) return

    const countsByDate = new Map()
    monthlyChildren.forEach((plan) => {
      countsByDate.set(plan.date, (countsByDate.get(plan.date) || 0) + 1)
    })

    const scheduleWeights = monthlyChildren.map((plan) => {
      const defaultWeight = normalDailyWeight / Math.max(1, countsByDate.get(plan.date) || 1)
      const approvedTarget = findApprovedScheduleTarget(plan.id, plan.date)
      return {
        ...plan,
        weightPct: approvedTarget?.targetPct ?? defaultWeight,
        normalWeightPct: approvedTarget?.normalTargetPct ?? defaultWeight,
        source: approvedTarget ? 'schedule_change' : 'duration',
      }
    })

    const reportedWorkPlanIds = new Set(
      reports.value
        .filter((item) => item.date === report.date)
        .map((item) => Number(item.workPlanId))
        .filter((id) => Number.isFinite(id) && id !== currentWorkPlanId),
    )

    const currentWeight = scheduleWeights.find((plan) => plan.id === currentWorkPlanId)
    if (!currentWeight) return

    const remainingWeightPct = scheduleWeights
      .filter((plan) => {
        if (plan.id === currentWorkPlanId) return false
        if (reportedWorkPlanIds.has(plan.id)) return false
        return plan.date >= report.date
      })
      .reduce((sum, plan) => sum + Number(plan.weightPct || 0), 0)

    report.scheduleWeightPct = currentWeight.weightPct
    report.normalScheduleWeightPct = currentWeight.normalWeightPct
    report.remainingScheduleWeightPct = remainingWeightPct
    report.monthlyScheduleCount = monthlyChildren.length
    report.scheduleWeightSource = currentWeight.source
  }

  return {
    approvedScheduleChanges,
    loadApprovedScheduleChanges,
    applyApprovedScheduleTarget,
    applyMonthlyScheduleWeights,
  }
}
