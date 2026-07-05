<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { AlertCircle, Map as MapIcon, RefreshCw, Truck, Upload } from 'lucide-vue-next'
import { clampPercent } from '@/utils/heavyEquipmentGateMapper.js'

const props = defineProps({
  activeBlueprint: {
    type: String,
    required: true,
  },
  blueprintAspectRatio: {
    type: String,
    required: true,
  },
  blueprintZoom: {
    type: Number,
    required: true,
  },
  blueprintZoomPercent: {
    type: String,
    required: true,
  },
  customBlueprint: {
    type: String,
    default: null,
  },
  draggingGateId: {
    type: [Number, null],
    default: null,
  },
  gateMarkerScale: {
    type: Number,
    required: true,
  },
  gates: {
    type: Array,
    default: () => [],
  },
  isAddMode: {
    type: Boolean,
    default: false,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  mapCursorClass: {
    type: String,
    required: true,
  },
})

const emit = defineEmits({
  'add-gate': (payload) => typeof payload.x === 'number' && typeof payload.y === 'number',
  'marker-click': (payload) => typeof payload.gateId === 'number' && payload.event instanceof MouseEvent,
  'marker-drag-end': (payload) => Boolean(payload.gate) && typeof payload.x === 'number' && typeof payload.y === 'number',
  'marker-drag-start': (payload) => Boolean(payload.gate) && payload.event instanceof DragEvent,
  'reset-zoom': () => true,
  'toggle-add-mode': () => true,
  'trigger-blueprint-upload': () => true,
  'zoom-in': () => true,
  'zoom-out': () => true,
})

const MIN_BLUEPRINT_ZOOM = 0.75
const MAX_BLUEPRINT_ZOOM = 1.4
const MAP_PADDING_X = 20
const MAP_PADDING_Y = 20

const mapAreaRef = ref(null)
const mapViewportRef = ref(null)
const isPanning = ref(false)
const canPan = ref(false)
const baseMapSize = ref({ width: 1, height: 1 })
const panStart = ref({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })
const lastDragPoint = ref({ x: 0, y: 0 })
const pendingViewportCenter = ref(null)

let resizeObserver = null

const blueprintRatio = computed(() => {
  const match = String(props.blueprintAspectRatio || '').match(/([\d.]+)\s*\/\s*([\d.]+)/)
  const width = Number(match?.[1])
  const height = Number(match?.[2])

  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return width / height
  }

  return 16 / 10
})

const mapAreaStyle = computed(() => {
  const width = Math.max(1, Math.round(baseMapSize.value.width * props.blueprintZoom))
  const height = Math.max(1, Math.round(baseMapSize.value.height * props.blueprintZoom))

  return {
    width: `${width}px`,
    height: `${height}px`,
    aspectRatio: props.blueprintAspectRatio,
    backgroundImage: `url(${props.activeBlueprint})`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  }
})

function updateBaseMapSize() {
  const viewport = mapViewportRef.value
  if (!viewport) return

  const availableWidth = Math.max(1, viewport.clientWidth - MAP_PADDING_X * 2)
  const availableHeight = Math.max(1, viewport.clientHeight - MAP_PADDING_Y * 2)
  const ratio = blueprintRatio.value

  let width = availableWidth
  let height = width / ratio

  if (height > availableHeight) {
    height = availableHeight
    width = height * ratio
  }

  baseMapSize.value = {
    width: Math.max(1, Math.floor(width)),
    height: Math.max(1, Math.floor(height)),
  }

  nextTick(updatePanAvailability)
}

function updatePanAvailability() {
  const viewport = mapViewportRef.value
  if (!viewport) {
    canPan.value = false
    return
  }

  canPan.value =
    viewport.scrollWidth > viewport.clientWidth + 1
    || viewport.scrollHeight > viewport.clientHeight + 1

  if (!canPan.value) {
    viewport.scrollLeft = 0
    viewport.scrollTop = 0
  }
}

function captureViewportCenter() {
  const viewport = mapViewportRef.value
  if (!viewport) return null

  return {
    x: (viewport.scrollLeft + viewport.clientWidth / 2) / Math.max(1, viewport.scrollWidth),
    y: (viewport.scrollTop + viewport.clientHeight / 2) / Math.max(1, viewport.scrollHeight),
  }
}

