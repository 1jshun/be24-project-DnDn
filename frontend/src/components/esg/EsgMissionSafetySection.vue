<script setup>
import { ShieldCheck, Target } from 'lucide-vue-next'

defineProps({
  missions: {
    type: Array,
    default: () => [],
  },
  safetyDays: {
    type: Number,
    default: 1,
  },
})

function colorClass(color, type) {
  const map = {
    emerald: {
      text: 'text-emerald-800',
      bar: 'bg-emerald-500',
      soft: 'bg-emerald-50 border-emerald-100',
    },
    sky: {
      text: 'text-sky-800',
      bar: 'bg-sky-500',
      soft: 'bg-sky-50 border-sky-100',
    },
    violet: {
      text: 'text-violet-800',
      bar: 'bg-violet-500',
      soft: 'bg-violet-50 border-violet-100',
    },
    lime: {
      text: 'text-lime-800',
      bar: 'bg-lime-500',
      soft: 'bg-lime-50 border-lime-100',
    },
  }
  return map[color]?.[type] ?? map.emerald[type]
}
</script>

<template>
  <section class="grid items-stretch gap-4 min-[1760px]:grid-cols-[minmax(0,1fr)_360px] min-[1920px]:grid-cols-[minmax(0,1fr)_400px]">
    <article class="min-w-0 rounded-2xl border border-forena-100 bg-white p-5 shadow-card">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <h2 class="truncate text-xl font-black text-forena-900">이번 주 ESG 미션</h2>
        </div>
        <Target class="h-6 w-6 shrink-0 text-emerald-600" />
      </div>

      <div class="mt-5 grid min-w-0 gap-3 lg:grid-cols-3">
        <div
          v-for="mission in missions"
          :key="mission.id"
          class="min-w-0 rounded-2xl border p-4"
          :class="colorClass(mission.color, 'soft')"
        >
          <div class="flex min-w-0 items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="line-clamp-2 text-sm font-black leading-5 text-forena-900">{{ mission.title }}</p>
              <p class="mt-1 line-clamp-2 text-[11px] leading-4 text-forena-500">{{ mission.description }}</p>
              <p v-if="mission.progressCaption" class="mt-2 truncate text-[10px] font-bold text-forena-400">{{ mission.progressCaption }}</p>
            </div>
            <p class="shrink-0 whitespace-nowrap text-right text-base font-black tabular-nums 2xl:text-lg" :class="colorClass(mission.color, 'text')">
              {{ mission.progressLabel }}
            </p>
          </div>
          <div class="mt-4 h-2 overflow-hidden rounded-full bg-white">
            <div class="h-full rounded-full" :class="colorClass(mission.color, 'bar')" :style="{ width: `${mission.progress}%` }" />
          </div>
        </div>
      </div>
    </article>

    <article class="min-w-0 rounded-2xl border border-sky-100 bg-white p-5 shadow-card">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[11px] font-bold uppercase tracking-wide text-sky-700">Safety</p>
          <h2 class="mt-1 truncate text-xl font-black text-forena-900">안전 무사고 일수</h2>
        </div>
        <ShieldCheck class="h-6 w-6 shrink-0 text-sky-600" />
      </div>

      <div class="mt-4 rounded-2xl bg-gradient-to-br from-sky-600 to-emerald-700 p-5 text-white shadow-lg">
        <p class="truncate text-sm font-black text-sky-100">현재 현장 무사고 운영</p>
        <p class="mt-3 whitespace-nowrap text-[clamp(2.6rem,4vw,4.2rem)] font-black leading-none tabular-nums">
          {{ safetyDays }}<span class="ml-1 text-[clamp(1.1rem,1.6vw,1.5rem)] text-sky-100">일</span>
        </p>
      </div>
    </article>
  </section>
</template>
