import api from './index.js'

const PATH = '/schedule-change-request'

/**
 * 일정 변경 요청 등록
 * POST /schedule-change-request
 */
export const createScheduleChange = (payload) => {
  return api.post(PATH, payload)
}

/**
 * 일정 변경 요청 목록 조회
 * GET /schedule-change-request?projectId=&process=&requester=
 *
 * @param {Object} params
 * @param {number} params.projectId  - 현장 ID (필수)
 * @param {string} [params.process]  - 공종 필터 (선택)
 * @param {string} [params.requester] - 요청자 필터 (선택, 공정 책임자 본인 요청만 조회 시)
 */
export const fetchScheduleChangeList = (params) => {
  return api.get(PATH, { params })
}

/**
 * 변경 이력 조회 (처리 완료된 것만)
 * GET /schedule-change-request/history?projectId=&process=
 */
export const fetchScheduleChangeHistory = (params) => {
  return api.get(`${PATH}/history`, { params })
}

/**
 * 일정 변경 요청 승인 (총 책임자)
 * PUT /schedule-change-request/{requestId}/approve
 */
export const approveScheduleChange = (requestId, payload) => {
  return api.put(`${PATH}/${requestId}/approve`, payload)
}

/**
 * 일정 변경 요청 반려 (총 책임자)
 * PUT /schedule-change-request/{requestId}/reject
 */
export const rejectScheduleChange = (requestId, payload) => {
  return api.put(`${PATH}/${requestId}/reject`, payload)
}

/**
 * 공정표 반영 (승인된 요청 → 실제 일정 적용)
 * PUT /schedule-change-request/{requestId}/apply
 */
export const applyScheduleChange = (requestId) => {
  return api.put(`${PATH}/${requestId}/apply`)
}