async function restoreViewportCenter() {
  const viewport = mapViewportRef.value
  const center = pendingViewportCenter.value

  await nextTick()
  updatePanAvailability()

  if (!viewport || !center || !canPan.value) {
    pendingViewportCenter.value = null
    return
  }

  viewport.scrollLeft = Math.max(0, viewport.scrollWidth * center.x - viewport.clientWidth / 2)
  viewport.scrollTop = Math.max(0, viewport.scrollHeight * center.y - viewport.clientHeight / 2)
  pendingViewportCenter.value = null
}

function requestZoomIn() {
  if (props.blueprintZoom >= MAX_BLUEPRINT_ZOOM) return
  pendingViewportCenter.value = captureViewportCenter()
  emit('zoom-in')
}

function requestZoomOut() {
  if (props.blueprintZoom <= MIN_BLUEPRINT_ZOOM) return
  pendingViewportCenter.value = captureViewportCenter()
  emit('zoom-out')
}

function requestResetZoom() {
  pendingViewportCenter.value = captureViewportCenter()
  emit('reset-zoom')
}

function emitAddGate(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  emit('add-gate', {
    x: clampPercent(((event.clientX - rect.left) / rect.width) * 100),
    y: clampPercent(((event.clientY - rect.top) / rect.height) * 100),
  })
}

function emitMarkerDrag(event) {
  if (event.clientX === 0 && event.clientY === 0) return
  lastDragPoint.value = { x: event.clientX, y: event.clientY }
}

function emitMarkerDragEnd(gate, event) {
  const point = event.clientX === 0 && event.clientY === 0
    ? lastDragPoint.value
    : { x: event.clientX, y: event.clientY }

  if (!mapAreaRef.value) return

  const rect = mapAreaRef.value.getBoundingClientRect()
  emit('marker-drag-end', {
    gate,
    x: clampPercent(((point.x - rect.left) / rect.width) * 100),
    y: clampPercent(((point.y - rect.top) / rect.height) * 100),
  })
}

function startPan(event) {
  if (!mapViewportRef.value || event.button !== 0 || props.isAddMode || props.draggingGateId !== null || !canPan.value) {
    return
  }

  const target = event.target instanceof Element ? event.target : null
  if (target?.closest('[data-map-toolbar], [data-gate-marker], button, input')) {
    return
  }

  event.preventDefault()
  isPanning.value = true
  panStart.value = {
    x: event.clientX,
    y: event.clientY,
    scrollLeft: mapViewportRef.value.scrollLeft,
    scrollTop: mapViewportRef.value.scrollTop,
  }
}

function movePan(event) {
  if (!isPanning.value || !mapViewportRef.value) return

  event.preventDefault()
  const dx = event.clientX - panStart.value.x
  const dy = event.clientY - panStart.value.y
  mapViewportRef.value.scrollLeft = panStart.value.scrollLeft - dx
  mapViewportRef.value.scrollTop = panStart.value.scrollTop - dy
}

function endPan() {
  isPanning.value = false
}

watch(
  () => props.blueprintZoom,
  () => {
    restoreViewportCenter()
  },
)

watch(
  () => [props.blueprintAspectRatio, props.activeBlueprint],
  () => {
    updateBaseMapSize()
  },
)

onMounted(async () => {
  await nextTick()
  updateBaseMapSize()
  updatePanAvailability()

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateBaseMapSize()
      updatePanAvailability()
    })

    if (mapViewportRef.value) {
      resizeObserver.observe(mapViewportRef.value)
    }
  }

  window.addEventListener('resize', updateBaseMapSize)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  window.removeEventListener('resize', updateBaseMapSize)
})
</script>

