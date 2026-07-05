<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useCurrentProject } from '@/composables/useCurrentProject.js'
import siteLayout from '@/assets/Firefly_Gemini Flash.png'
import HeavyEquipmentGateDetail from '@/components/gate/HeavyEquipmentGateDetail.vue'
import HeavyEquipmentHeader from '@/components/gate/HeavyEquipmentHeader.vue'
import HeavyEquipmentMapPanel from '@/components/gate/HeavyEquipmentMapPanel.vue'
import HeavyEquipmentStatusTable from '@/components/gate/HeavyEquipmentStatusTable.vue'
import {
  addHeavyEquipmentGateMachine,
  createHeavyEquipmentGate,
  deleteHeavyEquipmentGate,
  fetchGateWorkOrderEquipments,
  fetchHeavyEquipmentGate,
  fetchHeavyEquipmentGateBlueprint,
  fetchHeavyEquipmentGateList,
  removeHeavyEquipmentGateMachine,
  saveHeavyEquipmentGateBlueprint,
  toggleHeavyEquipmentGateMachine,
  updateHeavyEquipmentGateManpower,
  updateHeavyEquipmentGatePosition,
  updateHeavyEquipmentGateVehicles,
} from '@/api/heavyEquipmentGate.js'
import {
  BLUEPRINT_STORAGE_KEY,
  BLUEPRINT_ZOOM_STEP,
  MAX_BLUEPRINT_ZOOM,
  MIN_BLUEPRINT_ZOOM,
  buildEquipmentCountByGateKey,
  getClosestSmoothGate,
  getEquipmentStatusClass,
  getGateBusinessKey,
  getGateCapacityValue,
  getGateDisplayCongestion,
  getGateDisplayCongestionLabel,
  getGateVehicleCountForDisplay,
  getMarkerColor,
  getNoticeClass,
  getNoticeMessage,
  getPlannedEquipmentCount,
  getStatusColor,
  getNextAvailableGateNumber,
  getTodayDateText,
  mapWorkOrderEquipments,
} from '@/utils/heavyEquipmentGateMapper.js'

const { currentProjectId } = useCurrentProject()

const gates = ref([])
const selectedGateId = ref(null)
const isAddMode = ref(false)
const isLoading = ref(false)
const targetDate = ref(getTodayDateText())
const workOrderEquipments = ref([])
const isEquipmentLoading = ref(false)
const draggingGateId = ref(null)

const blueprintInputRef = ref(null)
const DEFAULT_BLUEPRINT_ASPECT_RATIO = '16 / 10'
const customBlueprint = ref(null)
const blueprintAspectRatio = ref(DEFAULT_BLUEPRINT_ASPECT_RATIO)
const blueprintProjectId = computed(() => currentProjectId.value ?? 1)
const blueprintZoom = ref(1)

const activeBlueprint = computed(() => customBlueprint.value || siteLayout)
const blueprintZoomPercent = computed(() => `${Math.round(blueprintZoom.value * 100)}%`)
const gateMarkerScale = computed(() =>
  Math.max(0.82, Math.min(1.12, 0.88 + blueprintZoom.value * 0.12)),
)
const isBlueprintZoomed = computed(() => blueprintZoom.value > 1.01)
const mapCursorClass = computed(() => {
  if (draggingGateId.value !== null) return 'cursor-grabbing'
  if (isAddMode.value) return 'cursor-crosshair'
  if (isBlueprintZoomed.value) return 'cursor-grab'
  return ''
})

const todayEquipments = computed(() =>
  mapWorkOrderEquipments(workOrderEquipments.value, gates.value),
)
const hasTodayEquipments = computed(() => todayEquipments.value.length > 0)
const totalAssignedEquipmentCount = computed(() =>
  todayEquipments.value.reduce((sum, equipment) => sum + (equipment.count ?? 1), 0),
)
const equipmentCountByGateKey = computed(() => buildEquipmentCountByGateKey(todayEquipments.value))

const displayGates = computed(() => {
  return gates.value.map((gate) => enrichGate(gate))
})

const selectedGate = computed(() => {
  const gate = gates.value.find((item) => item.idx === selectedGateId.value)
  return gate ? enrichGate(gate) : null
})

