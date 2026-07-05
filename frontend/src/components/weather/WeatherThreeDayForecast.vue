<script setup>
import { CalendarDays, Droplets, Wind } from 'lucide-vue-next'
import {
  formatWindSpeed,
  getRainBarClass,
  weatherEmoji,
} from '@/utils/weatherControlMapper.js'

defineProps({
  days: {
    type: Array,
    default: () => [],
  },
  locationLabel: {
    type: String,
    default: '현장',
  },
})
</script>

<template>
  <div class="rounded-2xl border border-forena-100/90 bg-white/95 shadow-card">
    <div class="flex items-center justify-between border-b border-forena-100 bg-forena-50/50 px-5 py-3">
      <h2 class="flex items-center gap-2 text-sm font-bold text-forena-900">
        <CalendarDays class="h-4 w-4 text-forena-500" />
        오늘 · 내일 · 모레 예보
      </h2>
      <span class="text-xs font-medium text-forena-400">{{ locationLabel }}</span>
    </div>

    <div class="p-4">
      <div class="grid gap-3 md:grid-cols-3">
        <article
          v-for="day in days"
          :key="day.date"
          class="rounded-xl border border-forena-100 bg-forena-50/40 p-3"
        >
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold text-forena-600">{{ day.dayLabel }}</p>
            <span class="text-2xl leading-none">
              {{ weatherEmoji(day.weatherLabel, day.precipitationProbability) }}
            </span>
          </div>

          <p class="mt-2 text-sm font-semibold text-forena-900">{{ day.weatherLabel }}</p>

          <p class="mt-1 tabular-nums text-base font-bold text-forena-800">
            {{ day.maxTemp ?? '--' }}°C
            <span class="text-sm font-normal text-slate-500">/ {{ day.minTemp ?? '--' }}°C</span>
          </p>

          <div class="my-2.5 border-t border-forena-100" />

          <div class="flex items-center justify-between text-xs text-slate-600">
            <span class="flex items-center gap-1">
              <Droplets class="h-3.5 w-3.5 text-sky-500" />
              {{ day.precipitationProbability ?? 0 }}%
            </span>
            <span class="flex items-center gap-1">
              <Wind class="h-3.5 w-3.5 text-slate-400" />
              {{ formatWindSpeed(day.windSpeed) }}
            </span>
          </div>

          <div class="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="getRainBarClass(day.precipitationProbability ?? 0)"
              :style="{ width: `${Math.min(100, day.precipitationProbability ?? 0)}%` }"
            />
          </div>
        </article>

        <p v-if="days.length === 0" class="col-span-3 py-6 text-center text-sm text-forena-500">
          예보 데이터를 불러오는 중입니다.
        </p>
      </div>
    </div>
  </div>
</template>
