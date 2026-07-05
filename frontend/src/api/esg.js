const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export async function fetchEsgDashboard(reportDate) {
  try {
    const url = `${API_BASE_URL}/esg/dashboard?reportDate=${reportDate}`
    const response = await fetch(url)
    
    if (!response.ok) {
      console.warn(`[ESG API] ${response.status} - ${url}`)
      return createEmptyEsgData()
    }
    
    const data = await response.json()
    return normalizeEsgResponse(data)
  } catch (error) {
    console.error('[ESG API] ESG 대시보드 조회 실패:', error)
    return createEmptyEsgData()
  }
}

// 응답 정규화 함수
function normalizeEsgResponse(data) {
  if (!data) return createEmptyEsgData()
  
  return {
    zones: Array.isArray(data.zones) ? data.zones : [],
    scoresByZone: data.scoresByZone || {},
    safetyDays: data.safetyDays || {},
    ranking: data.ranking || 1,
  }
}

function createEmptyEsgData() {
  return {
    zones: [],
    scoresByZone: {},
    safetyDays: {},
    ranking: 1,
  }
}
