<script setup>
import {
  AlertTriangle,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  Diamond,
  Layers,
  Locate,
  ZoomIn,
  ZoomOut,
} from 'lucide-vue-next'
import ScheduleChartTaskDetailPanel from './ScheduleChartTaskDetailPanel.vue'

defineProps({
  aiTasks: { type: Array, required: true },
  groupedTasks: { type: Array, required: true },
  milestones: { type: Array, required: true },
  groupOpen: { type: Object, required: true },
  selectedTask: { type: Object, default: null },
  selectedTaskId: { type: [Number, String], default: null },
  uploadedDocs: { type: Array, required: true },
  onlyCp: { type: Boolean, default: false },
  onlyMilestone: { type: Boolean, default: false },
  highlightDelayed: { type: Boolean, default: false },
  ganttZoom: { type: Number, required: true },
  ganttPxWidth: { type: Number, required: true },
  ganttHeader: { type: Array, required: true },
  cellW: { type: Number, required: true },
  todayLineStyle: { type: Object, default: null },
  confidenceClass: { type: Function, required: true },
  reviewStatusClass: { type: Function, required: true },
  milestonesOfGroup: { type: Function, required: true },
  isMilestoneSoon: { type: Function, required: true },
  milestoneFill: { type: Function, required: true },
  milestoneStroke: { type: Function, required: true },
  dayOffset: { type: Function, required: true },
  barStyle: { type: Function, required: true },
  workPlanProgress: { type: Function, required: true },
  progressBarRange: { type: Function, required: true },
  workPlanProgressDotStyle: { type: Function, required: true },
})

const emit = defineEmits([
  'toggle-only-cp',
  'toggle-highlight-delayed',
  'toggle-all-groups',
  'toggle-group',
  'toggle-milestone-highlight',
  'select-task',
  'update-selected-task-id',
  'zoom-in',
  'zoom-out',
  'scroll-to-today',
  'gantt-wheel',
])
</script>

