<script setup>
import { Users, X } from 'lucide-vue-next'

defineProps({
  show: { type: Boolean, default: false },
  orders: { type: Array, default: () => [] },
  selectedDate: { type: String, default: '' },
  formatDate: { type: Function, default: (value) => value },
})

const emit = defineEmits(['close', 'select'])
</script>

<template>
  <transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="show"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      @click.self="emit('close')"
    >
      <div
        class="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div
          class="flex shrink-0 items-center justify-between border-b border-forena-100 px-6 py-4"
        >
          <div>
            <p class="text-base font-bold text-forena-900">공사일보 작성 대상 세부 작업 선택</p>
            <p class="mt-0.5 text-xs text-forena-500">
              {{ formatDate(selectedDate) }} 기준 승인된 작업 지시서 목록입니다.
            </p>
          </div>
          <button @click="emit('close')" class="text-slate-400 hover:text-forena-700">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="overflow-y-auto px-6 py-4">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              v-for="order in orders"
              :key="order.idx"
              @click="emit('select', order)"
              class="group cursor-pointer rounded-xl border border-forena-200 bg-white p-4 transition-all hover:border-flare-400 hover:bg-flare-50 hover:shadow-md"
            >
              <div class="flex items-start justify-between mb-2">
                <span
                  class="rounded bg-forena-100 px-1.5 py-0.5 text-[10px] font-bold text-forena-700"
                  >{{ order.location || order.title }}</span
                >
              </div>
              <p class="mt-2 text-xs text-forena-500 line-clamp-2">
                {{ order.instructionContent || '세부 지시 내용 없음' }}
              </p>
              <div class="mt-3 flex items-center gap-3 text-[11px] font-semibold text-forena-600">
                <span class="flex items-center gap-1"
                  ><Users class="h-3.5 w-3.5" /> {{ order.workerCount || 0 }}명</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
