import api from './index.js'

const PATH = '/ai/schedule-recommendations'

export const createAiScheduleRecommendation = (payload) => {
  return api.post(PATH, payload, { timeout: 60000 })
}

export const fetchAiScheduleRecommendations = (projectId) => {
  return api.get(PATH, { params: { projectId } })
}

export const fetchAiScheduleRecommendation = (id) => {
  return api.get(`${PATH}/${id}`)
}

export const completeAiScheduleRecommendation = (id, payload) => {
  return api.post(`${PATH}/${id}/complete`, payload)
}

export const failAiScheduleRecommendation = (id, payload) => {
  return api.post(`${PATH}/${id}/fail`, payload)
}
