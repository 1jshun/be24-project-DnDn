export const BLUEPRINT_STORAGE_KEY = 'dndn-gate-blueprint'
export const MIN_BLUEPRINT_ZOOM = 0.75
export const MAX_BLUEPRINT_ZOOM = 1.4
export const BLUEPRINT_ZOOM_STEP = 0.05
export const DRAG_THRESHOLD_PX = 5

export const STATUS_COLOR_MAP = {
  CRITICAL: 'text-rose-500 bg-rose-50 border-rose-200',
  BUSY: 'text-amber-500 bg-amber-50 border-amber-200',
  SMOOTH: 'text-blue-500 bg-blue-50 border-blue-200',
}

export const MARKER_COLOR_MAP = {
  CRITICAL: 'bg-rose-500 shadow-rose-200',
  BUSY: 'bg-amber-500 shadow-amber-200',
  SMOOTH: 'bg-blue-500 shadow-blue-200',
}

export const NOTICE_CLASS_MAP = {
  HUMAN_WASH_MODE: 'bg-blue-50 text-blue-700',
  INEFFICIENT: 'bg-amber-50 text-amber-700',
  CRITICAL_GUIDE: 'bg-amber-50 text-amber-700',
  OPTIMAL: 'bg-blue-50 text-blue-700',
}

export const EQUIPMENT_STATUS_CLASS_MAP = {
  작업중: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  대기: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  입차예정: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  완료: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
}

