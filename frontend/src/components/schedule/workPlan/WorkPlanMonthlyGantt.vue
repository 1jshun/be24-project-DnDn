<script setup>
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import { GANTT_DAY_W, NAME_COL_W } from '@/utils/schedule/workPlan.js'

defineProps({
  groups: {
    type: Array,
    default: () => [],
  },
  groupOpen: {
    type: Object,
    required: true,
  },
  processOpen: {
    type: Object,
    required: true,
  },
  monthMeta: {
    type: Object,
    required: true,
  },
  chartWidth: {
    type: String,
    required: true,
  },
  todayLineStyle: {
    type: Object,
    default: null,
  },
  monthlyDayHeaderClass: {
    type: Function,
    required: true,
  },
  monthlyDayCellClass: {
    type: Function,
    required: true,
  },
  monthlyProcessHeaderHeight: {
    type: Function,
    required: true,
  },
  monthlyDetailRowHeight: {
    type: Function,
    required: true,
  },
  monthCellCenterStyle: {
    type: Function,
    required: true,
  },
  barStyle: {
    type: Function,
    required: true,
  },
  progressBarStyle: {
    type: Function,
    required: true,
  },
  progressDotStyle: {
    type: Function,
    required: true,
  },
})

defineEmits(['toggle-group', 'toggle-process', 'select-baseline', 'select-work-plan'])
</script>

