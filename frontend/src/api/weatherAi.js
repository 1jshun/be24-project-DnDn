import api from '@/api/index.js'

export async function analyzeWeatherRisk(date, projectId = null) {
  return api.post('/ai/weather/analyze', null, {
    params: {
      date,
      ...(projectId != null ? { projectId } : {}),
    },
    timeout: 60000,
  })
}
