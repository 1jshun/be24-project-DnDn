<script setup>
import { ChevronDown, ChevronRight, ExternalLink, Pencil, X } from 'lucide-vue-next'
import { fatigueIsHighRisk, fatigueTooltipForWorker, fatigueTotalFromWorker } from '@/utils/fatigueUi'
import {
  poolEmploymentBadgeClass,
  poolEmploymentDisplay,
  staffingTradeCell,
  subZoneCardBorderClass,
  tradeGroupAssignedSum,
  tradeGroupCardBorderClass,
  tradeGroupRequiredSum,
  zoneBarClass,
  zoneFillRatio,
  zoneTradeProgress,
} from '@/utils/deployment/staffingBoardUi'

const props = defineProps({
  T: { type: Object, required: true },
  zonesByTrade: { type: Array, default: () => [] },
  isTradeGroupExpanded: { type: Function, required: true },
})

const emit = defineEmits([
  'open-reset-confirm',
  'toggle-trade-group',
  'open-zone-edit',
  'remove-from-sub-zone',
  'open-worker-profile',
])

function openResetConfirm() {
  emit('open-reset-confirm')
}

function toggleTradeGroup(tradeName) {
  emit('toggle-trade-group', tradeName)
}

function openZoneEdit(group, subZone) {
  emit('open-zone-edit', group, subZone)
}

function removeFromSubZone(subZoneId, workerId) {
  emit('remove-from-sub-zone', subZoneId, workerId)
}

function openWorkerProfile(worker) {
  emit('open-worker-profile', worker)
}

function fatigueScore(worker) {
  return fatigueTotalFromWorker(worker)
}
</script>

