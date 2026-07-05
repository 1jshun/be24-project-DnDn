import api from './index.js'

const BASE_URL = '/esg'

/**
 * ESG 대시보드 공사현장 목록/순위/현재 현장 스냅샷 조회
 * @param {{ reportDate?: string, projectId?: number|string|null }} params
 */
export async function getEsgDashboard(params = {}) {
  const query = {}
  if (params.reportDate) query.reportDate = params.reportDate
  if (params.projectId !== null && params.projectId !== undefined && params.projectId !== '') {
    query.projectId = params.projectId
  }
  return await api.get(`${BASE_URL}/dashboard`, { params: query })
}

/**
 * 선택 일자의 ESG 계산 결과를 현장별 일일 스냅샷으로 저장
 * @param {object} body
 */
export async function saveEsgSnapshot(body) {
  return await api.post(`${BASE_URL}/snapshots`, body)
}
