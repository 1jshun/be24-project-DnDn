<script setup>
import { AlertCircle, X } from 'lucide-vue-next'

defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  errors: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['close'])
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
      <!-- 헤더 -->
      <div class="flex items-center gap-3 border-b border-forena-100 bg-amber-50 px-5 py-4">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <AlertCircle class="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-forena-900">입력 내용을 확인해주세요</h3>
          <p class="text-[11px] text-amber-700">{{ errors.length }}가지 항목이 누락되었습니다.</p>
        </div>
        <button @click="emit('close')" class="ml-auto rounded-lg p-1 hover:bg-amber-100">
          <X class="h-4 w-4 text-slate-400" />
        </button>
      </div>

      <!-- 오류 목록 -->
      <div class="p-5">
        <ul class="space-y-2">
          <li
            v-for="(err, i) in errors"
            :key="i"
            class="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-3"
          >
            <span
              class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-600"
            >
              {{ i + 1 }}
            </span>
            <div class="min-w-0">
              <p class="text-[11px] font-bold text-rose-700">{{ err.field }}</p>
              <p class="text-[11px] text-rose-600">{{ err.msg }}</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
