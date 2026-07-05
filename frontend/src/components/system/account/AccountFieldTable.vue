<script setup>
import { userRoleLabel } from '@/stores/authStore'
import { rowRoleStr } from '@/utils/system/accountHelpers'
import AccountRowActions from '@/components/system/account/AccountRowActions.vue'

defineProps({
  T: { type: Object, required: true },
  rows: { type: Array, required: true },
  theadClass: { type: String, required: true },
  rowKeyPrefix: { type: String, default: '' },
  emptyText: { type: String, default: '표시할 계정이 없습니다.' },
  showEmpty: { type: Boolean, default: true },
})

const emit = defineEmits(['edit', 'activate', 'deactivate'])
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[920px] border-collapse text-sm">
      <thead>
        <tr :class="theadClass">
          <th class="w-[13%] py-2.5 pl-5 pr-3 text-left text-xs font-bold sm:pl-6">
            {{ T.colLoginId }}
          </th>
          <th class="w-[15%] px-3 py-2.5 text-left text-xs">{{ T.colWorkerName }}</th>
          <th class="w-[13%] px-3 py-2.5 text-left text-xs">{{ T.colWorkerPhone }}</th>
          <th class="w-[17%] px-3 py-2.5 text-left text-xs">{{ T.colWorkerRole }}</th>
          <th class="w-[13%] px-3 py-2.5 text-left text-xs">{{ T.colWorkerTrade }}</th>
          <th class="w-[11%] px-3 py-2.5 text-left text-xs">{{ T.colStatus }}</th>
          <th class="w-[18%] px-3 py-2.5 pr-5 text-center text-xs sm:pr-6">
            {{ T.colActions }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="showEmpty && !rows.length">
          <td
            colspan="7"
            class="border-b border-slate-100/80 py-8 pl-5 pr-5 text-center text-xs text-slate-400 sm:pl-6 sm:pr-6"
          >
            {{ emptyText }}
          </td>
        </tr>
        <tr
          v-for="(row, ri) in rows"
          :key="rowKeyPrefix + row.idx"
          class="border-b border-violet-100/40 transition hover:bg-violet-50/40"
          :class="ri % 2 === 0 ? 'bg-white' : 'bg-violet-50/20'"
        >
          <td class="truncate py-2.5 pl-5 pr-3 font-mono text-xs text-forena-800 sm:pl-6">
            {{ row.loginId }}
          </td>
          <td class="truncate px-3 py-2.5 text-left">
            <span class="font-semibold text-forena-900">{{ row.name }}</span>
          </td>
          <td class="truncate px-3 py-2.5 text-left text-xs">{{ row.phone || '—' }}</td>
          <td class="truncate px-3 py-2.5 text-left text-xs">
            {{ userRoleLabel(rowRoleStr(row)) }}
          </td>
          <td class="truncate px-3 py-2.5 text-left text-xs text-forena-700">
            {{ row.trade || '—' }}
          </td>
          <td class="whitespace-nowrap px-3 py-2.5 text-left">
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
          <td class="whitespace-nowrap px-3 py-2.5 pr-5 text-center sm:pr-6">
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
</template>
