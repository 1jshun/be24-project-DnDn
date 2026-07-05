import {
  fetchGateList,
  fetchGate,
  fetchGateBlueprint,
  saveGateBlueprint,
  createGate,
  updateGatePosition,
  updateGateVehicles,
  updateGateManpower,
  addGateMachine,
  toggleGateMachine,
  removeGateMachine,
  deleteGate,
} from '@/api/gate'
import { getGateEquipments } from '@/api/workOrder'

export async function fetchHeavyEquipmentGateList(projectId = null) {
  const response = await fetchGateList(projectId)
  return Array.isArray(response) ? response : []
}

export async function fetchHeavyEquipmentGate(gateId) {
  return fetchGate(gateId)
}

export async function createHeavyEquipmentGate(payload, projectId = null) {
  return createGate(payload, projectId)
}

export async function fetchHeavyEquipmentGateBlueprint(projectId) {
  if (!projectId) return null
  return fetchGateBlueprint(projectId)
}

export async function saveHeavyEquipmentGateBlueprint(projectId, payload) {
  if (!projectId) throw new Error('현장 ID가 없어 도면을 저장할 수 없습니다.')
  return saveGateBlueprint(projectId, payload)
}

export async function updateHeavyEquipmentGatePosition(gateId, payload) {
  return updateGatePosition(gateId, payload)
}

export async function updateHeavyEquipmentGateVehicles(gateId, vehicles) {
  return updateGateVehicles(gateId, vehicles)
}

export async function updateHeavyEquipmentGateManpower(gateId, manpower) {
  return updateGateManpower(gateId, manpower)
}

export async function addHeavyEquipmentGateMachine(gateId) {
  return addGateMachine(gateId)
}

export async function toggleHeavyEquipmentGateMachine(gateId, machineId) {
  return toggleGateMachine(gateId, machineId)
}

export async function removeHeavyEquipmentGateMachine(gateId, machineId) {
  return removeGateMachine(gateId, machineId)
}

export async function deleteHeavyEquipmentGate(gateId) {
  return deleteGate(gateId)
}

export async function fetchGateWorkOrderEquipments(targetDate, projectId) {
  const response = await getGateEquipments(targetDate, projectId)
  return Array.isArray(response) ? response : []
}
