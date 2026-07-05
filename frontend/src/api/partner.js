import api from './index.js'

const PATH = '/partner'

/**
 * 협력사 등록
 * POST /partner
 */
export const createPartner = (payload) => {
  return api.post(PATH, payload)
}

/**
 * 협력사 단일 조회
 * GET /partner/{partnerId}
 */
export const fetchPartner = (partnerId) => {
  return api.get(`${PATH}/${partnerId}`)
}

/**
 * 협력사 목록 조회
 * GET /partner
 */
export const fetchPartnerList = () => {
  return api.get(PATH)
}

/**
 * 협력사 정보 수정
 * PUT /partner/{partnerId}
 */
export const updatePartner = (partnerId, payload) => {
  return api.put(`${PATH}/${partnerId}`, payload)
}

/**
 * 협력사 평가 등록/수정
 * PUT /partner/{partnerId}/evaluation
 */
export const evaluatePartner = (partnerId, payload) => {
  return api.put(`${PATH}/${partnerId}/evaluation`, payload)
}

/**
 * 협력사 삭제
 * DELETE /partner/{partnerId}
 */
export const deletePartner = (partnerId) => {
  return api.delete(`${PATH}/${partnerId}`)
}
