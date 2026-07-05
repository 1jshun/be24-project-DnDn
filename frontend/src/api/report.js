import api from './index.js'

const BASE_URL = '/report'

/**
 * 특정 일자의 공사일보 목록 조회
 * @param {string} date yyyy-MM-dd
 */
export async function getReportsByDate(date) {
  return await api.get(`${BASE_URL}/`, { params: { date } })
}
