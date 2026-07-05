<script setup>
import { TrendingUp, TrendingDown } from 'lucide-vue-next'
import { getRankingData } from '@/utils/esgDashboardMapper.js'

const rankings = getRankingData()

function getTrendIcon(trend) {
  return trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null
}

function getTrendColor(trend) {
  if (trend === 'up') return 'text-emerald-600'
  if (trend === 'down') return 'text-rose-600'
  return 'text-slate-400'
}
</script>

<template>
  <article class="rounded-2xl border border-forena-100/90 bg-white/95 p-5 shadow-card">
    <h2 class="mb-4 text-lg font-bold text-forena-900">공사현장 ESG 순위</h2>
    <ul class="space-y-2">
      <li v-for="(rank, idx) in rankings" :key="rank.site" class="rounded-lg border border-forena-100 bg-forena-50 p-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-full font-bold text-white" :class="idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-slate-400' : 'bg-amber-700'">{{ rank.rank }}</div>
            <div><p class="font-semibold text-forena-900">{{ rank.site }}</p><p class="text-xs text-forena-600">{{ rank.score }}점</p></div>
          </div>
          <component v-if="getTrendIcon(rank.trend)" :is="getTrendIcon(rank.trend)" :class="`h-5 w-5 ${getTrendColor(rank.trend)}`" />
        </div>
      </li>
    </ul>
  </article>
</template>