<script setup>
import { computed, ref } from 'vue'
import { isTaskDirty } from '@/utils/scheduleMapper.js'
import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  CalendarRange,
  CheckCircle2,
  Diamond,
  Layers,
  Loader2,
  Pencil,
  ShieldCheck,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-vue-next'

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  projectMeta: {
    type: Object,
    required: true,
  },
  tasks: {
    type: Array,
    required: true,
  },
  milestones: {
    type: Array,
    required: true,
  },
  projectInfo: {
    type: Object,
    default: null,
  },
  savingChanges: {
    type: Boolean,
    default: false,
  },
  saveError: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['close', 'confirm'])

const ganttZoom = ref(1)
const editingTaskId = ref(null)
const editDraft = ref(null)

const projStart = computed(() => props.projectMeta.startDate || '2025-03-01')
const projEnd = computed(() => props.projectMeta.endDate || '2026-09-30')
const projTotalDays = computed(() => {
  const a = new Date(projStart.value)
  const b = new Date(projEnd.value)
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
})

const cellW = computed(() => 3 * ganttZoom.value)
const ganttPxWidth = computed(() => projTotalDays.value * cellW.value)
const dirtyCount = computed(() => props.tasks.filter(isTaskDirty).length)

const ganttHeader = computed(() => {
  const out = []
  const a = new Date(projStart.value)
  const last = new Date(projEnd.value)
  let cur = new Date(a.getFullYear(), a.getMonth(), 1)

  while (cur <= last) {
    const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
    const start = cur < a ? a : cur
    const end = next > last ? last : next
    out.push({
      label: cur.getFullYear() + '.' + String(cur.getMonth() + 1).padStart(2, '0'),
      days: Math.round((end - start) / 86400000) + 1,
    })
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
  }

  return out
})

const todayLineStyle = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  if (today < projStart.value || today > projEnd.value) return null
  return { left: dayOffset(today) * cellW.value + cellW.value / 2 + 'px' }
})

const groupedGanttTasks = computed(() => {
  const map = new Map()
  for (const task of props.tasks) {
    if (!map.has(task.group)) map.set(task.group, [])
    map.get(task.group).push(task)
  }
  return Array.from(map.entries()).map(([group, items]) => ({ group, items }))
})

const confidenceClass = (n) =>
  n >= 90 ? 'text-emerald-600' : n >= 80 ? 'text-forena-600' : 'text-amber-600'

function dayOffset(dateStr) {
  const a = new Date(projStart.value)
  const b = new Date(dateStr)
  return Math.max(0, Math.round((b - a) / 86400000))
}

function rangeDays(start, end) {
  return Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000) + 1)
}

function barStyle(start, end) {
  if (!start || !end) return null
  const left = dayOffset(start) * cellW.value
  const width = rangeDays(start, end) * cellW.value
  return { left: left + 'px', width: width - 2 + 'px' }
}

function milestoneFill(milestone) {
  if (milestone.status === '완료') return '#10b981'
  if (milestone.status === '지연 위험') return '#f43f5e'
  return '#3b82f6'
}

function milestoneStroke(milestone) {
  if (milestone.status === '완료') return '#047857'
  if (milestone.status === '지연 위험') return '#be123c'
  return '#1d4ed8'
}

function startEdit(task) {
  editingTaskId.value = task.id
  editDraft.value = {
    name: task.name,
    group: task.group,
    start: task.start,
    end: task.end,
    weight: task.weight,
  }
}

function cancelEdit() {
  editingTaskId.value = null
  editDraft.value = null
}

function commitEdit(task) {
  if (!editDraft.value) return
  if (editDraft.value.start && editDraft.value.end && editDraft.value.start > editDraft.value.end) {
    alert('종료일은 시작일보다 같거나 이후여야 합니다.')
    return
  }

  task.name = editDraft.value.name?.trim() || task.name
  task.group = editDraft.value.group?.trim() || task.group
  task.start = editDraft.value.start
  task.end = editDraft.value.end

  const weight = Number(editDraft.value.weight)
  task.weight = Number.isFinite(weight) ? Math.round(weight * 100) / 100 : 0
  task.reviewStatus = '검토 중'

  cancelEdit()
}

function zoomIn() {
  ganttZoom.value = Math.min(2.0, +(ganttZoom.value + 0.2).toFixed(1))
}

