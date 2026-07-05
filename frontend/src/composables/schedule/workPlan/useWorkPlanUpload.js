import { computed, ref } from 'vue'
import { fetchTradeProcessList } from '@/api/tradeProcess.js'
import { createWorkPlans, extractWorkPlanUpload } from '@/api/workplan.js'

const DEFAULT_TRADES = ['공통/가설', '토공사', '지정/기초', '골조공사', '건축마감', '기계/설비']

export function useWorkPlanUpload({ selectedProjectId, reloadPlans }) {
  const uploadFileName = ref('')
  const uploadCategory = ref('')
  const yearlyInputRef = ref(null)
  const monthlyInputRef = ref(null)
  const isAnalyzingUpload = ref(false)

  const isUploadPopupOpen = ref(false)
  const uploadModalTrade = ref('')
  const uploadModalType = ref('연간')
  const mainTrades = ref([])

  const showVerifyModal = ref(false)
  const verifyCategory = ref('')
  const verifyFileName = ref('')
  const verifyRows = ref([])

  async function loadMainTrades() {
    try {
      const response = await fetchTradeProcessList({ projectId: selectedProjectId.value })
      if (response && Array.isArray(response)) {
        const uniqueTrades = [
          ...new Set(
            response
              .filter((item) => !item.isMilestone && !item.milestone)
              .map((item) => item.trade || item.tradeName),
          ),
        ].filter(Boolean)

        mainTrades.value = uniqueTrades.length ? uniqueTrades : DEFAULT_TRADES
        if (mainTrades.value.length > 0) uploadModalTrade.value = mainTrades.value[0]
      }
    } catch (error) {
      mainTrades.value = DEFAULT_TRADES
      uploadModalTrade.value = mainTrades.value[0]
    }
  }

  function triggerFileUpload() {
    isUploadPopupOpen.value = false
    if (uploadModalType.value === '연간') {
      yearlyInputRef.value?.click()
    } else {
      monthlyInputRef.value?.click()
    }
  }

  async function onFileChange(e, category) {
    const file = e.target.files?.[0]
    if (!file) {
      e.target.value = ''
      return
    }

    const projectId = selectedProjectId.value
    if (!projectId) {
      alert('현장을 먼저 선택해주세요.')
      e.target.value = ''
      return
    }

    uploadFileName.value = file.name
    uploadCategory.value = category
    verifyCategory.value = category
    verifyFileName.value = file.name

    try {
      isAnalyzingUpload.value = true
      const rows = await extractWorkPlanUpload({
        projectId,
        planType: category,
        trade: uploadModalTrade.value,
        file,
      })

      verifyRows.value = rows.map((row, index) => ({
        id: row.id ?? `${Date.now()}-${index}`,
        tradeProcessId: row.tradeProcessId ?? null,
        tradeProcessName: row.tradeProcessName ?? '',
        name: row.name ?? '',
        trade: row.trade ?? uploadModalTrade.value ?? '',
        location: row.location ?? '',
        start: row.start ?? '',
        end: row.end ?? '',
        note: row.note ?? '',
        issue: row.issue ?? null,
      }))

      if (!verifyRows.value.length) {
        alert('계획서에서 반영할 작업을 찾지 못했습니다.')
        uploadFileName.value = ''
        return
      }

      showVerifyModal.value = true
    } catch (err) {
      console.error(`${category} 계획서 분석 실패:`, err)
      uploadFileName.value = ''
      alert(err.message || '계획서 분석에 실패했습니다.')
    } finally {
      isAnalyzingUpload.value = false
      e.target.value = ''
    }
  }

  const verifyStats = computed(() => {
    const total = verifyRows.value.length
    const errors = verifyRows.value.filter((row) => row.issue === 'error').length
    const warnings = verifyRows.value.filter((row) => row.issue === 'warning').length
    const ok = total - errors - warnings
    return { total, ok, warnings, errors }
  })

  function fixVerifyRow(row) {
    if (!row.start) row.start = row.end || new Date().toISOString().slice(0, 10)
    if (!row.end) row.end = row.start
    row.issue = null
  }

  function removeVerifyRow(row) {
    verifyRows.value = verifyRows.value.filter((item) => item.id !== row.id)
  }

  async function confirmVerifyAndApply() {
    const validRows = verifyRows.value.filter(
      (row) => row.name && row.trade && row.start && row.end,
    )

    if (!validRows.length) {
      alert('저장할 수 있는 작업이 없습니다.')
      return
    }

    try {
      await createWorkPlans(
        validRows.map((row) => ({
            tradeProcessId: row.tradeProcessId || null,
            name: row.name,
            trade: row.trade,
            location: row.location,
            planType: verifyCategory.value,
            status: '진행 예정',
            start: row.start,
            end: row.end,
            requiredCount: 0,
            workers: [],
            equipment: [],
            partner: '',
            manager: '',
            contact: '',
            weekStart: '',
            note: row.note || '',
          })),
      )

      showVerifyModal.value = false
      alert(`${verifyCategory.value} 계획서 ${validRows.length}건이 저장되었습니다.`)
      await reloadPlans()
    } catch (err) {
      console.error(`${verifyCategory.value} 계획서 저장 실패:`, err)
      alert(err.message || '계획서 저장에 실패했습니다.')
    }
  }

  function cancelVerify() {
    showVerifyModal.value = false
    verifyRows.value = []
    uploadFileName.value = ''
  }

  return {
    uploadFileName,
    uploadCategory,
    yearlyInputRef,
    monthlyInputRef,
    isAnalyzingUpload,
    isUploadPopupOpen,
    uploadModalTrade,
    uploadModalType,
    mainTrades,
    showVerifyModal,
    verifyCategory,
    verifyFileName,
    verifyRows,
    verifyStats,
    loadMainTrades,
    triggerFileUpload,
    onFileChange,
    fixVerifyRow,
    removeVerifyRow,
    confirmVerifyAndApply,
    cancelVerify,
  }
}
