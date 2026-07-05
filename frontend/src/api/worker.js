import api from './index.js'

/** Backend.md — 근무자 관리 Base path */
const PATH = '/management'

/**
 * MANAGEMENT_001 전체 현장 일괄 동기화 수동 트리거 (스케줄러와 동일 로직)
 * POST /management/sync/all?date=
 */
export const syncAllSites = (date) => {
  const params = {}
  if (date != null && String(date).trim() !== '') params.date = date
  return api.post(`${PATH}/sync/all`, null, { params })
}

/**
 * MANAGEMENT_003 작업자 목록 조회 (페이징)
 * GET /management/list?siteCode=&date=&tradeName=&searchName=&page=&size=
 * @param {string} [siteCode]
 * @param {string} [date] yyyy-MM-dd
 * @param {object} [opts]
 * @param {string}  [opts.tradeName]
 * @param {string}  [opts.searchName]
 * @param {number}  [opts.page=0]
 * @param {number}  [opts.size=50]
 */
export const fetchWorkerList = (siteCode, date, { tradeName, searchName, page, size } = {}) => {
  const params = {}
  if (siteCode != null && String(siteCode).trim() !== '') params.siteCode = String(siteCode).trim()
  if (date != null && String(date).trim() !== '') params.date = date
  if (tradeName != null && String(tradeName).trim() !== '') params.tradeName = String(tradeName).trim()
  if (searchName != null && String(searchName).trim() !== '') params.searchName = String(searchName).trim()
  if (page != null) params.page = page
  if (size != null) params.size = size
  return api.get(`${PATH}/list`, { params })
}

/**
 * MANAGEMENT_002 근무자 검색
 * GET /management/search?siteCode=&...
 */
export const fetchWorkerSearch = ({ siteCode, date, attendanceStatus, partnerCompany, searchName } = {}) => {
  const params = {}
  if (siteCode != null && String(siteCode).trim() !== '') params.siteCode = String(siteCode).trim()
  if (date != null && String(date).trim() !== '') params.date = date
  if (attendanceStatus != null && String(attendanceStatus).trim() !== '')
    params.attendanceStatus = attendanceStatus
  if (partnerCompany != null && String(partnerCompany).trim() !== '')
    params.partnerCompany = partnerCompany
  if (searchName != null && String(searchName).trim() !== '') params.searchName = searchName
  return api.get(`${PATH}/search`, { params })
}

/** MANAGEMENT_004 */
export const fetchWorkerProfile = (workerIdx) => api.get(`${PATH}/${workerIdx}/detail`)

/** MANAGEMENT_005 */
export const fetchWorkerDocs = (workerIdx) => api.get(`${PATH}/${workerIdx}/docs`)

/** MANAGEMENT_006 @param {string} [yearMonth] 예: 2026-05 */
export const fetchWorkerAttendance = (workerIdx, yearMonth) =>
  api.get(`${PATH}/${workerIdx}/attendance`, {
    params: yearMonth ? { yearMonth } : {},
  })

/** MANAGEMENT_007 */
export const fetchWorkerDeployments = (workerIdx) => api.get(`${PATH}/${workerIdx}/deployments`)

/** MANAGEMENT_008 */
export const fetchWorkerPenalties = (workerIdx) => api.get(`${PATH}/${workerIdx}/penalties`)

/** MANAGEMENT_009 */
export const fetchWorkerAccidents = (workerIdx) => api.get(`${PATH}/${workerIdx}/accidents`)

/** MANAGEMENT_010 게이트 출근 */
export const gateClockIn = (body) => api.post(`${PATH}/attendance/gate-clock-in`, body)

/** MANAGEMENT_011 게이트 퇴근 */
export const gateClockOut = (body) => api.post(`${PATH}/attendance/gate-clock-out`, body)

/** MANAGEMENT_DEMO 출결 더미 이력 시딩 — 근무자별 피로도 다양화 (현장 단위) */
export const seedDemoAttendanceHistory = (siteCode) =>
  api.post(`${PATH}/attendance/seed-demo-history`, null, {
    params: { siteCode },
    timeout: 60000,
  })

/**
 * MANAGEMENT_DEMO 현장+날짜 근태 일괄 변경
 * targetStatus: PENDING(미출근) | PRESENT(출근) | LATE(지각) | EARLY_LEAVE(조퇴) | LEAVE(퇴근)
 */
export const bulkOverrideAttendance = (siteCode, date, targetStatus) =>
  api.post(`${PATH}/attendance/bulk-override`, null, {
    params: { siteCode, date, targetStatus },
  })
