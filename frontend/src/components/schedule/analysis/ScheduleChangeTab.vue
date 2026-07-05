<script setup>
import { Check, ChevronRight, ClipboardList, History, Paperclip, Send, X } from 'lucide-vue-next'
import {
  formatDayDelta,
  formatPct,
  hasApprovalData,
  requestApprovalSummary,
  requestDetailChanges,
  requestStatusLabel as reqStatusLabel,
} from '@/utils/schedule/analysis/scheduleChangeHelpers.js'

const props = defineProps({
  isSupervisor: { type: Boolean, default: false },
  changeSubView: { type: String, default: 'active' },
  visibleRequests: { type: Array, default: () => [] },
  visibleHistory: { type: Array, default: () => [] },
  pendingCount: { type: Number, default: 0 },
  applyingScheduleIds: { type: Array, default: () => [] },
})

const emit = defineEmits(['select-sub-view', 'reject', 'approve', 'apply'])

const reqStatusColor = (s) =>
  ({
    pending: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    approved: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    applied: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  })[s] || 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'

function selectSubView(view) {
  emit('select-sub-view', view)
}

function rejectRequest(id) {
  emit('reject', id)
}

function approveRequest(id) {
  emit('approve', id)
}

function isApplying(id) {
  return props.applyingScheduleIds.includes(id)
}

function applyRequest(id) {
  if (isApplying(id)) return
  emit('apply', id)
}
</script>

