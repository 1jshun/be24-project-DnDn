<script setup>
import { CheckCircle2, ShieldCheck } from 'lucide-vue-next'

defineProps({
  validation: { type: Array, required: true },
})

const emit = defineEmits(['close', 'confirm'])
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div class="flex items-center gap-2 border-b border-forena-100 px-5 py-3">
        <ShieldCheck class="h-4 w-4 text-emerald-600" />
        <h3 class="text-sm font-bold text-forena-900">기준 공정표 확정</h3>
      </div>
      <div class="space-y-3 p-5">
        <p class="text-xs text-slate-600">
          기준 공정표를 확정하면 이후 수정은 변경 요청을 통해서만 가능합니다.
        </p>

        <div class="rounded-xl border border-forena-100 bg-forena-50/40 p-3">
          <p class="mb-2 text-[10px] font-bold uppercase text-forena-500">확정 전 검증</p>
          <ul class="space-y-1.5 text-xs">
            <li v-for="(v, i) in validation" :key="i" class="flex items-start gap-2">
              <span
                class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                :class="
                  v.level === 'error'
                    ? 'bg-rose-500'
                    : v.level === 'warn'
                      ? 'bg-amber-500'
                      : 'bg-sky-500'
                "
              ></span>
              <span
                :class="
                  v.level === 'error'
                    ? 'text-rose-700'
                    : v.level === 'warn'
                      ? 'text-amber-800'
                      : 'text-sky-700'
                "
                >{{ v.msg }}</span
              >
            </li>
            <li v-if="!validation.length" class="text-emerald-700">
              <CheckCircle2 class="inline h-3.5 w-3.5 mr-1" />검증 항목 모두 통과
            </li>
          </ul>
        </div>

        <div
          class="rounded-lg bg-amber-50/40 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-100"
        >
          확정 후에는 본 페이지의 테이블/간트차트에서 직접 수정이 불가능하며, 변경 요청 절차를
          따라야 합니다.
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
          @click="emit('confirm')"
          class="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
        >
          <ShieldCheck class="inline h-3.5 w-3.5 mr-1" />확정
        </button>
      </div>
    </div>
  </div>
</template>
