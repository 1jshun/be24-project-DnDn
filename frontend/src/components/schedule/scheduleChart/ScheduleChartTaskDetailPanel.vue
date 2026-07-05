<script setup>
import { ArrowRight, Download, Eye, MapPin, RefreshCw, Users, Wrench, X } from 'lucide-vue-next'

defineProps({
  selectedTask: { type: Object, required: true },
  uploadedDocs: { type: Array, required: true },
  confidenceClass: { type: Function, required: true },
  reviewStatusClass: { type: Function, required: true },
})

const emit = defineEmits(['close'])
</script>

<template>
  <div
    class="w-80 shrink-0 overflow-hidden rounded-2xl border border-forena-100/90 bg-white/95 shadow-card"
  >
    <div class="flex items-center justify-between border-b border-forena-100 px-4 py-3">
      <h2 class="text-sm font-bold text-forena-900">작업 상세</h2>
      <button @click="emit('close')" class="rounded-lg p-1 hover:bg-forena-50">
        <X class="h-4 w-4 text-slate-400 hover:text-forena-700" />
      </button>
    </div>
    <div class="overflow-y-auto" style="max-height: calc(100vh - 200px)">
      <div class="space-y-4 p-4">
        <div>
          <div class="flex items-start justify-between gap-2">
            <p class="text-base font-bold text-forena-900">{{ selectedTask.name }}</p>
            <span
              v-if="selectedTask.isCritical"
              class="shrink-0 rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700"
              >CP</span
            >
          </div>
          <p class="mt-0.5 text-xs text-slate-500">
            {{ selectedTask.group }} · {{ selectedTask.sub }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="rounded-lg bg-forena-50/40 p-2">
            <p class="text-[10px] font-bold text-forena-400">시작일</p>
            <p class="font-semibold tabular-nums text-forena-800">{{ selectedTask.start }}</p>
          </div>
          <div class="rounded-lg bg-forena-50/40 p-2">
            <p class="text-[10px] font-bold text-forena-400">종료일</p>
            <p class="font-semibold tabular-nums text-forena-800">{{ selectedTask.end }}</p>
          </div>
          <div class="rounded-lg bg-forena-50/40 p-2">
            <p class="text-[10px] font-bold text-forena-400">기간</p>
            <p class="font-semibold tabular-nums text-forena-800">{{ selectedTask.durDays }}일</p>
          </div>
          <div class="rounded-lg bg-forena-50/40 p-2">
            <p class="text-[10px] font-bold text-forena-400">보할</p>
            <p class="font-semibold tabular-nums text-forena-800">{{ selectedTask.weight }}%</p>
          </div>
        </div>

        <!-- 선행/후속 -->
        <div>
          <p class="text-[10px] font-bold uppercase text-forena-400 mb-1.5">선행 / 후속</p>
          <div class="flex items-center gap-2 text-xs">
            <span class="flex-1 truncate rounded bg-slate-50 px-2 py-1.5 text-slate-700">{{
              selectedTask.prev || '없음'
            }}</span>
            <ArrowRight class="h-3.5 w-3.5 shrink-0 text-forena-400" />
            <span class="flex-1 truncate rounded bg-flare-50/60 px-2 py-1.5 text-flare-700">{{
              selectedTask.next || '없음'
            }}</span>
          </div>
        </div>

        <!-- 인원/장비 -->
        <div class="rounded-lg border border-forena-100 p-3 text-xs">
          <p class="text-[10px] font-bold uppercase text-forena-400 mb-1.5">담당 / 인원 / 장비</p>
          <div class="flex items-center gap-1.5 mb-1">
            <Users class="h-3 w-3 text-forena-500" />{{ selectedTask.responsible }} ·
            {{ selectedTask.requiredCount }}명
          </div>
          <div class="flex items-center gap-1.5 mb-1">
            <MapPin class="h-3 w-3 text-forena-500" />{{ selectedTask.location }}
          </div>
          <div v-if="selectedTask.equipment.length" class="flex items-center gap-1.5">
            <Wrench class="h-3 w-3 text-forena-500" />{{ selectedTask.equipment.join(', ') }}
          </div>
        </div>

        <!-- AI 신뢰도 / 검토 -->
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="rounded-lg border border-forena-100 p-2.5">
            <p class="text-[10px] font-bold text-forena-400 mb-1">AI 신뢰도</p>
            <p
              class="text-lg font-bold tabular-nums"
              :class="confidenceClass(selectedTask.confidence)"
            >
              {{ selectedTask.confidence }}%
            </p>
          </div>
          <div class="rounded-lg border border-forena-100 p-2.5">
            <p class="text-[10px] font-bold text-forena-400 mb-1">검토 상태</p>
            <span
              class="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
              :class="reviewStatusClass(selectedTask.reviewStatus)"
              >{{ selectedTask.reviewStatus }}</span
            >
          </div>
        </div>

        <!-- 출처 문서 -->
        <div
          v-if="selectedTask.sourceDocId"
          class="rounded-lg border border-flare-100 bg-flare-50/30 p-3"
        >
          <p class="text-[10px] font-bold uppercase text-flare-700 mb-1.5">출처 문서</p>
          <p class="text-xs font-semibold text-forena-800">
            {{
              uploadedDocs.find((d) => d.id === selectedTask.sourceDocId)?.name ||
              '연결된 문서 없음'
            }}
          </p>
          <div class="mt-2 flex gap-1.5">
            <button
              class="rounded border border-forena-200 bg-white px-2 py-0.5 text-[10px] font-bold text-forena-600 hover:bg-forena-50"
            >
              <Eye class="inline h-2.5 w-2.5 mr-0.5" />보기
            </button>
            <button
              class="rounded border border-forena-200 bg-white px-2 py-0.5 text-[10px] font-bold text-forena-600 hover:bg-forena-50"
            >
              <Download class="inline h-2.5 w-2.5 mr-0.5" />다운로드
            </button>
            <button
              class="rounded border border-flare-200 bg-flare-50 px-2 py-0.5 text-[10px] font-bold text-flare-700 hover:bg-flare-100"
            >
              <RefreshCw class="inline h-2.5 w-2.5 mr-0.5" />재분석
            </button>
          </div>
        </div>

        <!-- 메모 -->
        <div
          v-if="selectedTask.memo"
          class="rounded-lg bg-amber-50/40 p-2.5 text-[11px] text-amber-800 ring-1 ring-amber-100"
        >
          <strong class="block text-[10px] uppercase">메모</strong>
          {{ selectedTask.memo }}
        </div>
      </div>
      <!-- /space-y-4 p-4 -->
    </div>
    <!-- /overflow-y-auto -->
  </div>
  <!-- /w-80 shrink-0 -->
</template>
