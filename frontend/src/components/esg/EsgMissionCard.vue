<script setup>
import { CheckCircle2, Clock, AlertCircle } from 'lucide-vue-next'
import { getDefaultMissions } from '@/utils/esgDashboardMapper.js'

defineProps({
  selectedZoneId: String,
})

function getStatusIcon(status) {
  if (status === 'completed') return CheckCircle2
  if (status === 'ongoing') return Clock
  return AlertCircle
}

function getStatusColor(status) {
  if (status === 'completed') return 'text-emerald-600'
  if (status === 'ongoing') return 'text-sky-600'
  return 'text-amber-600'
}
</script>

<template>
  <article class="rounded-2xl border border-forena-100/90 bg-white/95 p-5 shadow-card">
    <h2 class="mb-4 text-lg font-bold text-forena-900">이번 주 미션</h2>
    <ul class="space-y-2">
      <li v-for="mission in getDefaultMissions(selectedZoneId)" :key="mission.id" class="rounded-lg border border-forena-100 bg-forena-50 p-3">
        <div class="flex items-start gap-2">
          <component :is="getStatusIcon(mission.status)" :class="`h-5 w-5 ${getStatusColor(mission.status)}`" />
          <div class="flex-1">
            <p class="font-medium text-forena-900">{{ mission.title }}</p>
            <div class="mt-1 flex gap-2">
              <span class="rounded-full bg-white px-2 py-0.5 text-xs font-semibold" :class="mission.priority === 'high' ? 'text-rose-700' : 'text-amber-700'">{{ mission.priority === 'high' ? '높음' : '중간' }}</span>
              <span class="rounded-full bg-white px-2 py-0.5 text-xs font-semibold" :class="mission.status === 'completed' ? 'text-emerald-700' : mission.status === 'ongoing' ? 'text-sky-700' : 'text-amber-700'">{{ mission.status === 'completed' ? '완료' : mission.status === 'ongoing' ? '진행' : '예정' }}</span>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </article>
</template>