<script setup>
import { TrendingUp, Shield, Zap } from 'lucide-vue-next'
import { getScoreBadgeClass } from '@/utils/esgDashboardMapper.js'

defineProps({
  esgScore: Number,
  keyFocus: String,
  safetyDays: Number,
  ranking: Number,
})
</script>

<template>
  <div class="grid auto-rows-fr gap-4 sm:grid-cols-2">
    <article class="flex flex-col rounded-2xl border border-forena-100/90 bg-white/95 p-5 shadow-card">
      <div class="flex items-center gap-2"><TrendingUp class="h-4 w-4 text-forena-500" /><p class="text-[11px] font-bold text-forena-600">ESG 점수</p></div>
      <div class="mt-6"><p class="text-4xl font-extrabold text-forena-900">{{ esgScore || 0 }}</p><p class="mt-2 text-xs text-forena-600">100 중</p></div>
    </article>

    <article class="flex flex-col rounded-2xl border border-amber-100/90 bg-amber-50/50 p-5 shadow-card">
      <div class="flex items-center gap-2"><Shield class="h-4 w-4 text-amber-600" /><p class="text-[11px] font-bold text-amber-800">중점 관리</p></div>
      <div class="mt-6"><p class="text-lg font-bold text-amber-900">{{ keyFocus || 'ESG 균형' }}</p></div>
    </article>

    <article class="flex flex-col rounded-2xl border border-emerald-100/90 bg-emerald-50/50 p-5 shadow-card">
      <div class="flex items-center gap-2"><Zap class="h-4 w-4 text-emerald-600" /><p class="text-[11px] font-bold text-emerald-800">무사고일수</p></div>
      <div class="mt-6"><p class="text-4xl font-extrabold text-emerald-900">{{ safetyDays || 0 }}<span class="text-lg">일</span></p></div>
    </article>

    <article :class="`flex flex-col rounded-2xl p-5 shadow-card border ${getScoreBadgeClass(esgScore)}`">
      <p class="text-[11px] font-bold">공사현장 순위</p>
      <div class="mt-6"><p class="text-4xl font-extrabold">{{ ranking || '--' }}<span class="text-lg">위</span></p></div>
    </article>
  </div>
</template>