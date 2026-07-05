<script setup>
import { ChevronRight } from 'lucide-vue-next'

defineProps({
  zones: {
    type: Array,
    default: () => [],
  },
  selectedZoneId: String,
})

defineEmits(['select-zone'])
</script>

<template>
  <article class="rounded-2xl border border-forena-100/90 bg-white/95 p-5 shadow-card">
    <h2 class="mb-4 text-lg font-bold text-forena-900">관리구역 선택</h2>
    <div class="grid gap-2 sm:grid-cols-2">
      <button v-for="zone in zones" :key="zone.id" class="rounded-lg border-2 p-3 text-left transition" :class="selectedZoneId === zone.id ? 'border-sky-500 bg-sky-50' : 'border-forena-100 bg-white hover:border-forena-200'" @click="$emit('select-zone', zone.id)">
        <div class="flex items-center justify-between">
          <div><p class="text-sm font-bold text-forena-900">{{ zone.icon }} {{ zone.name }}</p><p class="mt-1 text-xs text-forena-600">{{ zone.type === 'fixed' ? '상시' : '작업' }}구역</p></div>
          <ChevronRight class="h-4 w-4" :class="selectedZoneId === zone.id ? 'rotate-90 text-sky-600' : 'text-forena-300'" />
        </div>
      </button>
    </div>
  </article>
</template>