const recommendedGate = computed(() => {
  const gate = selectedGate.value
  if (!gate) return null

  const closestGate = getClosestSmoothGate(gate, gates.value, equipmentCountByGateKey.value)
  return closestGate ? enrichGate(closestGate) : null
})

function enrichGate(gate) {
  const plannedEquipmentCount = getPlannedEquipmentCount(gate, equipmentCountByGateKey.value)
  const displayCongestion = getGateDisplayCongestion(gate, equipmentCountByGateKey.value)

  return {
    ...gate,
    businessKey: getGateBusinessKey(gate),
    capacityValue: getGateCapacityValue(gate),
    displayCongestion,
    displayCongestionLabel: getGateDisplayCongestionLabel(gate, equipmentCountByGateKey.value),
    displayVehicleCount: getGateVehicleCountForDisplay(gate, equipmentCountByGateKey.value),
    markerColor: getMarkerColor(gate, equipmentCountByGateKey.value),
    noticeClass: getNoticeClass(gate, equipmentCountByGateKey.value),
    noticeMessage: getNoticeMessage(gate, equipmentCountByGateKey.value),
    plannedEquipmentCount,
    statusColor: getStatusColor(gate, equipmentCountByGateKey.value),
  }
}

const displayEquipments = computed(() => {
  return todayEquipments.value.map((equipment) => ({
    ...equipment,
    statusClass: getEquipmentStatusClass(equipment.status),
  }))
})

async function loadGates() {
  isLoading.value = true

  try {
    gates.value = await fetchHeavyEquipmentGateList(blueprintProjectId.value)

    if (gates.value.length && !selectedGateId.value) {
      selectedGateId.value = gates.value[0].idx
    }
  } catch (error) {
    console.error('게이트 목록 조회 실패', error)
    gates.value = []
  } finally {
    isLoading.value = false
  }
}

async function loadTodayEquipments() {
  isEquipmentLoading.value = true

  try {
    workOrderEquipments.value = await fetchGateWorkOrderEquipments(targetDate.value, blueprintProjectId.value)
  } catch (error) {
    console.error('작업지시서 장비 조회 실패', error)
    workOrderEquipments.value = []
  } finally {
    isEquipmentLoading.value = false
  }
}

async function refreshGate(gateId) {
  try {
    const updated = await fetchHeavyEquipmentGate(gateId)
    const index = gates.value.findIndex((gate) => gate.idx === gateId)

    if (index !== -1) {
      gates.value[index] = updated
    } else {
      gates.value.push(updated)
    }
  } catch (error) {
    console.error('게이트 갱신 실패', error)
  }
}

async function loadPageData() {
  await Promise.all([loadGates(), loadTodayEquipments()])
}


async function updateManpower(delta) {
  if (!selectedGate.value) return

  const next = selectedGate.value.manpower + delta
  if (next < 2) return

  try {
    await updateHeavyEquipmentGateManpower(selectedGate.value.idx, next)
    await refreshGate(selectedGate.value.idx)
  } catch (error) {
    console.error('배치 인원 수정 실패', error)
  }
}

async function updateVehicles(delta) {
  if (!selectedGate.value) return

  const next = Math.max(0, selectedGate.value.vehicles + delta)

  try {
    await updateHeavyEquipmentGateVehicles(selectedGate.value.idx, next)
    await refreshGate(selectedGate.value.idx)
  } catch (error) {
    console.error('진입 차량 수정 실패', error)
  }
}

async function toggleMachine(machineId) {
  if (!selectedGate.value) return

  try {
    await toggleHeavyEquipmentGateMachine(selectedGate.value.idx, machineId)
    await refreshGate(selectedGate.value.idx)
  } catch (error) {
    console.error('세척 기계 토글 실패', error)
  }
}

async function addMachine() {
  if (!selectedGate.value) return

  try {
    await addHeavyEquipmentGateMachine(selectedGate.value.idx)
    await refreshGate(selectedGate.value.idx)
  } catch (error) {
    console.error('세척 기계 추가 실패', error)
  }
}

async function removeMachine(machineId) {
  if (!selectedGate.value) return

  try {
    await removeHeavyEquipmentGateMachine(selectedGate.value.idx, machineId)
    await refreshGate(selectedGate.value.idx)
  } catch (error) {
    console.error('세척 기계 삭제 실패', error)
  }
}

