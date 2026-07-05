<script setup>
import { ChevronRight, Pencil, Ban, Check } from 'lucide-vue-next'

defineProps({
  T: { type: Object, required: true },
  rows: { type: Array, required: true },
})

const emit = defineEmits([
  'open-site-accounts',
  'edit-site',
  'deactivate-site',
  'activate-site',
])
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-forena-100/90 bg-white shadow-card">
    <div class="border-b border-forena-100/80 px-4 py-4 sm:px-5">
      <h2 class="text-base font-bold text-forena-900">{{ T.sectionSites }}</h2>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[900px] text-left text-sm">
        <thead
          class="border-b border-forena-100 bg-forena-50/70 text-[11px] font-bold uppercase tracking-wide text-forena-500"
        >
          <tr>
            <th class="whitespace-nowrap px-3 py-3">{{ T.colCode }}</th>
            <th class="whitespace-nowrap px-3 py-3">{{ T.colSiteDisplayName }}</th>
            <th class="whitespace-nowrap px-3 py-3">{{ T.colDirectorName }}</th>
            <th class="whitespace-nowrap px-3 py-3">{{ T.colDirectorPhone }}</th>
            <th class="px-3 py-3">{{ T.colAddress }}</th>
            <th class="whitespace-nowrap px-3 py-3">{{ T.colProjectStatus }}</th>
            <th class="whitespace-nowrap px-3 py-3 text-center">관리</th>
            <th class="w-10 px-2 py-3 text-center">
              <span class="sr-only">상세 이동</span>
            </th>
          </tr>
        </thead>
        <tbody class="text-forena-800">
          <tr v-if="!rows.length">
            <td colspan="8" class="px-3 py-10 text-center text-sm text-slate-400">
              {{ T.empty }}
            </td>
          </tr>
          <tr
            v-for="r in rows"
            :key="r.idx"
            class="cursor-pointer border-b border-forena-50 transition hover:bg-flare-50/40"
            role="button"
            tabindex="0"
            @click="emit('open-site-accounts', r.idx)"
            @keydown.enter.prevent="emit('open-site-accounts', r.idx)"
          >
            <td class="whitespace-nowrap px-3 py-3 font-mono text-xs">{{ r.code }}</td>
            <td class="px-3 py-3 font-semibold text-forena-900">{{ r.displayName }}</td>
            <td class="whitespace-nowrap px-3 py-3">{{ r.directorName }}</td>
            <td class="whitespace-nowrap px-3 py-3 text-xs">{{ r.directorPhone }}</td>
            <td class="px-3 py-3 text-xs text-forena-700">{{ r.address }}</td>
            <td class="whitespace-nowrap px-3 py-3">
              <span
                class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1"
                :class="
                  r.statusLabel === '운영 종료'
                    ? 'bg-slate-100 text-slate-700 ring-slate-200/80'
                    : 'bg-emerald-50 text-emerald-900 ring-emerald-200/80'
                "
              >
                {{ r.statusLabel }}
              </span>
            </td>
            <td class="px-3 py-3 text-center" @click.stop>
              <div class="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-forena-700 hover:bg-slate-50"
                  @click="emit('edit-site', r)"
                >
                  <Pencil class="h-3 w-3" />
                  {{ T.edit }}
                </button>
                <button
                  v-if="r.active"
                  type="button"
                  class="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50"
                  @click="emit('deactivate-site', r)"
                >
                  <Ban class="h-3 w-3" />
                  비활성화
                </button>
                <button
                  v-else
                  type="button"
                  class="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50"
                  @click="emit('activate-site', r)"
                >
                  <Check class="h-3 w-3" />
                  활성화
                </button>
              </div>
            </td>
            <td class="px-2 py-3 text-center text-forena-400" aria-hidden="true">
              <ChevronRight class="mx-auto h-4 w-4" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
