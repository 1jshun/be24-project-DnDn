<script setup>
import { ChevronRight, ClipboardList, Sparkles, X } from 'lucide-vue-next'
import { progressSourceLabel } from '@/utils/schedule/analysis/analysisMappers.js'

defineProps({
  show: { type: Boolean, default: false },
  detailTask: { type: Object, default: null },
  detailRec: { type: Object, default: null },
})

const emit = defineEmits(['close', 'goto-ai'])

const riskColor = (r) =>
  ({
    ['\uB0AE\uC74C']: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    ['\uBCF4\uD1B5']: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    ['\uB192\uC74C']: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    ['\uB9E4\uC6B0 \uB192\uC74C']: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  })[r] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'

function close() {
  emit('close')
}

function gotoAi() {
  emit('goto-ai')
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
      v-if="show && detailTask"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      @click.self="close"
    >
      <div
        class="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div
          class="flex shrink-0 items-center justify-between border-b border-forena-100 px-6 py-4"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-flare-50">
              <ClipboardList class="h-5 w-5 text-flare-600" />
            </div>
            <div>
              <p class="text-base font-bold text-forena-900">지연 위험 작업 상세</p>
              <p class="mt-0.5 text-xs text-forena-500">
                {{ detailTask.process }} 공정 · {{ detailTask.partner }}
              </p>
            </div>
          </div>
          <button @click="close" class="text-slate-400 hover:text-forena-700">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <!-- 타이틀 + 위험도 -->
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-lg font-bold text-forena-900">{{ detailTask.name }}</h2>
            <span
              v-if="detailTask.isCritical"
              class="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700"
              >CP · 임계공정</span
            >
            <span
              class="rounded-lg px-2 py-0.5 text-[11px] font-bold"
              :class="riskColor(detailTask.risk)"
              >위험도 {{ detailTask.risk }}</span
            >
          </div>
          <p class="mt-1 text-xs text-forena-500">
            <ChevronRight class="inline h-3 w-3" />작업 위치:
            <strong class="text-forena-700">{{ detailTask.location }}</strong>
          </p>

          <!-- 진척률 박스 -->
          <div class="mt-4 grid grid-cols-3 gap-2.5">
            <div class="rounded-xl border border-forena-100 bg-forena-50/40 p-3">
              <p class="text-[10px] font-bold uppercase text-forena-400">계획</p>
              <p class="mt-0.5 text-2xl font-bold tabular-nums text-forena-700">
                {{ detailTask.plannedPct }}%
              </p>
            </div>
            <div class="rounded-xl border border-rose-200 bg-rose-50/40 p-3">
              <p class="text-[10px] font-bold uppercase text-rose-500">실제</p>
              <p class="mt-0.5 text-2xl font-bold tabular-nums text-rose-700">
                {{ detailTask.actualPct }}%
              </p>
              <p class="mt-0.5 text-[10px] text-rose-500">차이 {{ detailTask.diff }}%p</p>
              <p class="mt-0.5 text-[10px] font-semibold text-rose-500">
                {{ progressSourceLabel(detailTask.actualSource) }}
              </p>
            </div>
            <div class="rounded-xl border border-orange-200 bg-orange-50/40 p-3">
              <p class="text-[10px] font-bold uppercase text-orange-600">예상 지연</p>
              <p class="mt-0.5 text-2xl font-bold tabular-nums text-orange-700">
                {{ detailTask.expectedDelayDays }}일
              </p>
            </div>
          </div>

          <!-- 정보 -->
          <div class="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div class="rounded-xl border border-forena-100 px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">지연 원인</p>
              <p class="mt-1 text-xs leading-relaxed text-forena-800">{{ detailTask.cause }}</p>
            </div>
            <div class="rounded-xl border border-rose-100 bg-rose-50/30 px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-rose-500">
                후속 공정 영향
              </p>
              <p class="mt-1 text-xs leading-relaxed text-rose-800">
                {{ detailTask.followEffect }}
              </p>
            </div>
            <div class="rounded-xl border border-forena-100 px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">
                현재 투입 인력
              </p>
              <p class="mt-1 text-sm font-bold text-forena-900">{{ detailTask.actualWorkers }}명</p>
            </div>
            <div class="rounded-xl border border-forena-100 px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">
                계획 종료일
              </p>
              <p class="mt-1 text-sm font-bold tabular-nums text-forena-900">
                {{ detailTask.originalEnd }}
              </p>
            </div>
          </div>

          <!-- AI 요약 미리보기 -->
          <div
            v-if="detailRec"
            class="mt-3 rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3"
          >
            <p class="flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
              <Sparkles class="h-3.5 w-3.5" />AI 분석 요약
            </p>
            <p class="mt-1 text-xs leading-relaxed text-amber-900">{{ detailRec.summary }}</p>
          </div>
        </div>

        <div
          class="flex shrink-0 items-center justify-end gap-2 border-t border-forena-100 bg-forena-50/40 px-6 py-3"
        >
          <button
            @click="close"
            class="rounded-lg border border-forena-200 bg-white px-4 py-2 text-xs font-bold text-forena-700 hover:bg-forena-50"
          >
            닫기
          </button>
          <button
            @click="gotoAi"
            class="inline-flex items-center gap-1.5 rounded-lg bg-flare-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-flare-600"
          >
            <Sparkles class="h-3.5 w-3.5" /> AI 추천안 보기
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
