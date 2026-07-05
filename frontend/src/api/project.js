import api from './index.js'

/** @returns {Promise<Array<{ idx: number, name: string, location?: string, period?: string }>>} */
export async function getProjectList() {
  return await api.get('/project')
}

/**
 * @param {number|string} projectId
 * @returns {Promise<{ idx: number, name: string, location?: string, startDate?: string|null, endDate?: string|null, period?: string }>}
 */
export async function getProject(projectId) {
  return await api.get(`/project/${projectId}`)
}

/**
 * @param {{ name: string, location?: string, startDate?: string|null, endDate?: string|null }} body
 */
export async function createProject(body) {
  return await api.post('/project', body)
}

/**
 * @param {number|string} projectId
 * @param {{ name?: string, location?: string|null, startDate?: string|null, endDate?: string|null }} body
 */
export async function updateProject(projectId, body) {
  return await api.put(`/project/${projectId}`, body)
}

/**
 * 현장 운영 종료 (active = false)
 * @param {number|string} projectId
 */
export async function deactivateProject(projectId) {
  return await api.patch(`/project/${projectId}/deactivate`)
}

/**
 * 현장 운영 재개 (active = true)
 * @param {number|string} projectId
 */
export async function activateProject(projectId) {
  return await api.patch(`/project/${projectId}/activate`)
}

/**
 * 현장별 공정(공종) 목록 — 공종 선택용
 * @param {number|string} projectId
 * @param {string} [tradeName]
 */
export async function getTradeProcessList(projectId, tradeName) {
  const params = { projectId }
  if (tradeName) params.tradeName = tradeName
  return await api.get('/trade-process', { params })
}

/**
 * 계정 생성 공종 드롭다운 전용.
 * isMilestone=true 이고 '준공','착공' 제외한 공종명 목록(List<String>) 반환.
 * @param {number|string} projectId
 * @returns {Promise<string[]>}
 */
export async function getMilestoneTradeNames(projectId) {
  return await api.get('/trade-process/milestone-trades', { params: { projectId } })
}
