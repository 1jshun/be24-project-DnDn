import { reactive, ref, watch } from 'vue'
import {
  createScheduleChange,
  fetchScheduleChangeList,
  fetchScheduleChangeHistory,
  approveScheduleChange,
  rejectScheduleChange,
  applyScheduleChange,
} from '@/api/schedulechange.js'
import {
  clonePlain,
  dedupeScheduleChanges,
  mapScheduleChange,
} from '@/utils/schedule/analysis/scheduleChangeHelpers.js'

export function useScheduleChangeActions({
  currentProjectId,
  currentTradeItem,
  currentTradeLabel,
  activeTab,
  changeSubView,
  refreshScheduleContext,
}) {
  const changeRequests = ref([])
  const changeHistory = ref([])
  const applyingScheduleIds = ref([])

  async function loadScheduleChangeData() {
    const [requests, history] = await Promise.all([
      fetchScheduleChangeList({ projectId: currentProjectId.value }),
      fetchScheduleChangeHistory({ projectId: currentProjectId.value }),
    ])

    const activeStatuses = new Set(['pending', 'approved'])
    const requestItems = Array.isArray(requests)
      ? requests
          .map((item) => mapScheduleChange(item, false))
          .filter((item) => activeStatuses.has(item.status))
      : []
    const historyItems = Array.isArray(history)
      ? history.map((item) => mapScheduleChange(item, true))
      : []

    changeRequests.value = dedupeScheduleChanges(requestItems)
    changeHistory.value = dedupeScheduleChanges(historyItems, true)
  }

  const requestForm = reactive({
    taskId: '',
    process: '',
    task: '',
    oldStart: '',
    oldEnd: '',
    newStart: '',
    newEnd: '',
    reason: '',
    changeSummary: null,
    detailChanges: [],
    aiApplied: false,
    attachments: [],
  })

  watch(
    currentTradeItem,
    (item) => {
      if (item) requestForm.process = item.name
    },
    { immediate: true },
  )

  function resetRequestForm() {
    Object.assign(requestForm, {
      taskId: '',
      process: currentTradeItem.value?.name || '',
      task: '',
      oldStart: '',
      oldEnd: '',
      newStart: '',
      newEnd: '',
      reason: '',
      changeSummary: null,
      detailChanges: [],
      aiApplied: false,
      attachments: [],
    })
  }

  async function submitRequest() {
    if (!requestForm.task || !requestForm.newStart || !requestForm.newEnd || !requestForm.reason) {
      return
    }

    const detailChanges = clonePlain(requestForm.detailChanges || [])
    const firstDetail = detailChanges[0] || {}

    await createScheduleChange({
      projectId: currentProjectId.value,
      tradeProcessId:
        firstDetail.tradeProcessId || requestForm.changeSummary?.tradeProcessId || null,
      workPlanId: requestForm.taskId || requestForm.changeSummary?.targetTaskId || null,
      taskName: requestForm.task,
      requester: currentTradeLabel.value,
      process: requestForm.process,
      oldStart: requestForm.oldStart || null,
      oldEnd: requestForm.oldEnd || null,
      newStart: requestForm.newStart,
      newEnd: requestForm.newEnd,
      reason: requestForm.reason,
      cause: requestForm.changeSummary?.cause || '',
      changeSummary: clonePlain(requestForm.changeSummary),
      detailChanges,
      aiApplied: requestForm.aiApplied,
      attachmentUrls: requestForm.attachments.map((file) => file.url || file.name).filter(Boolean),
    })

    await loadScheduleChangeData()
    resetRequestForm()
    activeTab.value = 'change'
    changeSubView.value = 'active'
  }

  const rejectModal = ref({ show: false, id: null, reason: '' })

  async function approveRequest(id) {
    await approveScheduleChange(id, {
      approver: currentTradeLabel.value,
    })
    await loadScheduleChangeData()
  }

  async function applyToSchedule(id) {
    if (applyingScheduleIds.value.includes(id)) return
    applyingScheduleIds.value = [...applyingScheduleIds.value, id]

    try {
      await applyScheduleChange(id)
      changeRequests.value = changeRequests.value.filter((request) => request.id !== id)
      await Promise.all([refreshScheduleContext(), loadScheduleChangeData()])
      alert('공정표에 반영했습니다.')
    } catch (err) {
      console.error('공정표 반영 실패:', err)
      alert(err?.response?.data?.message || err?.message || '공정표 반영에 실패했습니다.')
    } finally {
      applyingScheduleIds.value = applyingScheduleIds.value.filter((requestId) => requestId !== id)
    }
  }

  function openRejectModal(id) {
    rejectModal.value = { show: true, id, reason: '' }
  }

  async function confirmReject() {
    if (!rejectModal.value.id || !rejectModal.value.reason.trim()) return

    await rejectScheduleChange(rejectModal.value.id, {
      approver: currentTradeLabel.value,
      rejectReason: rejectModal.value.reason,
    })

    await loadScheduleChangeData()
    rejectModal.value.show = false
  }

  return {
    changeRequests,
    changeHistory,
    applyingScheduleIds,
    loadScheduleChangeData,
    requestForm,
    submitRequest,
    rejectModal,
    approveRequest,
    applyToSchedule,
    openRejectModal,
    confirmReject,
  }
}