<template>
  <div class="flex gap-4 transition-all duration-300">
    <!-- 간트차트 -->
    <div
      class="overflow-hidden rounded-2xl border border-forena-100/90 bg-white/95 shadow-card transition-all duration-300"
      :class="selectedTask ? 'flex-1 min-w-0' : 'w-full'"
    >
      <!-- 차트 헤더: 제목 + 우상단 버튼군 -->
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-forena-100 px-5 py-3"
      >
        <div class="flex items-center gap-2">
          <CalendarRange class="h-4 w-4 text-flare-600" />
          <h2 class="text-sm font-bold text-forena-900">전체 간트차트</h2>
          <span
            class="rounded-md bg-forena-100 px-1.5 py-0.5 text-[10px] font-bold text-forena-600 tabular-nums"
          >
            {{ aiTasks.length }}공정 · CP {{ aiTasks.filter((t) => t.isCritical).length }}
          </span>
        </div>

        <!-- 우상단: 토글 + 줌 + 오늘 (아이콘 위주, 작은 토글) -->
        <div class="flex items-center gap-1.5">
          <div class="flex overflow-hidden rounded-lg border border-forena-200 bg-white">
            <button
              @click="emit('toggle-only-cp')"
              :title="onlyCp ? 'CP만 표시 ON' : 'CP만 표시 OFF'"
              class="px-2 py-1 text-[10px] font-bold transition"
              :class="onlyCp ? 'bg-rose-50 text-rose-700' : 'text-forena-600 hover:bg-forena-50'"
            >
              CP
            </button>
            <button
              @click="emit('toggle-all-groups')"
              :title="onlyMilestone ? '마일스톤만' : '마일스톤 토글'"
              class="border-l border-forena-200 px-2 py-1 text-[10px] font-bold transition"
              :class="
                onlyMilestone ? 'bg-flare-50 text-flare-700' : 'text-forena-600 hover:bg-forena-50'
              "
            >
              <Diamond class="inline h-3 w-3" />
            </button>
            <button
              @click="emit('toggle-highlight-delayed')"
              :title="highlightDelayed ? '지연 강조 ON' : '지연 강조 OFF'"
              class="border-l border-forena-200 px-2 py-1 text-[10px] font-bold transition"
              :class="
                highlightDelayed
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-forena-600 hover:bg-forena-50'
              "
            >
              <AlertTriangle class="inline h-3 w-3" />
            </button>
          </div>

          <div class="flex overflow-hidden rounded-lg border border-forena-200 bg-white">
            <button @click="emit('zoom-out')" class="p-1.5 hover:bg-forena-50" title="축소">
              <ZoomOut class="h-3.5 w-3.5 text-forena-600" />
            </button>
            <span
              class="border-x border-forena-200 px-2 text-[10px] font-bold tabular-nums text-forena-600 leading-[28px]"
              >{{ ganttZoom }}x</span
            >
            <button @click="emit('zoom-in')" class="p-1.5 hover:bg-forena-50" title="확대">
              <ZoomIn class="h-3.5 w-3.5 text-forena-600" />
            </button>
          </div>

          <button
            @click="emit('scroll-to-today')"
            class="inline-flex items-center gap-1 rounded-lg border border-flare-200 bg-flare-50 px-2 py-1 text-[10px] font-bold text-flare-700 hover:bg-flare-100"
          >
            <Locate class="h-3 w-3" /> 오늘
          </button>
        </div>
      </div>

      <!-- 마일스톤 요약 (가로 스크롤, 한 줄 유지) -->
      <div class="border-b border-forena-100 bg-forena-50/30 px-5 py-2.5">
        <div class="flex items-center gap-2">
          <Diamond class="h-3.5 w-3.5 shrink-0 text-flare-600" />
          <span class="shrink-0 pr-2 text-[11px] font-bold text-forena-700">마일스톤</span>
          <div class="ms-row flex flex-1 items-center gap-1.5">
            <button
              v-for="m in milestones"
              :key="m.id"
              @click="emit('toggle-milestone-highlight', m.id)"
              class="group flex shrink-0 items-center gap-1.5 rounded-md border bg-white px-2 py-1 text-[10px] transition hover:border-flare-300"
              :class="
                highlightedMilestoneId === m.id
                  ? 'border-flare-400 bg-flare-50 ring-2 ring-flare-200'
                  : 'border-forena-100'
              "
              :title="`${m.name} · ${m.date} · ${m.relatedTask} · ${m.status}`"
            >
              <!-- 다이아몬드 SVG -->
              <svg
                class="h-3 w-3"
                :class="isMilestoneSoon(m) ? 'ms-pulse' : ''"
                viewBox="0 0 12 12"
              >
                <path
                  d="M6 1 L11 6 L6 11 L1 6 Z"
                  :fill="milestoneFill(m)"
                  :stroke="milestoneStroke(m)"
                  stroke-width="1"
                />
              </svg>
              <span class="font-bold text-forena-700">{{ m.name }}</span>
              <span class="tabular-nums text-slate-400">{{ m.date.slice(5) }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 간트차트 본체 -->
      <div class="flex">
        <div class="flex min-w-full">
          <!-- 좌측: 작업명 sticky -->
          <div class="sticky left-0 z-10 w-44 shrink-0 border-r border-forena-200 bg-white">
            <div
              class="flex h-9 items-center border-b border-forena-200 bg-forena-50/60 px-4 text-[10px] font-bold text-forena-500"
            >
              공정명 / 공종
            </div>
            <template v-for="(grp, gi) in groupedTasks" :key="grp.group">
              <!-- 공종 그룹 헤더 -->
              <div
                class="flex h-9 cursor-pointer items-center justify-between border-b border-forena-200 bg-gradient-to-r from-forena-100 to-forena-50 px-3 text-[11px] font-bold text-forena-800 transition hover:from-flare-50 hover:to-flare-50/30"
                @click="emit('toggle-group', grp.group)"
              >
                <div class="flex items-center gap-1.5">
                  <ChevronDown v-if="groupOpen[grp.group]" class="h-3.5 w-3.5 text-forena-600" />
                  <ChevronRight v-else class="h-3.5 w-3.5 text-forena-600" />
                  <Layers class="h-3 w-3 text-flare-600" />
                  <span>{{ grp.group }}</span>
                </div>
                <span
                  class="rounded bg-white/70 px-1.5 py-0.5 text-[9px] tabular-nums text-forena-500"
                  >{{ grp.items.length }}</span
                >
              </div>
              <template v-if="groupOpen[grp.group]">
                <div
                  v-for="t in grp.items"
                  :key="t.id"
                  class="flex h-12 cursor-pointer flex-col justify-center border-b border-forena-50 px-4 transition hover:bg-forena-50/60"
                  :class="
                    selectedTaskId === t.id ? 'bg-flare-50/60 border-l-2 border-l-flare-500' : ''
                  "
                  @click="emit('select-task', t.id)"
                >
                  <div class="flex items-center gap-1">
                    <span
                      v-if="t.isCritical"
                      class="rounded bg-rose-100 px-1 py-0.5 text-[8px] font-bold text-rose-700"
                      >CP</span
                    >
                    <p class="truncate text-xs font-semibold text-forena-800">{{ t.name }}</p>
                  </div>
                  <p class="truncate text-[10px] text-slate-400">
                    {{ t.sub }} · 보할 {{ t.weight }}%
                  </p>
                </div>
              </template>
            </template>
          </div>

          <!-- 우측: 차트 -->
          <div
            id="gantt-scroll"
            class="overflow-x-auto flex-1"
            @wheel.prevent="emit('gantt-wheel', $event)"
          >
            <div class="relative" :style="{ width: ganttPxWidth + 'px', minWidth: '100%' }">
              <!-- 헤더 -->
              <div
                class="sticky top-0 z-[10] flex h-9 border-b border-forena-200 bg-white shadow-[0_1px_0_0_rgb(226,232,240)]"
              >
                <div
                  v-for="(h, i) in ganttHeader"
                  :key="i"
                  class="flex items-center justify-center border-r border-forena-100 text-[10px] font-bold text-forena-500"
                  :style="{ width: h.days * cellW + 'px' }"
                >
                  {{ h.label }}
                </div>
              </div>

              <!-- 본문 -->
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

                <!-- 행: 그룹 헤더 라인 (해당 그룹의 마일스톤만 표시) + 작업 행 -->
                <template v-for="(grp, gi) in groupedTasks" :key="`grow-${grp.group}`">
                  <!-- 그룹 헤더 라인 -->
                  <div
                    class="relative h-9 border-b border-forena-200 bg-gradient-to-r from-forena-100 to-forena-50"
                  >
                    <!-- 이 그룹에 속한 마일스톤 -->
                    <div
                      v-for="m in milestonesOfGroup(grp.group)"
                      :key="`gms-${m.id}`"
                      class="ms-marker pointer-events-auto absolute top-1/2 z-[4] -translate-y-1/2"
                      :class="[
                        isMilestoneSoon(m) ? 'ms-pulse' : '',
                        highlightedMilestoneId === m.id ? 'ms-highlight' : '',
                      ]"
                      :style="{ left: dayOffset(m.date) * cellW + cellW / 2 - 8 + 'px' }"
                      :title="`${m.name} · ${m.date} · ${m.relatedTask} · ${m.status}`"
                      @click="emit('toggle-milestone-highlight', m.id)"
                    >
                      <svg class="h-4 w-4 cursor-pointer drop-shadow-sm" viewBox="0 0 16 16">
                        <path
                          d="M8 1 L15 8 L8 15 L1 8 Z"
                          :fill="milestoneFill(m)"
                          :stroke="milestoneStroke(m)"
                          stroke-width="1.5"
                        />
                      </svg>
                    </div>
                  </div>

                  <template v-if="groupOpen[grp.group]">
                    <div
                      v-for="t in grp.items"
                      :key="`row-${t.id}`"
                      class="relative flex h-12 border-b border-forena-50"
                      :class="selectedTaskId === t.id ? 'bg-flare-50/40' : ''"
                      @click="emit('update-selected-task-id', t.id)"
                    >
                      <!-- 라인: 계획 (파란) -->
                      <div
                        v-if="barStyle(t.baselineStart ?? t.start, t.baselineEnd ?? t.end)"
                        class="absolute z-[2] flex items-center"
                        :style="{
                          ...barStyle(t.baselineStart ?? t.start, t.baselineEnd ?? t.end),
                          top: '14px',
                          height: '4px',
                        }"
                        :title="`계획: ${t.baselineStart ?? t.start} ~ ${t.baselineEnd ?? t.end}`"
                      >
                        <span
                          class="absolute -left-[3px] h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white"
                          :class="t.isCritical ? 'h-3 w-3' : ''"
                        ></span>
                        <span
                          class="absolute -right-[3px] h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white"
                          :class="t.isCritical ? 'h-3 w-3' : ''"
                        ></span>
                        <span
                          class="h-1 w-full rounded-full"
                          :class="t.isCritical ? 'bg-blue-700 h-1.5' : 'bg-blue-600'"
                        ></span>
                      </div>
                      <!-- 라인: 연간 실행/진행 (WorkPlan 통합 빨간선) -->
                      <template v-if="workPlanProgress(t)">
                        <!-- 전체 계획 구간: 연한 빨강 (배경) -->
                        <div
                          v-if="
                            barStyle(workPlanProgress(t).planStart, workPlanProgress(t).planEnd)
                          "
                          class="absolute z-[2] flex items-center"
                          :style="{
                            ...barStyle(workPlanProgress(t).planStart, workPlanProgress(t).planEnd),
                            top: '28px',
                            height: '4px',
                          }"
                          :title="`연간 계획: ${workPlanProgress(t).planStart} ~ ${workPlanProgress(t).planEnd}`"
                        >
                          <span
                            class="absolute -left-[3px] h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white"
                          ></span>
                          <span class="h-1 w-full rounded-full bg-rose-200"></span>
                          <span
                            class="absolute top-1/2 z-[3] h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-rose-500 ring-2 ring-white"
                            :style="workPlanProgressDotStyle(t)"
                          ></span>
                        </div>

                        <!-- 진행된 구간: 진한 빨강 (오버레이, 점 없음) -->
                        <div
                          v-if="
                            progressBarRange(t) &&
                            barStyle(progressBarRange(t).start, progressBarRange(t).end)
                          "
                          class="absolute z-[3] flex items-center"
                          :style="{
                            ...barStyle(progressBarRange(t).start, progressBarRange(t).end),
                            top: '28px',
                            height: '4px',
                          }"
                          :title="`진행됨: ${progressBarRange(t).start} ~ ${progressBarRange(t).end}`"
                        >
                          <span class="h-1 w-full rounded-full bg-rose-500"></span>
                        </div>
                      </template>
                    </div>
                  </template>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 범례 (다이아몬드 아이콘 통일) -->
      <div
        class="flex flex-wrap items-center gap-3 border-t border-forena-100 bg-forena-50/40 px-5 py-2 text-[10px] text-slate-600"
      >
        <span class="inline-flex items-center gap-1.5"
          ><span class="h-1 w-5 rounded-full bg-blue-600" />계획선</span
        >
        <span class="inline-flex items-center gap-1.5"
          ><span class="h-1 w-5 rounded-full bg-rose-500" />실제 진행</span
        >
        <span class="inline-flex items-center gap-1.5"
          ><span class="h-1 w-5 rounded-full bg-rose-200" />진행 예정</span
        >
        <span class="inline-flex items-center gap-1.5">
          <svg class="h-3 w-3" viewBox="0 0 12 12">
            <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="#10b981" stroke="#047857" stroke-width="1" />
          </svg>
          완료
        </span>
        <span class="inline-flex items-center gap-1.5">
          <svg class="h-3 w-3" viewBox="0 0 12 12">
            <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1" />
          </svg>
          예정
        </span>
        <span class="inline-flex items-center gap-1.5">
          <svg class="h-3 w-3" viewBox="0 0 12 12">
            <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="#f43f5e" stroke="#be123c" stroke-width="1" />
          </svg>
          지연 위험
        </span>
        <span class="inline-flex items-center gap-1.5"
          ><span class="h-3 w-px bg-flare-500" /> 오늘</span
        >
        <span class="ml-auto text-forena-400">스크롤하여 전체 보기</span>
      </div>
    </div>

    <!-- 작업 상세 패널 -->
    <transition name="slide-detail">
      <ScheduleChartTaskDetailPanel
        v-if="selectedTask"
        :selected-task="selectedTask"
        :uploaded-docs="uploadedDocs"
        :confidence-class="confidenceClass"
        :review-status-class="reviewStatusClass"
        @close="emit('update-selected-task-id', null)"
      />
    </transition>
  </div>
