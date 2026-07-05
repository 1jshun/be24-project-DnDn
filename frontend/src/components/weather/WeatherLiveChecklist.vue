<script setup>
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Siren,
  Snowflake,
  Sun,
  Thermometer,
  Umbrella,
  Wind,
} from 'lucide-vue-next'
import { WEATHER_CONTROL_TEXT } from '@/utils/weatherControlMapper.js'

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  actions: {
    type: Array,
    default: () => [],
  },
  actionCount: {
    type: Number,
    default: 0,
  },
  isFutureReportDate: {
    type: Boolean,
    default: false,
  },
})

function getLevelBadgeClass(level) {
  if (level === '경고' || level === '위험' || level === '제한') return 'bg-rose-600 text-white'
  if (level === '주의') return 'bg-amber-100 text-amber-900'
  return 'bg-emerald-100 text-emerald-900'
}
</script>

<template>
  <article class="relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50/90 via-white to-orange-50/40 p-4 shadow-card ring-1 ring-rose-100/70 min-[1760px]:h-[300px]">
    <span class="pointer-events-none absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-rose-400 to-orange-400" />
    <div class="flex items-start justify-between gap-2.5">
      <div class="flex min-w-0 flex-1 items-start gap-2.5 pl-2">
        <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        <div class="min-w-0 flex-1">
          <h3 class="text-[18px] font-extrabold tracking-tight text-rose-900">{{ WEATHER_CONTROL_TEXT.liveRisk }}</h3>
          <p class="mt-1 text-[11px] leading-6 text-rose-700/75">{{ WEATHER_CONTROL_TEXT.liveRiskSub }}</p>
        </div>
      </div>
      <span
        class="shrink-0 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-bold text-rose-700"
      >
        {{ actionCount }}건
      </span>
    </div>

    <div v-if="loading" class="mt-3 rounded-xl border border-rose-100 bg-white px-5 py-4 text-[15px] font-medium text-slate-600">
      기상 관제 데이터를 불러오는 중입니다...
    </div>

    <div
      v-else-if="isFutureReportDate"
      class="mt-3 flex flex-1 flex-col items-center justify-center rounded-xl border border-sky-200/70 bg-white px-5 py-6 text-center"
    >
      <Clock class="h-6 w-6 text-sky-500" />
      <p class="mt-2 text-[14px] font-bold text-sky-700">미래 날짜는 기상 예보만 표시됩니다</p>
      <p class="mt-1 text-[11px] leading-5 text-sky-600/80">작업지시·AI 대조 결과는 해당 날짜 운영 데이터가 확정된 뒤 제공됩니다.</p>
    </div>

    <ul v-else-if="actions.length > 0" class="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
      <li
        v-for="action in actions"
        :key="action.id"
        class="flex items-start gap-3 rounded-xl border border-rose-200/80 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          :class="action.level === '경고' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'"
        >
          <Siren v-if="action.icon === 'siren'" class="h-4 w-4" />
          <Wind v-else-if="action.icon === 'wind'" class="h-4 w-4" />
          <Umbrella v-else-if="action.icon === 'umbrella'" class="h-4 w-4" />
          <Snowflake v-else-if="action.icon === 'snow'" class="h-4 w-4" />
          <Sun v-else-if="action.icon === 'sun'" class="h-4 w-4" />
          <Thermometer v-else-if="action.icon === 'thermometer'" class="h-4 w-4" />
          <Eye v-else-if="action.icon === 'mask'" class="h-4 w-4" />
          <AlertTriangle v-else class="h-4 w-4" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[14px] font-extrabold leading-5 text-forena-900">{{ action.label }}</p>
            <span
              class="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold"
              :class="getLevelBadgeClass(action.level)"
            >
              {{ action.level }}
            </span>
          </div>
          <p class="mt-1 text-[12px] leading-5 text-slate-600">{{ action.detail }}</p>
          <p class="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-rose-700">
            <Clock class="h-3 w-3" />
            {{ action.timing }}
          </p>
        </div>
      </li>
    </ul>

    <div
      v-else
      class="mt-3 flex flex-1 flex-col items-center justify-center rounded-xl border border-emerald-200/60 bg-white px-5 py-6"
    >
      <CheckCircle2 class="h-6 w-6 text-emerald-500" />
      <p class="mt-2 text-[14px] font-bold text-emerald-700">즉시 조치할 항목이 없습니다</p>
      <p class="mt-1 text-[11px] text-emerald-600/80">현재 기상 조건은 평시 운용 범위입니다.</p>
    </div>
  </article>
</template>
