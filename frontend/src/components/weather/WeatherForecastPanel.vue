<script setup>
import { ChevronRight, AlertTriangle } from 'lucide-vue-next'
import { weatherEmoji, formatWindSpeed, getRainBarClass } from '@/utils/weatherControlMapper.js'

defineProps({
  threeDayForecast: {
    type: Array,
    default: () => [],
  },
  weeklyForecast: {
    type: Array,
    default: () => [],
  },
  monthlyForecast: {
    type: Array,
    default: () => [],
  },
})

const forecastTab = defineModel('tab', { default: 'week' })
const selectedMonthWeekId = defineModel('selectedMonthWeekId', { default: null })
</script>

<template>
  <article class="rounded-2xl border border-forena-100/90 bg-white/95 p-5 shadow-card">
    <div class="mb-5 flex gap-2 border-b border-forena-100">
      <button class="px-4 py-2 text-sm font-bold transition" :class="forecastTab === 'week' ? 'border-b-2 border-forena-700 text-forena-900' : 'text-forena-500 hover:text-forena-700'" @click="forecastTab = 'week'">주간 7일</button>
      <button class="px-4 py-2 text-sm font-bold transition" :class="forecastTab === 'month' ? 'border-b-2 border-forena-700 text-forena-900' : 'text-forena-500 hover:text-forena-700'" @click="forecastTab = 'month'">월간</button>
    </div>

    <!-- 주간 예보 -->
    <div v-if="forecastTab === 'week'" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-forena-200">
            <th class="py-3 pr-3 text-left font-semibold text-forena-700">날짜</th>
            <th class="py-3 pr-3 text-left font-semibold text-forena-700">날씨</th>
            <th class="py-3 pr-3 text-right font-semibold text-forena-700">기온</th>
            <th class="py-3 pr-3 text-right font-semibold text-forena-700">강수</th>
            <th class="py-3 text-right font-semibold text-forena-700">풍속</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(day, idx) in weeklyForecast" :key="day.date" class="border-b border-forena-50 transition-colors hover:bg-forena-50/30" :class="idx === 0 ? 'bg-sky-50/40' : ''">
            <td class="py-3 pr-3"><span class="text-xs font-bold" :class="idx === 0 ? 'text-sky-700' : 'text-forena-700'">{{ day.dayLabel }}</span></td>
            <td class="py-3 pr-3"><span class="flex items-center gap-2"><span class="text-lg leading-none">{{ weatherEmoji(day.weatherLabel, day.precipitationProbability) }}</span><span class="text-xs text-slate-700">{{ day.weatherLabel }}</span></span></td>
            <td class="py-3 pr-3 text-right tabular-nums"><span class="font-semibold text-forena-800">{{ day.maxTemp ?? '--' }}°</span><span class="text-xs text-slate-400"> / {{ day.minTemp ?? '--' }}°</span></td>
            <td class="py-3 pr-3"><div class="flex flex-col items-end gap-1"><span class="text-xs font-medium tabular-nums text-slate-700">{{ day.precipitationProbability ?? 0 }}%</span><div class="h-1 w-16 overflow-hidden rounded-full bg-slate-100"><div :class="`h-full rounded-full transition-all duration-500 ${getRainBarClass(day.precipitationProbability ?? 0)}`" :style="{ width: `${Math.min(100, day.precipitationProbability ?? 0)}%` }" /></div></div></td>
            <td class="py-3 text-right text-xs tabular-nums text-slate-600">{{ formatWindSpeed(day.windSpeed) }}</td>
          </tr>
          <tr v-if="weeklyForecast.length === 0"><td colspan="5" class="py-6 text-center text-sm text-forena-500">예보 데이터를 불러오는 중입니다.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- 월간 예보 -->
    <div v-else-if="forecastTab === 'month'" class="space-y-3">
      <p class="text-xs text-forena-500">월간 예보는 기상청 단기·중기 예보를 주차 단위로 묶어 표시합니다.</p>
      <article v-for="weekItem in monthlyForecast" :key="weekItem.id" role="button" class="relative cursor-pointer overflow-hidden rounded-xl border bg-white/95 p-4 transition" :class="selectedMonthWeekId === weekItem.id ? weekItem.risk === '주의' ? 'border-rose-300 bg-rose-50/60 shadow-md ring-2 ring-rose-100' : weekItem.risk === '보통' ? 'border-amber-300 bg-amber-50/50 shadow-md ring-2 ring-amber-100' : 'border-forena-200 bg-sky-50/40 shadow-md ring-2 ring-sky-100' : weekItem.risk === '주의' ? 'border-rose-200 bg-rose-50/40 shadow-sm hover:bg-rose-50/60' : weekItem.risk === '보통' ? 'border-amber-200 bg-amber-50/30 hover:bg-amber-50/50' : 'border-forena-100 bg-forena-50/30 hover:bg-forena-50/50'" @click="selectedMonthWeekId = selectedMonthWeekId === weekItem.id ? null : weekItem.id">
        <span class="pointer-events-none absolute left-0 top-0 h-full w-1" :class="weekItem.risk === '주의' ? 'bg-gradient-to-b from-rose-400 to-rose-600' : weekItem.risk === '보통' ? 'bg-gradient-to-b from-amber-300 to-amber-500' : 'bg-gradient-to-b from-emerald-300 to-emerald-500'" />
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 pl-2">
            <div><p class="text-xs font-bold text-forena-700">{{ weekItem.label }}</p><p class="text-[10px] text-forena-500">{{ weekItem.dateRange }}</p></div>
            <span class="text-xl leading-none">{{ weatherEmoji(weekItem.weatherSummary, weekItem.precipitationProbability) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold" :class="weekItem.riskClass"><AlertTriangle v-if="weekItem.risk === '주의'" class="h-3 w-3" />{{ weekItem.risk }}</span>
            <ChevronRight class="h-4 w-4 transition" :class="selectedMonthWeekId === weekItem.id ? 'rotate-90' : ''" />
          </div>
        </div>
        <div v-if="selectedMonthWeekId === weekItem.id" class="mt-3 grid gap-1 pt-3">
          <div v-for="day in weekItem.days" :key="day.id" class="rounded-lg bg-forena-50 p-2 text-xs">
            <p class="font-semibold">{{ day.shortDate }} ({{ day.weekday }}) - {{ day.weatherLabel }} / {{ day.maxTemp }}°C</p>
          </div>
        </div>
      </article>
    </div>
  </article>
</template>