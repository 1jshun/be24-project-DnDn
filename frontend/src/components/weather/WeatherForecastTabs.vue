<script setup>
import { AlertTriangle, CalendarDays, CalendarRange, ChevronRight } from 'lucide-vue-next'
import {
  formatWindSpeed,
  getRainBarClass,
  weatherEmoji,
} from '@/utils/weatherControlMapper.js'

defineProps({
  forecastTab: {
    type: String,
    required: true,
  },
  selectedMonthWeekId: {
    type: String,
    default: null,
  },
  weeklyForecast: {
    type: Array,
    default: () => [],
  },
  monthlyForecast: {
    type: Array,
    default: () => [],
  },
  locationLabel: {
    type: String,
    default: '현장',
  },
})

const emit = defineEmits({
  'update:forecastTab': (value) => typeof value === 'string',
  'select-month-week': (value) => typeof value === 'string',
})

function updateForecastTab(value) {
  emit('update:forecastTab', value)
}

function selectMonthWeek(weekId) {
  emit('select-month-week', weekId)
}
</script>

<template>
  <div class="shrink-0 overflow-hidden rounded-2xl border border-forena-100/90 bg-white/95 shadow-card">
    <div class="flex items-center justify-between border-b border-forena-100 bg-forena-50/50 px-5 py-0">
      <div class="flex">
        <button
          type="button"
          class="flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors"
          :class="forecastTab === 'week' ? 'border-forena-700 text-forena-900' : 'border-transparent text-forena-500 hover:text-forena-700'"
          @click="updateForecastTab('week')"
        >
          <CalendarDays class="h-3.5 w-3.5" />
          주간 7일
        </button>
        <button
          type="button"
          class="flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors"
          :class="forecastTab === 'month' ? 'border-forena-700 text-forena-900' : 'border-transparent text-forena-500 hover:text-forena-700'"
          @click="updateForecastTab('month')"
        >
          <CalendarRange class="h-3.5 w-3.5" />
          월간
        </button>
      </div>
      <span class="pr-4 text-xs font-medium text-forena-400">{{ locationLabel }}</span>
    </div>

    <div v-if="forecastTab === 'week'" class="p-3">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-forena-100">
              <th class="w-16 py-2 pr-3 text-left text-[11px] font-bold uppercase tracking-wide text-forena-500">날짜</th>
              <th class="py-2 pr-3 text-left text-[11px] font-bold uppercase tracking-wide text-forena-500">날씨</th>
              <th class="w-24 py-2 pr-3 text-right text-[11px] font-bold uppercase tracking-wide text-forena-500">최고/최저</th>
              <th class="w-24 py-2 pr-3 text-right text-[11px] font-bold uppercase tracking-wide text-forena-500">강수</th>
              <th class="w-20 py-2 text-right text-[11px] font-bold uppercase tracking-wide text-forena-500">풍속</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(day, index) in weeklyForecast"
              :key="day.date"
              class="border-b border-forena-50 transition-colors hover:bg-forena-50/30"
              :class="index === 0 ? 'bg-sky-50/40' : ''"
            >
              <td class="py-3 pr-3">
                <span class="text-xs font-bold" :class="index === 0 ? 'text-sky-700' : 'text-forena-700'">
                  {{ day.dayLabel }}
                </span>
              </td>
              <td class="py-3 pr-3">
                <span class="flex items-center gap-2">
                  <span class="text-lg leading-none">{{ weatherEmoji(day.weatherLabel, day.precipitationProbability) }}</span>
                  <span class="text-xs text-slate-700">{{ day.weatherLabel }}</span>
                </span>
              </td>
              <td class="py-3 pr-3 text-right tabular-nums">
                <span class="font-semibold text-forena-800">{{ day.maxTemp ?? '--' }}°</span>
                <span class="text-xs text-slate-400"> / {{ day.minTemp ?? '--' }}°</span>
              </td>
              <td class="py-3 pr-3">
                <div class="flex flex-col items-end gap-1">
                  <span class="text-xs font-medium tabular-nums text-slate-700">{{ day.precipitationProbability ?? 0 }}%</span>
                  <div class="h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="getRainBarClass(day.precipitationProbability ?? 0)"
                      :style="{ width: `${Math.min(100, day.precipitationProbability ?? 0)}%` }"
                    />
                  </div>
                </div>
              </td>
              <td class="py-3 text-right text-xs tabular-nums text-slate-600">
                {{ formatWindSpeed(day.windSpeed) }}
              </td>
            </tr>
            <tr v-if="weeklyForecast.length === 0">
              <td colspan="5" class="py-6 text-center text-sm text-forena-500">예보 데이터를 불러오는 중입니다.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else-if="forecastTab === 'month'" class="p-3">
      <p class="mb-3 text-xs text-forena-500">
        월간 예보는 기상청 단기·중기 예보를 주차 단위로 묶어 표시합니다. 주차를 누르면 해당 주의 일별 상세가 펼쳐집니다.
      </p>

      <div class="space-y-3">
        <article
          v-for="weekItem in monthlyForecast"
          :key="weekItem.id"
          role="button"
          tabindex="0"
          class="relative cursor-pointer overflow-hidden rounded-xl border bg-white/95 p-3.5 transition"
          :class="[
            selectedMonthWeekId === weekItem.id
              ? weekItem.risk === '주의'
                ? 'border-rose-300 bg-rose-50/60 shadow-md ring-2 ring-rose-100'
                : weekItem.risk === '보통'
                  ? 'border-amber-300 bg-amber-50/50 shadow-md ring-2 ring-amber-100'
                  : 'border-forena-200 bg-sky-50/40 shadow-md ring-2 ring-sky-100'
              : weekItem.risk === '주의'
                ? 'border-rose-200 bg-rose-50/40 shadow-sm hover:bg-rose-50/60'
                : weekItem.risk === '보통'
                  ? 'border-amber-200 bg-amber-50/30 hover:bg-amber-50/50'
                  : 'border-forena-100 bg-forena-50/30 hover:bg-forena-50/50',
          ]"
          @click="selectMonthWeek(weekItem.id)"
          @keyup.enter="selectMonthWeek(weekItem.id)"
        >
          <span
            class="pointer-events-none absolute left-0 top-0 h-full w-1"
            :class="[
              weekItem.risk === '주의'
                ? 'bg-gradient-to-b from-rose-400 to-rose-600'
                : weekItem.risk === '보통'
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500'
                  : 'bg-gradient-to-b from-emerald-300 to-emerald-500',
            ]"
          />

          <div class="md:flex md:items-center md:justify-between">
            <div class="flex items-center gap-4 pl-2">
              <div class="w-24 shrink-0">
                <p class="text-xs font-bold text-forena-700">{{ weekItem.label }}</p>
                <p class="mt-0.5 text-[10px] text-forena-500">{{ weekItem.dateRange }}</p>
              </div>
              <div class="h-8 w-px bg-forena-100" />
              <div class="flex items-center gap-2">
                <span class="text-2xl leading-none">{{ weatherEmoji(weekItem.weatherSummary, weekItem.precipitationProbability) }}</span>
                <div>
                  <p class="text-sm font-semibold text-forena-900">{{ weekItem.weatherSummary }}</p>
                  <p class="mt-0.5 tabular-nums text-xs text-slate-500">
                    {{ weekItem.maxTemp ?? '--' }}°C / {{ weekItem.minTemp ?? '--' }}°C &nbsp;·&nbsp; 강수 {{ weekItem.precipitationProbability }}%
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-3 flex items-center justify-between gap-3 md:mt-0">
              <div class="flex flex-col items-end gap-1">
                <span class="text-[10px] font-bold text-slate-500">강수</span>
                <div class="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="getRainBarClass(weekItem.precipitationProbability ?? 0)"
                    :style="{ width: `${Math.min(100, weekItem.precipitationProbability ?? 0)}%` }"
                  />
                </div>
              </div>
              <span class="inline-flex w-fit items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold" :class="weekItem.riskClass">
                <AlertTriangle v-if="weekItem.risk === '주의'" class="h-3 w-3" />
                {{ weekItem.risk }}
              </span>
              <ChevronRight
                class="h-4 w-4 transition"
                :class="selectedMonthWeekId === weekItem.id ? 'rotate-90 text-forena-800' : 'text-forena-300'"
              />
            </div>
          </div>

          <div
            v-if="selectedMonthWeekId === weekItem.id"
            class="mt-3 overflow-hidden rounded-2xl border border-forena-100 bg-gradient-to-br from-slate-50 via-white to-sky-50/40 shadow-sm"
          >
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-forena-100 px-5 py-3">
              <div>
                <h3 class="text-sm font-bold text-forena-900">{{ weekItem.label }} 상세 예보</h3>
                <p class="mt-0.5 text-[11px] text-forena-500">{{ weekItem.dateRange }} · 기상청 기준 일별 날씨</p>
              </div>
              <span class="rounded-full border border-forena-200 bg-white px-3 py-1 text-xs font-semibold text-forena-700">
                {{ weekItem.weatherSummary }}
              </span>
            </div>

            <div class="p-3">
              <div class="grid gap-2 md:grid-cols-7">
                <article
                  v-for="day in weekItem.days"
                  :key="day.id"
                  class="rounded-xl border border-forena-100 bg-white px-3 py-2.5 shadow-sm transition hover:-translate-y-0.5"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <p class="text-sm font-bold text-forena-900">{{ day.shortDate }}</p>
                      <p class="text-[11px] text-forena-500">{{ day.weekday }}</p>
                    </div>
                    <span class="text-xl leading-none">{{ weatherEmoji(day.weatherLabel, day.precipitationProbability) }}</span>
                  </div>

                  <p class="mt-2 text-xs font-semibold text-slate-700">{{ day.weatherLabel }}</p>

                  <p class="mt-2 tabular-nums text-sm font-bold text-forena-800">
                    {{ day.maxTemp ?? '--' }}°
                    <span class="font-normal text-slate-400"> / {{ day.minTemp ?? '--' }}°</span>
                  </p>

                  <div class="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>강수 {{ day.precipitationProbability }}%</span>
                    <span>{{ formatWindSpeed(day.windSpeed) }}</span>
                  </div>

                  <div class="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="getRainBarClass(day.precipitationProbability ?? 0)"
                      :style="{ width: `${Math.min(100, day.precipitationProbability ?? 0)}%` }"
                    />
                  </div>
                </article>
              </div>
            </div>
          </div>
        </article>

        <p v-if="monthlyForecast.length === 0" class="py-6 text-center text-sm text-forena-500">
          월간 예보 데이터를 불러오는 중입니다.
        </p>
      </div>
    </div>
  </div>
</template>
