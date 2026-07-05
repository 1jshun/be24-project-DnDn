<script setup>
import { AlertTriangle, GitBranch } from 'lucide-vue-next'

defineProps({
  projectInfo: { type: Object, required: true },
  validationCounts: { type: Object, required: true },
  taskCount: { type: Number, default: 0 },
})
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
    <!-- 계획 공정률 — 핵심 강조 -->
    <div
      class="rounded-2xl border border-forena-200 bg-gradient-to-br from-white to-forena-50/40 p-4 shadow-card"
    >
      <p class="text-[11px] font-bold uppercase tracking-wider text-forena-500">계획 공정률</p>
      <p class="mt-1.5 text-3xl font-bold tabular-nums text-forena-900">
        {{ projectInfo.plannedProgress }}<span class="text-base text-forena-500">%</span>
      </p>
      <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-forena-100">
        <div
          class="h-full rounded-full bg-forena-700"
          :style="{ width: projectInfo.plannedProgress + '%' }"
        />
      </div>
    </div>
    <!-- 실제 공정률 — 핵심 강조 -->
    <div
      class="rounded-2xl border border-flare-200 bg-gradient-to-br from-white to-flare-50/40 p-4 shadow-card"
    >
      <p class="text-[11px] font-bold uppercase tracking-wider text-flare-600">실제 공정률</p>
      <p class="mt-1.5 text-3xl font-bold tabular-nums text-flare-700">
        {{ projectInfo.actualProgress }}<span class="text-base">%</span>
      </p>
      <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-flare-100">
        <div
          class="h-full rounded-full bg-flare-500"
          :style="{ width: projectInfo.actualProgress + '%' }"
        />
      </div>
      <p
        class="mt-1 text-[10px] tabular-nums"
        :class="
          projectInfo.actualProgress < projectInfo.plannedProgress
            ? 'text-rose-600'
            : 'text-emerald-600'
        "
      >
        계획 대비 {{ projectInfo.actualProgress < projectInfo.plannedProgress ? '-' : '+'
        }}{{ Math.abs(projectInfo.actualProgress - projectInfo.plannedProgress) }}%
      </p>
    </div>
    <!-- 지연 위험 — 경고성 -->
    <div
      class="rounded-2xl border p-4 shadow-card"
      :class="
        validationCounts.delayed
          ? 'border-amber-200 bg-amber-50/40'
          : 'border-forena-100/90 bg-white/95'
      "
    >
      <p
        class="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
        :class="validationCounts.delayed ? 'text-amber-700' : 'text-forena-500'"
      >
        <AlertTriangle v-if="validationCounts.delayed" class="h-3 w-3" />
        지연 위험
      </p>
      <p
        class="mt-1.5 text-3xl font-bold tabular-nums"
        :class="validationCounts.delayed ? 'text-amber-700' : 'text-forena-900'"
      >
        {{ validationCounts.delayed
        }}<span class="text-sm font-normal text-slate-400 ml-1">건</span>
      </p>
      <p class="mt-1 text-[10px] text-forena-400">전체 {{ taskCount }}건</p>
    </div>
    <!-- 변경 요청 대기 — 경고성 -->
    <div
      class="rounded-2xl border p-4 shadow-card"
      :class="
        validationCounts.pendingChanges
          ? 'border-flare-200 bg-flare-50/40'
          : 'border-forena-100/90 bg-white/95'
      "
    >
      <p
        class="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
        :class="validationCounts.pendingChanges ? 'text-flare-700' : 'text-forena-500'"
      >
        <GitBranch v-if="validationCounts.pendingChanges" class="h-3 w-3" />
        변경 요청 대기
      </p>
      <p
        class="mt-1.5 text-3xl font-bold tabular-nums"
        :class="validationCounts.pendingChanges ? 'text-flare-700' : 'text-forena-900'"
      >
        {{ validationCounts.pendingChanges
        }}<span class="text-sm font-normal text-slate-400 ml-1">건</span>
      </p>
    </div>
    <!-- 보할 합계 -->
    <div
      class="rounded-2xl border p-4 shadow-card"
      :class="
        validationCounts.weightSum === 100
          ? 'border-forena-100/90 bg-white/95'
          : 'border-amber-200 bg-amber-50/40'
      "
    >
      <p class="text-[11px] font-bold uppercase tracking-wider text-forena-500">보할 합계</p>
      <p
        class="mt-1.5 text-3xl font-bold tabular-nums"
        :class="validationCounts.weightSum === 100 ? 'text-emerald-600' : 'text-amber-700'"
      >
        {{ validationCounts.weightSum }}<span class="text-base">%</span>
      </p>
      <p
        class="mt-1 text-[10px]"
        :class="validationCounts.weightSum === 100 ? 'text-emerald-500' : 'text-amber-500'"
      >
        {{ validationCounts.weightSum === 100 ? '정상 (100%)' : '100% 권장' }}
      </p>
    </div>
  </div>
</template>
