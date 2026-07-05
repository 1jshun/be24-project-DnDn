import { computed, ref } from 'vue'
import { submitWeeklyWorkPlan } from '@/api/workplan.js'
import { formatPhoneNumber, isValidPhoneNumber } from '@/utils/inputFormat'

export function useWeeklyWorkPlanForm({ monthlyPlans, reloadPlans }) {
  const showWeeklyForm = ref(false)
  const weeklyForm = ref(null)

  const monthlyPlanOptions = computed(() => {
    return monthlyPlans.value.map((plan) => ({
      id: plan.id,
      label: `${plan.name} / ${plan.location || '-'} / ${plan.start} ~ ${plan.end}`,
      raw: plan,
    }))
  })

  function openWeeklyForm() {
    const today = new Date()
    const weekStartDate = new Date(today)
    weekStartDate.setDate(today.getDate() - today.getDay())
    const weekStart = weekStartDate.toISOString().slice(0, 10)

    weeklyForm.value = {
      monthlyPlanId: null,
      monthlyPlanName: '',
      tradeProcessId: null,
      trade: '',
      monthlyStart: '',
      monthlyEnd: '',
      monthlyLocation: '',
      partner: '',
      manager: '',
      contact: '',
      weekStart,
      items: [makeWeeklyItem(weekStart)],
    }

    showWeeklyForm.value = true
  }

  function makeWeeklyItem(date, defaults = {}) {
    return {
      id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date,
      processName: defaults.processName || '',
      zone: defaults.zone || '',
      workers: [makeWorkerEntry()],
      equipment: [makeEquipmentEntry()],
      note: '',
    }
  }

  function onSelectMonthlyPlan() {
    if (!weeklyForm.value) return

    const selected = monthlyPlans.value.find(
      (plan) => String(plan.id) === String(weeklyForm.value.monthlyPlanId),
    )

    if (!selected) return

    weeklyForm.value.monthlyPlanName = selected.name || ''
    weeklyForm.value.tradeProcessId = selected.tradeProcessId || null
    weeklyForm.value.trade = selected.trade || ''
    weeklyForm.value.monthlyStart = selected.start || ''
    weeklyForm.value.monthlyEnd = selected.end || ''
    weeklyForm.value.monthlyLocation = selected.location || ''
    weeklyForm.value.partner = selected.partner || ''
    weeklyForm.value.manager = selected.manager || ''
    weeklyForm.value.contact = formatPhoneNumber(selected.contact || '')
    weeklyForm.value.weekStart = selected.start || weeklyForm.value.weekStart
    weeklyForm.value.items = [
      makeWeeklyItem(selected.start || weeklyForm.value.weekStart, {
        processName: selected.name || '',
        zone: selected.location || '',
      }),
    ]
  }

  function makeWorkerEntry() {
    return {
      tradeId: `wt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      trade: '전공',
      count: 1,
    }
  }

  function addWorker(item) {
    item.workers.push(makeWorkerEntry())
  }

  function removeWorker(item, index) {
    if (item.workers.length <= 1) return
    item.workers.splice(index, 1)
  }

  function makeEquipmentEntry() {
    return {
      equipId: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: '굴삭기',
      count: 1,
    }
  }

  function addEquipment(item) {
    item.equipment.push(makeEquipmentEntry())
  }

  function removeEquipment(item, index) {
    if (item.equipment.length <= 1) return
    item.equipment.splice(index, 1)
  }

  function addWeeklyItem() {
    if (!weeklyForm.value) return

    const lastDate = weeklyForm.value.items.at(-1)?.date
    const baseDate = lastDate || weeklyForm.value.weekStart

    weeklyForm.value.items.push(
      makeWeeklyItem(baseDate, {
        processName: weeklyForm.value.monthlyPlanName,
        zone: weeklyForm.value.monthlyLocation,
      }),
    )
  }

  function removeWeeklyItem(index) {
    if (weeklyForm.value.items.length <= 1) return
    weeklyForm.value.items.splice(index, 1)
  }

  const weeklyFormValid = computed(() => {
    if (!weeklyForm.value) return false

    const form = weeklyForm.value
    if (!form.monthlyPlanId) return false
    if (!form.partner.trim() || !form.manager.trim()) return false
    if (!isValidPhoneNumber(form.contact, { required: true })) return false

    return form.items.every(
      (item) =>
        item.date &&
        item.processName.trim() &&
        item.zone.trim() &&
        Array.isArray(item.workers) &&
        item.workers.length > 0 &&
        item.workers.every(
          (worker) => worker.trade && worker.trade.trim() && Number(worker.count) > 0,
        ) &&
        Array.isArray(item.equipment) &&
        item.equipment.length > 0 &&
        item.equipment.every(
          (equipment) => equipment.type && equipment.type.trim() && Number(equipment.count) > 0,
        ),
    )
  })

  async function submitWeeklyForm() {
    if (!weeklyFormValid.value) return
    const form = weeklyForm.value
    const contact = formatPhoneNumber(form.contact)
    form.contact = contact

    try {
      const payload = {
        parentWorkPlanId: form.monthlyPlanId,
        tradeProcessId: form.tradeProcessId,
        partner: form.partner,
        manager: form.manager,
        contact,
        weekStart: form.weekStart,
        items: form.items.map((item) => ({
          date: item.date,
          processName: item.processName,
          zone: item.zone,
          workers: item.workers.map((worker) => ({
            trade: worker.trade,
            count: Number(worker.count) || 0,
          })),
          equipment: item.equipment.map((equipment) => ({
            type: equipment.type,
            count: Number(equipment.count) || 0,
          })),
          note: item.note,
        })),
      }

      await submitWeeklyWorkPlan(payload)
      showWeeklyForm.value = false
      alert(
        `${form.partner} (${form.manager}) 세부 계획서 ${form.items.length}건이 제출되었습니다.`,
      )
      await reloadPlans()
    } catch (err) {
      console.error('세부 계획서 제출 실패:', err)
      alert(err.message || '세부 계획서 제출에 실패했습니다.')
    }
  }

  function cancelWeeklyForm() {
    showWeeklyForm.value = false
    weeklyForm.value = null
  }

  return {
    showWeeklyForm,
    weeklyForm,
    monthlyPlanOptions,
    weeklyFormValid,
    openWeeklyForm,
    onSelectMonthlyPlan,
    addWorker,
    removeWorker,
    addEquipment,
    removeEquipment,
    addWeeklyItem,
    removeWeeklyItem,
    submitWeeklyForm,
    cancelWeeklyForm,
  }
}
