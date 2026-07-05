import api from '@/api/index.js'
import { getGateEquipments } from '@/api/workOrder'
import { analyzeWeatherRisk } from '@/api/weatherAi'

export async function fetchWeatherDashboard(reportDate) {
  return api.get('/weather/dashboard', {
    params: { reportDate },
    timeout: 30000,
  })
}

export async function fetchWeatherWorkOrderEquipments(reportDate, projectId) {
  const response = await getGateEquipments(reportDate, projectId, { includeNoEquipment: true })
  return Array.isArray(response) ? response : []
}

export async function fetchWeatherAiAnalysis(reportDate, projectId) {
  return analyzeWeatherRisk(reportDate, projectId)
}
