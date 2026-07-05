import { ref } from 'vue'
import api from '@/api/index'
import { getTradeNameFromRecord, toDateString } from '@/utils/schedule/dailyWorkReport.js'

function unwrapReportList(res) {
  if (Array.isArray(res)) return res
  return res?.data?.data || res?.data || []
}

function normalizeReport(db) {
  return {
    id: db.idx,
    workPlanId: db.workPlanId,
    date: toDateString(db.reportDate),
    process: getTradeNameFromRecord(db) || '공종 미지정',
    workers: db.actualWorkerCount || 0,
    location: db.location || db.workPlanLocation || '',
    equipmentCount: 0,
    equipmentList: [],
    todayWork: db.todayWork || '',
    progress: db.todayProgress || 0,
    processProgress: db.actualProgress || 0,
    notes: db.issue || '',
    completion: db.actualProgress >= 100 ? '완료' : '미완료',
    status: '제출 완료',
    photos: [],
    files: [],
  }
}

function buildSubmitPayload(report, calcInfo) {
  return {
    workPlanId: report.workPlanId,
    todayProgress: parseFloat(report.progress || 0),
    actualProgress: parseFloat(report.processProgress || 0),
    monthlyWorkPlanId: report.monthlyWorkPlanId || null,
    progressIncrementPct: calcInfo?.increment ?? 0,
    monthlyProgressPct: parseFloat(report.processProgress || 0),
    actualWorkerCount: report.workers || 0,
    location: report.location,
    issue: report.notes || '특이사항 없음',
    reportDate: report.date,
    todayWork: report.todayWork,
  }
}

export function useDailyWorkReports() {
  const reports = ref([])
  const viewingReport = ref(null)

  async function loadReportsForDate(targetDate) {
    try {
      const res = await api.get('/report/', { params: { date: targetDate } })
      reports.value = unwrapReportList(res).map(normalizeReport)
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    }
  }

  function persistReport(report, newStatus) {
    if (!report) return

    delete report.equipmentInput
    report.status = newStatus

    const idx = reports.value.findIndex((item) => item.id === report.id)
    if (idx >= 0) reports.value.splice(idx, 1, { ...report })
    else reports.value.push({ ...report })
  }

  function saveDraftReport(report) {
    persistReport(report, '임시 저장')
  }

  async function submitReport({ report, calcInfo, targetDate, onSuccess }) {
    if (!report?.location?.trim()) {
      alert('작업 위치는 필수입니다.')
      return false
    }

    try {
      await api.post('/report/', buildSubmitPayload(report, calcInfo))
      report.submittedAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
      persistReport(report, '제출 완료')
      onSuccess?.()
      alert('공사일보 제출이 완료되었습니다.')
      await loadReportsForDate(targetDate)
      return true
    } catch (error) {
      console.error(error)
      alert('제출에 실패했습니다.')
      return false
    }
  }

  function openViewer(report) {
    viewingReport.value = report
  }

  function closeViewer() {
    viewingReport.value = null
  }

  function setViewingReportStatus(status) {
    if (!viewingReport.value) return

    const idx = reports.value.findIndex((report) => report.id === viewingReport.value.id)
    if (idx < 0) return

    reports.value[idx].status = status
    viewingReport.value = reports.value[idx]
  }

  function approveReport() {
    setViewingReportStatus('승인 완료')
  }

  function rejectReport() {
    setViewingReportStatus('반려')
  }

  return {
    reports,
    viewingReport,
    loadReportsForDate,
    saveDraftReport,
    submitReport,
    openViewer,
    closeViewer,
    approveReport,
    rejectReport,
  }
}