<template>
  <div class="min-h-0 flex-1 overflow-auto bg-white">
    <div
      v-if="!groups.length"
      class="flex items-center justify-center py-16 text-sm text-slate-400"
    >
      {{ monthMeta.year }}년 {{ monthMeta.month }}월에 표시할 기준 공정이 없습니다.
    </div>

    <div v-else class="flex min-w-max">
      <div
        class="sticky left-0 z-10 shrink-0 border-r border-forena-200 bg-white"
        :style="{ width: NAME_COL_W + 'px' }"
      >
        <div class="flex h-10 items-center border-b border-forena-200 bg-white px-4">
          <span class="text-[11px] font-bold text-forena-500">공종 / 공정 / 세부계획</span>
        </div>

        <template v-for="group in groups" :key="`m-grp-${group.group}`">
          <div
            class="flex h-9 cursor-pointer items-center justify-between border-b border-forena-200 bg-gradient-to-r from-forena-100 to-forena-50 px-3 text-[11px] font-bold text-forena-800 transition hover:from-flare-50 hover:to-flare-50/30"
            @click="$emit('toggle-group', group.group)"
          >
            <div class="flex items-center gap-1.5">
              <ChevronDown v-if="groupOpen[group.group]" class="h-3.5 w-3.5 text-forena-600" />
              <ChevronRight v-else class="h-3.5 w-3.5 text-forena-600" />
              <span>{{ group.group }}</span>
            </div>
            <span
              class="rounded bg-white/70 px-1.5 py-0.5 text-[9px] tabular-nums text-forena-500"
              >{{ group.items.length }}</span
            >
          </div>

          <template v-if="groupOpen[group.group]">
            <template v-for="item in group.items" :key="`m-item-${item.id}`">
              <div
                class="flex cursor-pointer items-center gap-1.5 border-b border-forena-100 bg-slate-50/40 pl-4 pr-3 transition hover:bg-forena-50/60"
                :style="{ height: monthlyProcessHeaderHeight() + 'px' }"
                @click="$emit('toggle-process', item.id)"
              >
                <ChevronDown
                  v-if="processOpen[item.id]"
                  class="h-3.5 w-3.5 shrink-0 text-slate-500"
                />
                <ChevronRight v-else class="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <div class="flex min-w-0 flex-1 flex-col">
                  <div class="flex items-center gap-1.5">
                    <p
                      class="truncate text-sm font-bold text-forena-900"
                      @click.stop="$emit('select-baseline', item)"
                    >
                      {{ item.name }}
                    </p>
                    <span
                      v-if="item.weightPct != null"
                      class="rounded bg-blue-50 px-1 py-0.5 text-[9px] font-bold text-blue-700"
                    >
                      보할 {{ item.weightPct }}%
                    </span>
                  </div>
                  <p class="truncate text-[10px] text-slate-400">
                    <span
                      v-if="item.milestoneDate"
                      class="inline-flex items-center gap-1"
                      :title="
                        item.milestoneFromAnnual
                          ? '연간 실행계획 종료일을 마일스톤으로 사용'
                          : '기준 공정 종료일'
                      "
                    >
                      종료 예정일 {{ item.milestoneDate }}
                    </span>
                    <span v-else class="italic text-slate-300">마일스톤 없음</span>
                  </p>
                </div>
                <span
                  class="rounded bg-white/70 px-1.5 py-0.5 text-[9px] tabular-nums text-slate-500"
                  >{{ (item.details && item.details.length) || 0 }}</span
                >
              </div>

              <template v-if="processOpen[item.id]">
                <div
                  v-for="detail in item.details"
                  :key="`m-detail-${detail.id}`"
                  class="flex cursor-pointer items-center gap-1.5 border-b border-forena-50 pl-10 pr-3 transition hover:bg-rose-50/40"
                  :style="{ height: monthlyDetailRowHeight() + 'px' }"
                  @click.stop="$emit('select-work-plan', detail)"
                >
                  <span class="shrink-0 text-[10px] text-slate-300">└</span>
                  <p class="truncate text-[11px] text-slate-700">
                    {{ detail.name
                    }}<span v-if="detail.location" class="text-slate-400">
                      · {{ detail.location }}</span
                    >
                  </p>
                </div>
                <div
                  v-if="!item.details || !item.details.length"
                  class="flex items-center border-b border-forena-50 pl-10 pr-3 text-[10px] italic text-slate-300"
                  :style="{ height: monthlyDetailRowHeight() + 'px' }"
                >
                  세부계획 없음 (월간 계획서를 업로드하세요)
                </div>
              </template>
            </template>
          </template>
        </template>
      </div>

      <div class="relative flex-1 w-full min-w-[1000px]" :style="{ width: chartWidth }">
        <div class="sticky top-0 z-[5] flex h-10 border-b border-forena-200 bg-white">
          <div
            v-for="day in monthMeta.days"
            :key="day.date"
            class="flex-1 flex items-center justify-center border-r border-forena-100 text-[11px] font-semibold tabular-nums"
            :class="monthlyDayHeaderClass(day)"
          >
            {{ day.day }}
          </div>
        </div>

        <div class="relative">
          <div
            v-if="todayLineStyle"
            class="pointer-events-none absolute top-0 z-[3] h-full w-px bg-flare-400/60"
            :style="todayLineStyle"
          ></div>

          <template v-for="group in groups" :key="`m-grow-${group.group}`">
            <div
              class="h-9 border-b border-forena-200 bg-gradient-to-r from-forena-100 to-forena-50"
            ></div>

            <template v-if="groupOpen[group.group]">
              <template v-for="item in group.items" :key="`m-row-${item.id}`">
                <div
                  class="relative flex border-b border-forena-100 bg-slate-50/40"
                  :style="{ height: monthlyProcessHeaderHeight() + 'px' }"
                >
                  <div
                    v-for="day in monthMeta.days"
                    :key="day.date"
                    class="flex-1 border-r border-forena-50"
                    :class="monthlyDayCellClass(day)"
                  ></div>

                  <div
                    v-if="item.milestoneDate && monthCellCenterStyle(item.milestoneDate)"
                    class="absolute z-[2] flex cursor-pointer items-center justify-center"
                    :style="{
                      ...monthCellCenterStyle(item.milestoneDate),
                      top: '50%',
                      width: '14px',
                      height: '14px',
                      transform: 'translate(-7px, -50%)',
                    }"
                    :title="`마일스톤: ${item.milestoneDate}`"
                    @click.stop="$emit('select-baseline', item)"
                  >
                    <span class="block h-2.5 w-2.5 rotate-45 bg-rose-500 ring-2 ring-white"></span>
                  </div>
                </div>

                <template v-if="processOpen[item.id]">
                  <div
                    v-for="detail in item.details"
                    :key="`m-detail-row-${detail.id}`"
                    class="relative flex border-b border-forena-50"
                    :style="{ height: monthlyDetailRowHeight() + 'px' }"
                  >
                    <div
                      v-for="day in monthMeta.days"
                      :key="day.date"
                      class="flex-1 border-r border-forena-50"
                      :class="monthlyDayCellClass(day)"
                    ></div>

                    <div
                      v-if="
                        detail.plannedStart &&
                        detail.plannedEnd &&
                        barStyle(detail.plannedStart, detail.plannedEnd)
                      "
                      class="group absolute z-[2] flex cursor-pointer items-center"
                      :style="{
                        ...barStyle(detail.plannedStart, detail.plannedEnd),
                        top: '8px',
                        height: '4px',
                      }"
                      :title="`월간 기준: ${detail.plannedStart} ~ ${detail.plannedEnd}`"
                      @click.stop="$emit('select-work-plan', detail)"
                    >
                      <span
                        class="absolute -left-[3px] h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white"
                      ></span>
                      <span
                        class="absolute -right-[3px] h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white"
                      ></span>
                      <span class="h-1 w-full rounded-full bg-blue-600"></span>
                    </div>

                    <div
                      v-if="barStyle(detail.start, detail.end)"
                      class="group absolute z-[2] cursor-pointer"
                      :style="{
                        ...barStyle(detail.start, detail.end),
                        top: '20px',
                        height: '4px',
                      }"
                      :title="`${detail.name}${detail.location ? ' · ' + detail.location : ''}\n실행: ${detail.start} ~ ${detail.end}`"
                      @click.stop="$emit('select-work-plan', detail)"
                    >
                      <span
                        class="absolute -left-[3px] top-1/2 z-[2] h-2 w-2 -translate-y-1/2 rounded-full bg-red-500 ring-2 ring-white"
                      ></span>
                      <span
                        class="absolute top-1/2 z-[2] h-2 w-2 -translate-y-1/2 rounded-full bg-red-500 ring-2 ring-white"
                        :style="progressDotStyle(detail, barStyle)"
                      ></span>
                      <span class="absolute inset-0 z-0 rounded-full bg-red-200"></span>
                      <span
                        class="absolute inset-y-0 left-0 z-[1] rounded-full bg-red-500 transition group-hover:h-1.5"
                        :style="progressBarStyle(detail, barStyle)"
                      ></span>
                    </div>
                  </div>

                  <div
                    v-if="!item.details || !item.details.length"
                    class="relative flex border-b border-forena-50"
                    :style="{ height: monthlyDetailRowHeight() + 'px' }"
                  >
                    <div
                      v-for="day in monthMeta.days"
                      :key="day.date"
                      class="flex-1 border-r border-forena-50"
                      :class="monthlyDayCellClass(day)"
                    ></div>
                  </div>
                </template>
              </template>
            </template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
