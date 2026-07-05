import api from './index.js'

const PATH = '/analysis'

/**
 * 공정 진척률 비교 조회
 * GET /analysis/progress?projectId=
 */
export const fetchProgressList = (projectId) => {
  return api.get(`${PATH}/progress`, {
    params: { projectId },
  })
}

/**
 * 세부 작업 지연 위험 목록 조회
 * GET /analysis/delay-risk-tasks?projectId=&tradeProcessId=
 */
export const fetchDelayRiskTasks = (projectId, tradeProcessId = null) => {
  const params = { projectId }

  if (tradeProcessId) {
    params.tradeProcessId = tradeProcessId
  }

  return api.get(`${PATH}/delay-risk-tasks`, {
    params,
  })
}
