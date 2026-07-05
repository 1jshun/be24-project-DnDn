<script setup>
import { computed } from 'vue'
import { ArrowUpRight, Award, Medal, Trophy } from 'lucide-vue-next'

const props = defineProps({
  currentSite: {
    type: Object,
    required: true,
  },
  siteZones: {
    type: Array,
    default: () => [],
  },
})


function normalizeSortableNumber(value) {
  if (value == null || value === '') return 0
  const numberValue = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(numberValue) ? numberValue : 0
}

const sortedSiteZones = computed(() => (
  [...props.siteZones]
    .sort((left, right) => {
      const levelGap = normalizeSortableNumber(right.level) - normalizeSortableNumber(left.level)
      if (levelGap !== 0) return levelGap

      const scoreGap = normalizeSortableNumber(right.score) - normalizeSortableNumber(left.score)
      if (scoreGap !== 0) return scoreGap

      return String(left.name ?? '').localeCompare(String(right.name ?? ''), 'ko')
    })
    .map((zone, index) => ({
      ...zone,
      summaryRank: index + 1,
    }))
))

function levelTone(level) {
  if (level === '경고' || level === '위험') return 'bg-rose-100 text-rose-800 border-rose-200'
  if (level === '주의' || level === '관리' || level === '대기') return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-emerald-100 text-emerald-800 border-emerald-200'
}

function rankBadgeClass(rank) {
  if (rank === 1) return 'rounded-full border-amber-200 bg-amber-50 text-amber-800'
  if (rank === 2) return 'rounded-xl border-slate-200 bg-slate-100 text-slate-700'
  if (rank === 3) return 'rounded-lg border-orange-200 bg-orange-50 text-orange-800'
  return 'rounded-md border-forena-100 bg-forena-50 text-forena-700'
}

function rankIcon(rank) {
  if (rank === 1) return Trophy
  if (rank === 2) return Award
  return Medal
}
</script>

<template>
  <section class="rounded-2xl border border-forena-100 bg-white p-5 shadow-card">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-wide text-forena-500">일일 ESG 기록</p>
        <h2 class="mt-1 text-xl font-black text-forena-900">현장 ESG 성과 요약</h2>
      </div>
      <span class="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        <ArrowUpRight class="h-3.5 w-3.5" />
        {{ currentSite.snapshotSaved ? `${currentSite.shortName} 저장된 ESG 기록 기준` : `${currentSite.shortName} 실시간 ESG 계산 기준` }}
      </span>
    </div>

    <div class="mt-5 overflow-x-auto">
      <table class="w-full min-w-[760px] text-sm">
        <thead>
          <tr class="border-b border-forena-100 text-left text-[11px] font-bold uppercase tracking-wide text-forena-500">
            <th class="py-3 pr-4">구분</th>
            <th class="py-3 pr-4">대상</th>
            <th class="py-3 pr-4">ESG 점수</th>
            <th class="py-3 pr-4">레벨</th>
            <th class="py-3 pr-4">주요 기여</th>
            <th class="py-3 text-right">상태</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="zone in sortedSiteZones"
            :key="zone.id"
            class="border-b border-forena-50 transition hover:bg-forena-50/40"
          >
            <td class="py-3 pr-4">
              <span class="inline-flex items-center gap-1 border px-2 py-1 text-[11px] font-bold" :class="rankBadgeClass(zone.summaryRank)">
                <component :is="rankIcon(zone.summaryRank)" class="h-3 w-3" />
                {{ zone.summaryRank }}위
              </span>
            </td>
            <td class="py-3 pr-4">
              <p class="font-bold text-forena-900">{{ zone.name }}</p>
              <p class="mt-0.5 text-[11px] text-forena-500">{{ zone.type }}</p>
            </td>
            <td class="py-3 pr-4 font-black tabular-nums text-emerald-800">{{ zone.score }}</td>
            <td class="py-3 pr-4">
              <span class="rounded-full border border-forena-200 bg-white px-2 py-0.5 text-[11px] font-bold text-forena-700">
                Lv.{{ zone.level }}
              </span>
            </td>
            <td class="py-3 pr-4 text-xs text-forena-600">
              탄소 {{ zone.carbon }}kg · 세척 관리 {{ zone.metrics?.washEquipmentCount ?? zone.equipmentCount ?? 0 }}대 · 리스크 {{ zone.risk }}건
            </td>
            <td class="py-3 text-right">
              <span class="rounded-full border px-2.5 py-1 text-[11px] font-bold" :class="levelTone(zone.status)">
                {{ zone.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
