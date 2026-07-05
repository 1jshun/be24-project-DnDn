<script setup>
import { CalendarDays } from 'lucide-vue-next'

defineProps({
  targetDate: {
    type: String,
    required: true,
  },
  equipmentCount: {
    type: Number,
    default: 0,
  },
  totalAssignedEquipmentCount: {
    type: Number,
    default: 0,
  },
})
</script>

<template>
  <div class="flex shrink-0 flex-wrap items-start justify-between gap-3">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-widest text-flare-600">현장 정보</p>
      <h1 class="text-xl font-bold text-forena-900">장비 입출차</h1>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span class="inline-flex items-center gap-1.5 rounded-lg border border-forena-200 bg-white px-3 py-1.5 text-xs font-bold text-forena-700">
        <CalendarDays class="h-3.5 w-3.5 text-forena-400" />
        금일 기준 {{ targetDate }}
      </span>

      <span
        class="inline-flex h-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700"
      >
        작업지시서 장비 {{ equipmentCount }}건 · 총 {{ totalAssignedEquipmentCount }}대
      </span>
    </div>
  </div>
</template>