</template>

<style scoped>
.slide-detail-enter-active,
.slide-detail-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.slide-detail-enter-from,
.slide-detail-leave-to {
  opacity: 0;
  width: 0;
  min-width: 0;
}
.slide-detail-enter-to,
.slide-detail-leave-from {
  opacity: 1;
  width: 320px;
}

/* 마일스톤 — 현재일 근접 시 pulse */
@keyframes ms-pulse {
  0%,
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 0 rgba(244, 63, 94, 0));
  }
  50% {
    transform: scale(1.18);
    filter: drop-shadow(0 0 4px rgba(244, 63, 94, 0.55));
  }
}
.ms-pulse {
  animation: ms-pulse 1.6s ease-in-out infinite;
  transform-origin: center;
}

/* 마일스톤 hover 시 살짝 확대 */
.ms-marker {
  transition: transform 0.15s ease;
}
.ms-marker:hover {
  transform: scale(1.25);
}

/* 마일스톤 표 ↔ 간트 강조 */
.ms-highlight {
  filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.85));
}

/* 마일스톤 가로 스크롤 (간트 상단 영역) */
.ms-row {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: thin;
}
.ms-row::-webkit-scrollbar {
  height: 4px;
}
.ms-row::-webkit-scrollbar-thumb {
  background: rgba(15, 23, 42, 0.15);
  border-radius: 999px;
}
.ms-row::-webkit-scrollbar-track {
  background: transparent;
}

/* 간트 차트 스크롤 설정 */
#gantt-scroll::-webkit-scrollbar {
  height: 8px;
}
#gantt-scroll::-webkit-scrollbar-thumb {
  background: rgba(15, 23, 42, 0.15);
  border-radius: 999px;
}
#gantt-scroll::-webkit-scrollbar-track {
  background: transparent;
}
</style>
