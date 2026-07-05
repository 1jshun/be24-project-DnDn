<script setup>
import {
  Activity,
  ChevronRight,
  Clock,
  Send,
  Sparkles,
  TrendingUp,
  UserCog,
  X,
} from 'lucide-vue-next'

defineProps({
  show: { type: Boolean, default: false },
  selectedTask: { type: Object, default: null },
  selectedRec: { type: Object, default: null },
  aiQuickSummary: { type: Object, default: null },
})

const emit = defineEmits(['close', 'submit'])

function close() {
  emit('close')
}

function submit() {
  emit('submit')
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
      v-if="show && selectedTask && selectedRec"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      @click.self="close"
    >
      <div class="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <!-- 헤더 -->
        <div
          class="flex items-center justify-between border-b border-flare-100 bg-flare-50/40 px-5 py-4"
        >
          <div class="flex items-center gap-2">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-flare-200"
            >
              <Sparkles class="h-4 w-4 text-flare-600" />
            </div>
            <div>
              <p class="text-sm font-extrabold text-forena-900">AI 추천안 요청</p>
              <p class="mt-0.5 text-[11px] text-forena-500">
                추천안 그대로 총책임자에게 보내거나, 수정 후 보낼 수 있습니다
              </p>
            </div>
          </div>
          <button
            @click="close"
            class="text-forena-400 transition-colors hover:text-forena-700"
            aria-label="닫기"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- 본문: 요청 내용 미리보기 -->
        <div class="space-y-3 p-5">
          <!-- 작업 정보 -->
          <div class="rounded-lg border border-forena-200 bg-forena-50/40 px-3.5 py-3">
            <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">대상 작업</p>
            <p class="mt-1 text-sm font-extrabold text-forena-900">{{ selectedTask.name }}</p>
            <p v-if="selectedTask.location" class="mt-0.5 text-[11px] text-forena-500">
              {{ selectedTask.process }} · {{ selectedTask.location }}
            </p>
          </div>

          <!-- 변경 요약 -->
          <div
            v-if="aiQuickSummary"
            class="overflow-hidden rounded-lg border-2 border-flare-200 bg-flare-50/30"
          >
            <div
              class="flex items-center justify-between border-b border-flare-100 bg-white/60 px-3.5 py-2"
            >
              <p class="text-[10px] font-bold uppercase tracking-wide text-flare-700">변경 내용</p>
              <span
                class="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-flare-700 ring-1 ring-flare-200"
              >
                세부일정 {{ aiQuickSummary.proposalCount }}건 변경
              </span>
            </div>

            <div class="space-y-2 px-3.5 py-3">
              <!-- 종료일 변경 -->
              <div v-if="aiQuickSummary.addDays !== 0" class="flex items-center gap-2 text-xs">
                <Clock class="h-3.5 w-3.5 shrink-0 text-flare-600" />
                <span class="w-16 shrink-0 font-bold text-forena-500">종료일</span>
                <span
                  class="tabular-nums text-forena-500"
                  :class="aiQuickSummary.addDays !== 0 ? 'line-through decoration-forena-300' : ''"
                >
                  {{ aiQuickSummary.oldEnd || '—' }}
                </span>
                <template v-if="aiQuickSummary.addDays !== 0">
                  <ChevronRight class="h-3 w-3 text-flare-400" />
                  <span class="font-extrabold tabular-nums text-flare-700">
                    {{ aiQuickSummary.newEnd }}
                  </span>
                </template>
                <span
                  v-if="aiQuickSummary.addDays > 0"
                  class="ml-auto rounded bg-white px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums text-flare-700 ring-1 ring-flare-300"
                >
                  +{{ aiQuickSummary.addDays }}일
                </span>
                <span
                  v-else
                  class="ml-auto rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-300"
                >
                  납기 유지
                </span>
              </div>

              <!-- 인력 변경 -->
              <div
                v-if="aiQuickSummary.workerChanges.length > 1"
                class="flex items-center gap-2 text-xs"
              >
                <UserCog class="h-3.5 w-3.5 shrink-0 text-flare-600" />
                <span class="w-16 shrink-0 font-bold text-forena-500">투입 인력</span>
                <span class="font-extrabold text-forena-800">
                  세부일정 {{ aiQuickSummary.workerChanges.length }}건 변경
                </span>
                <span
                  class="ml-auto rounded bg-white px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums text-flare-700 ring-1 ring-flare-300"
                >
                  +{{ aiQuickSummary.totalAdditionalWorkers }}명
                </span>
              </div>
              <div
                v-if="aiQuickSummary.workerChanges.length === 1"
                class="flex items-center gap-2 text-xs"
              >
                <UserCog class="h-3.5 w-3.5 shrink-0 text-flare-600" />
                <span class="w-16 shrink-0 font-bold text-forena-500">투입 인력</span>
                <span class="tabular-nums text-forena-500 line-through decoration-forena-300">
                  {{ aiQuickSummary.workerChanges[0].originalRequiredCount }}명
                </span>
                <ChevronRight class="h-3 w-3 text-flare-400" />
                <span class="font-extrabold tabular-nums text-flare-700">
                  {{ aiQuickSummary.workerChanges[0].recommendedRequiredCount }}명
                </span>
                <span
                  v-if="aiQuickSummary.workerChanges.length > 1"
                  class="ml-1 text-[10px] text-forena-400"
                >
                  외 {{ aiQuickSummary.workerChanges.length - 1 }}건
                </span>
                <span
                  class="ml-auto rounded bg-white px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums text-flare-700 ring-1 ring-flare-300"
                >
                  +{{
                    aiQuickSummary.workerChanges[0].recommendedRequiredCount -
                    aiQuickSummary.workerChanges[0].originalRequiredCount
                  }}명
                </span>
              </div>

              <!-- 작업시간 변경 -->
              <div
                v-if="aiQuickSummary.workTimeChanges.length > 1"
                class="flex items-center gap-2 text-xs"
              >
                <Activity class="h-3.5 w-3.5 shrink-0 text-flare-600" />
                <span class="w-16 shrink-0 font-bold text-forena-500">작업시간</span>
                <span class="font-extrabold text-forena-800">
                  세부일정 {{ aiQuickSummary.workTimeChanges.length }}건 변경
                </span>
              </div>
              <div
                v-if="aiQuickSummary.workTimeChanges.length === 1"
                class="flex items-center gap-2 text-xs"
              >
                <Activity class="h-3.5 w-3.5 shrink-0 text-flare-600" />
                <span class="w-16 shrink-0 font-bold text-forena-500">작업시간</span>
                <span class="tabular-nums text-forena-500 line-through decoration-forena-300">
                  {{ aiQuickSummary.workTimeChanges[0].originalWorkTime }}
                </span>
                <ChevronRight class="h-3 w-3 text-flare-400" />
                <span class="font-extrabold tabular-nums text-flare-700">
                  {{ aiQuickSummary.workTimeChanges[0].recommendedWorkTime }}
                </span>
                <span
                  v-if="aiQuickSummary.workTimeChanges.length > 1"
                  class="ml-1 text-[10px] text-forena-400"
                >
                  외 {{ aiQuickSummary.workTimeChanges.length - 1 }}건
                </span>
              </div>

              <!-- 추가 공수 합계 -->
              <div
                v-if="aiQuickSummary.totalAdditionalManHours > 0"
                class="flex items-center gap-2 text-xs"
              >
                <TrendingUp class="h-3.5 w-3.5 shrink-0 text-flare-600" />
                <span class="w-16 shrink-0 font-bold text-forena-500">추가 공수</span>
                <span class="font-extrabold tabular-nums text-flare-700">
                  +{{ aiQuickSummary.totalAdditionalManHours }}인시
                </span>
              </div>
            </div>

            <!-- 대표 세부일정 정보 -->
            <div
              v-if="aiQuickSummary.proposals && aiQuickSummary.proposals.length"
              class="border-t border-flare-100 bg-white/70 px-3.5 py-3"
            >
              <p class="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-forena-500">
                변경 대상 세부일정
              </p>
              <div class="space-y-2">
                <div
                  v-for="(proposal, index) in aiQuickSummary.proposals"
                  :key="proposal.workPlanId || `${proposal.date}-${index}`"
                  class="rounded-lg border border-forena-100 bg-white px-3 py-2"
                >
                  <div class="flex items-start gap-2">
                    <span
                      class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-flare-50 text-[10px] font-extrabold tabular-nums text-flare-700 ring-1 ring-flare-200"
                    >
                      {{ index + 1 }}
                    </span>
                    <div class="min-w-0">
                      <p class="truncate text-xs font-extrabold text-forena-900">
                        {{ proposal.date }} · {{ proposal.originalName }}
                      </p>
                      <p class="mt-0.5 truncate text-[10px] text-forena-500">
                        {{ proposal.location || selectedTask.location || '-' }}
                      </p>
                    </div>
                  </div>
                  <div class="mt-2 grid grid-cols-1 gap-1.5 text-[11px] sm:grid-cols-3">
                    <p class="tabular-nums text-forena-600">
                      인력
                      <span class="font-bold text-forena-800">
                        {{ proposal.originalRequiredCount }}명 →
                        {{ proposal.recommendedRequiredCount }}명
                      </span>
                    </p>
                    <p class="tabular-nums text-forena-600">
                      시간
                      <span class="font-bold text-forena-800">
                        {{ proposal.originalWorkTime || '-' }} →
                        {{ proposal.recommendedWorkTime || '-' }}
                      </span>
                    </p>
                    <p class="tabular-nums text-forena-600">
                      공수
                      <span class="font-bold text-flare-700">
                        +{{ Math.round(Number(proposal.additionalManHours || 0) * 10) / 10 }}인시
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="false" class="border-t border-flare-100 bg-white/60 px-3.5 py-2">
              <p class="text-[10px] text-forena-500">
                <span class="font-bold text-forena-600">대표 일정:</span>
                {{ aiQuickSummary.sample.date }} {{ aiQuickSummary.sample.originalName }}
              </p>
            </div>
          </div>

          <p class="text-[11px] leading-relaxed text-forena-500">
            <span class="font-bold text-forena-700">전송하기</span>를 선택하면 위 내용으로 요청이
            즉시 등록되고, 총책임자의 승인 후 일정에 반영됩니다.
          </p>
        </div>

        <!-- 푸터 -->
        <div
          class="flex flex-wrap justify-end gap-2 border-t border-forena-100 bg-forena-50/40 px-5 py-3"
        >
          <button
            @click="close"
            class="rounded-lg border border-forena-200 bg-white px-4 py-2 text-xs font-bold text-forena-600 transition-colors hover:bg-forena-50"
          >
            취소
          </button>
          <button
            @click="submit"
            class="inline-flex items-center gap-1.5 rounded-lg bg-flare-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-flare-600"
          >
            <Send class="h-3 w-3" />
            전송하기
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
