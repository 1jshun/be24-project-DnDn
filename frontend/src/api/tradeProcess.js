import api from './index.js'

const PATH = '/trade-process'

const toTradeProcessPlan = (dto) => ({
  id: `tp-${dto.idx}`,
  tradeProcessId: dto.idx,
  masterScheduleId: dto.masterScheduleId,
  projectId: dto.projectId,

  name: dto.processName,
  trade: dto.tradeName,
  partner: dto.partnerCompany || '',

  start: dto.plannedStart,
  end: dto.plannedEnd,

  weightPct: dto.weightPct ?? 0,
  isMilestone: dto.isMilestone ?? false,

  planType: '기준',
  status: '진행 예정',
  source: 'trade_process',
})

export const fetchTradeProcessList = async (params = {}) => {
  const dtos = await api.get(PATH, { params })
  return Array.isArray(dtos) ? dtos.map(toTradeProcessPlan) : []
}

/**
 * 백엔드 TradeProcessDto.Res[] 를 변환 없이 원본 그대로 반환.
 * scheduleMapper.buildGanttData() 의 입력으로 사용.
 *
 * @param {Object}        params
 * @param {number|string} params.projectId
 * @param {string}        [params.tradeName]  공종 필터 (선택)
 * @returns {Promise<Array>}
 */
export const listTradeProcessesRaw = async ({ projectId, tradeName, includeAllTrades = false } = {}) => {
  const params = { projectId }
  if (tradeName) params.tradeName = tradeName
  if (includeAllTrades) params.includeAllTrades = true
  const dtos = await api.get(PATH, { params })
  return Array.isArray(dtos) ? dtos : []
}

/**
 * 단건 PUT — 미리보기 모달의 인라인 편집 저장에 사용.
 *
 * @param {number|string} tpId  TradeProcess.idx
 * @param {Object} body         TradeProcessDto.Req 형태
 */
export const updateTradeProcess = (tpId, body) => api.put(`${PATH}/${tpId}`, body)
