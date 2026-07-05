<script setup>
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  selectedZone: {
    type: Object,
    required: true,
  },
  siteZones: {
    type: Array,
    default: () => [],
  },
  esgBreakdown: {
    type: Array,
    default: () => [],
  },
  zoneMetricCards: {
    type: Array,
    default: () => [],
  },
})

const selectedZoneId = defineModel('selectedZoneId', {
  type: [String, Number],
  default: '',
})

const activeEsgKey = defineModel('activeEsgKey', {
  type: String,
  default: 'E',
})

function colorClass(color, type) {
  const map = {
    emerald: {
      icon: 'bg-emerald-100 text-emerald-700',
      text: 'text-emerald-800',
      bar: 'bg-emerald-500',
      soft: 'bg-emerald-50 border-emerald-100',
    },
    sky: {
      icon: 'bg-sky-100 text-sky-700',
      text: 'text-sky-800',
      bar: 'bg-sky-500',
      soft: 'bg-sky-50 border-sky-100',
    },
    violet: {
      icon: 'bg-violet-100 text-violet-700',
      text: 'text-violet-800',
      bar: 'bg-violet-500',
      soft: 'bg-violet-50 border-violet-100',
    },
    lime: {
      icon: 'bg-lime-100 text-lime-700',
      text: 'text-lime-800',
      bar: 'bg-lime-500',
      soft: 'bg-lime-50 border-lime-100',
    },
  }
  return map[color]?.[type] ?? map.emerald[type]
}
</script>

<template>
  <article class="flex h-full min-h-[640px] flex-col rounded-2xl border border-forena-100 bg-white p-5 shadow-card min-[1440px]:h-[680px] min-[1440px]:min-h-0">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="text-2xl font-black text-forena-900">{{ selectedZone.name }} 점수 분해</h2>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
          작업구역 기준
        </span>
        <div class="relative min-w-[170px]">
          <label class="sr-only" for="zone-select">작업구역 선택</label>
          <select
            id="zone-select"
            v-model="selectedZoneId"
            class="h-9 w-full appearance-none rounded-full border border-forena-200 bg-white px-3 pr-9 text-xs font-black text-forena-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          >
            <option v-for="zone in siteZones" :key="zone.id" :value="zone.id">
              {{ zone.name }}
            </option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forena-500" />
        </div>
      </div>
    </div>

    <div class="mt-4 grid gap-3 lg:grid-cols-3">
      <button
        v-for="item in esgBreakdown"
        :key="item.key"
        type="button"
        class="min-h-[138px] rounded-2xl border p-4 text-left transition"
        :class="activeEsgKey === item.key ? `${colorClass(item.color, 'soft')} shadow-sm ring-2 ring-emerald-100` : `${colorClass(item.color, 'soft')} opacity-85 hover:opacity-100`"
        @click="activeEsgKey = item.key"
      >
        <div class="flex items-start justify-between">
          <span class="flex h-12 w-12 items-center justify-center rounded-xl" :class="colorClass(item.color, 'icon')">
            <component :is="item.icon" class="h-5 w-5" />
          </span>
          <div class="text-right">
            <p class="text-3xl font-black tabular-nums" :class="colorClass(item.color, 'text')">{{ Math.round(item.score) }}</p>
            <p class="text-[10px] font-bold text-forena-500">/ 100점</p>
          </div>
        </div>
        <p class="mt-3 text-base font-black text-forena-900">{{ item.key }} · {{ item.title }}</p>
        <p class="mt-1 text-[11px] leading-5 text-forena-500">{{ item.subtitle }}</p>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
          <div class="h-full rounded-full" :class="colorClass(item.color, 'bar')" :style="{ width: `${item.score}%` }" />
        </div>
        <p class="mt-2 text-[11px] font-bold text-forena-600">
          {{ item.contributionLabel || `작업구역 점수 ${item.weight}% 반영` }} → <span :class="colorClass(item.color, 'text')">{{ item.weightedScore }}점 기여</span>
        </p>
      </button>
    </div>

    <div class="mt-3 grid gap-3 lg:grid-cols-2">
      <div
        v-for="card in zoneMetricCards"
        :key="card.id"
        class="min-h-[150px] rounded-2xl border border-forena-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-3">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" :class="card.iconClass">
              <component :is="card.icon" class="h-5 w-5" />
            </span>
            <div class="min-w-0">
              <p class="truncate text-base font-black text-forena-900">{{ card.title }}</p>
              <p class="mt-0.5 text-xs font-semibold text-forena-500">{{ card.subtitle }}</p>
            </div>
          </div>
        </div>
        <p class="mt-3.5 text-[30px] font-black tabular-nums" :class="card.valueClass">{{ card.value }}</p>
        <div class="mt-2.5 h-1.5 overflow-hidden rounded-full bg-forena-100">
          <div class="h-full rounded-full" :class="card.barClass" :style="{ width: `${card.displayScore}%` }" />
        </div>
      </div>
    </div>
  </article>
</template>
