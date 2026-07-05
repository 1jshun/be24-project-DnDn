<script setup>
import { AlertCircle } from 'lucide-vue-next'
import { calculateGateCongestion, getGateCongestionColor } from '@/utils/gateMapper.js'

defineProps({
  selectedGate: Object,
  loading: Boolean,
})

function getCongestion(count) {
  return calculateGateCongestion(count)
}
</script>

<template>
  <article class="rounded-2xl border border-forena-100/90 bg-white/95 p-5 shadow-card">
    <div v-if="!selectedGate" class="rounded-xl border border-dashed border-forena-200 bg-forena-50/50 py-12 text-center"><AlertCircle class="mx-auto h-8 w-8 text-forena-400" /><p class="mt-3 text-sm font-medium text-forena-600">게이트를 선택해주세요</p></div>
    <div v-else>
      <div class="mb-4 flex items-center justify-between">
        <div><h2 class="text-lg font-bold text-forena-900">Gate {{ selectedGate.idx }}</h2><p class="mt-1 text-xs text-forena-600">중장비 {{ selectedGate.totalCount || 0 }}대</p></div>
        <div :class="`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${getGateCongestionColor(getCongestion(selectedGate.totalCount))}`"><span class="h-2 w-2 rounded-full bg-current" />{{ getCongestion(selectedGate.totalCount) }}</div>
      </div>
      <div class="grid gap-2 grid-cols-2">
        <div class="rounded-lg border border-forena-100 bg-forena-50 p-3"><p class="text-[11px] font-bold text-forena-600">위치</p><p class="mt-1 text-sm font-bold text-forena-900">{{ selectedGate.locations?.[0] || '미정' }}</p></div>
        <div class="rounded-lg border border-forena-100 bg-forena-50 p-3"><p class="text-[11px] font-bold text-forena-600">장비 대수</p><p class="mt-1 text-sm font-bold text-forena-900">{{ selectedGate.totalCount || 0 }}대</p></div>
      </div>
    </div>
  </article>
</template>