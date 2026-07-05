<script setup>
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import AccountFieldTable from '@/components/system/account/AccountFieldTable.vue'

defineProps({
  T: { type: Object, required: true },
  directorFieldAccounts: { type: Array, required: true },
  hqFieldAccounts: { type: Array, required: true },
  tradeFieldAccounts: { type: Array, required: true },
  tradeGroupedRows: { type: Array, required: true },
  tradeAccordionOpen: { type: Object, required: true },
  accountStatusTheadClass: { type: String, required: true },
})

const workerAffiliationTab = defineModel('workerAffiliationTab', {
  type: String,
  required: true,
})

const emit = defineEmits(['edit', 'activate', 'deactivate', 'toggle-trade-accordion'])
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-forena-100/90 bg-white shadow-card">
    <div class="px-4 pt-4 pb-3 sm:px-5">
      <h2 class="text-base font-bold text-forena-900">{{ T.sectionAccountStatus }}</h2>
    </div>

    <div class="border-t border-forena-100/70 bg-white px-4 pb-px pt-3 sm:px-5">
      <div
        v-if="(directorFieldAccounts ?? []).length"
        class="mb-5 overflow-hidden rounded-xl border border-slate-200/80"
      >
        <div
          class="flex items-center justify-between gap-3 bg-slate-200/55 px-4 py-2.5 text-left"
        >
          <span class="text-sm font-bold text-forena-900">{{ T.sectionSiteDirectorAccounts }}</span>
          <span class="shrink-0 text-[11px] font-semibold tabular-nums text-forena-600">
            ({{ (directorFieldAccounts ?? []).length }})
          </span>
        </div>
        <div class="overflow-x-auto border-t border-slate-200/70">
          <AccountFieldTable
            :T="T"
            :rows="directorFieldAccounts ?? []"
            :thead-class="accountStatusTheadClass"
            row-key-prefix="dir-"
            :show-empty="false"
            @edit="emit('edit', $event)"
            @activate="emit('activate', $event)"
            @deactivate="emit('deactivate', $event)"
          />
        </div>
      </div>

      <div
        class="-mx-1 mb-3 flex flex-wrap items-center gap-1 border-b border-forena-100/60 px-1 pb-3"
      >
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-bold transition"
          :class="
            workerAffiliationTab === 'hq'
              ? 'bg-forena-800 text-white shadow-sm'
              : 'text-forena-600 hover:bg-forena-50 hover:text-forena-900'
          "
          @click="workerAffiliationTab = 'hq'"
        >
          {{ T.workerSubTabHQ }}
          <span class="ml-1 tabular-nums opacity-90">({{ (hqFieldAccounts ?? []).length }})</span>
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-bold transition"
          :class="
            workerAffiliationTab === 'trade'
              ? 'bg-forena-800 text-white shadow-sm'
              : 'text-forena-600 hover:bg-forena-50 hover:text-forena-900'
          "
          @click="workerAffiliationTab = 'trade'"
        >
          {{ T.workerSubTabByTrade }}
          <span class="ml-1 tabular-nums opacity-90">({{ (tradeFieldAccounts ?? []).length }})</span>
        </button>
      </div>

      <template v-if="workerAffiliationTab === 'hq'">
        <AccountFieldTable
          :T="T"
          :rows="hqFieldAccounts ?? []"
          :thead-class="accountStatusTheadClass"
          @edit="emit('edit', $event)"
          @activate="emit('activate', $event)"
          @deactivate="emit('deactivate', $event)"
        />
      </template>

      <div v-else class="divide-y divide-slate-200/70">
        <div v-if="!(tradeGroupedRows ?? []).length" class="px-4 py-10 text-center text-sm text-slate-400">
          표시할 계정이 없습니다.
        </div>
        <div v-for="[tradeLabel, tradeRows] in tradeGroupedRows ?? []" :key="'trade-' + tradeLabel">
          <button
            type="button"
            class="flex w-full items-center justify-between bg-slate-200/55 px-4 py-2.5 text-left text-sm font-bold text-forena-900 transition hover:bg-slate-200/75"
            @click="emit('toggle-trade-accordion', tradeLabel)"
          >
            <div class="flex min-w-0 items-center gap-2">
              <ChevronDown
                v-if="tradeAccordionOpen[tradeLabel]"
                class="h-3.5 w-3.5 shrink-0 text-forena-600"
                aria-hidden="true"
              />
              <ChevronRight
                v-else
                class="h-3.5 w-3.5 shrink-0 text-forena-600"
                aria-hidden="true"
              />
              <span class="truncate">{{ tradeLabel }}</span>
              <span class="text-[11px] font-semibold tabular-nums text-forena-600">
                ({{ (tradeRows ?? []).length }})
              </span>
            </div>
          </button>
          <div v-show="tradeAccordionOpen[tradeLabel]" class="bg-white">
            <AccountFieldTable
              :T="T"
              :rows="tradeRows ?? []"
              :thead-class="accountStatusTheadClass"
              :show-empty="false"
              @edit="emit('edit', $event)"
              @activate="emit('activate', $event)"
              @deactivate="emit('deactivate', $event)"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
