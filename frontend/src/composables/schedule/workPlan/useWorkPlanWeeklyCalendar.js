import { computed, ref } from 'vue'
import {
  formatDateLocal,
  getWeekStart,
  isHolidayDate,
  workPlanStatus,
} from '@/utils/schedule/workPlan.js'

export function useWorkPlanWeeklyCalendar({
  weeklyPlans,
  monthlyPlans,
  viewMode,
  filterTrade,
  filterStatus,
  effectiveEnd,
  extOf,
}) {
  const filtered = computed(() => {
    let result = viewMode.value === 'weekly' ? weeklyPlans.value : monthlyPlans.value

    if (filterStatus.value) {
      result = result.filter((plan) => workPlanStatus(plan) === filterStatus.value)
    }

    return result
  })

  function monthlyPlanFor(plan) {
    const parentId = plan?.parentWorkPlanId
    if (parentId) {
      const byId = monthlyPlans.value.find((item) => String(item.id) === String(parentId))
      if (byId) return byId
    }

    const parentName = String(plan?.parentWorkPlanName || '').trim()
    if (parentName) {
      const byName = monthlyPlans.value.find(
        (item) => String(item.name || '').trim() === parentName,
      )
      if (byName) return byName
    }

    return null
  }

  function displayMonthlyPlanName(plan) {
    return monthlyPlanFor(plan)?.name || plan?.parentWorkPlanName || '-'
  }

  function displayMonthlyPlanPeriod(plan) {
    const monthlyPlan = monthlyPlanFor(plan)
    if (!monthlyPlan?.start && !monthlyPlan?.end) return ''
    return `${monthlyPlan.start || '-'} ~ ${monthlyPlan.end || '-'}`
  }

  const selectedWeekStart = ref(getWeekStart(new Date()))

  const weeklyWorkList = computed(() => {
    const start = formatDateLocal(selectedWeekStart.value)
    const endDate = new Date(selectedWeekStart.value)
    endDate.setDate(endDate.getDate() + 13)
    const end = formatDateLocal(endDate)

    return filtered.value
      .filter((plan) => plan.start <= end && effectiveEnd(plan) >= start)
      .slice()
      .sort((a, b) => {
        const startOrder = (a.start || '').localeCompare(b.start || '')
        if (startOrder !== 0) return startOrder

        const endOrder = (effectiveEnd(a) || '').localeCompare(effectiveEnd(b) || '')
        if (endOrder !== 0) return endOrder

        return (a.name || '').localeCompare(b.name || '')
      })
  })

  const weekDays = computed(() => {
    const today = new Date()
    const start = new Date(selectedWeekStart.value)
    const labels = ['일', '월', '화', '수', '목', '금', '토']

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      const dow = date.getDay()
      const dateStr = formatDateLocal(date)

      return {
        label: labels[dow],
        date: dateStr,
        day: date.getDate(),
        month: date.getMonth() + 1,
        isToday: date.toDateString() === today.toDateString(),
        isHoliday: isHolidayDate(dateStr),
        isSunday: dow === 0,
        isSaturday: dow === 6,
        isWeekend: dow === 0 || dow === 6,
      }
    })
  })

  const weekHeader = computed(() => {
    const first = weekDays.value[0]
    const last = weekDays.value[6]
    if (!first || !last) return ''

    const [year, month] = first.date.split('-')
    return `${Number(year)}년 ${Number(month)}월 · ${first.month}.${first.day} ~ ${last.month}.${last.day}`
  })

  const isCurrentWeek = computed(
    () => selectedWeekStart.value.toDateString() === getWeekStart(new Date()).toDateString(),
  )

  function prevWeek() {
    const date = new Date(selectedWeekStart.value)
    date.setDate(date.getDate() - 7)
    selectedWeekStart.value = date
  }

  function nextWeek() {
    const date = new Date(selectedWeekStart.value)
    date.setDate(date.getDate() + 7)
    selectedWeekStart.value = date
  }

  function goCurrentWeek() {
    selectedWeekStart.value = getWeekStart(new Date())
  }

  function plansForDay(dateStr) {
    return filtered.value
      .filter((plan) => plan.start <= dateStr && effectiveEnd(plan) >= dateStr)
      .map((plan) => ({
        ...plan,
        isExtensionDay: extOf(plan) && dateStr > plan.end,
      }))
  }

  return {
    displayMonthlyPlanName,
    displayMonthlyPlanPeriod,
    selectedWeekStart,
    weeklyWorkList,
    weekDays,
    weekHeader,
    isCurrentWeek,
    prevWeek,
    nextWeek,
    goCurrentWeek,
    plansForDay,
  }
}
