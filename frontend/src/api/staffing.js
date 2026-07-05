import api from './index.js'

/** @typedef {'DIRECT' | 'PARTNER'} StaffingAffiliationKindApi */

const PATH = '/staffing'

/**
 * STAFFING_001 — 자동 추천 배치 (본사 DIRECT·WORKER·당일 PRESENT/LATE·미배치만)
 * @param {string} [rosterDate] yyyy-MM-dd
 * @returns {Promise<{ assignedCount: number, unassignedCount: number }>}
 */
export async function postStaffingAutoRecommend(rosterDate, siteCode) {
  const params = {}
  if (rosterDate) params.rosterDate = rosterDate
  if (siteCode != null && String(siteCode).trim() !== '') params.siteCode = String(siteCode).trim()
  return await api.post(`${PATH}/auto-recommend`, {}, { params })
}

/**
 * STAFFING_002 — 배치 초기화
 * @param {string} [rosterDate] yyyy-MM-dd
 * @param {string} [siteCode]
 */
export async function postStaffingReset(rosterDate, siteCode) {
  const params = {}
  if (rosterDate) params.rosterDate = rosterDate
  if (siteCode != null && String(siteCode).trim() !== '') params.siteCode = String(siteCode).trim()
  return await api.post(`${PATH}/reset`, {}, { params })
}

/**
 * TEST — `data/staffing-zone-demo.json` 등으로 구역 트리 DB 시드
 * @param {object} [opts]
 * @param {boolean} [opts.replaceExisting=true] 기존 인력배치 구역 데이터 비운 뒤 삽입
 * @param {string} [opts.resource] classpath 리소스 (미지정 시 백엔드 기본 JSON)
 */
export async function postStaffingDummySeedZones(opts = {}) {
  const params = {}
  if (opts.replaceExisting !== undefined && opts.replaceExisting !== null) {
    params.replaceExisting = opts.replaceExisting
  }
  if (opts.resource != null && String(opts.resource).trim() !== '') {
    params.resource = String(opts.resource).trim()
  }
  return await api.post(`${PATH}/dummy/seed-zones`, {}, { params })
}

/**
 * 최종배치(확정): 현재 staffing_assignment → 해당 일 attendance_record zone_main/zone_sub 반영, confirmed=true
 * @param {string} [rosterDate] yyyy-MM-dd
 * @param {string} [siteCode]
 * @returns {Promise<{ assignedCount: number, unassignedCount: number }>}
 */
export async function postStaffingSave(rosterDate, siteCode) {
  const params = {}
  if (rosterDate) params.rosterDate = rosterDate
  if (siteCode != null && String(siteCode).trim() !== '') params.siteCode = String(siteCode).trim()
  return await api.request({
    method: 'POST',
    url: `${PATH}/save`,
    params,
  })
}

/** STAFFING board — 구역 트리 + 직종별 필요 + 배치 작업자 일괄 조회 */
export async function getStaffingBoard(opts = {}) {
  const params = {}
  if (opts.rosterDate) params.rosterDate = opts.rosterDate
  if (opts.siteCode != null && String(opts.siteCode).trim() !== '') params.siteCode = String(opts.siteCode).trim()
  return await api.get(`${PATH}/board`, { params })
}

/** STAFFING_003 — 기본구역 트리 */
export async function getStaffingZones(opts = {}) {
  const params = {}
  if (opts.rosterDate) params.rosterDate = opts.rosterDate
  if (opts.siteCode != null && String(opts.siteCode).trim() !== '') params.siteCode = String(opts.siteCode).trim()
  return await api.get(`${PATH}/zones`, { params })
}

/** STAFFING_004 — 상세구역 단건 */
export async function getZoneSubDetail(zoneSubIdx, rosterDate) {
  const params = {}
  if (rosterDate) params.rosterDate = rosterDate
  return await api.get(`${PATH}/zones/${zoneSubIdx}`, { params })
}

/**
 * STAFFING_006 GET — 상세구역 배치 작업자
 * @param {number|string} zoneSubIdx
 * @param {string} [rosterDate]
 */
export async function getZoneSubWorkers(zoneSubIdx, rosterDate) {
  const params = {}
  if (rosterDate) params.rosterDate = rosterDate
  return await api.get(`${PATH}/zones/${zoneSubIdx}/workers`, { params })
}

/** STAFFING_005 — 구역명·직종별 필요 인원 */
export async function patchZoneSub(zoneSubIdx, body) {
  return await api.patch(`${PATH}/zones/${zoneSubIdx}`, body)
}

/**
 * STAFFING_006 DELETE — 구역에서 미투입
 * @param {number|string} zoneSubIdx
 * @param {number|string} workerIdx
 */
export async function deleteZoneSubWorker(zoneSubIdx, workerIdx, rosterDate) {
  const params = {}
  if (rosterDate) params.rosterDate = rosterDate
  return await api.delete(`${PATH}/zones/${zoneSubIdx}/workers/${workerIdx}`, { params })
}

/**
 * STAFFING_007 — 수동 배치 (성공 시 201)
 * @param {number[]} workerIds
 */
export async function postZoneSubAssign(zoneSubIdx, workerIds, rosterDate) {
  const params = {}
  if (rosterDate) params.rosterDate = rosterDate
  return await api.post(`${PATH}/zones/${zoneSubIdx}/assign`, { workerIds }, { params })
}

/**
 * staffing_log 기준 확정 배치 근무자 조회 (당일 + 현장 필터)
 * @param {object} [opts]
 * @param {string} [opts.siteCode]
 * @param {string} [opts.rosterDate] yyyy-MM-dd
 * @returns {Promise<Array<{workerIdx, name, affiliationKind, affiliationLine, zoneMainTitle, zoneSubTitle, placement, tradeName, confirmedAt}>>}
 */
export async function getStaffingConfirmedWorkers(opts = {}) {
  const params = {}
  if (opts.rosterDate) params.rosterDate = opts.rosterDate
  if (opts.siteCode != null && String(opts.siteCode).trim() !== '') params.siteCode = String(opts.siteCode).trim()
  return await api.get(`${PATH}/logs`, { params })
}

/**
 * STAFFING_008 — 작업자 현황
 * @param {object} [opts]
 * @param {StaffingAffiliationKindApi} [opts.affiliationKind]
 * @param {string} [opts.keyword]
 * @param {boolean} [opts.unassignedOnly]
 * @param {string} [opts.rosterDate]
 */
export async function getStaffingWorkerPool(opts = {}) {
  const params = {}
  if (opts.siteCode != null && String(opts.siteCode).trim() !== '') params.siteCode = String(opts.siteCode).trim()
  if (opts.affiliationKind) params.affiliationKind = opts.affiliationKind
  if (opts.keyword != null && String(opts.keyword).trim() !== '') {
    params.keyword = String(opts.keyword).trim()
  }
  if (opts.unassignedOnly === true) params.unassignedOnly = true
  if (opts.rosterDate) params.rosterDate = opts.rosterDate
  return await api.get(`${PATH}/workers`, { params })
}
