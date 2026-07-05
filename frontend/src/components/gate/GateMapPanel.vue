<script setup>
import { MapPin } from 'lucide-vue-next'

defineProps({
  gates: {
    type: Array,
    default: () => [],
  },
  selectedGateId: [Number, String],
  loading: Boolean,
})

defineEmits(['select-gate'])

function getGateStyle(gate) {
  return { left: `${(gate.x || 0) * 2}%`, top: `${(gate.y || 0) * 2}%` }
}
</script>

<template>
  <article class="rounded-2xl border border-forena-100/90 bg-white/95 p-5 shadow-card">
    <div class="mb-4"><h2 class="flex items-center gap-2 text-lg font-bold text-forena-900"><MapPin class="h-5 w-5" />게이트 배치도</h2><p class="mt-1 text-xs text-forena-600">현장 게이트 위치 및 중장비 배정</p></div>
    <div class="relative h-64 overflow-hidden rounded-xl border border-forena-100 bg-gradient-to-br from-slate-50 to-blue-50">
      <div v-if="loading" class="flex h-full items-center justify-center"><p class="text-sm text-forena-500">게이트 정보를 불러오는 중...</p></div>
      <div v-for="gate in gates" :key="gate.idx" :style="getGateStyle(gate)" class="absolute h-12 w-12 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition hover:scale-110" @click="$emit('select-gate', gate.idx)">
        <div :class="`h-full w-full rounded-xl border-2 flex items-center justify-center font-bold text-white ${selectedGateId === gate.idx ? 'bg-sky-600 border-sky-700 shadow-lg' : 'bg-slate-400 border-slate-500'}`">{{ gate.idx }}</div>
      </div>
      <div v-if="gates.length === 0" class="flex h-full items-center justify-center text-forena-500">게이트가 없습니다</div>
    </div>
  </article>
</template>