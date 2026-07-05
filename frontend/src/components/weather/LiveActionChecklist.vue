<script setup>
import { AlertCircle, Clock, Shield } from 'lucide-vue-next'

defineProps({
  actions: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

function getLevelColor(level) {
  if (level === '경고') return 'text-rose-700 bg-rose-50 border-rose-200'
  if (level === '주의') return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-emerald-700 bg-emerald-50 border-emerald-200'
}
</script>

<template>
  <article class="rounded-2xl border border-forena-100/90 bg-white/95 p-5 shadow-card">
    <div class="mb-5 flex items-start justify-between">
      <div>
        <h2 class="text-lg font-bold text-forena-900">현장 즉시 조치 체크리스트</h2>
        <p class="mt-1 text-xs leading-relaxed text-forena-600">오늘 기상 기준으로 작업계획에 없더라도 위험해질 수 있는 작업·장비를 AI가 먼저 제안합니다.</p>
      </div>
      <div v-if="actions.length > 0" class="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">{{ actions.length }}개</div>
    </div>

    <div v-if="loading" class="py-6 text-center text-sm text-forena-500">조치 사항을 확인 중입니다...</div>
    <div v-else-if="actions.length === 0" class="rounded-xl border border-dashed border-forena-200 bg-forena-50/50 py-6 text-center"><Shield class="mx-auto h-6 w-6 text-emerald-600" /><p class="mt-2 text-sm font-medium text-forena-600">특별한 조치 사항이 없습니다.</p></div>
    <ul v-else class="space-y-3">
      <li v-for="action in actions" :key="action.id" :class="`rounded-xl border p-4 transition ${getLevelColor(action.level)}`">
        <div class="flex items-start gap-3">
          <div class="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-current/20"><AlertCircle class="h-3 w-3 text-current" /></div>
          <div class="flex-1">
            <p class="font-semibold">{{ action.label }}</p>
            <p class="mt-1 text-sm">{{ action.detail }}</p>
            <div class="mt-2 flex items-center gap-2 text-xs"><Clock class="h-3 w-3" /><span>{{ action.timing }}</span></div>
          </div>
        </div>
      </li>
    </ul>
  </article>
</template>