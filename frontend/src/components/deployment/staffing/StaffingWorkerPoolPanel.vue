<script setup>
import { computed } from 'vue'
import { ChevronDown, ChevronRight, ExternalLink, Search } from 'lucide-vue-next'
import { fatigueIsHighRisk, fatigueTooltipForWorker, fatigueTotalFromWorker } from '@/utils/fatigueUi'
import {
  poolEmploymentBadgeClass,
  poolEmploymentDisplay,
  staffingTradeCell,
} from '@/utils/deployment/staffingBoardUi'

const props = defineProps({
  T: { type: Object, required: true },
  poolAffiliationFilter: { type: String, default: '' },
  poolTradeOptions: { type: Array, default: () => [] },
  workerPoolSearch: { type: String, default: '' },
  selectedWaitingIds: { type: Array, default: () => [] },
  showOnlyUnassignedInPool: { type: Boolean, default: false },
  assignTargetSubZoneId: { type: String, default: '' },
  assignOptions: { type: Array, default: () => [] },
  boardKindBreakdown: { type: Object, default: () => ({ total: 0 }) },
  staffingTableRows: { type: Array, default: () => [] },
  poolTotalPages: { type: Number, default: 1 },
  poolCurrentPage: { type: Number, default: 0 },
  poolHeaderAllChecked: { type: Boolean, default: false },
  poolSelectableWaitingIds: { type: Array, default: () => [] },
  poolPagedGroups: { type: Array, default: () => [] },
  poolHeaderCheckboxRef: { type: [Object, Function], default: null },
  poolGroupAllChecked: { type: Function, required: true },
  poolGroupSelectableIds: { type: Function, required: true },
  poolGroupIsOpen: { type: Function, required: true },
})

const emit = defineEmits([
  'assign',
  'toggle-unassigned-filter',
  'go-to-page',
  'toggle-pool-header-select-all',
  'toggle-pool-group-select-all',
  'toggle-pool-group-expanded',
  'toggle-select-waiting',
  'open-worker-profile',
  'update:pool-affiliation-filter',
  'update:worker-pool-search',
  'update:assign-target-sub-zone-id',
])

const poolAffiliationFilterModel = computed({
  get: () => props.poolAffiliationFilter,
  set: (v) => emit('update:pool-affiliation-filter', v),
})

const workerPoolSearchModel = computed({
  get: () => props.workerPoolSearch,
  set: (v) => emit('update:worker-pool-search', v),
})

const assignTargetSubZoneIdModel = computed({
  get: () => props.assignTargetSubZoneId,
  set: (v) => emit('update:assign-target-sub-zone-id', v),
})

function onToggleUnassignedFilter() {
  emit('toggle-unassigned-filter')
}

function assignSelectedWorkers() {
  emit('assign')
}

function togglePoolHeaderSelectAll() {
  emit('toggle-pool-header-select-all')
}

function togglePoolGroupSelectAll(rows) {
  emit('toggle-pool-group-select-all', rows)
}

function togglePoolGroupExpanded(label) {
  emit('toggle-pool-group-expanded', label)
}

function toggleSelectWaiting(waitingId) {
  emit('toggle-select-waiting', waitingId)
}

function openWorkerProfile(worker) {
  emit('open-worker-profile', worker)
}

function poolGoToPage(page) {
  emit('go-to-page', page)
}

function fatigueScore(worker) {
  return fatigueTotalFromWorker(worker)
}
</script>