<template>
  <section class="rounded-2xl border border-forena-100/90 bg-white/90 p-4 shadow-card sm:p-5">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-base font-bold text-forena-900">{{ props.T.zoneByZoneTitle }}</h2>
      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          class="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800"
          @click="openResetConfirm"
        >
          {{ props.T.zoneReset }}
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <div
        v-for="tg in props.zonesByTrade"
        :key="tg.tradeName"
        class="overflow-hidden rounded-lg bg-forena-50/30"
        :class="tradeGroupCardBorderClass(tg)"
      >
        <button
          type="button"
          class="flex w-full flex-col gap-2 px-3 py-2.5 text-left transition hover:bg-forena-100/50 sm:flex-row sm:items-center sm:gap-3"
          @click="toggleTradeGroup(tg.tradeName)"
        >
          <div class="flex shrink-0 flex-wrap items-center gap-2">
            <ChevronRight
              v-if="!props.isTradeGroupExpanded(tg.tradeName)"
              class="h-3.5 w-3.5 shrink-0 text-forena-500"
            />
            <ChevronDown v-else class="h-3.5 w-3.5 shrink-0 text-forena-500" />
            <span class="font-bold text-forena-900">{{ tg.tradeName }}</span>
            <span class="text-[11px] text-slate-500">({{ (tg.entries ?? []).length }}개 공정)</span>
          </div>
          <div
            class="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold leading-snug"
          >
            <template v-for="(entry, idx) in tg.entries ?? []" :key="entry.sz.id">
              <span
                v-if="idx > 0"
                class="hidden font-bold text-slate-300 sm:inline"
                aria-hidden="true"
                >·</span
              >
              <span class="whitespace-nowrap tabular-nums text-forena-900">
                {{ entry.sz.title
                }}<span>{{ ' ' }}{{ entry.sz.workers.length }}/{{ entry.sz.required }}{{ props.T.count }}</span>
              </span>
            </template>
          </div>
          <span class="shrink-0 text-[10px] font-bold tabular-nums text-forena-600 sm:ml-auto">
            {{ tradeGroupAssignedSum(tg) }}/{{ tradeGroupRequiredSum(tg) }}{{ props.T.count }} 투입
          </span>
        </button>

        <div
          v-show="props.isTradeGroupExpanded(tg.tradeName)"
          class="space-y-3 border-t border-forena-100/80 bg-white/90 px-2 py-3 sm:px-3"
        >
          <div
            v-for="entry in tg.entries ?? []"
            :key="entry.sz.id"
            class="overflow-hidden rounded-lg border bg-white/95"
            :class="subZoneCardBorderClass(entry.sz)"
          >
            <div
              class="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5"
              :class="entry.sz.expanded ? 'border-b border-forena-100/90' : ''"
            >
              <button
                type="button"
                class="flex min-w-0 max-w-full shrink-0 items-center gap-1.5 text-left"
                @click="entry.sz.expanded = !entry.sz.expanded"
              >
                <ChevronRight v-if="!entry.sz.expanded" class="h-3.5 w-3.5 shrink-0 text-forena-400" />
                <ChevronDown v-else class="h-3.5 w-3.5 shrink-0 text-forena-400" />
                <span class="truncate text-xs font-bold text-forena-900">{{ entry.sz.title }}</span>
              </button>

              <div class="flex min-w-0 flex-wrap items-center gap-1 text-[10px] font-bold text-forena-500">
                <span v-if="entry.sz.location" class="rounded-md bg-slate-50 px-1.5 py-0.5">
                  {{ entry.sz.location }}
                </span>
                <span v-if="entry.sz.workTime" class="rounded-md bg-slate-50 px-1.5 py-0.5">
                  {{ entry.sz.workTime }}
                </span>
                <span v-if="entry.sz.tradeName" class="rounded-md bg-slate-50 px-1.5 py-0.5">
                  {{ entry.sz.tradeName }}
                </span>
              </div>

              <div
                class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1 leading-tight sm:gap-x-3"
              >
                <span
                  v-for="row in zoneTradeProgress(props.T, entry.sz)"
                  :key="row.trade"
                  class="whitespace-nowrap text-xs font-bold tabular-nums"
                  :class="row.fill >= row.need ? 'text-emerald-700' : 'text-rose-600'"
                >
                  {{ row.fill }}/{{ row.need }}{{ props.T.count }}
                </span>
              </div>

              <div class="flex shrink-0 items-center gap-2">
                <div
                  class="h-1.5 w-[4.5rem] overflow-hidden rounded-full bg-forena-100 sm:w-24 md:w-32"
                >
                  <div
                    class="h-full min-w-0 rounded-full transition-all duration-300"
                    :class="zoneBarClass(entry.sz)"
                    :style="{ width: Math.round(zoneFillRatio(entry.sz) * 100) + '%' }"
                  />
                </div>
                <span class="shrink-0 text-[10px] font-bold tabular-nums text-forena-800">
                  총 {{ entry.sz.workers.length }}/{{ entry.sz.required }}{{ props.T.count }}
                </span>
                <button
                  type="button"
                  class="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-forena-50 hover:text-flare-700"
                  :title="props.T.editZone"
                  @click.stop="openZoneEdit(entry.group, entry.sz)"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div v-if="entry.sz.expanded" class="border-t border-forena-100 bg-white">
              <div class="overflow-x-auto">
                <table class="w-full min-w-[720px] text-left text-xs">
                  <thead
                    class="border-b border-forena-100 bg-forena-50/85 text-[10px] font-bold uppercase tracking-wide text-forena-500"
                  >
                    <tr>
                      <th class="w-8 px-3 py-2" />
                      <th class="px-3 py-2">{{ props.T.workerTableName }}</th>
                      <th class="px-3 py-2">{{ props.T.colTrade }}</th>
                      <th class="px-3 py-2 whitespace-nowrap">{{ props.T.colEmployment }}</th>
                      <th class="px-3 py-2">{{ props.T.colFatigue }}</th>
                      <th class="px-3 py-2 text-center">{{ props.T.colProfile }}</th>
                      <th class="w-8 px-3 py-2 text-center" />
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-forena-100 text-forena-800">
                    <tr v-if="entry.sz.workers.length === 0">
                      <td colspan="7" class="px-3 py-5 text-center text-slate-400">
                        {{ props.T.poolEmpty }}
                      </td>
                    </tr>
                    <tr v-for="w in entry.sz.workers" :key="w.id" class="align-middle">
                      <td class="px-3 py-1.5" />
                      <td class="px-3 py-1.5">
                        <span class="font-semibold text-forena-900">{{ w.name }}</span>
                      </td>
                      <td class="px-3 py-1.5 text-[11px] font-medium text-forena-700">
                        {{ staffingTradeCell(props.T, w) }}
                      </td>
                      <td class="px-3 py-1.5">
                        <span :class="poolEmploymentBadgeClass(poolEmploymentDisplay(w))">
                          {{ poolEmploymentDisplay(w) }}
                        </span>
                      </td>
                      <td class="px-3 py-1.5">
                        <span
                          :title="fatigueTooltipForWorker(w)"
                          class="tabular-nums font-bold"
                          :class="
                            fatigueIsHighRisk(fatigueScore(w), w)
                              ? 'text-rose-600'
                              : 'text-forena-800'
                          "
                        >
                          {{ fatigueScore(w) }}
                        </span>
                      </td>
                      <td class="px-3 py-1.5 text-center">
                        <button
                          type="button"
                          class="inline-flex items-center gap-1 rounded-md border border-forena-200 bg-white px-2 py-0.5 text-[10px] font-bold text-forena-700 hover:bg-flare-50"
                          @click="openWorkerProfile(w)"
                        >
                          <ExternalLink class="h-3 w-3" />
                        </button>
                      </td>
                      <td class="px-3 py-1.5 text-center">
                        <button
                          type="button"
                          class="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          :title="props.T.removeZone"
                          @click="removeFromSubZone(entry.sz.id, w.id)"
                        >
                          <X class="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
