<script setup>
import {
  ArrowRight,
  BrainCircuit,
  GitBranch,
  MessagesSquare,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-vue-next'

defineProps({
  changeRequests: { type: Array, required: true },
  selectedChange: { type: Object, default: null },
  selectedChangeId: { type: [Number, String], default: null },
  canConfirm: { type: Boolean, default: false },
  crStatusClass: { type: Function, required: true },
})

const emit = defineEmits([
  'close',
  'select-change',
  'review-change',
  'approve-change',
  'reject-change',
])
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    @click.self="emit('close')"
  >
    <div
      class="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
    >
      <div class="flex items-center justify-between border-b border-forena-100 px-5 py-3">
        <div class="flex items-center gap-2">
          <GitBranch class="h-4 w-4 text-flare-600" />
          <h3 class="text-sm font-bold text-forena-900">변경 요청 관리</h3>
          <span class="rounded-md bg-forena-100 px-1.5 py-0.5 text-[10px] font-bold text-forena-600"
            >{{ changeRequests.length }}건</span
          >
        </div>
        <button @click="emit('close')"><X class="h-4 w-4 text-slate-400" /></button>
      </div>

      <div class="flex min-h-0 flex-1">
        <!-- 좌: 요청 테이블 -->
        <div class="flex-1 overflow-auto border-r border-forena-100">
          <table class="w-full text-xs">
            <thead
              class="sticky top-0 z-10 bg-forena-50/95 text-[10px] font-bold uppercase text-forena-500 backdrop-blur"
            >
              <tr>
                <th class="px-3 py-2 text-left">요청일</th>
                <th class="px-3 py-2 text-left">작업명</th>
                <th class="px-3 py-2 text-left">공종</th>
                <th class="px-3 py-2 text-left">변경 유형</th>
                <th class="px-3 py-2 text-left">기존 기간</th>
                <th class="px-3 py-2 text-left">변경 요청</th>
                <th class="px-3 py-2 text-left">요청자</th>
                <th class="px-3 py-2 text-center">상태</th>
                <th class="px-3 py-2 text-center">영향</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-forena-50">
              <tr
                v-for="cr in changeRequests"
                :key="cr.id"
                class="cursor-pointer hover:bg-forena-50/40"
                :class="selectedChangeId === cr.id ? 'bg-flare-50/40' : ''"
                @click="emit('select-change', cr.id)"
              >
                <td class="px-3 py-2 tabular-nums text-slate-500">{{ cr.requestedAt }}</td>
                <td class="px-3 py-2 font-semibold text-forena-800">{{ cr.taskName }}</td>
                <td class="px-3 py-2 text-slate-600">{{ cr.group }}</td>
                <td class="px-3 py-2 text-slate-600">{{ cr.changeType }}</td>
                <td class="px-3 py-2 tabular-nums text-[11px] text-slate-500">
                  {{ cr.oldStart.slice(5) }}~{{ cr.oldEnd.slice(5) }}
                </td>
                <td class="px-3 py-2 tabular-nums text-[11px] text-flare-700">
                  {{ cr.newStart.slice(5) }}~{{ cr.newEnd.slice(5) }}
                </td>
                <td class="px-3 py-2 text-slate-600">{{ cr.requester }}</td>
                <td class="px-3 py-2 text-center">
                  <span
                    class="rounded px-1.5 py-0.5 text-[10px] font-bold"
                    :class="crStatusClass(cr.status)"
                    >{{ cr.status }}</span
                  >
                </td>
                <td class="px-3 py-2 text-center">
                  <span
                    v-if="cr.cpImpact"
                    class="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700"
                    >CP</span
                  >
                  <span v-else class="text-slate-300">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 우: 변경 요청 상세 -->
        <div class="flex w-[420px] shrink-0 flex-col bg-white">
          <div
            v-if="!selectedChange"
            class="flex h-full items-center justify-center text-sm text-slate-400"
          >
            왼쪽 목록에서 변경 요청을 선택하세요
          </div>
          <div v-else class="flex min-h-0 flex-1 flex-col">
            <div class="flex items-center justify-between border-b border-forena-100 px-5 py-3">
              <p class="text-sm font-bold text-forena-900">변경 요청 상세</p>
              <span
                class="rounded-md px-2 py-0.5 text-[10px] font-bold"
                :class="crStatusClass(selectedChange.status)"
                >{{ selectedChange.status }}</span
              >
            </div>

            <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <!-- 작업 기본 -->
              <div>
                <p class="text-base font-bold text-forena-900">{{ selectedChange.taskName }}</p>
                <p class="text-xs text-slate-500">
                  {{ selectedChange.group }} · {{ selectedChange.changeType }}
                </p>
              </div>

              <!-- 변경 전/후 비교 -->
              <div class="rounded-xl border border-forena-100 bg-forena-50/40 p-3">
                <p class="mb-2 text-[10px] font-bold uppercase text-forena-500">
                  변경 전 → 변경 후
                </p>
                <div class="space-y-2 text-xs">
                  <div class="flex items-center justify-between">
                    <span class="text-forena-500">시작일</span>
                    <div class="flex items-center gap-1.5 tabular-nums">
                      <span class="text-slate-500 line-through">{{ selectedChange.oldStart }}</span>
                      <ArrowRight class="h-3 w-3 text-flare-600" />
                      <span class="font-bold text-flare-700">{{ selectedChange.newStart }}</span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-forena-500">종료일</span>
                    <div class="flex items-center gap-1.5 tabular-nums">
                      <span class="text-slate-500 line-through">{{ selectedChange.oldEnd }}</span>
                      <ArrowRight class="h-3 w-3 text-flare-600" />
                      <span class="font-bold text-flare-700">{{ selectedChange.newEnd }}</span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-forena-500">CP 여부</span>
                    <div class="flex items-center gap-1.5">
                      <span class="text-slate-500">{{ selectedChange.oldCp ? 'CP' : '비CP' }}</span>
                      <ArrowRight class="h-3 w-3 text-flare-600" />
                      <span class="font-bold text-flare-700">{{
                        selectedChange.newCp ? 'CP' : '비CP'
                      }}</span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-forena-500">보할</span>
                    <div class="flex items-center gap-1.5 tabular-nums">
                      <span class="text-slate-500 line-through"
                        >{{ selectedChange.oldWeight }}%</span
                      >
                      <ArrowRight class="h-3 w-3 text-flare-600" />
                      <span class="font-bold text-flare-700">{{ selectedChange.newWeight }}%</span>
                    </div>
                  </div>
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-forena-500">선행 작업</span>
                    <div class="flex items-center gap-1.5 text-right">
                      <span class="text-slate-500 line-through">{{
                        selectedChange.oldPrev || '없음'
                      }}</span>
                      <ArrowRight class="h-3 w-3 shrink-0 text-flare-600" />
                      <span class="font-bold text-flare-700">{{
                        selectedChange.newPrev || '없음'
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 변경 사유 -->
              <div class="rounded-xl border border-forena-100 p-3">
                <p class="mb-1 text-[10px] font-bold uppercase text-forena-500">변경 사유</p>
                <p class="text-xs leading-relaxed text-forena-800">{{ selectedChange.reason }}</p>
                <p class="mt-2 text-[10px] text-slate-400">
                  {{ selectedChange.requester }} · {{ selectedChange.requestedAt }}
                </p>
              </div>

              <!-- AI 영향 분석 -->
              <div class="rounded-xl border border-flare-100 bg-flare-50/30 p-3">
                <div class="flex items-center gap-1.5 mb-1.5">
                  <BrainCircuit class="h-3.5 w-3.5 text-flare-600" />
                  <p class="text-[10px] font-bold uppercase text-flare-700">AI 영향 분석</p>
                </div>
                <p class="text-xs leading-relaxed text-forena-800">
                  {{ selectedChange.aiSummary }}
                </p>
              </div>

              <!-- 영향도 -->
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div
                  class="rounded-lg p-2.5"
                  :class="
                    selectedChange.cpImpact ? 'bg-rose-50 ring-1 ring-rose-100' : 'bg-forena-50/40'
                  "
                >
                  <p class="text-[10px] font-bold text-forena-500 mb-1">CP 영향</p>
                  <p
                    class="font-bold"
                    :class="selectedChange.cpImpact ? 'text-rose-700' : 'text-slate-500'"
                  >
                    {{ selectedChange.cpImpact ? '있음' : '없음' }}
                  </p>
                </div>
                <div
                  class="rounded-lg p-2.5"
                  :class="
                    selectedChange.expectedDelayDays > 0
                      ? 'bg-amber-50 ring-1 ring-amber-100'
                      : 'bg-forena-50/40'
                  "
                >
                  <p class="text-[10px] font-bold text-forena-500 mb-1">예상 지연</p>
                  <p
                    class="font-bold tabular-nums"
                    :class="
                      selectedChange.expectedDelayDays > 0 ? 'text-amber-700' : 'text-emerald-600'
                    "
                  >
                    {{
                      selectedChange.expectedDelayDays > 0
                        ? `+${selectedChange.expectedDelayDays}일`
                        : '없음'
                    }}
                  </p>
                </div>
              </div>

              <!-- 후속 영향 -->
              <div v-if="selectedChange.affectedTasks?.length">
                <p class="text-[10px] font-bold uppercase text-forena-500 mb-1.5">
                  영향 받는 후속 공정
                </p>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="(t, i) in selectedChange.affectedTasks"
                    :key="i"
                    class="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-100"
                    >{{ t }}</span
                  >
                </div>
              </div>

              <!-- 마일스톤 영향 -->
              <div class="text-xs">
                <p class="text-[10px] font-bold uppercase text-forena-500 mb-1">마일스톤 영향</p>
                <p class="text-forena-700">{{ selectedChange.milestoneImpact }}</p>
              </div>

              <!-- 승인자 정보 -->
              <div
                v-if="selectedChange.approver"
                class="rounded-lg bg-emerald-50/40 px-3 py-2 text-[11px] text-emerald-800 ring-1 ring-emerald-100"
              >
                처리자: <strong>{{ selectedChange.approver }}</strong> ·
                {{ selectedChange.approvedAt }}
              </div>
            </div>

            <!-- 액션 -->
            <div class="border-t border-forena-100 p-3">
              <div
                v-if="['요청됨', '검토 중'].includes(selectedChange.status)"
                class="grid grid-cols-3 gap-2"
              >
                <button
                  @click="emit('review-change', selectedChange)"
                  class="flex items-center justify-center gap-1 rounded-lg border border-forena-200 bg-white py-2 text-xs font-bold text-forena-700 hover:bg-forena-50"
                >
                  <MessagesSquare class="h-3.5 w-3.5" />검토
                </button>
                <button
                  @click="emit('approve-change', selectedChange)"
                  :disabled="!canConfirm"
                  class="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <ThumbsUp class="h-3.5 w-3.5" />승인
                </button>
                <button
                  @click="emit('reject-change', selectedChange)"
                  :disabled="!canConfirm"
                  class="flex items-center justify-center gap-1 rounded-lg bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  <ThumbsDown class="h-3.5 w-3.5" />반려
                </button>
              </div>
              <div
                v-else
                class="rounded-lg bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-500"
              >
                처리 완료 — {{ selectedChange.status }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