<template>
  <div class="lg:col-span-2 relative flex h-[var(--gate-panel-height)] min-h-0 flex-col overflow-hidden rounded-3xl border border-forena-100 shadow-card">
    <div
      data-map-toolbar
      class="absolute right-4 top-4 z-20 flex max-w-[calc(100%-9rem)] flex-wrap items-center justify-end gap-2 [overflow-wrap:normal]"
    >
      <button
        type="button"
        class="inline-flex min-w-[118px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap break-keep rounded-xl border px-3 py-2 text-[11px] font-bold leading-none shadow-sm transition-all sm:min-w-[126px] sm:gap-2 sm:text-xs"
        :class="isAddMode ? 'border-flare-300 bg-flare-100 text-flare-700 ring-2 ring-flare-200 animate-pulse' : 'border-forena-100 bg-white text-forena-700 hover:bg-forena-50'"
        @click.stop="emit('toggle-add-mode')"
      >
        <MapIcon class="h-4 w-4 shrink-0" />
        <span class="whitespace-nowrap break-keep">게이트 추가 모드</span>
      </button>

      <button
        type="button"
        class="inline-flex min-w-[104px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap break-keep rounded-xl border border-forena-100 bg-white px-3 py-2 text-[11px] font-bold leading-none text-forena-700 shadow-sm transition hover:bg-forena-50 sm:min-w-[112px] sm:gap-2 sm:text-xs"
        @click.stop="emit('trigger-blueprint-upload')"
      >
        <Upload class="h-4 w-4 shrink-0" />
        <span class="whitespace-nowrap break-keep">도면 업로드</span>
      </button>

      <span class="inline-flex h-8 shrink-0 items-center whitespace-nowrap break-keep rounded-xl border border-forena-100 bg-white px-3 text-[11px] font-bold leading-none text-forena-700 shadow-sm sm:text-xs">
        총 {{ gates.length }}개
      </span>
    </div>

    <div
      data-map-toolbar
      class="absolute left-4 top-4 z-20 flex items-center gap-1 rounded-xl border border-forena-100 bg-white/95 px-2 py-1 shadow-sm"
    >
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-forena-700 hover:bg-forena-50 disabled:opacity-40"
        :disabled="blueprintZoom <= MIN_BLUEPRINT_ZOOM"
        @click.stop="requestZoomOut"
      >
        -
      </button>
      <span class="min-w-12 text-center text-xs font-black text-forena-700">{{ blueprintZoomPercent }}</span>
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-forena-700 hover:bg-forena-50 disabled:opacity-40"
        :disabled="blueprintZoom >= MAX_BLUEPRINT_ZOOM"
        @click.stop="requestZoomIn"
      >
        +
      </button>
      <button
        type="button"
        class="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-forena-500 hover:bg-forena-50"
        title="도면 크기 초기화"
        @click.stop="requestResetZoom"
      >
        <RefreshCw class="h-3.5 w-3.5" />
      </button>
    </div>

    <div
      ref="mapViewportRef"
      class="h-full min-h-0 overflow-auto bg-slate-100/70"
      :class="[
        mapCursorClass,
        canPan && !isAddMode ? (isPanning ? 'cursor-grabbing select-none' : 'cursor-grab') : '',
      ]"
      @mousedown="startPan"
      @mousemove="movePan"
      @mouseup="endPan"
      @mouseleave="endPan"
    >
      <div class="flex min-h-full min-w-full items-center justify-center p-5">
        <div
          ref="mapAreaRef"
          class="relative shrink-0 transition-[width,height] duration-200"
          :style="mapAreaStyle"
          @click="isAddMode && emitAddGate($event)"
          @dragover.prevent
        >
          <button
            v-for="gate in gates"
            :key="gate.idx"
            data-gate-marker
            class="absolute flex flex-col items-center gap-1 transition-all"
            :class="draggingGateId === gate.idx ? 'scale-110 cursor-grabbing opacity-50' : 'cursor-grab'"
            :style="{
              left: gate.x + '%',
              top: gate.y + '%',
              transform: `translate(-50%, -50%) scale(${gateMarkerScale})`,
              zIndex: draggingGateId === gate.idx ? 50 : 10,
            }"
            :draggable="!isAddMode"
            @dragstart="emit('marker-drag-start', { gate, event: $event })"
            @drag="emitMarkerDrag"
            @dragend="emitMarkerDragEnd(gate, $event)"
            @click="emit('marker-click', { gateId: gate.idx, event: $event })"
          >
            <div
              class="relative flex h-10 w-10 items-center justify-center rounded-full border-4 border-white text-white shadow-xl transition-colors"
              :class="[gate.markerColor, draggingGateId === gate.idx ? 'shadow-2xl ring-2 ring-white/80' : 'drop-shadow-xl']"
            >
              <Truck class="h-5 w-5" />
              <AlertCircle
                v-if="gate.displayCongestion !== 'SMOOTH'"
                class="absolute -right-2 -top-2 h-5 w-5 fill-amber-500 text-white rounded-full"
              />
            </div>

            <div class="flex flex-col items-center gap-0.5 rounded-lg border border-forena-100 bg-white/95 px-2 py-1 text-[10px] font-bold shadow-sm">
              <span class="whitespace-nowrap">{{ gate.name }}</span>
              <span v-if="gate.plannedEquipmentCount > 0" class="whitespace-nowrap text-forena-500">
                배정 {{ gate.plannedEquipmentCount }}대
              </span>
            </div>
          </button>

          <div
            v-if="isLoading"
            class="absolute inset-0 flex items-center justify-center bg-white/50 text-sm font-semibold text-forena-600"
          >
            게이트 정보를 불러오는 중입니다...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>