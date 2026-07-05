<script setup>
import {
  Activity,
  Check,
  ChevronRight,
  Eye,
  Layers,
  ListChecks,
  LoaderCircle,
  Pencil,
  Send,
  Sparkles,
  X,
} from 'lucide-vue-next'
import {
  hasDailyReportProgress,
  progressSourceLabel,
} from '@/utils/schedule/analysis/analysisMappers.js'
import { tradeMatches } from '@/utils/authScope.js'
import {
  cancelEditProposal,
  confirmEditProposal,
  startEditProposal,
} from '@/utils/schedule/analysis/aiRecommendationHelpers.js'

defineProps({
  visibleTasks: { type: Array, default: () => [] },
  selectedTaskId: { type: [String, Number, null], default: null },
  selectedTask: { type: Object, default: null },
  selectedRec: { type: Object, default: null },
  selectedTradeId: { type: [String, Number, null], default: null },
  currentSelectedTradeName: { type: String, default: '' },
  isSupervisor: { type: Boolean, default: false },
  currentTradeItem: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits([
  'select-task',
  'clear-task-selection',
  'clear-selected-trade',
  'open-task-detail',
  'request-ai-recommendation',
  'create-request-from-ai',
])

const riskColor = (r) =>
  ({
    ['\uB0AE\uC74C']: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    ['\uBCF4\uD1B5']: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    ['\uB192\uC74C']: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    ['\uB9E4\uC6B0 \uB192\uC74C']: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  })[r] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'

const riskBar = (r) =>
  ({
    ['\uB0AE\uC74C']: 'bg-sky-400',
    ['\uBCF4\uD1B5']: 'bg-amber-400',
    ['\uB192\uC74C']: 'bg-orange-500',
    ['\uB9E4\uC6B0 \uB192\uC74C']: 'bg-rose-500',
  })[r] || 'bg-slate-400'

function selectTask(taskId) {
  emit('select-task', taskId)
}

function clearTaskSelection() {
  emit('clear-task-selection')
}

function clearSelectedTrade() {
  emit('clear-selected-trade')
}

function openTaskDetail(taskId) {
  emit('open-task-detail', taskId)
}

function requestAiRecommendation() {
  emit('request-ai-recommendation')
}

function createRequestFromAi() {
  emit('create-request-from-ai')
}
</script>

<template>
  <div class="space-y-3">
    <!-- 선택된 공종 안내 / 전체 보기 토글 -->
    <div
      v-if="selectedTradeId && currentSelectedTradeName"
      class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-flare-200 bg-flare-50/60 px-3 py-2 text-xs"
    >
      <span class="text-forena-700">
        <Layers class="mr-1 inline h-3.5 w-3.5 text-flare-600" />
        <strong class="text-flare-700">{{ currentSelectedTradeName }}</strong> 공종의 지연 위험
        작업만 표시 중
      </span>
      <button
        v-if="isSupervisor"
        @click="clearSelectedTrade"
        class="inline-flex items-center gap-1 rounded-md border border-flare-300 bg-white px-2.5 py-1 text-[11px] font-bold text-flare-700 hover:bg-flare-50"
      >
        <X class="h-3 w-3" /> 전체 공종 보기
      </button>
    </div>

    <div class="grid gap-4 lg:grid-cols-12">
      <!-- 좌측: 지연 위험 작업 목록 -->
      <div class="overflow-hidden rounded-xl border border-forena-200 bg-white lg:col-span-5">
        <div
          class="flex items-center justify-between border-b border-forena-100 bg-forena-50/60 px-4 py-2.5"
        >
          <div>
            <p class="flex items-center gap-1.5 text-sm font-bold text-forena-900">
              <Activity class="h-4 w-4 text-rose-500" />
              지연 위험 작업
            </p>
            <p class="text-[11px] text-forena-400">선택하면 AI 추천안을 우측에 표시합니다</p>
          </div>
          <span
            class="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200"
            >{{ visibleTasks.length }}건</span
          >
        </div>
        <div class="max-h-[640px] divide-y divide-forena-50 overflow-y-auto">
          <div
            v-for="t in visibleTasks"
            :key="t.id"
            class="cursor-pointer p-4 transition-colors hover:bg-forena-50/60"
            :class="
              selectedTaskId === t.id
                ? 'border-l-2 border-l-flare-500 bg-flare-50/50'
                : 'border-l-2 border-l-transparent'
            "
            @click="selectTask(t.id)"
          >
            <div class="mb-2 flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <p class="truncate text-sm font-semibold text-forena-900">{{ t.name }}</p>
                  <span
                    v-if="t.isCritical"
                    class="shrink-0 rounded bg-rose-100 px-1 py-0.5 text-[9px] font-bold text-rose-700"
                    >CP</span
                  >
                </div>
                <p class="mt-0.5 text-[10px] text-forena-400">
                  <span
                    v-if="t.process"
                    class="rounded bg-flare-50 px-1 py-0.5 font-bold text-flare-700 ring-1 ring-flare-200"
                    >{{ t.process }}</span
                  >
                  <span v-if="t.location"> · {{ t.location }}</span>
                </p>
              </div>
              <span
                class="shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold"
                :class="riskColor(t.risk)"
                >{{ t.risk }}</span
              >
            </div>

            <!-- 미니 진척 막대 -->
            <div class="mt-2 space-y-1">
              <div class="flex items-center justify-between text-[10px] text-forena-400">
                <span>계획 {{ t.plannedPct }}% / 실제 {{ t.actualPct }}%</span>
                <span
                  class="rounded px-1.5 py-0.5 font-bold"
                  :class="
                    hasDailyReportProgress(t)
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  "
                >
                  {{ progressSourceLabel(t.actualSource) }}
                </span>
                <span class="font-bold" :class="t.diff < 0 ? 'text-rose-500' : 'text-emerald-600'"
                  >차이 {{ t.diff }}%p</span
                >
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-forena-100">
                <div
                  class="h-full rounded-full"
                  :class="riskBar(t.risk)"
                  :style="{ width: t.actualPct + '%' }"
                />
              </div>
            </div>

            <div class="mt-2 flex items-center gap-2">
              <button
                @click.stop="openTaskDetail(t.id)"
                class="inline-flex items-center gap-1 rounded-md border border-forena-200 bg-white px-2 py-1 text-[10px] font-bold text-forena-600 hover:bg-forena-50"
              >
                <Eye class="h-2.5 w-2.5" /> 상세
              </button>
              <span class="text-[10px] text-forena-400">
                예상 지연 <strong class="text-rose-600">{{ t.expectedDelayDays }}일</strong>
              </span>
            </div>
          </div>
          <div v-if="loading" class="py-12 text-center text-xs text-slate-400">
            지연 위험 작업을 불러오는 중입니다
          </div>
          <div v-else-if="!visibleTasks.length" class="py-12 text-center text-xs text-slate-400">
            지연 위험 작업이 없습니다
          </div>
        </div>
      </div>

      <!-- 우측: AI 추천안 상세 -->
      <div class="lg:col-span-7">
        <div
          v-if="selectedTask && selectedRec"
          class="overflow-hidden rounded-xl border border-forena-200 bg-white"
        >
          <div
            class="flex items-center justify-between border-b border-forena-100 bg-forena-50/70 px-4 py-2.5"
          >
            <div class="flex items-center gap-2">
              <Sparkles class="h-4 w-4 text-flare-600" />
              <p class="text-sm font-bold text-forena-900">
                작업 일정 조정 — {{ selectedTask.name }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                :disabled="selectedRec.aiStatus === 'PENDING'"
                class="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-[11px] font-bold text-cyan-700 transition-colors hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                @click="requestAiRecommendation"
              >
                <LoaderCircle
                  v-if="selectedRec.aiStatus === 'PENDING'"
                  class="h-3.5 w-3.5 animate-spin"
                />
                <Sparkles v-else class="h-3.5 w-3.5" />
                {{ selectedRec.source === 'AI' ? 'AI 재생성' : 'AI 추천 생성' }}
              </button>
              <button @click="clearTaskSelection" class="text-forena-400 hover:text-forena-700">
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>
          <div class="space-y-4 p-4">
            <!-- 핵심 지표 요약 -->
            <div class="grid gap-2 sm:grid-cols-4">
              <div class="rounded-lg border border-forena-100 bg-white px-3.5 py-2.5">
                <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">계획</p>
                <p class="mt-1 text-lg font-extrabold tabular-nums text-forena-800">
                  {{ selectedTask.plannedPct }}%
                </p>
              </div>
              <div class="rounded-lg border border-forena-100 bg-white px-3.5 py-2.5">
                <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">실제</p>
                <p class="mt-1 text-lg font-extrabold tabular-nums text-forena-800">
                  {{ selectedTask.actualPct }}%
                </p>
                <p class="mt-0.5 text-[10px] font-semibold text-forena-400">
                  {{ progressSourceLabel(selectedTask.actualSource) }}
                </p>
              </div>
              <div class="rounded-lg border border-forena-100 bg-white px-3.5 py-2.5">
                <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">차이</p>
                <p
                  class="mt-1 text-lg font-extrabold tabular-nums"
                  :class="
                    selectedTask.actualPct - selectedTask.plannedPct < 0
                      ? 'text-rose-600'
                      : 'text-emerald-600'
                  "
                >
                  {{ Number((selectedTask.actualPct - selectedTask.plannedPct).toFixed(1)) }}%p
                </p>
              </div>
              <div class="rounded-lg border border-forena-100 bg-white px-3.5 py-2.5">
                <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">
                  예상 지연
                </p>
                <p
                  class="mt-1 text-lg font-extrabold tabular-nums"
                  :class="selectedTask.expectedDelayDays > 0 ? 'text-rose-600' : 'text-forena-800'"
                >
                  {{ selectedTask.expectedDelayDays }}일
                </p>
              </div>
            </div>

            <!-- 가장 중요한 영역: 실제 수정안 -->
            <div
              v-if="selectedRec.aiStatus === 'PENDING'"
              class="flex items-center gap-2 rounded-lg border border-cyan-100 bg-cyan-50 px-3.5 py-3 text-xs font-semibold text-cyan-800"
            >
              <LoaderCircle class="h-4 w-4 animate-spin" />
              OpenAI 추천안을 생성하는 중입니다. 완료되면 아래 수정안이 AI 결과로 갱신됩니다.
            </div>

            <div
              v-if="selectedRec.aiError"
              class="rounded-lg border border-rose-100 bg-rose-50 px-3.5 py-3 text-xs font-semibold text-rose-700"
            >
              {{ selectedRec.aiError }}
            </div>

            <div
              v-if="selectedRec.detailEditProposals?.length"
              class="rounded-xl border border-cyan-200 bg-cyan-50/30 p-4"
            >
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p class="flex items-center gap-1.5 text-xs font-extrabold text-cyan-700">
                    <ListChecks class="h-3.5 w-3.5" /> AI 추천 작업 수정안
                  </p>
                  <p class="mt-0.5 text-[11px] text-forena-500">
                    실제 일자별 작업에 반영될 내용을 먼저 검토하세요.
                  </p>
                </div>
                <span
                  class="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-cyan-700 ring-1 ring-cyan-200"
                >
                  {{ selectedRec.detailEditProposals.length }}건 검토
                </span>
              </div>

              <div class="space-y-3">
                <div
                  v-for="proposal in selectedRec.detailEditProposals"
                  :key="proposal.workPlanId"
                  class="rounded-xl border border-cyan-100 bg-white p-3.5 shadow-sm"
                >
                  <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="text-[10px] font-bold text-forena-400">
                        {{ proposal.date }} · work_plan #{{ proposal.workPlanId }}
                        <span
                          v-if="proposal.isUserEdited"
                          class="ml-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-extrabold text-violet-700 ring-1 ring-violet-200"
                          >관리자 수정됨</span
                        >
                      </p>
                      <p class="mt-1 text-base font-extrabold text-forena-900">
                        {{ proposal.originalName }}
                      </p>
                      <p v-if="proposal.location" class="mt-0.5 text-[11px] text-forena-400">
                        {{ proposal.location }}
                      </p>
                    </div>
                    <div class="flex flex-wrap items-start gap-2">
                      <div
                        class="rounded-lg bg-emerald-50 px-3 py-2 text-right ring-1 ring-emerald-100"
                      >
                        <p class="text-[10px] font-bold text-emerald-600">목표 진척률</p>
                        <p class="text-sm font-extrabold text-emerald-700">
                          {{ proposal.normalTargetPct }}% → {{ proposal.targetPct }}%
                        </p>
                        <p class="mt-0.5 text-[9px] font-bold text-emerald-500">
                          자동 계산값 · 수정 불가
                        </p>
                      </div>
                      <button
                        v-if="!proposal.isEditing"
                        type="button"
                        class="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-cyan-700 hover:bg-cyan-50"
                        @click="startEditProposal(proposal)"
                      >
                        <Pencil class="h-3 w-3" /> 수정
                      </button>
                      <div v-else class="flex items-center gap-1">
                        <button
                          type="button"
                          class="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-cyan-700"
                          @click="confirmEditProposal(proposal)"
                        >
                          <Check class="h-3 w-3" /> 확정
                        </button>
                        <button
                          type="button"
                          class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50"
                          @click="cancelEditProposal(proposal)"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
                    <div class="rounded-lg bg-forena-50 px-3 py-3">
                      <p class="mb-1 text-[10px] font-bold text-forena-400">기존 작업</p>
                      <p class="text-sm font-bold text-forena-800">{{ proposal.originalName }}</p>
                      <p class="mt-1 text-[11px] text-forena-500">
                        인력 {{ proposal.originalRequiredCount }}명
                      </p>
                      <p class="mt-0.5 text-[11px] text-forena-500">
                        작업시간 {{ proposal.originalWorkTime || '-' }}
                      </p>
                      <p class="mt-0.5 text-[11px] text-forena-500">
                        공수 {{ proposal.originalManHours || 0 }}인시
                      </p>
                    </div>
                    <div class="hidden items-center justify-center md:flex">
                      <ChevronRight class="h-5 w-5 text-cyan-500" />
                    </div>
                    <div class="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-3">
                      <p class="mb-1 text-[10px] font-bold text-cyan-700">추천 수정안</p>
                      <template v-if="!proposal.isEditing">
                        <p class="text-sm font-extrabold text-cyan-900">
                          {{ proposal.recommendedName }}
                        </p>
                        <p class="mt-1 text-[11px] text-cyan-700">
                          인력 {{ proposal.originalRequiredCount }}명 →
                          {{ proposal.recommendedRequiredCount }}명
                        </p>
                        <p class="mt-0.5 text-[11px] text-cyan-700">
                          작업시간 {{ proposal.originalWorkTime || '-' }} →
                          {{ proposal.recommendedWorkTime || '-' }}
                        </p>
                        <p class="mt-0.5 text-[11px] font-bold text-cyan-800">
                          공수 {{ proposal.originalManHours || 0 }} →
                          {{ proposal.recommendedManHours || 0 }}인시
                          <span
                            v-if="Number(proposal.additionalManHours || 0) > 0"
                            class="font-extrabold text-emerald-600"
                          >
                            (+{{ proposal.additionalManHours }}인시)
                          </span>
                        </p>
                      </template>
                      <div v-else class="space-y-2">
                        <label class="block text-[10px] font-bold text-cyan-700">작업명</label>
                        <input
                          v-model="proposal.recommendedName"
                          class="w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-bold text-cyan-900 outline-none focus:border-cyan-500"
                        />
                        <label class="block text-[10px] font-bold text-cyan-700">추천 인력</label>
                        <div class="flex items-center gap-2 text-xs text-cyan-700">
                          <span>기존 {{ proposal.originalRequiredCount }}명 →</span>
                          <input
                            v-model.number="proposal.recommendedRequiredCount"
                            type="number"
                            min="0"
                            class="w-20 rounded-lg border border-cyan-200 bg-white px-3 py-2 text-right text-xs font-bold outline-none focus:border-cyan-500"
                          />
                          <span>명</span>
                        </div>

                        <label class="block text-[10px] font-bold text-cyan-700"
                          >추천 작업시간</label
                        >
                        <div class="flex items-center gap-2 text-xs text-cyan-700">
                          <span>기존 {{ proposal.originalWorkTime || '-' }} →</span>
                          <input
                            v-model="proposal.recommendedWorkTime"
                            placeholder="07:00 ~ 18:30"
                            class="w-36 rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-cyan-500"
                          />
                        </div>
                        <p class="text-[10px] leading-relaxed text-cyan-600">
                          확정 시 입력한 작업시간과 추천 인력 기준으로 공수가 다시 계산됩니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div class="mt-3 rounded-lg border border-cyan-100 bg-cyan-50/60 px-3 py-2.5">
                    <p class="mb-1 text-[10px] font-bold text-cyan-700">추천 비고</p>
                    <p
                      v-if="!proposal.isEditing"
                      class="whitespace-pre-line text-[11px] leading-relaxed text-cyan-900"
                    >
                      {{ proposal.recommendedNote }}
                    </p>
                    <textarea
                      v-else
                      v-model="proposal.recommendedNote"
                      rows="4"
                      class="w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-[11px] leading-relaxed text-cyan-900 outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- AI 권고사항 -->
            <div class="rounded-lg border border-forena-100 bg-forena-50/40 px-3.5 py-3">
              <p class="mb-1.5 text-[11px] font-bold text-forena-400">AI 권고사항</p>
              <p class="whitespace-pre-line text-xs leading-relaxed text-forena-800">
                {{ selectedRec.recommendation }}
              </p>
            </div>

            <!-- 책임자: 변경 요청 등록 -->
            <div
              v-if="
                !isSupervisor &&
                currentTradeItem &&
                tradeMatches(selectedTask.process, currentTradeItem.name)
              "
              class="rounded-lg border border-flare-100 bg-flare-50/40 p-3"
            >
              <p class="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold text-flare-700">
                <Sparkles class="h-3 w-3" /> 이 추천안을 그대로 총책임자에게 요청
              </p>
              <button
                @click="createRequestFromAi"
                class="flex w-full items-center justify-center gap-1.5 rounded-lg bg-flare-500 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-flare-600"
              >
                <Send class="h-4 w-4" />
                세부일정 재분배 요청 등록
              </button>
            </div>
            <div
              v-else-if="!isSupervisor"
              class="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-500"
            >
              <Eye class="mr-1 inline h-3 w-3" />
              {{ selectedTask.process }} 공정은 본인 담당이 아니므로 조회만 가능합니다.
            </div>

            <div
              v-if="false"
              class="rounded-lg border border-forena-100 bg-forena-50/60 px-3.5 py-3 text-xs text-forena-500"
            >
              AI 추천안은 참고용입니다. 일정 변경은 공정 책임자 요청 → 총 책임자 승인 → 일정 반영
              순으로 처리됩니다.
            </div>
          </div>
        </div>

        <div
          v-else
          class="flex h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-forena-200 bg-white text-sm text-forena-400"
        >
          <Sparkles class="h-8 w-8 text-forena-300" />
          <p>왼쪽 목록에서 작업을 선택하세요</p>
          <p class="text-[11px]">선택한 작업의 AI 추천안이 여기에 표시됩니다</p>
        </div>
      </div>
    </div>
  </div>

  <!-- ════════════════════════════════════════════════════════════════ -->
  <!-- TAB 3: 변경 관리 — 요청/승인 + 이력 (서브 토글)                   -->
  <!-- ════════════════════════════════════════════════════════════════ -->
</template>
