import api from './index'

const BASE_URL = '/work-order'

// 1. 작업 지시서 작성
export const createWorkOrder = async (workOrderData) => {
  return await api.post(BASE_URL, workOrderData)
}

export const getWorkOrderList = async () => {
  return await api.get(BASE_URL)
}

export const getWorkOrderSlice = async (params = {}) => {
  return await api.get(`${BASE_URL}/slice`, { params })
}

// 2. 작업 지시서 단일 조회
export const getWorkOrder = async (workOrderId) => {
  return await api.get(`${BASE_URL}/${workOrderId}`)
}

// 3. 작업 지시서 수정
export const updateWorkOrder = async (workOrderId, workOrderData) => {
  return await api.put(`${BASE_URL}/${workOrderId}`, workOrderData)
}

// 4. 작업 지시서 삭제
export const deleteWorkOrder = async (workOrderId) => {
  return await api.delete(`${BASE_URL}/${workOrderId}`)
}

export const approveWorkOrder = async (workOrderId) => {
  return await api.put(`${BASE_URL}/${workOrderId}/approve`)
}

/* 중장비 입출차 현황 페이지용 — 게이트별 투입 장비 목록 조회*/
export const getGateEquipments = async (targetDate = null, projectId = null, options = {}) => {
  const params = {}
  if (targetDate) params.targetDate = targetDate
  if (projectId) params.projectId = projectId
  if (options.includeNoEquipment) params.includeNoEquipment = true
  return await api.get(`${BASE_URL}/gate-equipments`, { params })
}
