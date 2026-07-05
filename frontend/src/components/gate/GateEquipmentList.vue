<script setup>
import { TrendingUp, AlertTriangle } from 'lucide-vue-next'
import { getEquipmentIcon } from '@/utils/gateMapper.js'

defineProps({
  gateEquipmentGroups: {
    type: Array,
    default: () => [],
  },
  selectedGateId: [Number, String],
  loading: Boolean,
})

function filterByGate(groups, gateId) {
  return groups?.filter((g) => g.gateIdx === gateId) || []
}
</script>

<template>
  <article class="rounded-2xl border border-forena-100/90 bg-white/95 p-5 shadow-card">
    <h2 class="mb-4 flex items-center gap-2 text-lg font-bold text-forena-900"><TrendingUp class="h-5 w-5" />중장비 입/출차</h2>
    <div v-if="loading" class="py-6 text-center text-sm text-forena-500">중장비 정보를 불러오는 중...</div>
    <div v-else-if="filterByGate(gateEquipmentGroups, selectedGateId).length === 0" class="rounded-xl border border-dashed border-forena-200 bg-forena-50/50 py-6 text-center"><AlertTriangle class="mx-auto h-6 w-6 text-amber-600" /><p class="mt-2 text-sm text-forena-600">이 게이트의 입차 예정이 없습니다</p></div>
    <ul v-else class="space-y-2">
      <li v-for="group in filterByGate(gateEquipmentGroups, selectedGateId)" :key="`${group.gateIdx}`" class="rounded-lg border border-forena-100 bg-forena-50 p-3">
        <div v-for="eq in group.equipments" :key="`${eq.id}`" class="mb-2 flex items-center justify-between last:mb-0">
          <div class="flex items-center gap-2"><span class="text-lg">{{ getEquipmentIcon(eq.equipmentName) }}</span><div><p class="font-medium text-forena-900">{{ eq.equipmentName }}</p><p class="text-xs text-forena-600">{{ eq.workLocation || '위치미정' }}</p></div></div>
          <div class="text-right"><p class="font-bold text-forena-900">{{ eq.equipmentCount || 1 }}대</p></div>
        </div>
      </li>
    </ul>
  </article>
</template>