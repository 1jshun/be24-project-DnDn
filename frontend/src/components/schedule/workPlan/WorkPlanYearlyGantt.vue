<script setup>
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import { GANTT_MONTH_W, NAME_COL_W } from '@/utils/schedule/workPlan.js'

defineProps({
  groups: {
    type: Array,
    default: () => [],
  },
  groupOpen: {
    type: Object,
    required: true,
  },
  yearMeta: {
    type: Object,
    required: true,
  },
  chartWidth: {
    type: String,
    required: true,
  },
  processRowHeight: {
    type: Function,
    required: true,
  },
  yearBarStyle: {
    type: Function,
    required: true,
  },
  workPlanTop: {
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

defineEmits(['toggle-group', 'select-baseline', 'select-work-plan'])
</script>

<template>
  <div class="min-h-0 flex-1 overflow-auto bg-white">
    <div
      v-if="!groups.length"
      class="flex items-center justify-center py-16 text-sm text-slate-400"
    >
      {{ yearMeta.year }}년에 표시할 기준 공정이 없습니다.
    </div>

    <div v-else class="flex min-w-full">
      <div
        class="sticky left-0 z-10 shrink-0 border-r border-forena-200 bg-white"
        :style="{ width: NAME_COL_W + 'px' }"
      >
        <div class="flex h-10 items-center border-b border-forena-200 bg-white px-4">
          <span class="text-[11px] font-bold text-forena-500">공종 / 공정 / 실행위치</span>
        </div>

        <template v-for="group in groups" :key="`y-grp-${group.group}`">
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
            <div
              v-for="item in group.items"
              :key="`y-item-${item.id}`"
              class="flex cursor-pointer flex-col justify-start gap-0.5 overflow-hidden border-b border-forena-100 px-4 py-2 transition hover:bg-forena-50/60"
              :style="{ height: processRowHeight(item) + 'px' }"
            >
              <div class="flex items-center gap-1.5" @click="$emit('select-baseline', item)">
                <p class="truncate text-sm font-bold text-forena-900">{{ item.name }}</p>
                <span
                  v-if="item.weightPct != null"
                  class="rounded bg-blue-50 px-1 py-0.5 text-[9px] font-bold text-blue-700"
                >
                  보할 {{ item.weightPct }}%
                </span>
              </div>
              <p class="truncate text-[10px] text-slate-400">
                기준 {{ item.baselineStart || '-' }} ~ {{ item.baselineEnd || '-' }}
              </p>
              <ul v-if="item.workPlans.length" class="mt-1 space-y-0.5">
                <li
                  v-for="workPlan in item.workPlans"
                  :key="`y-wp-${workPlan.id}`"
                  class="truncate text-[10px] text-red-600 hover:text-red-700"
                  @click.stop="$emit('select-work-plan', workPlan)"
                >
                  └ {{ workPlan.location || workPlan.name }} 실행
                </li>
              </ul>
              <p v-else class="text-[10px] italic text-slate-300">실행 일정 없음</p>
            </div>
          </template>
        </template>
      </div>

      <div class="relative min-w-0 flex-1" :style="{ minWidth: chartWidth, width: '100%' }">
        <div class="sticky top-0 z-[5] flex h-10 border-b border-forena-200 bg-white">
          <div
            v-for="month in yearMeta.months"
            :key="month.month"
            class="flex min-w-0 flex-1 items-center justify-center border-r border-forena-100 text-[11px] font-semibold tabular-nums"
            :class="month.isCurrent ? 'bg-flare-50 text-flare-700' : 'text-forena-500'"
            :style="{ minWidth: GANTT_MONTH_W + 'px' }"
          >
            {{ month.label }}
          </div>
        </div>

        <div class="relative">
          <template v-for="group in groups" :key="`y-grow-${group.group}`">
            <div
              class="h-9 border-b border-forena-200 bg-gradient-to-r from-forena-100 to-forena-50"
            ></div>

            <template v-if="groupOpen[group.group]">
              <div
                v-for="item in group.items"
                :key="`y-row-${item.id}`"
                class="relative flex border-b border-forena-100"
                :style="{ height: processRowHeight(item) + 'px' }"
              >
                <div
                  v-for="month in yearMeta.months"
                  :key="month.month"
                  class="min-w-0 flex-1 border-r border-forena-50"
                  :style="{ minWidth: GANTT_MONTH_W + 'px' }"
                ></div>

                <div
                  v-if="
                    item.baselineStart &&
                    item.baselineEnd &&
                    yearBarStyle(item.baselineStart, item.baselineEnd)
                  "
                  class="group absolute z-[2] flex cursor-pointer items-center"
                  :style="{
                    ...yearBarStyle(item.baselineStart, item.baselineEnd),
                    top: '14px',
                    height: '4px',
                  }"
                  :title="`기준 일정 (수정 불가): ${item.baselineStart} ~ ${item.baselineEnd}`"
                  @click="$emit('select-baseline', item)"
                >
                  <span
                    class="absolute -left-[3px] h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white"
                  ></span>
                  <span
                    class="absolute -right-[3px] h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white"
                  ></span>
                  <span class="h-1 w-full rounded-full bg-blue-600"></span>
                </div>

                <div
                  v-for="(workPlan, index) in item.workPlans"
                  :key="`y-wpbar-${workPlan.id}`"
                  class="group absolute z-[2] cursor-pointer"
                  :style="{
                    ...(yearBarStyle(workPlan.start, workPlan.end) || { display: 'none' }),
                    top: workPlanTop(index) + 'px',
                    height: '4px',
                  }"
                  :title="`${workPlan.name}${workPlan.location ? ' · ' + workPlan.location : ''}\n${workPlan.start} ~ ${workPlan.end}`"
                  @click.stop="$emit('select-work-plan', workPlan)"
                >
                  <span
                    class="absolute -left-[3px] top-1/2 z-[3] h-2 w-2 -translate-y-1/2 rounded-full bg-red-500 ring-2 ring-white"
                  ></span>
                  <span
                    class="absolute -right-[3px] top-1/2 z-[3] h-2 w-2 -translate-y-1/2 rounded-full bg-red-500 ring-2 ring-white"
                  ></span>
                  <span class="absolute inset-0 z-0 rounded-full bg-red-200"></span>
                  <span
                    class="absolute inset-y-0 left-0 z-[1] rounded-full bg-red-500 transition group-hover:h-1.5"
                    :style="progressBarStyle(workPlan, yearBarStyle)"
                  ></span>
                  <span
                    class="absolute top-1/2 z-[4] h-2 w-2 -translate-y-1/2 rounded-full bg-red-500 ring-2 ring-white"
                    :style="progressDotStyle(workPlan, yearBarStyle)"
                  ></span>
                </div>
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
