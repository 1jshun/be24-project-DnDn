<script setup>
import { X } from 'lucide-vue-next'

defineProps({
  open: { type: Boolean, default: false },
  fatigue: { type: Object, default: null },
  T: { type: Object, required: true },
})

const emit = defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && fatigue"
      class="fixed inset-0 z-[95] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fatigue-modal-title"
    >
      <button
        type="button"
        class="absolute inset-0 bg-forena-900/40 backdrop-blur-[1px]"
        :aria-label="T.fatigueModalClose"
        @click="emit('close')"
      />
      <div
        class="relative z-10 flex max-h-[min(85vh,680px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-forena-100 bg-white shadow-xl ring-1 ring-black/5"
      >
        <div class="flex shrink-0 items-center justify-between gap-3 border-b border-forena-100 px-4 py-3">
          <h3 id="fatigue-modal-title" class="text-sm font-bold text-forena-900 sm:text-base">
            {{ T.fatigueModalTitle }}
          </h3>
          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-500 transition hover:bg-forena-50 hover:text-forena-900"
            :aria-label="T.fatigueModalClose"
            @click="emit('close')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          <div class="overflow-x-auto rounded-xl border border-forena-100">
            <table class="w-full min-w-[280px] text-left text-xs sm:text-sm">
              <thead
                class="border-b border-forena-100 bg-forena-50/80 text-[10px] font-bold uppercase tracking-wide text-forena-600"
              >
                <tr>
                  <th class="px-2.5 py-2 sm:px-3">{{ T.fatigueModalColItem }}</th>
                  <th
                    class="w-[4.5rem] whitespace-nowrap px-2 py-2 text-right tabular-nums sm:w-[5rem]"
                  >
                    {{ T.fatigueModalColPoints }}
                  </th>
                  <th class="min-w-[8rem] px-2.5 py-2 sm:px-3">{{ T.fatigueModalColRule }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-forena-100 text-forena-800">
                <tr v-for="row in fatigue.breakdownRows" :key="row.key">
                  <td class="align-top px-2.5 py-2 font-semibold sm:px-3">{{ row.label }}</td>
                  <td class="align-top px-2 py-2 text-right font-bold tabular-nums text-forena-900">
                    {{ row.points }}점
                  </td>
                  <td
                    class="align-top px-2.5 py-2 text-[11px] leading-snug text-slate-600 sm:px-3 sm:text-xs"
                  >
                    {{ row.desc }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mt-3 text-[11px] leading-relaxed text-slate-500">
            {{ T.fatigueModalFooterNote }}
          </p>
        </div>
        <div class="flex shrink-0 justify-end border-t border-forena-100 bg-forena-50/40 px-4 py-3">
          <button
            type="button"
            class="rounded-xl bg-gradient-to-r from-forena-700 to-forena-900 px-4 py-2 text-xs font-bold text-white sm:text-sm"
            @click="emit('close')"
          >
            {{ T.fatigueModalClose }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
