<script setup>
import { ArrowRight, X } from 'lucide-vue-next'

defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  mainTrades: {
    type: Array,
    default: () => [],
  },
  trade: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: '연간',
  },
  allowYearly: {
    type: Boolean,
    default: true,
  },
})

defineEmits(['close', 'upload', 'update:trade', 'update:type'])
</script>

<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="$emit('close')"></div>

      <div class="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 class="text-sm font-bold text-slate-800">계획서 업로드 설정</h3>
          <button @click="$emit('close')" class="rounded-lg p-1 hover:bg-slate-100">
            <X class="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div class="space-y-5 p-6">
          <div class="space-y-2">
            <label class="text-[11px] font-bold text-slate-500">공종 선택</label>
            <select
              :value="trade"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-flare-500 focus:outline-none"
              @change="$emit('update:trade', $event.target.value)"
            >
              <option v-for="item in mainTrades" :key="item" :value="item">{{ item }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-[11px] font-bold text-slate-500">계획 종류</label>
            <div :class="allowYearly ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1 gap-2'">
              <button
                v-if="allowYearly"
                @click="$emit('update:type', '연간')"
                :class="
                  type === '연간'
                    ? 'border-flare-500 bg-flare-50 text-flare-700'
                    : 'border-slate-200 bg-white text-slate-600'
                "
                class="rounded-lg border py-3 text-xs font-semibold transition-all"
              >
                연간 계획서
              </button>
              <button
                @click="$emit('update:type', '월간')"
                :class="
                  type === '월간'
                    ? 'border-flare-500 bg-flare-50 text-flare-700'
                    : 'border-slate-200 bg-white text-slate-600'
                "
                class="rounded-lg border py-3 text-xs font-semibold transition-all"
              >
                월간 계획서
              </button>
            </div>
          </div>
        </div>

        <div class="bg-slate-50 px-6 py-4">
          <button
            @click="$emit('upload')"
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800"
          >
            계획서 업로드 <ArrowRight class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