<template>
  <section class="rounded-2xl border border-forena-100/90 bg-white/90 p-4 shadow-card sm:p-5">
    <h2 class="mb-4 text-base font-bold text-forena-900">{{ props.T.workerPoolTitle }}</h2>

    <div class="mb-4 flex flex-col gap-3 rounded-xl border border-forena-100 bg-forena-50/40 p-3">
      <div
        class="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-3 lg:gap-y-2"
      >
        <div class="flex w-full min-w-0 flex-col gap-1 sm:w-auto">
          <label class="text-[10px] font-bold uppercase tracking-wide text-forena-500">{{
            props.T.filterAffil
          }}</label>
          <select
            v-model="poolAffiliationFilterModel"
            class="w-full min-w-[9rem] rounded-xl border border-forena-200 bg-white px-3 py-2 text-xs font-semibold text-forena-900 outline-none focus:ring-2 focus:ring-flare-400/25 sm:w-44"
          >
            <option
              v-for="opt in props.poolTradeOptions"
              :key="opt.value || 'all'"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div class="w-full min-w-0 flex-1 lg:min-w-[220px]">
          <label
            class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
            >{{ props.T.searchWorker }}</label
          >
          <div class="relative">
            <Search
              class="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-flare-500/80"
              aria-hidden="true"
            />
            <input
              v-model="workerPoolSearchModel"
              type="search"
              :placeholder="props.T.searchPh"
              class="w-full rounded-xl border border-forena-200 bg-white py-2 pr-3 pl-9 text-xs text-forena-900 outline-none placeholder:text-slate-400 focus:border-flare-400 focus:ring-2 focus:ring-flare-400/20"
            />
          </div>
        </div>

        <div
          class="flex w-full shrink-0 flex-wrap items-end gap-2 sm:w-auto"
          :class="props.selectedWaitingIds.length ? '' : 'lg:ml-auto'"
        >
          <button
            type="button"
            class="rounded-lg px-3 py-2 text-xs font-bold shadow-sm ring-1 transition"
            :class="
              props.showOnlyUnassignedInPool
                ? 'bg-forena-800 text-white ring-forena-800'
                : 'bg-white text-forena-700 ring-forena-200 hover:bg-forena-50'
            "
            @click="onToggleUnassignedFilter"
          >
            {{ props.T.showUnassignedOnly }}
          </button>
        </div>

        <div
          v-if="props.selectedWaitingIds.length"
          class="flex w-full flex-wrap items-end gap-2 sm:w-auto lg:ml-auto"
        >
          <select
            v-model="assignTargetSubZoneIdModel"
            class="min-w-[12rem] rounded-xl border border-forena-200 bg-white px-3 py-2 text-xs font-semibold text-forena-900 outline-none focus:ring-2 focus:ring-flare-400/30"
          >
            <option value="" disabled>{{ props.T.assignTarget }}</option>
            <option v-for="opt in props.assignOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <button
            type="button"
            class="rounded-xl bg-gradient-to-r from-forena-700 to-forena-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-forena-800 hover:to-forena-950"
            @click="assignSelectedWorkers"
          >
            {{ props.T.assignBtn }}
          </button>
        </div>
      </div>
    </div>

    <div class="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[11px] text-slate-500">
      <span
        >{{ props.T.totalWorkers }}
        <strong class="text-forena-800">{{ props.boardKindBreakdown.total }}</strong
        >{{ props.T.countUnit }}</span
      >
      <span v-if="props.staffingTableRows.length"
        >{{ props.T.poolListAggregate }}
        <strong class="text-forena-800">{{ props.staffingTableRows.length }}</strong
        >{{ props.T.countUnit }}</span
      >
      <span v-if="props.poolTotalPages > 1" class="text-forena-400">
        ({{ props.poolCurrentPage + 1 }}&nbsp;/&nbsp;{{ props.poolTotalPages }}&nbsp;페이지)
      </span>
    </div>

    <div class="overflow-x-auto rounded-xl border border-forena-100">
      <table class="w-full min-w-[1000px] text-left text-sm">
        <thead
          class="border-b border-forena-100 bg-forena-50/70 text-[11px] font-bold uppercase tracking-wide text-forena-500"
        >
          <tr>
            <th class="w-11 min-w-[2.75rem] px-3 py-3 align-middle">
              <div class="flex items-center justify-center">
                <input
                  :ref="props.poolHeaderCheckboxRef"
                  type="checkbox"
                  class="h-4 w-4 shrink-0 rounded border-forena-300 text-flare-600 focus:ring-flare-500 disabled:cursor-not-allowed disabled:opacity-40"
                  :checked="props.poolHeaderAllChecked"
                  :disabled="!props.poolSelectableWaitingIds.length"
                  :title="props.T.poolHeaderSelectAll"
                  :aria-label="props.T.poolHeaderSelectAll"
                  @change="togglePoolHeaderSelectAll"
                />
              </div>
            </th>
            <th class="px-3 py-3">{{ props.T.workerTableName }}</th>
            <th class="px-3 py-3">{{ props.T.colTrade }}</th>
            <th class="px-3 py-3 whitespace-nowrap">{{ props.T.colEmployment }}</th>
            <th class="px-3 py-3">{{ props.T.colFatiguePool }}</th>
            <th class="px-3 py-3">{{ props.T.colPlacement }}</th>
            <th class="px-3 py-3 text-center">{{ props.T.colProfile }}</th>
          </tr>
        </thead>
        <tbody class="text-forena-800">
          <tr v-if="props.staffingTableRows.length === 0">
            <td colspan="7" class="px-6 py-12 text-center text-slate-400">{{ props.T.poolEmpty }}</td>
          </tr>
          <template v-for="grp in props.poolPagedGroups" :key="grp.label">
            <tr class="border-b border-forena-100 bg-indigo-50/75">
              <td class="w-11 min-w-[2.75rem] px-3 py-2 align-middle">
                <div class="flex items-center justify-center" @click.stop>
                  <input
                    type="checkbox"
                    class="h-4 w-4 shrink-0 rounded border-forena-300 text-flare-600 focus:ring-flare-500 disabled:cursor-not-allowed disabled:opacity-40"
                    :checked="props.poolGroupAllChecked(grp.rows)"
                    :disabled="!props.poolGroupSelectableIds(grp.rows).length"
                    :aria-label="`${grp.label} ${props.T.poolHeaderSelectAll}`"
                    @change="togglePoolGroupSelectAll(grp.rows)"
                  />
                </div>
              </td>
              <td colspan="7" class="px-3 py-2">
                <div class="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex shrink-0 items-center justify-center rounded-md p-0.5 text-forena-700 hover:bg-white/90"
                    :aria-expanded="props.poolGroupIsOpen(grp.label)"
                    :aria-label="`${grp.label} ${props.T.poolGroupToggle}`"
                    @click="togglePoolGroupExpanded(grp.label)"
                  >
                    <ChevronDown v-if="props.poolGroupIsOpen(grp.label)" class="h-4 w-4" />
                    <ChevronRight v-else class="h-4 w-4" />
                  </button>
                  <span class="truncate text-xs font-bold text-flare-900">{{ grp.label }}</span>
                </div>
              </td>
            </tr>

            <tr
              v-for="row in grp.rows"
              v-show="props.poolGroupIsOpen(grp.label)"
              :key="(row.waitingId || row.worker.id) + row.placement"
              class="border-b border-forena-50 transition hover:bg-flare-50/30"
            >
              <td class="w-11 min-w-[2.75rem] px-3 py-3 align-middle">
                <div class="flex items-center justify-center">
                  <input
                    v-if="row.selectable && row.waitingId"
                    type="checkbox"
                    class="h-4 w-4 shrink-0 rounded border-forena-300 text-flare-600 focus:ring-flare-500"
                    :checked="props.selectedWaitingIds.includes(row.waitingId)"
                    @change="toggleSelectWaiting(row.waitingId)"
                  />
                </div>
              </td>
              <td class="px-3 py-3">
                <span class="font-semibold text-forena-900">{{ row.worker.name }}</span>
              </td>
              <td class="px-3 py-3 text-xs font-medium text-forena-700">
                {{ staffingTradeCell(props.T, row.worker) }}
              </td>
              <td class="px-3 py-3">
                <span :class="poolEmploymentBadgeClass(poolEmploymentDisplay(row.worker))">
                  {{ poolEmploymentDisplay(row.worker) }}
                </span>
              </td>
              <td class="px-3 py-3">
                <span
                  class="font-bold tabular-nums"
                  :title="fatigueTooltipForWorker(row.worker)"
                  :class="
                    fatigueIsHighRisk(fatigueScore(row.worker), row.worker)
                      ? 'text-rose-600'
                      : 'text-forena-900'
                  "
                >
                  {{ fatigueScore(row.worker) }}
                </span>
              </td>
              <td class="px-3 py-3">
                <span
                  class="text-xs font-bold"
                  :class="row.placement === '미투입' ? 'text-amber-800' : 'text-emerald-800'"
                >
                  {{ row.placement }}
                </span>
              </td>
              <td class="px-3 py-3 text-center">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg border border-forena-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-forena-700 hover:bg-flare-50"
                  :title="props.T.workerDetail"
                  @click="openWorkerProfile(row.worker)"
                >
                  <ExternalLink class="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <div
      v-if="props.poolTotalPages > 1"
      class="mt-2 flex items-center justify-center gap-3"
    >
      <button
        type="button"
        :disabled="props.poolCurrentPage === 0"
        class="inline-flex items-center justify-center rounded-lg p-1.5 text-forena-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        @click="poolGoToPage(props.poolCurrentPage - 1)"
      >
        <ChevronRight class="h-4 w-4 rotate-180" />
      </button>
      <span class="text-xs font-semibold tabular-nums text-forena-700">
        {{ props.poolCurrentPage + 1 }} / {{ props.poolTotalPages }}
        <span class="font-normal text-forena-400">({{ props.staffingTableRows.length }}명)</span>
      </span>
      <button
        type="button"
        :disabled="props.poolCurrentPage >= props.poolTotalPages - 1"
        class="inline-flex items-center justify-center rounded-lg p-1.5 text-forena-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        @click="poolGoToPage(props.poolCurrentPage + 1)"
      >
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>
  </section>
</template>
