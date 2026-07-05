import api from './index.js'

const PATH = '/gate'

/**
 * 게이트 목록 조회
 * GET /gate
 */
export const fetchGateList = (projectId = null) => {
  return api.get(PATH, {
    params: projectId ? { projectId } : {},
  })
}


/**
 * 공사현장별 도면 조회
 * GET /gate/blueprint?projectId={projectId}
 */
export const fetchGateBlueprint = (projectId) => {
  return api.get(`${PATH}/blueprint`, { params: { projectId } })
}

/**
 * 공사현장별 도면 저장
 * PUT /gate/blueprint?projectId={projectId}
 */
export const saveGateBlueprint = (projectId, payload) => {
  return api.put(`${PATH}/blueprint`, payload, { params: { projectId } })
}

/**
 * 게이트 단일 조회
 * GET /gate/{gateId}
 */
export const fetchGate = (gateId) => {
  return api.get(`${PATH}/${gateId}`)
}

/**
 * 게이트 등록
 * POST /gate
 */
export const createGate = (payload, projectId = null) => {
  return api.post(PATH, payload, {
    params: projectId ? { projectId } : {},
  })
}

/**
 * 게이트 정보 수정
 * PUT /gate/{gateId}
 */
export const updateGate = (gateId, payload) => {
  return api.put(`${PATH}/${gateId}`, payload)
}

/**
 * 게이트 좌표 수정 (드래그 종료)
 * PATCH /gate/{gateId}/position
 */
export const updateGatePosition = (gateId, payload) => {
  return api.patch(`${PATH}/${gateId}/position`, payload)
}

/**
 * 진입 차량 수 수정
 * PATCH /gate/{gateId}/vehicles
 */
export const updateGateVehicles = (gateId, vehicles) => {
  return api.patch(`${PATH}/${gateId}/vehicles`, { vehicles })
}

/**
 * 배치 인원 수정
 * PATCH /gate/{gateId}/manpower
 */
export const updateGateManpower = (gateId, manpower) => {
  return api.patch(`${PATH}/${gateId}/manpower`, { manpower })
}

/**
 * 세척 기계 추가
 * POST /gate/{gateId}/machine
 */
export const addGateMachine = (gateId) => {
  return api.post(`${PATH}/${gateId}/machine`)
}

/**
 * 세척 기계 ON/OFF 토글
 * PATCH /gate/{gateId}/machine/{machineId}
 */
export const toggleGateMachine = (gateId, machineId) => {
  return api.patch(`${PATH}/${gateId}/machine/${machineId}`)
}

/**
 * 세척 기계 삭제
 * DELETE /gate/{gateId}/machine/{machineId}
 */
export const removeGateMachine = (gateId, machineId) => {
  return api.delete(`${PATH}/${gateId}/machine/${machineId}`)
}

/**
 * 게이트 삭제
 * DELETE /gate/{gateId}
 */
export const deleteGate = (gateId) => {
  return api.delete(`${PATH}/${gateId}`)
}