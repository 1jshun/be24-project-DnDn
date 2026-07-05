<script setup>
import { Building2 } from 'lucide-vue-next'
import { getBuildingGrowthLevel } from '@/utils/esgDashboardMapper.js'

defineProps({
  selectedZone: Object,
  esgScore: Number,
})
</script>

<template>
  <article class="rounded-2xl border border-forena-100/90 bg-white/95 p-5 shadow-card">
    <h2 class="mb-4 flex items-center gap-2 text-lg font-bold text-forena-900"><Building2 class="h-5 w-5" />ESG 빌딩 성장</h2>
    <div class="rounded-lg border border-forena-100 bg-gradient-to-br from-sky-50 to-blue-50 p-6">
      <div class="text-center">
        <p class="text-sm font-bold text-forena-700">{{ selectedZone?.name || '구역' }}의</p>
        <p class="mt-2 text-2xl font-extrabold text-forena-900">{{ getBuildingGrowthLevel(esgScore) }}</p>
        <p class="mt-4 text-xs text-forena-600">{{ selectedZone?.name || '구역' }} · 콘크리트 시공 중</p>
        <div class="mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div class="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600" :style="{ width: `${Math.min(100, esgScore || 0)}%` }" />
        </div>
        <p class="mt-2 text-xs font-semibold text-forena-700">{{ esgScore || 0 }}%</p>
      </div>
    </div>
  </article>
</template>