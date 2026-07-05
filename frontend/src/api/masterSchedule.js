import api from './index.js'

export function fetchMasterSchedules({ projectId, docType } = {}) {
  const params = { projectId }
  if (docType) params.docType = docType
  return api.get('/master-schedule', { params })
}

/**
 * 공정표 파일 업로드 + AI 분석 (OpenAI 기반 추출)
 *
 * 백엔드: POST /master-schedule/upload (multipart/form-data)
 *   - projectId : 현장 ID
 *   - docType   : 한글 라벨 (예: '마스터 공정표', '마일스톤 공정표',
 *                              '공종별 시공계획서', '보할 공정표')
 *   - file      : 업로드 파일 (xlsx, xls, pdf, png, jpg, jpeg)
 *
 * 응답: TradeProcessDto.Res[]
 *   [{ idx, masterScheduleId, projectId, tradeName, processName,
 *      partnerCompany, plannedStart, plannedEnd, period,
 *      weightPct, isMilestone }, ...]
 *
 * @param {Object}       params
 * @param {number|string} params.projectId
 * @param {string}       params.docType   한글 라벨
 * @param {File}         params.file
 * @param {Function}    [params.onUploadProgress] (percent: 0~100) => void
 * @returns {Promise<Array>} TradeProcessDto.Res 배열
 */
export function uploadAndExtractSchedule({ projectId, docType, file, onUploadProgress }) {
  const formData = new FormData()
  formData.append('projectId', String(projectId))
  formData.append('docType', docType)
  formData.append('file', file)

  return api.post('/master-schedule/upload', formData, {
    // FormData 사용 시 Content-Type 헤더는 axios가 boundary 포함해 자동 설정하도록
    // index.js의 기본 'application/json'을 명시적으로 덮어씀
    headers: { 'Content-Type': 'multipart/form-data' },
    // OpenAI 분석은 시간이 걸리므로 충분히 길게 (5분)
    timeout: 5 * 60 * 1000,
    onUploadProgress: (e) => {
      if (!onUploadProgress || !e.total) return
      const percent = Math.round((e.loaded * 100) / e.total)
      onUploadProgress(percent)
    },
  })
}

/**
 * 공정 단건 수정 (PUT /trade-process/{tpId})
 * 백엔드 TradeProcessController.update 와 매칭.
 *
 * @param {number|string} tpId  TradeProcess.idx
 * @param {Object} body         TradeProcessDto.Req 형태
 *   { masterScheduleId, tradeName, processName, partnerCompany,
 *     plannedStart, plannedEnd, weightPct, isMilestone }
 */
export function updateTradeProcess(tpId, body) {
  return api.put(`/trade-process/${tpId}`, body)
}
