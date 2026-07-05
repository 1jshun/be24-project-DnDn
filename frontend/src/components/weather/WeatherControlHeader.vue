<script setup>
import { WEATHER_CONTROL_TEXT } from '@/utils/weatherControlMapper.js'

defineProps({
  reportDate: {
    type: String,
    required: true,
  },
  sourceLabel: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits({
  'update:reportDate': (value) => typeof value === 'string',
})

function updateReportDate(event) {
  emit('update:reportDate', event.target.value)
}
</script>

<template>
  <div class="flex shrink-0 flex-wrap items-start justify-between gap-3">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-widest text-flare-600">현장 정보</p>
      <h1 class="text-xl font-bold text-forena-900">{{ WEATHER_CONTROL_TEXT.title }}</h1>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span
        class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold"
        :class="sourceLabel.tone"
      >
        <span class="relative flex h-1.5 w-1.5">
          <span class="absolute inset-0 animate-ping rounded-full bg-current opacity-75" />
          <span class="relative h-1.5 w-1.5 rounded-full bg-current" />
        </span>
        {{ sourceLabel.label }}
      </span>

      <label class="flex items-center gap-1.5 rounded-lg border border-forena-200 bg-white pl-2.5">
        <span class="text-[11px] font-bold uppercase tracking-wide text-forena-400">기준 날짜</span>
        <input
          :value="reportDate"
          type="date"
          class="rounded-r-lg border-0 border-l border-forena-100 bg-white px-3 py-1.5 text-xs font-bold text-forena-700 outline-none focus:bg-forena-50"
          @change="updateReportDate"
        />
      </label>
    </div>
  </div>
</template>
