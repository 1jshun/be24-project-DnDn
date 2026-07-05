<script setup>
import {
  AlertCircle,
  Map as MapIcon,
  Navigation,
  Power,
  PowerOff,
  Settings2,
  Trash2,
  Users,
  X,
} from 'lucide-vue-next'

defineProps({
  gates: {
    type: Array,
    default: () => [],
  },
  recommendedGate: {
    type: Object,
    default: null,
  },
  selectedGate: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits({
  'add-machine': () => true,
  'clear-selected-gate': () => true,
  'remove-gate': (gateId) => typeof gateId === 'number',
  'remove-machine': (machineId) => typeof machineId === 'number',
  'toggle-machine': (machineId) => typeof machineId === 'number',
  'update-manpower': (delta) => typeof delta === 'number',
  'update-vehicles': (delta) => typeof delta === 'number',
})
</script>

<template>
  <div class="flex h-[var(--gate-panel-height)] min-h-0 flex-col">
    <div
      v-if="selectedGate"
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-forena-100 bg-white shadow-card ring-1 ring-forena-50"
    >
      <div class="flex shrink-0 flex-col items-stretch gap-3 border-b border-forena-100 bg-forena-50/50 px-5 py-4 xl:flex-row xl:items-center xl:justify-between xl:gap-4 xl:px-6">
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
            <span class="text-sm font-black text-forena-900">{{ selectedGate.businessKey }}</span>
          </div>
          <div class="min-w-0">
            <h3 class="truncate text-lg font-bold text-forena-900">{{ selectedGate.name }}</h3>
            <div class="mt-1 space-y-0.5 text-xs font-semibold leading-tight text-slate-500">
              <p class="whitespace-nowrap break-keep">작업지시 배정 {{ selectedGate.plannedEquipmentCount }}대</p>
              <p class="whitespace-nowrap break-keep">현재 진입 {{ selectedGate.vehicles ?? 0 }}대</p>
            </div>
          </div>
        </div>

        <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <div class="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-1.5 py-1">
            <button
              type="button"
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-amber-800 shadow-sm transition hover:scale-105 hover:bg-amber-50"
              @click="emit('update-vehicles', -1)"
            >
              -
            </button>
            <span class="flex h-11 min-w-[52px] shrink-0 flex-col items-center justify-center rounded-full bg-amber-50 px-2 text-center leading-none text-amber-900 shadow-inner">
              <span class="whitespace-nowrap text-[10px] font-bold">현재</span>
              <span class="mt-0.5 whitespace-nowrap text-sm font-black">{{ selectedGate.vehicles }}대</span>
            </span>
            <button
              type="button"
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-amber-800 shadow-sm transition hover:scale-105 hover:bg-amber-50"
              @click="emit('update-vehicles', 1)"
            >
              +
            </button>
          </div>

          <span
            class="inline-flex h-10 min-w-[58px] shrink-0 items-center justify-center whitespace-nowrap break-keep rounded-full border px-3 text-[11px] font-black leading-none sm:text-xs"
            :class="selectedGate.statusColor"
          >
            {{ selectedGate.displayCongestionLabel }}
          </span>

          <button
            type="button"
            class="rounded-full p-2 text-rose-400 transition hover:bg-rose-50 hover:text-rose-600"
            title="게이트 삭제"
            @click="emit('remove-gate', selectedGate.idx)"
          >
            <Trash2 class="h-5 w-5" />
          </button>

          <button
            type="button"
            class="rounded-full p-2 text-forena-400 transition hover:bg-forena-100 hover:text-forena-600"
            @click="emit('clear-selected-gate')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto p-6">
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
            <p class="text-xs font-bold text-sky-700">작업지시서 배정</p>
            <p class="mt-2 text-2xl font-black text-sky-900">
              {{ selectedGate.plannedEquipmentCount }}대
            </p>
            <p class="mt-1 text-[11px] text-sky-700/80">
              기준 날짜 작업지시서 장비 배정
            </p>
          </div>

          <div class="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
            <p class="text-xs font-bold text-amber-700">현재 진입 상태</p>
            <p class="mt-2 text-2xl font-black text-amber-900">
              {{ selectedGate.vehicles }}대
            </p>
            <p class="mt-1 text-[11px] text-amber-700/80">
              현장 상황에 따라 수동 조정 가능
            </p>
          </div>
        </div>

        <div class="mt-6">
          <div class="flex items-center justify-between text-sm font-bold uppercase tracking-wider text-forena-500">
            <span>게이트 혼잡도</span>
            <span :class="selectedGate.statusColor.split(' ')[0]">
              {{ selectedGate.displayVehicleCount }}대 / 기준 {{ selectedGate.capacityValue }}대
            </span>
          </div>
          <div class="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              class="h-full transition-all duration-500"
              :class="selectedGate.markerColor"
              :style="{ width: Math.min((selectedGate.displayVehicleCount / Math.max(1, selectedGate.capacityValue)) * 100, 100) + '%' }"
            />
          </div>
        </div>

        <div class="mt-8">
          <div class="flex items-center justify-between">
            <h3 class="flex items-center gap-2 text-sm font-bold text-forena-900">
              <Settings2 class="h-4 w-4 text-flare-600" />
              세척 설비 가동 ({{ selectedGate.machines.length }}대)
            </h3>
            <button
              type="button"
              class="bg-slate-100 text-slate-600 rounded-lg p-1 hover:bg-slate-200"
              @click="emit('add-machine')"
            >
              <span class="text-sm font-bold leading-none">+</span>
            </button>
          </div>

          <div
            v-if="selectedGate.machines.length === 0"
            class="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800"
          >
            현재 인력 세척 모드로 가동 중입니다. 배치 인원 2명당 트럭 3대 수용 기준입니다.
          </div>

          <div v-else class="mt-3 grid grid-cols-2 gap-3">
            <div
              v-for="(machine, index) in selectedGate.machines"
              :key="machine.idx"
              role="button"
              tabindex="0"
              class="relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border p-4 transition-all"
              :class="machine.active ? 'border-flare-200 bg-flare-50 text-flare-700' : 'border-slate-100 bg-slate-50 text-slate-400'"
              @click="emit('toggle-machine', machine.idx)"
              @keyup.enter="emit('toggle-machine', machine.idx)"
              @keyup.space.prevent="emit('toggle-machine', machine.idx)"
            >
              <button
                type="button"
                class="absolute -right-2 -top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-100"
                @click.stop="emit('remove-machine', machine.idx)"
              >
                <X class="h-3 w-3" />
              </button>

              <component :is="machine.active ? Power : PowerOff" class="h-6 w-6" />
              <span class="text-[10px] font-bold">
                {{ index + 1 }}번 기계 {{ machine.active ? 'ON' : 'OFF' }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-8">
          <h3 class="flex items-center gap-2 text-sm font-bold text-forena-900">
            <Users class="h-4 w-4 text-flare-600" />
            게이트 배치 인원
          </h3>
          <div class="mt-3 flex items-center justify-between rounded-2xl border border-forena-100 bg-forena-50/30 p-2">
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl font-bold shadow-sm hover:bg-slate-50"
              @click="emit('update-manpower', -1)"
            >
              -
            </button>
            <div class="text-center">
              <span class="text-xl font-black text-forena-900">{{ selectedGate.manpower }}</span>
              <span class="ml-1 text-xs font-bold text-forena-500">명</span>
            </div>
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl font-bold shadow-sm hover:bg-slate-50"
              @click="emit('update-manpower', 1)"
            >
              +
            </button>
          </div>
        </div>

        <div class="mt-6 flex items-start gap-2 rounded-xl p-3 text-[10px]" :class="selectedGate.noticeClass">
          <AlertCircle class="h-3 w-3 shrink-0" />
          <p>{{ selectedGate.noticeMessage }}</p>
        </div>

        <div
          v-if="recommendedGate"
          class="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800 shadow-sm"
        >
          <p class="text-sm font-semibold">현재 게이트가 매우 혼잡합니다.</p>
          <p class="mt-2 text-sm font-bold text-blue-900">
            가장 가까운 우회 경로: {{ recommendedGate.name }}
            <span class="font-medium">
              (작업지시 배정 {{ recommendedGate.plannedEquipmentCount }}대 · 현재 진입 {{ recommendedGate.vehicles }}대)
            </span>
          </p>
        </div>
      </div>
    </div>

    <div
      v-else-if="gates.length === 0"
      class="flex h-full min-h-0 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-forena-100 bg-white/60 p-8 text-center"
    >
      <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-flare-50 text-flare-600">
        <MapIcon class="h-6 w-6" />
      </span>
      <p class="text-sm font-bold text-forena-900">아직 등록된 게이트가 없습니다.</p>
      <p class="text-xs text-forena-500">
        우측 상단 <span class="font-semibold text-flare-600">'게이트 추가 모드'</span>를 눌러 도면 위에 게이트를 배치하세요.
      </p>
    </div>

    <div
      v-else
      class="flex h-full min-h-0 flex-col items-center justify-center gap-3 rounded-3xl border border-forena-100 bg-white/60 p-8 text-center shadow-card"
    >
      <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-forena-50 text-forena-600">
        <Navigation class="h-6 w-6" />
      </span>
      <p class="text-sm font-bold text-forena-900">게이트를 선택해주세요</p>
      <p class="text-xs text-forena-500">도면의 마커를 클릭하면 상세 정보가 표시됩니다.</p>
    </div>
  </div>
</template>