export function getTodayDateText() {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

export function normalizeGateKey(value) {
  if (value == null || value === '') return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}


export function getNextAvailableGateNumber(gates = []) {
  const usedNumbers = new Set()

  gates.forEach((gate) => {
    const matched = String(gate?.name || '').match(/\d+/)
    const numberValue = matched ? Number(matched[0]) : Number(gate?.businessKey ?? gate?.idx)

    if (Number.isInteger(numberValue) && numberValue > 0) {
      usedNumbers.add(numberValue)
    }
  })

  let nextNumber = 1
  while (usedNumbers.has(nextNumber)) {
    nextNumber += 1
  }

  return nextNumber
}

export function getGateBusinessKey(gate) {
  if (!gate) return null

  const matched = String(gate.name || '').match(/\d+/)
  if (matched) return Number(matched[0])

  return gate.idx
}

export function getGateByAssignment(gates, gateIdx) {
  const key = normalizeGateKey(gateIdx)
  if (key == null) return null

  return gates.find((gate) => gate.idx === key || getGateBusinessKey(gate) === key)
}

export function getGateNameByAssignment(gates, gateIdx) {
  const gate = getGateByAssignment(gates, gateIdx)
  if (gate) return gate.name

  return gateIdx != null ? `${gateIdx}번 게이트` : '게이트 미배정'
}

export function mapWorkOrderEquipments(rawEquipments, gates) {
  return rawEquipments.map((item, index) => ({
    id: item.idx ?? `${item.workOrderIdx}-${item.gateIdx}-${index}`,
    name: item.equipmentName || '장비명 미지정',
    type: item.equipmentType || item.equipmentName || '중장비',
    count: item.equipmentCount ?? 1,
    status: item.statusLabel || '작업중',
    gateIdx: item.gateIdx,
    gate: getGateNameByAssignment(gates, item.gateIdx),
    workLocation: item.workLocation || '작업위치 미지정',
    workDetail: item.workDetail || '작업상세내역 없음',
    instruction: item.workOrderRef || `WO-${item.workOrderIdx ?? '-'}`,
    title: item.title || '작업지시서',
    tradeType: item.tradeType || '공종 미지정',
  }))
}

export function buildEquipmentCountByGateKey(equipments) {
  const map = {}

  equipments.forEach((equipment) => {
    const key = normalizeGateKey(equipment.gateIdx)
    if (key == null) return

    map[key] = (map[key] ?? 0) + (equipment.count ?? 1)
  })

  return map
}

export function getPlannedEquipmentCount(gate, equipmentCountByGateKey) {
  if (!gate) return 0

  const businessKey = getGateBusinessKey(gate)
  return equipmentCountByGateKey[businessKey] ?? equipmentCountByGateKey[gate.idx] ?? 0
}

export function getGateVehicleCountForDisplay(gate, equipmentCountByGateKey) {
  const plannedCount = getPlannedEquipmentCount(gate, equipmentCountByGateKey)
  if (plannedCount > 0) return plannedCount

  return gate?.vehicles ?? 0
}

export function getGateCapacityValue(gate) {
  if (!gate) return 0
  if (gate.capacity != null) return gate.capacity

  const manpower = gate.manpower ?? 2
  const activeMachines = Array.isArray(gate.machines)
    ? gate.machines.filter((machine) => machine.active ?? machine).length
    : 0

  if (activeMachines > 0) {
    return activeMachines * 5 + Math.floor((manpower - 2) / 2) * 3
  }

  return Math.max(3, Math.floor(manpower / 2) * 3)
}

export function getGateDisplayCongestion(gate, equipmentCountByGateKey) {
  if (!gate) return 'SMOOTH'

  const count = getGateVehicleCountForDisplay(gate, equipmentCountByGateKey)
  const capacity = getGateCapacityValue(gate)

  if (count <= capacity) return 'SMOOTH'
  if (count <= capacity + 3) return 'BUSY'
  return 'CRITICAL'
}

export function getGateDisplayCongestionLabel(gate, equipmentCountByGateKey) {
  const congestion = getGateDisplayCongestion(gate, equipmentCountByGateKey)

  if (congestion === 'CRITICAL') return '매우 혼잡'
  if (congestion === 'BUSY') return '혼잡'
  return '원활'
}

export function getStatusColor(gate, equipmentCountByGateKey) {
  return STATUS_COLOR_MAP[getGateDisplayCongestion(gate, equipmentCountByGateKey)] ?? STATUS_COLOR_MAP.SMOOTH
}

export function getMarkerColor(gate, equipmentCountByGateKey) {
  return MARKER_COLOR_MAP[getGateDisplayCongestion(gate, equipmentCountByGateKey)] ?? MARKER_COLOR_MAP.SMOOTH
}

export function getNoticeClass(gate, equipmentCountByGateKey) {
  const displayCongestion = getGateDisplayCongestion(gate, equipmentCountByGateKey)

  if (displayCongestion === 'CRITICAL') return 'bg-rose-50 text-rose-700'
  if (displayCongestion === 'BUSY') return 'bg-amber-50 text-amber-700'

  return NOTICE_CLASS_MAP[gate?.noticeType] ?? NOTICE_CLASS_MAP.OPTIMAL
}

export function getNoticeMessage(gate, equipmentCountByGateKey) {
  if (!gate) return ''

  const plannedCount = getPlannedEquipmentCount(gate, equipmentCountByGateKey)
  const capacity = getGateCapacityValue(gate)
  const displayCongestion = getGateDisplayCongestion(gate, equipmentCountByGateKey)

  if (plannedCount > 0 && displayCongestion === 'CRITICAL') {
    return `작업지시서 기준 ${plannedCount}대가 ${gate.name}에 배정되어 수용 기준 ${capacity}대를 초과합니다. 우회 게이트나 입차 시간 분산을 검토해 주세요.`
  }

  if (plannedCount > 0 && displayCongestion === 'BUSY') {
    return `작업지시서 기준 ${plannedCount}대가 ${gate.name}에 배정되어 혼잡 가능성이 있습니다. 입차 순서와 유도 인원을 확인해 주세요.`
  }

  return gate.noticeMessage || '게이트 운영 상태가 안정적입니다.'
}

export function getEquipmentStatusClass(statusLabel) {
  return EQUIPMENT_STATUS_CLASS_MAP[statusLabel] ?? EQUIPMENT_STATUS_CLASS_MAP.완료
}

export function getClosestSmoothGate(selectedGate, gates, equipmentCountByGateKey) {
  if (!selectedGate || getGateDisplayCongestion(selectedGate, equipmentCountByGateKey) !== 'CRITICAL') return null

  const availableGates = gates.filter((gate) => (
    gate.idx !== selectedGate.idx && getGateDisplayCongestion(gate, equipmentCountByGateKey) === 'SMOOTH'
  ))

  if (!availableGates.length) return null

  return availableGates.reduce((closestGate, gate) => {
    const closestDistance = Math.hypot(closestGate.x - selectedGate.x, closestGate.y - selectedGate.y)
    const currentDistance = Math.hypot(gate.x - selectedGate.x, gate.y - selectedGate.y)
    return currentDistance < closestDistance ? gate : closestGate
  })
}

export function clampPercent(value) {
  return Math.max(0, Math.min(100, value))
}
