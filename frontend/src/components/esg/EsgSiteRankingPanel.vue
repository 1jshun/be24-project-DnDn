<script setup>
import { Target, Trophy } from 'lucide-vue-next'
import {
  ESG_SITE_FLOOR_POINT,
  formatEsgFloorProgressScoreCompact,
  getEsgFloorProgressByPoint,
} from '@/utils/esg/esgScoreCalculator.js'

defineProps({
  currentSiteRank: {
    type: Number,
    default: 0,
  },
  rankingComparison: {
    type: String,
    default: '',
  },
  siteRankingItems: {
    type: Array,
    default: () => [],
  },
  selectedSiteId: {
    type: [String, Number],
    default: '',
  },
})
</script>

<template>
  <article class="flex h-full min-h-[640px] flex-col rounded-2xl border border-amber-100 bg-white p-5 shadow-card min-[1440px]:h-[680px] min-[1440px]:min-h-0">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-black text-forena-900">현장 ESG 순위</h2>
      </div>
    </div>

    <div class="mt-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 text-white shadow-lg">
      <div class="flex items-center justify-between gap-3">
        <p class="flex items-center gap-2 text-sm font-black text-emerald-100">
          <Target class="h-4 w-4" />
          내 순위
        </p>
        <p class="text-3xl font-black tabular-nums">{{ currentSiteRank }}위</p>
      </div>
      <p class="mt-3 text-sm font-black">
        {{ rankingComparison }}
      </p>
    </div>

    <div class="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
      <div
        v-for="(item, index) in siteRankingItems"
        :key="item.id"
        class="rounded-2xl border p-3 transition"
        :class="item.id === selectedSiteId ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100' : 'border-forena-100 bg-white'"
      >
        <div class="flex items-center gap-3">
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black"
            :class="index === 0 ? 'bg-amber-100 text-amber-700' : item.id === selectedSiteId ? 'bg-sky-100 text-sky-700' : 'bg-forena-100 text-forena-700'"
          >
            <Trophy v-if="index === 0" class="h-4 w-4" />
            <span v-else>{{ index + 1 }}</span>
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 items-center gap-2">
              <p class="truncate text-sm font-black text-forena-900">{{ item.name }}</p>
              <span
                v-if="item.id === selectedSiteId"
                class="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white"
              >
                현재
              </span>
            </div>
            <p class="mt-0.5 text-[11px] text-forena-500">{{ item.address }}</p>
          </div>
          <p class="text-lg font-black tabular-nums text-emerald-800">{{ formatEsgFloorProgressScoreCompact(item.snapshotSaved ? item.level : 0, item.snapshotSaved ? item.score : 0, ESG_SITE_FLOOR_POINT) }}</p>
        </div>
        <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-forena-100">
          <div class="h-full rounded-full bg-emerald-500" :style="{ width: `${getEsgFloorProgressByPoint(item.snapshotSaved ? item.score : 0, ESG_SITE_FLOOR_POINT)}%` }" />
        </div>
      </div>
    </div>
  </article>
</template>