function zoomOut() {
  ganttZoom.value = Math.max(0.5, +(ganttZoom.value - 0.2).toFixed(1))
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    @click.self="emit('close')"
  >
    <div
      class="flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      style="max-height: 92vh"
    >
      <!-- 모달 헤더 -->
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-forena-100 bg-gradient-to-r from-forena-50 to-white px-6 py-4"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-flare-100">
            <CalendarRange class="h-5 w-5 text-flare-600" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-forena-900">AI 생성 공정표 미리보기</h3>
            <p class="text-[11px] text-forena-500">
              {{ projectMeta.siteName }} · {{ projectMeta.startDate }} ~ {{ projectMeta.endDate }}
            </p>
          </div>
        </div>

        <!-- AI 분석 요약 뱃지 -->
        <div class="flex flex-wrap gap-2">
          <span class="rounded-lg bg-forena-100 px-2.5 py-1 text-[11px] font-bold text-forena-700">
            전체 {{ tasks.length }}개 공정
          </span>
          <span
            class="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200"
          >
            마일스톤 {{ milestones.length }}개
          </span>
          <span
            v-if="projectInfo"
            class="rounded-lg bg-flare-50 px-2.5 py-1 text-[11px] font-bold text-flare-700 ring-1 ring-flare-200"
            :title="'100% 권장'"
          >
            보할 합계 {{ projectInfo.weightSum }}%
          </span>
        </div>

        <button @click="emit('close')" class="rounded-lg p-1.5 hover:bg-forena-100">
          <X class="h-4 w-4 text-slate-400 hover:text-forena-700" />
        </button>
      </div>

      <!-- 안내 배너 -->
      <div class="flex items-start gap-2 border-b border-forena-100 bg-flare-50/50 px-6 py-3">
        <BrainCircuit class="h-4 w-4 shrink-0 text-flare-600 mt-0.5" />
        <p class="text-[11px] leading-relaxed text-flare-800">
          AI가 업로드된 문서를 분석하여 공정표를 생성했습니다. 좌측 공정명에
          <Pencil class="inline h-3 w-3 mx-0.5" />아이콘을 눌러 직접 수정할 수 있으며,
          <strong>공정표 확정하기</strong>를 누르면 변경 사항이 일괄 저장됩니다. 확정 이후에도 변경
          요청을 통해 수정이 가능합니다.
        </p>
      </div>

      <!-- 줌 컨트롤 -->
      <div class="flex items-center gap-2 border-b border-forena-100 bg-white px-6 py-2">
        <Diamond class="h-3.5 w-3.5 text-flare-600" />
        <span class="text-[11px] font-bold text-forena-700 mr-2">마일스톤</span>
        <div class="flex gap-1.5 mr-4">
          <span
            v-for="m in milestones"
            :key="m.id"
            class="flex items-center gap-1 rounded-md border border-forena-100 bg-white px-2 py-0.5 text-[10px] font-bold text-forena-700"
          >
            <svg class="h-2.5 w-2.5" viewBox="0 0 12 12">
              <path
                d="M6 1 L11 6 L6 11 L1 6 Z"
                :fill="milestoneFill(m)"
                :stroke="milestoneStroke(m)"
                stroke-width="1"
              />
            </svg>
            {{ m.name }}
            <span class="tabular-nums text-slate-400">{{ m.date.slice(5) }}</span>
          </span>
        </div>
        <div class="ml-auto flex items-center gap-1.5">
          <div class="flex overflow-hidden rounded-lg border border-forena-200 bg-white">
            <button @click="zoomOut" class="p-1.5 hover:bg-forena-50">
              <ZoomOut class="h-3.5 w-3.5 text-forena-600" />
            </button>
            <span
              class="border-x border-forena-200 px-2 text-[10px] font-bold tabular-nums text-forena-600 leading-[28px]"
              >{{ ganttZoom }}x</span
            >
            <button @click="zoomIn" class="p-1.5 hover:bg-forena-50">
              <ZoomIn class="h-3.5 w-3.5 text-forena-600" />
            </button>
          </div>
        </div>
      </div>

      <!-- 간트차트 본체 -->
      <div id="gantt-scroll" class="overflow-x-auto">
        <div class="flex min-w-full">
          <!-- 좌측 고정: 작업명 -->
          <div class="sticky left-0 z-10 w-44 shrink-0 border-r border-forena-200 bg-white">
            <div
              class="flex h-9 items-center border-b border-forena-200 bg-forena-50/60 px-4 text-[10px] font-bold text-forena-500"
            >
              공정명 / 공종
            </div>
            <template v-for="grp in groupedGanttTasks" :key="grp.group">
              <!-- 공종 헤더 -->
              <div
                class="flex h-9 items-center gap-1.5 border-b border-forena-200 bg-gradient-to-r from-forena-100 to-forena-50 px-3 text-[11px] font-bold text-forena-800"
              >
                <Layers class="h-3 w-3 text-flare-600" />
                <span>{{ grp.group }}</span>
                <span
                  class="ml-auto rounded bg-white/70 px-1.5 py-0.5 text-[9px] tabular-nums text-forena-500"
                  >{{ grp.items.length }}</span
                >
              </div>
              <!-- 각 작업 -->
              <div
                v-for="t in grp.items"
                :key="t.id"
                class="group/task relative flex h-12 flex-col justify-center border-b border-forena-50 px-4 hover:bg-forena-50/60"
              >
                <!-- 보기 모드 -->
                <template v-if="editingTaskId !== t.id">
                  <div class="flex items-center gap-1">
                    <span
                      v-if="t.isCritical"
                      class="rounded bg-rose-100 px-1 py-0.5 text-[8px] font-bold text-rose-700"
                      >CP</span
                    >
                    <p class="truncate text-xs font-semibold text-forena-800">{{ t.name }}</p>
                    <span
                      v-if="isTaskDirty(t)"
                      class="ml-auto rounded bg-flare-100 px-1 py-0.5 text-[8px] font-bold text-flare-700"
                      title="변경됨"
                      >수정</span
                    >
                    <button
                      @click.stop="startEdit(t)"
                      class="opacity-0 group-hover/task:opacity-100 ml-1 rounded p-0.5 text-forena-400 hover:bg-forena-100 hover:text-forena-700 transition"
                      title="편집"
                    >
                      <Pencil class="h-3 w-3" />
                    </button>
                  </div>
                  <p class="truncate text-[10px] text-slate-400">
                    보할 {{ t.weight }}% · 신뢰도
                    <span :class="confidenceClass(t.confidence)">{{ t.confidence }}%</span>
                  </p>
                </template>

                <!-- 편집 모드 -->
                <template v-else>
                  <input
                    v-model="editDraft.name"
                    class="rounded border border-flare-300 px-1.5 py-0.5 text-[11px] font-semibold text-forena-800 outline-none focus:border-flare-500"
                    placeholder="공정명"
                  />
                  <div class="mt-0.5 flex items-center gap-1">
                    <input
                      v-model="editDraft.start"
                      type="date"
                      class="w-[88px] rounded border border-forena-200 px-1 py-0.5 text-[9px] text-forena-700 outline-none"
                    />
                    <span class="text-[9px] text-forena-400">~</span>
                    <input
                      v-model="editDraft.end"
                      type="date"
                      class="w-[88px] rounded border border-forena-200 px-1 py-0.5 text-[9px] text-forena-700 outline-none"
                    />
                    <input
                      v-model.number="editDraft.weight"
                      type="number"
                      min="0"
                      step="0.01"
                      class="w-12 rounded border border-forena-200 px-1 py-0.5 text-[9px] text-forena-700 outline-none"
                      title="보할율"
                    />
                    <span class="text-[9px] text-forena-400">%</span>
                    <button
                      @click.stop="commitEdit(t)"
                      class="ml-auto rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white hover:bg-emerald-700"
                    >
                      저장
                    </button>
                    <button
                      @click.stop="cancelEdit"
                      class="rounded border border-forena-200 px-1.5 py-0.5 text-[9px] font-bold text-forena-600 hover:bg-forena-50"
                    >
                      취소
                    </button>
                  </div>
                </template>
              </div>
            </template>
          </div>

          <!-- 우측: 차트 -->
          <div class="relative" :style="{ width: ganttPxWidth + 'px' }">
            <!-- 월 헤더 -->
            <div class="sticky top-0 z-[5] flex h-9 border-b border-forena-200 bg-forena-50/30">
              <div
                v-for="(h, i) in ganttHeader"
                :key="i"
                class="flex items-center justify-center border-r border-forena-100 text-[10px] font-bold text-forena-500"
                :style="{ width: h.days * cellW + 'px' }"
              >
                {{ h.label }}
              </div>
            </div>

            <!-- 차트 행 -->
            <div class="relative">
              <!-- 오늘 라인 -->
              <div
                v-if="todayLineStyle"
                class="pointer-events-none absolute top-0 z-[3] h-full w-px bg-flare-500/70"
                :style="todayLineStyle"
              >
                <div
                  class="absolute -top-2 left-1/2 -translate-x-1/2 rounded bg-flare-500 px-1 text-[8px] font-bold text-white"
                >
                  오늘
                </div>
              </div>

              <template v-for="grp in groupedGanttTasks" :key="`grow-${grp.group}`">
                <!-- 그룹 헤더 행 (마일스톤 표시) -->
                <div
                  class="relative h-9 border-b border-forena-200 bg-gradient-to-r from-forena-100 to-forena-50"
                >
                  <div
                    v-for="m in milestones.filter((ms) =>
                      tasks.find((t) => t.group === grp.group && t.isCritical),
                    )"
                    :key="`ms-${m.id}-${grp.group}`"
                    class="pointer-events-auto absolute top-1/2 z-[4] -translate-y-1/2"
                    :style="{ left: dayOffset(m.date) * cellW + cellW / 2 - 8 + 'px' }"
                    :title="`${m.name} · ${m.date}`"
                  ></div>
                </div>
                <!-- 작업 행 -->
                <div
                  v-for="t in grp.items"
                  :key="`row-${t.id}`"
                  class="relative flex h-12 border-b border-forena-50"
                >
                  <!-- 계획 바 -->
                  <div
                    v-if="barStyle(t.start, t.end)"
                    class="absolute z-[2] flex items-center"
                    :style="{ ...barStyle(t.start, t.end), top: '18px', height: '6px' }"
                  >
                    <span
                      class="absolute -left-[3px] h-2.5 w-2.5 rounded-full ring-2 ring-white"
                      :class="t.isCritical ? 'bg-rose-600 h-3 w-3' : 'bg-blue-600'"
                    ></span>
                    <span
                      class="absolute -right-[3px] h-2.5 w-2.5 rounded-full ring-2 ring-white"
                      :class="t.isCritical ? 'bg-rose-600 h-3 w-3' : 'bg-blue-600'"
                    ></span>
                    <span
                      class="h-full w-full rounded-full"
                      :class="t.isCritical ? 'bg-rose-500' : 'bg-blue-500'"
                    ></span>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 범례 -->
      <div
        class="flex flex-wrap items-center gap-4 border-t border-forena-100 bg-forena-50/40 px-6 py-2 text-[10px] text-slate-600"
      >
        <span class="inline-flex items-center gap-1.5"
          ><span class="h-1.5 w-5 rounded-full bg-rose-500" />CP 공정</span
        >
        <span class="inline-flex items-center gap-1.5"
          ><span class="h-1.5 w-5 rounded-full bg-blue-500" />일반 공정</span
        >
        <span class="inline-flex items-center gap-1.5"
          ><span class="h-3 w-px bg-flare-500" />오늘</span
        >
        <span class="ml-auto text-forena-400">가로 스크롤하여 전체 일정 확인</span>
      </div>

      <!-- 모달 푸터 -->
      <div class="flex items-center justify-between border-t border-forena-200 bg-white px-6 py-4">
        <div class="flex flex-col gap-1 text-[11px] text-forena-500">
          <div>
            <CheckCircle2 class="inline h-3.5 w-3.5 text-emerald-500 mr-1" />
            공정표 확정 후에도 변경 요청을 통해 수정이 가능합니다.
          </div>
          <div v-if="dirtyCount > 0" class="text-flare-700 font-bold">
            수정된 공정 {{ dirtyCount }}건이 확정 시 저장됩니다.
          </div>
          <div v-if="saveError" class="text-rose-700 font-bold">
            <AlertCircle class="inline h-3.5 w-3.5 mr-1" />
            {{ saveError }}
          </div>
        </div>
        <div class="flex gap-2">
          <button
            @click="emit('close')"
            :disabled="savingChanges"
            class="rounded-lg border border-forena-200 bg-white px-4 py-2 text-xs font-bold text-forena-700 hover:bg-forena-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다시 검토하기
          </button>
          <button
            @click="emit('confirm')"
            :disabled="savingChanges"
            class="inline-flex items-center gap-2 rounded-lg bg-forena-800 px-5 py-2 text-xs font-bold text-white hover:bg-forena-900 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="savingChanges" class="h-3.5 w-3.5 animate-spin" />
            <ShieldCheck v-else class="h-3.5 w-3.5" />
            {{ savingChanges ? '저장 중...' : '공정표 확정하기' }}
            <ArrowRight v-if="!savingChanges" class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
