<script setup>
import { AlertTriangle, X } from 'lucide-vue-next'

defineProps({
  modal: { type: Object, required: true },
})

const emit = defineEmits(['close', 'confirm'])

function close() {
  emit('close')
}

function confirm() {
  emit('confirm')
}
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
      v-if="modal.show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      @click.self="close"
    >
      <div class="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          class="flex items-center justify-between border-b border-rose-100 bg-rose-50/60 px-5 py-4"
        >
          <div class="flex items-center gap-2">
            <AlertTriangle class="h-4 w-4 text-rose-600" />
            <p class="font-bold text-rose-800">일정 변경 요청 반려</p>
          </div>
          <button @click="close" class="text-rose-400 hover:text-rose-700">
            <X class="h-4 w-4" />
          </button>
        </div>
        <div class="space-y-3 p-5">
          <p class="text-xs text-forena-600">
            반려 사유를 입력해주세요. 입력한 내용은 공정 책임자에게 전달됩니다.
          </p>
          <div>
            <label class="mb-1.5 block text-[11px] font-bold text-forena-400">
              반려 사유 <span class="text-rose-500">*</span>
            </label>
            <textarea
              v-model="modal.reason"
              rows="4"
              placeholder="예: 제출된 근거 자료 미흡, 추가 현장 확인 필요, 다른 공정 일정과 충돌 등"
              class="w-full resize-none rounded-lg border border-forena-200 px-3 py-2.5 text-xs outline-none transition-colors focus:border-rose-400"
            />
          </div>
        </div>
        <div class="flex justify-end gap-2 border-t border-forena-100 bg-forena-50/60 px-5 py-3">
          <button
            @click="close"
            class="rounded-lg border border-forena-200 bg-white px-4 py-2 text-xs font-bold text-forena-600 transition-colors hover:bg-forena-50"
          >
            취소
          </button>
          <button
            @click="confirm"
            :disabled="!modal.reason.trim()"
            class="rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-300"
            :class="modal.reason.trim() ? 'bg-rose-600 hover:bg-rose-700' : ''"
          >
            반려 확인
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