async function addCustomGate({ x, y }) {
  const nextSeq = getNextAvailableGateNumber(gates.value)

  try {
    const created = await createHeavyEquipmentGate(
      {
        name: `Gate ${nextSeq}`,
        x,
        y,
      },
      blueprintProjectId.value,
    )

    await loadGates()
    selectedGateId.value =
      typeof created === 'number'
        ? created
        : (created?.idx ?? gates.value[gates.value.length - 1]?.idx ?? null)
    isAddMode.value = false
  } catch (error) {
    console.error('게이트 등록 실패', error)
  }
}

async function removeGate(gateId) {
  try {
    await deleteHeavyEquipmentGate(gateId)
    gates.value = gates.value.filter((gate) => gate.idx !== gateId)

    if (selectedGateId.value === gateId) {
      selectedGateId.value = gates.value[0]?.idx ?? null
    }
  } catch (error) {
    console.error('게이트 삭제 실패', error)
  }
}

function handleMarkerDragStart({ gate, event }) {
  event.stopPropagation()
  draggingGateId.value = gate.idx

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(gate.idx))
  }
}

async function handleMarkerDragEnd({ gate, x, y }) {
  draggingGateId.value = null

  gate.x = x
  gate.y = y

  try {
    await updateHeavyEquipmentGatePosition(gate.idx, { x, y })
    await refreshGate(gate.idx)
  } catch (error) {
    console.error('게이트 좌표 저장 실패', error)
    await refreshGate(gate.idx)
  }
}

function handleMarkerClick({ gateId, event }) {
  event.stopPropagation()
  selectedGateId.value = gateId
}

function clearSelectedGate() {
  selectedGateId.value = null
}

function toggleAddMode() {
  isAddMode.value = !isAddMode.value
}

function applyBlueprintAspectRatio(imageSource) {
  if (!imageSource || typeof Image === 'undefined') {
    blueprintAspectRatio.value = DEFAULT_BLUEPRINT_ASPECT_RATIO
    return
  }

  const image = new Image()
  image.onload = () => {
    if (!image.naturalWidth || !image.naturalHeight) {
      blueprintAspectRatio.value = DEFAULT_BLUEPRINT_ASPECT_RATIO
      return
    }

    blueprintAspectRatio.value = `${image.naturalWidth} / ${image.naturalHeight}`
  }
  image.onerror = () => {
    blueprintAspectRatio.value = DEFAULT_BLUEPRINT_ASPECT_RATIO
  }
  image.src = imageSource
}

const MAX_BLUEPRINT_FILE_SIZE = 10 * 1024 * 1024

async function loadBlueprintFromServer() {
  try {
    const saved = await fetchHeavyEquipmentGateBlueprint(blueprintProjectId.value)

    if (saved?.dataUrl) {
      customBlueprint.value = saved.dataUrl
      blueprintZoom.value = 1
      applyBlueprintAspectRatio(saved.dataUrl)
      return
    }

    customBlueprint.value = null
    blueprintZoom.value = 1
    applyBlueprintAspectRatio(siteLayout)
  } catch (error) {
    console.error('서버 저장 도면 조회 실패', error)
    customBlueprint.value = null
    blueprintZoom.value = 1
    applyBlueprintAspectRatio(siteLayout)
    return
  }

  try {
    const legacySaved = window.localStorage.getItem(BLUEPRINT_STORAGE_KEY)
    if (!legacySaved) return

    customBlueprint.value = legacySaved
    blueprintZoom.value = 1
    applyBlueprintAspectRatio(legacySaved)

    try {
      await saveHeavyEquipmentGateBlueprint(blueprintProjectId.value, {
        dataUrl: legacySaved,
        originalFileName: 'legacy-blueprint',
      })
      window.localStorage.removeItem(BLUEPRINT_STORAGE_KEY)
    } catch (error) {
      console.error('기존 로컬 도면 서버 이전 실패', error)
    }
  } catch (error) {
    console.error('기존 로컬 도면 조회 실패', error)
  }
}

function triggerBlueprintUpload() {
  blueprintInputRef.value?.click()
}

function handleBlueprintUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    window.alert('이미지 파일만 업로드할 수 있습니다.')
    event.target.value = ''
    return
  }

  if (file.size > MAX_BLUEPRINT_FILE_SIZE) {
    window.alert('10MB 이하 이미지만 업로드할 수 있습니다.')
    event.target.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = async (readerEvent) => {
    const dataUrl = readerEvent.target?.result
    if (typeof dataUrl !== 'string') return

    customBlueprint.value = dataUrl
    blueprintZoom.value = 1
    applyBlueprintAspectRatio(dataUrl)

    try {
      await saveHeavyEquipmentGateBlueprint(blueprintProjectId.value, {
        dataUrl,
        originalFileName: file.name,
      })
      window.localStorage.removeItem(BLUEPRINT_STORAGE_KEY)
    } catch (error) {
      console.error('도면 저장 실패', error)
      window.alert('도면을 화면에는 반영했지만, 서버 저장에 실패했습니다. 잠시 후 다시 업로드해주세요.')
    }
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

function zoomInBlueprint() {
  blueprintZoom.value = Math.min(MAX_BLUEPRINT_ZOOM, blueprintZoom.value + BLUEPRINT_ZOOM_STEP)
}

function zoomOutBlueprint() {
  blueprintZoom.value = Math.max(MIN_BLUEPRINT_ZOOM, blueprintZoom.value - BLUEPRINT_ZOOM_STEP)
}

function resetBlueprintZoom() {
  blueprintZoom.value = 1
}

onMounted(() => {
  loadPageData()
  loadBlueprintFromServer()
})

watch(currentProjectId, () => {
  selectedGateId.value = null
  loadGates()
  loadBlueprintFromServer()
  loadTodayEquipments()
})
</script>

<template>
  <div class="flex min-h-full flex-col gap-4 pb-6">
    <HeavyEquipmentHeader
      :target-date="targetDate"
      :equipment-count="todayEquipments.length"
      :total-assigned-equipment-count="totalAssignedEquipmentCount"
    />

    <input
      ref="blueprintInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleBlueprintUpload"
    />

    <div class="grid gap-6 [--gate-panel-height:clamp(560px,calc(100vh-220px),720px)] lg:grid-cols-3 lg:items-stretch">
      <HeavyEquipmentMapPanel
        :active-blueprint="activeBlueprint"
        :blueprint-aspect-ratio="blueprintAspectRatio"
        :blueprint-zoom="blueprintZoom"
        :blueprint-zoom-percent="blueprintZoomPercent"
        :custom-blueprint="customBlueprint"
        :dragging-gate-id="draggingGateId"
        :gate-marker-scale="gateMarkerScale"
        :gates="displayGates"
        :is-add-mode="isAddMode"
        :is-loading="isLoading"
        :map-cursor-class="mapCursorClass"
        @add-gate="addCustomGate"
        @marker-click="handleMarkerClick"
        @marker-drag-end="handleMarkerDragEnd"
        @marker-drag-start="handleMarkerDragStart"
        @reset-zoom="resetBlueprintZoom"
        @toggle-add-mode="toggleAddMode"
        @trigger-blueprint-upload="triggerBlueprintUpload"
        @zoom-in="zoomInBlueprint"
        @zoom-out="zoomOutBlueprint"
      />

      <HeavyEquipmentGateDetail
        :gates="displayGates"
        :recommended-gate="recommendedGate"
        :selected-gate="selectedGate"
        @add-machine="addMachine"
        @clear-selected-gate="clearSelectedGate"
        @remove-gate="removeGate"
        @remove-machine="removeMachine"
        @toggle-machine="toggleMachine"
        @update-manpower="updateManpower"
        @update-vehicles="updateVehicles"
      />
    </div>

    <HeavyEquipmentStatusTable
      :equipments="displayEquipments"
      :has-equipments="hasTodayEquipments"
      :is-loading="isEquipmentLoading"
    />
  </div>
</template>

<style scoped>
.shadow-card {
  box-shadow:
    0 10px 25px -5px rgba(0, 0, 0, 0.05),
    0 8px 10px -6px rgba(0, 0, 0, 0.05);
}
</style>
