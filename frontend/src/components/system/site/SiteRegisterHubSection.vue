<script setup>
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import { userRoleLabel } from '@/stores/authStore'
import { rowRoleStr } from '@/utils/system/accountHelpers'
import AccountRowActions from '@/components/system/account/AccountRowActions.vue'

defineProps({
  T: { type: Object, required: true },
  hubSections: { type: Array, required: true },
  expanded: { type: Object, required: true },
  accountStatusTheadClass: { type: String, required: true },
})

const emit = defineEmits(['toggle-accordion', 'edit', 'activate', 'deactivate'])
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-forena-100/90 bg-white shadow-card">
    <div class="border-b border-forena-100/80 px-4 py-4 sm:px-5">
      <h2 class="text-base font-bold text-forena-900">{{ T.sectionAccountHub }}</h2>
    </div>

    <div>
      <div
        v-for="sec in hubSections"
        :key="sec.key"
        class="border-b border-slate-200/60 last:border-b-0"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between bg-slate-200/55 px-4 py-2.5 text-left text-sm font-bold text-forena-900 transition hover:bg-slate-200/75"
          @click="emit('toggle-accordion', sec.key)"
        >
          <div class="flex items-center gap-2">
            <ChevronDown v-if="expanded[sec.key]" class="h-3.5 w-3.5 shrink-0 text-forena-600" />
            <ChevronRight v-else class="h-3.5 w-3.5 shrink-0 text-forena-600" />
            <span>{{ sec.label }}</span>
            <span class="text-[11px] font-semibold tabular-nums text-forena-600">
              ({{ (sec.rows ?? []).length }})
            </span>
          </div>
        </button>

        <div v-show="expanded[sec.key]" class="bg-white">
          <div class="border-t border-forena-100/70 px-4 pt-3 pb-px sm:px-5">
            <div class="overflow-x-auto">
              <table class="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead>
                  <tr :class="accountStatusTheadClass">
                    <th class="w-[13%] py-2.5 pl-5 pr-2 sm:pl-6">{{ T.colLoginId }}</th>
                    <th class="w-[12%] px-3 py-2.5">{{ T.colHubAccountName }}</th>
                    <th class="w-[14%] px-3 py-2.5">{{ T.colPhone }}</th>
                    <th class="w-[16%] px-3 py-2.5">{{ T.colEmail }}</th>
                    <th class="w-[14%] px-3 py-2.5">{{ T.colRole }}</th>
                    <th class="w-[10%] px-3 py-2.5">{{ T.colTrade }}</th>
                    <th class="w-[9%] px-3 py-2.5">{{ T.colStatus }}</th>
                    <th class="w-[12%] px-3 py-2.5 pr-5 text-center sm:pr-6">
                      {{ T.colActions }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!(sec.rows ?? []).length">
                    <td
                      colspan="8"
                      class="border-b border-slate-100/80 py-8 pl-5 pr-3 text-center text-xs text-slate-400 sm:pl-6 sm:pr-5"
                    >
                      표시할 계정이 없습니다.
                    </td>
                  </tr>
                  <tr
                    v-for="(row, ri) in sec.rows ?? []"
                    :key="row.idx"
                    class="border-b border-violet-100/40 transition hover:bg-violet-50/40"
                    :class="ri % 2 === 0 ? 'bg-white' : 'bg-violet-50/20'"
                  >
                    <td class="truncate py-2.5 pl-5 pr-2 font-mono text-xs text-forena-800 sm:pl-6">
                      {{ row.loginId }}
                    </td>
                    <td class="truncate px-3 py-2.5">
                      <span class="font-semibold text-forena-900">{{ row.name }}</span>
                    </td>
                    <td class="truncate px-3 py-2.5 text-xs">{{ row.phone || '—' }}</td>
                    <td class="truncate px-3 py-2.5 text-xs text-forena-700">
                      {{ row.email || '—' }}
                    </td>
                    <td class="truncate px-3 py-2.5 text-xs">
                      {{ userRoleLabel(rowRoleStr(row)) }}
                    </td>
                    <td class="truncate px-3 py-2.5 text-xs text-forena-700">
                      {{ row.trade || '—' }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2.5">
                      <span
                        class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1"
                        :class="
                          row.active
                            ? 'bg-sky-100 text-sky-900 ring-sky-200/80'
                            : 'bg-slate-100 text-slate-600 ring-slate-200/80'
                        "
                      >
                        {{ row.active ? T.active : T.inactive }}
                      </span>
                    </td>
                    <td class="whitespace-nowrap px-3 py-2.5 pr-5 sm:pr-6">
                      <AccountRowActions
                        :T="T"
                        :row="row"
                        @edit="emit('edit', $event)"
                        @activate="emit('activate', $event)"
                        @deactivate="emit('deactivate', $event)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
