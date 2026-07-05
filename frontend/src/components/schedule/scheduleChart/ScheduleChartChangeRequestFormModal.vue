<script setup>
import { GitBranch, X } from 'lucide-vue-next'

defineProps({
  newChangeReq: { type: Object, required: true },
})

const emit = defineEmits(['close', 'submit'])
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div class="flex items-center justify-between border-b border-forena-100 px-5 py-3">
        <h3 class="text-sm font-bold text-forena-900">변경 요청 — {{ newChangeReq.taskName }}</h3>
        <button @click="emit('close')">
          <X class="h-4 w-4 text-slate-400" />
        </button>
      </div>
      <div class="grid grid-cols-2 gap-3 p-5">
        <div class="col-span-2">
          <label class="text-[10px] font-bold uppercase text-forena-400">변경 유형</label>
          <select
            v-model="newChangeReq.changeType"
            class="mt-1 w-full rounded-lg border border-forena-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-flare-400"
          >
            <option>시작일 변경</option>
            <option>종료일 변경</option>
            <option>기간 연장</option>
            <option>기간 단축</option>
            <option>작업명 변경</option>
            <option>CP 변경</option>
            <option>보할 변경</option>
            <option>선행/후속 작업 변경</option>
          </select>
        </div>

        <div class="col-span-2 grid grid-cols-2 gap-3 rounded-xl bg-forena-50/40 p-3">
          <div class="col-span-2 text-[10px] font-bold uppercase text-forena-500">
            변경 전 → 변경 후
          </div>
          <div>
            <label class="text-[10px] text-forena-400">기존 시작일</label>
            <input
              :value="newChangeReq.oldStart"
              disabled
              class="mt-1 w-full rounded border border-forena-200 bg-slate-50 px-2 py-1 text-xs text-slate-500"
            />
          </div>
          <div>
            <label class="text-[10px] text-forena-400">새 시작일</label>
            <input
              v-model="newChangeReq.newStart"
              type="date"
              class="mt-1 w-full rounded border border-flare-300 bg-white px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label class="text-[10px] text-forena-400">기존 종료일</label>
            <input
              :value="newChangeReq.oldEnd"
              disabled
              class="mt-1 w-full rounded border border-forena-200 bg-slate-50 px-2 py-1 text-xs text-slate-500"
            />
          </div>
          <div>
            <label class="text-[10px] text-forena-400">새 종료일</label>
            <input
              v-model="newChangeReq.newEnd"
              type="date"
              class="mt-1 w-full rounded border border-flare-300 bg-white px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label class="text-[10px] text-forena-400">기존 보할</label>
            <input
              :value="newChangeReq.oldWeight + '%'"
              disabled
              class="mt-1 w-full rounded border border-forena-200 bg-slate-50 px-2 py-1 text-xs text-slate-500"
            />
          </div>
          <div>
            <label class="text-[10px] text-forena-400">새 보할 (%)</label>
            <input
              v-model.number="newChangeReq.newWeight"
              type="number"
              class="mt-1 w-full rounded border border-flare-300 bg-white px-2 py-1 text-xs"
            />
          </div>
        </div>

        <div class="col-span-2">
          <label class="text-[10px] font-bold uppercase text-forena-400">변경 사유 (필수)</label>
          <textarea
            v-model="newChangeReq.reason"
            rows="3"
            placeholder="현장 사유를 구체적으로 기재해 주세요"
            class="mt-1 w-full rounded-lg border border-forena-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-flare-400"
          ></textarea>
        </div>
      </div>
      <div class="flex justify-end gap-2 border-t border-forena-100 px-5 py-3">
        <button
          @click="emit('close')"
          class="rounded-lg border border-forena-200 bg-white px-4 py-2 text-xs font-bold text-forena-700 hover:bg-forena-50"
        >
          취소
        </button>
        <button
          @click="emit('submit')"
          class="rounded-lg bg-flare-600 px-4 py-2 text-xs font-bold text-white hover:bg-flare-700"
        >
          <GitBranch class="inline h-3.5 w-3.5 mr-1" />변경 요청 등록
        </button>
      </div>
    </div>
  </div>
</template>