<template>
  <div class="space-y-4">
    <!-- 서브 토글 -->
    <div class="flex items-center justify-between">
      <div class="inline-flex rounded-lg border border-forena-200 bg-white p-0.5">
        <button
          type="button"
          @click.prevent.stop="selectSubView('active')"
          class="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition"
          :class="
            changeSubView === 'active'
              ? 'bg-forena-800 text-white'
              : 'text-forena-500 hover:text-forena-800'
          "
        >
          <ClipboardList class="h-3.5 w-3.5" />
          {{ isSupervisor ? '승인 처리' : '요청 등록' }}
          <span
            v-if="pendingCount > 0 && isSupervisor"
            class="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] text-white"
            >{{ pendingCount }}</span
          >
        </button>
        <button
          type="button"
          @click.prevent.stop="selectSubView('history')"
          class="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition"
          :class="
            changeSubView === 'history'
              ? 'bg-forena-800 text-white'
              : 'text-forena-500 hover:text-forena-800'
          "
        >
          <History class="h-3.5 w-3.5" /> 변경 이력
        </button>
      </div>
    </div>

    <!-- ────────────────────────── 요청/승인 뷰 ─────────────────── -->
    <div v-if="changeSubView === 'active'" class="space-y-4">
      <!-- 변경 요청 목록 -->
      <div>
        <div class="mb-3 flex items-center justify-between">
          <p class="text-sm font-bold text-forena-900">
            {{ isSupervisor ? '전체 일정 변경 요청 목록' : '내 요청 목록' }}
          </p>
          <span class="text-xs text-forena-400">
            총 {{ visibleRequests.length }}건 · 승인 대기 {{ pendingCount }}건
          </span>
        </div>
        <div class="space-y-3">
          <div
            v-for="r in visibleRequests"
            :key="r.id"
            class="overflow-hidden rounded-xl border border-forena-200 bg-white"
          >
            <div
              class="flex flex-wrap items-center justify-between gap-2 border-b border-forena-100 bg-forena-50/60 px-4 py-3"
            >
              <div class="flex flex-wrap items-center gap-2">
                <p class="flex items-center gap-1.5 font-semibold text-forena-900">
                  <span
                    class="rounded bg-flare-50 px-1.5 py-0.5 text-[10px] font-bold text-flare-700 ring-1 ring-flare-200"
                    >{{ r.process }}</span
                  >
                  {{ r.task }}
                </p>
                <span
                  class="rounded-lg px-2 py-0.5 text-[10px] font-bold"
                  :class="reqStatusColor(r.status)"
                  >{{ reqStatusLabel(r.status) }}</span
                >
                <span
                  v-if="r.aiApplied"
                  class="rounded bg-flare-50 px-1.5 py-0.5 text-[9px] font-bold text-flare-700 ring-1 ring-flare-200"
                  >AI 반영</span
                >
              </div>
              <div class="flex items-center gap-2 text-[11px] text-forena-400">
                <span>{{ r.requester }}</span
                ><span>·</span><span>{{ r.requestDate }}</span>
              </div>
            </div>
            <div class="space-y-4 p-4 text-xs">
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p class="mb-1 text-[10px] font-bold text-forena-400">기존 일정</p>
                  <p class="tabular-nums text-forena-600">
                    {{ r.oldStart || '-' }} ~ {{ r.oldEnd || '-' }}
                  </p>
                </div>
                <div>
                  <p class="mb-1 text-[10px] font-bold text-flare-600">변경 요청 일정</p>
                  <p class="font-semibold tabular-nums text-forena-800">
                    {{ r.newStart || '-' }} ~ {{ r.newEnd || '-' }}
                  </p>
                </div>
                <div>
                  <p class="mb-1 text-[10px] font-bold text-forena-400">변경 규모</p>
                  <p class="font-semibold text-forena-800">
                    {{
                      requestApprovalSummary(r).proposalCount
                        ? `세부일정 ${requestApprovalSummary(r).proposalCount}건`
                        : '일정 변경'
                    }}
                    <span class="ml-1 tabular-nums text-flare-600">
                      {{ formatDayDelta(requestApprovalSummary(r).addDays) }}
                    </span>
                  </p>
                </div>
                <div v-if="hasApprovalData(r)">
                  <p class="mb-1 text-[10px] font-bold text-forena-400">진척 근거</p>
                  <p class="font-semibold text-forena-800">
                    계획 {{ formatPct(requestApprovalSummary(r).plannedPct) }} · 실제
                    {{ formatPct(requestApprovalSummary(r).actualPct) }}
                  </p>
                </div>
              </div>

              <div v-if="hasApprovalData(r)" class="border-t border-forena-100 pt-4">
                <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p class="text-[11px] font-extrabold text-forena-900">승인 검토 데이터</p>
                  <span
                    v-if="requestApprovalSummary(r).redistributionLevel"
                    class="rounded bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-700 ring-1 ring-cyan-100"
                  >
                    {{ requestApprovalSummary(r).redistributionLevel }}
                  </span>
                </div>

                <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div class="rounded-lg border border-forena-100 bg-forena-50/40 px-3 py-2.5">
                    <p class="mb-1 text-[10px] font-bold text-forena-400">투입 인력</p>
                    <template v-if="requestApprovalSummary(r).firstWorkerChange">
                      <p class="font-extrabold tabular-nums text-forena-900">
                        {{ requestApprovalSummary(r).firstWorkerChange.originalRequiredCount }}명
                        <ChevronRight class="mx-0.5 inline h-3 w-3 text-flare-400" />
                        {{ requestApprovalSummary(r).firstWorkerChange.recommendedRequiredCount }}명
                      </p>
                      <p
                        v-if="requestApprovalSummary(r).workerChangeCount > 1"
                        class="mt-0.5 text-[10px] text-forena-400"
                      >
                        외 {{ requestApprovalSummary(r).workerChangeCount - 1 }}건
                      </p>
                    </template>
                    <p v-else class="font-semibold text-forena-500">변경 없음</p>
                  </div>

                  <div class="rounded-lg border border-forena-100 bg-forena-50/40 px-3 py-2.5">
                    <p class="mb-1 text-[10px] font-bold text-forena-400">작업시간</p>
                    <template v-if="requestApprovalSummary(r).firstWorkTimeChange">
                      <p class="font-extrabold tabular-nums text-forena-900">
                        {{ requestApprovalSummary(r).firstWorkTimeChange.originalWorkTime }}
                        <ChevronRight class="mx-0.5 inline h-3 w-3 text-flare-400" />
                        {{ requestApprovalSummary(r).firstWorkTimeChange.recommendedWorkTime }}
                      </p>
                      <p
                        v-if="requestApprovalSummary(r).workTimeChangeCount > 1"
                        class="mt-0.5 text-[10px] text-forena-400"
                      >
                        외 {{ requestApprovalSummary(r).workTimeChangeCount - 1 }}건
                      </p>
                    </template>
                    <p v-else class="font-semibold text-forena-500">변경 없음</p>
                  </div>

                  <div class="rounded-lg border border-forena-100 bg-forena-50/40 px-3 py-2.5">
                    <p class="mb-1 text-[10px] font-bold text-forena-400">추가 공수</p>
                    <p class="font-extrabold tabular-nums text-flare-700">
                      +{{ requestApprovalSummary(r).totalAdditionalManHours }}인시
                    </p>
                  </div>

                  <div class="rounded-lg border border-forena-100 bg-forena-50/40 px-3 py-2.5">
                    <p class="mb-1 text-[10px] font-bold text-forena-400">검토 포인트</p>
                    <p class="font-semibold text-forena-800">
                      {{ requestApprovalSummary(r).normalReturnDate || '즉시 만회 계획' }}
                    </p>
                  </div>
                </div>

                <div
                  v-if="requestDetailChanges(r).length"
                  class="mt-3 overflow-hidden rounded-lg border border-forena-100"
                >
                  <div class="bg-forena-50/70 px-3 py-2">
                    <p class="text-[10px] font-bold text-forena-500">변경 대상 세부일정</p>
                  </div>
                  <div class="divide-y divide-forena-50 bg-white">
                    <div
                      v-for="detail in requestDetailChanges(r).slice(0, 3)"
                      :key="`${r.id}-${detail.workPlanId || detail.date || detail.originalName}`"
                      class="px-3 py-3"
                    >
                      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p class="font-extrabold text-forena-900">
                          <span class="mr-1 tabular-nums text-forena-500">{{ detail.date }}</span>
                          {{ detail.originalName }}
                        </p>
                        <span
                          v-if="detail.carryOver"
                          class="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-amber-100"
                        >
                          미완료분 반영
                        </span>
                      </div>
                      <div class="grid gap-2 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
                        <div v-if="detail.originalName !== detail.recommendedName">
                          <p class="mb-0.5 font-bold text-forena-400">작업명</p>
                          <p class="text-forena-600 line-through">{{ detail.originalName }}</p>
                          <p class="font-semibold text-forena-900">
                            {{ detail.recommendedName }}
                          </p>
                        </div>
                        <div>
                          <p class="mb-0.5 font-bold text-forena-400">인력</p>
                          <p class="font-semibold tabular-nums text-forena-800">
                            {{ detail.originalRequiredCount }}명
                            <ChevronRight class="mx-0.5 inline h-3 w-3 text-flare-400" />
                            {{ detail.recommendedRequiredCount }}명
                          </p>
                        </div>
                        <div>
                          <p class="mb-0.5 font-bold text-forena-400">작업시간</p>
                          <p class="font-semibold tabular-nums text-forena-800">
                            {{ detail.originalWorkTime || '-' }}
                            <ChevronRight class="mx-0.5 inline h-3 w-3 text-flare-400" />
                            {{ detail.recommendedWorkTime || '-' }}
                          </p>
                        </div>
                        <div>
                          <p class="mb-0.5 font-bold text-forena-400">공수</p>
                          <p class="font-semibold tabular-nums text-forena-800">
                            {{ detail.originalManHours || 0 }} →
                            {{ detail.recommendedManHours || 0 }}인시
                          </p>
                        </div>
                      </div>
                      <p
                        v-if="detail.recommendedNote"
                        class="mt-2 whitespace-pre-line rounded-md bg-cyan-50/60 px-2.5 py-2 text-[11px] leading-relaxed text-cyan-900"
                      >
                        {{ detail.recommendedNote }}
                      </p>
                    </div>
                  </div>
                  <div
                    v-if="requestDetailChanges(r).length > 3"
                    class="border-t border-forena-50 bg-forena-50/40 px-3 py-2 text-[10px] font-semibold text-forena-500"
                  >
                    외 {{ requestDetailChanges(r).length - 3 }}건은 동일 기준으로 변경됩니다.
                  </div>
                </div>

                <div
                  v-if="requestApprovalSummary(r).basis || requestApprovalSummary(r).expectedEffect"
                  class="mt-3 grid gap-3 lg:grid-cols-2"
                >
                  <div v-if="requestApprovalSummary(r).basis">
                    <p class="mb-1 text-[10px] font-bold text-forena-400">AI 판단 근거</p>
                    <p
                      class="max-h-24 overflow-y-auto whitespace-pre-line rounded-lg bg-forena-50/60 px-3 py-2 text-[11px] leading-relaxed text-forena-700"
                    >
                      {{ requestApprovalSummary(r).basis }}
                    </p>
                  </div>
                  <div v-if="requestApprovalSummary(r).expectedEffect">
                    <p class="mb-1 text-[10px] font-bold text-forena-400">승인 시 기대 효과</p>
                    <p
                      class="rounded-lg bg-emerald-50/60 px-3 py-2 text-[11px] leading-relaxed text-emerald-800"
                    >
                      {{ requestApprovalSummary(r).expectedEffect }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="r.attachments?.length" class="mx-4 mb-3 flex flex-wrap gap-1.5">
              <span
                v-for="(f, i) in r.attachments"
                :key="i"
                class="inline-flex items-center gap-1 rounded-md bg-forena-50 px-2 py-0.5 text-[10px] font-semibold text-forena-700"
              >
                <Paperclip class="h-3 w-3" />{{ f.name }}
              </span>
            </div>

            <!-- 반려 사유 -->
            <div
              v-if="r.status === 'rejected' && r.rejectReason"
              class="mx-4 mb-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs"
            >
              <p class="mb-0.5 font-bold text-rose-600">반려 사유</p>
              <p class="text-rose-800">{{ r.rejectReason }}</p>
            </div>

            <!-- 책임자 액션 -->
            <div
              v-if="isSupervisor && (r.status === 'pending' || r.status === 'approved')"
              class="flex justify-end gap-2 border-t border-forena-100 bg-forena-50/40 px-4 py-3"
            >
              <button
                v-if="r.status === 'pending'"
                @click="rejectRequest(r.id)"
                class="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50"
              >
                <X class="h-3.5 w-3.5" /> 반려
              </button>
              <button
                v-if="r.status === 'pending'"
                @click="approveRequest(r.id)"
                class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-600"
              >
                <Check class="h-3.5 w-3.5" /> 승인
              </button>
              <button
                v-if="r.status === 'approved'"
                @click="applyRequest(r.id)"
                :disabled="isApplying(r.id)"
                class="inline-flex items-center gap-1.5 rounded-lg bg-flare-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-flare-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                <Send class="h-3.5 w-3.5" /> {{ isApplying(r.id) ? '반영 중' : '공정표 반영' }}
              </button>
            </div>
          </div>

          <div
            v-if="!visibleRequests.length"
            class="flex h-32 items-center justify-center rounded-xl border border-dashed border-forena-200 bg-white text-sm text-forena-400"
          >
            일정 변경 요청이 없습니다
          </div>
        </div>
      </div>
    </div>

    <!-- ────────────────────────── 변경 이력 뷰 ─────────────────── -->
    <div
      v-if="changeSubView === 'history'"
      class="overflow-hidden rounded-xl border border-forena-200 bg-white"
    >
      <div class="border-b border-forena-100 bg-forena-50/60 px-4 py-2.5">
        <p class="flex items-center gap-1.5 text-sm font-bold text-forena-900">
          <History class="h-4 w-4 text-forena-500" /> 변경 이력
        </p>
        <p class="text-[11px] text-forena-400">일정 변경 요청 승인 · 반려 · 일정 반영 처리 이력</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="border-b border-forena-100 bg-forena-50/30">
            <tr>
              <th class="px-4 py-3 text-left text-[10px] font-bold text-forena-400">처리</th>
              <th class="px-3 py-3 text-left text-[10px] font-bold text-forena-400">공정 · 작업</th>
              <th class="px-3 py-3 text-left text-[10px] font-bold text-forena-400">
                변경 전 종료
              </th>
              <th class="px-3 py-3 text-left text-[10px] font-bold text-forena-400">
                변경 후 종료
              </th>
              <th class="px-4 py-3 text-left text-[10px] font-bold text-forena-400">사유</th>
              <th class="px-3 py-3 text-left text-[10px] font-bold text-forena-400">처리자</th>
              <th class="px-3 py-3 text-left text-[10px] font-bold text-forena-400">
                AI 추천 반영
              </th>
              <th class="px-3 py-3 text-left text-[10px] font-bold text-forena-400">처리일</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-forena-50">
            <tr
              v-for="h in visibleHistory"
              :key="h.id"
              class="transition-colors hover:bg-forena-50/40"
            >
              <td class="px-4 py-3.5">
                <span
                  class="rounded-lg px-2 py-0.5 text-[10px] font-bold"
                  :class="
                    h.action === '승인'
                      ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                      : h.action === '일정 반영'
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                  "
                  >{{ h.action }}</span
                >
              </td>
              <td class="px-3 py-3.5 font-semibold text-forena-800">
                <span
                  class="mr-1 rounded bg-flare-50 px-1 py-0.5 text-[9px] font-bold text-flare-700 ring-1 ring-flare-200"
                  >{{ h.process }}</span
                >
                {{ h.task }}
              </td>
              <td class="px-3 py-3.5 tabular-nums text-forena-500 line-through">
                {{ h.oldEnd }}
              </td>
              <td class="px-3 py-3.5 font-semibold tabular-nums text-forena-800">
                {{ h.newEnd }}
              </td>
              <td class="max-w-[180px] truncate px-4 py-3.5 text-forena-600">{{ h.reason }}</td>
              <td class="px-3 py-3.5 text-forena-500">{{ h.approver }}</td>
              <td class="px-3 py-3.5">
                <span
                  v-if="h.aiApplied"
                  class="rounded bg-flare-50 px-1.5 py-0.5 text-[9px] font-bold text-flare-700 ring-1 ring-flare-200"
                  >반영</span
                >
                <span v-else class="text-forena-300">–</span>
              </td>
              <td class="px-3 py-3.5 tabular-nums text-forena-400">{{ h.processedAt }}</td>
            </tr>
            <tr v-if="!visibleHistory.length">
              <td colspan="8" class="px-4 py-12 text-center text-sm text-forena-400">
                변경 이력이 없습니다
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
