<script setup>
import {
  AlertTriangle,
  CalendarPlus,
  CalendarRange,
  ClipboardList,
  MapPin,
  Users,
  Wrench,
  X,
} from 'lucide-vue-next'
import { displayWorkTime, statusClass, workPlanStatus } from '@/utils/schedule/workPlan.js'

defineProps({
  plan: {
    type: Object,
    required: true,
  },
  extension: {
    type: Object,
    default: null,
  },
  monthlyPlanName: {
    type: String,
    default: '-',
  },
  monthlyPlanPeriod: {
    type: String,
    default: '',
  },
})

defineEmits(['close'])
</script>

<template>
  <div
    class="flex items-center justify-between border-b border-forena-100 bg-forena-50/60 px-4 py-2.5"
  >
    <p class="text-sm font-bold text-forena-900">작업 상세</p>
    <button @click="$emit('close')">
      <X class="h-4 w-4 text-slate-400 hover:text-forena-700" />
    </button>
  </div>

  <div class="p-5">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <p class="text-lg font-bold text-forena-900">{{ plan.name }}</p>
        <p class="mt-0.5 text-xs text-forena-400">
          {{ plan.trade }} · {{ plan.start }} ~ {{ plan.end }}
        </p>
      </div>
      <span
        v-if="!plan.__baseline"
        class="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold"
        :class="statusClass(workPlanStatus(plan))"
        >{{ workPlanStatus(plan) }}</span
      >
      <span
        v-else
        class="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200"
      >
        기준 일정
      </span>
    </div>

    <div
      v-if="plan.__baseline"
      class="mb-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3"
    >
      <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
      <div class="text-[12px] leading-5 text-blue-800">
        <p class="font-bold">전체 공정표 기준 일정입니다</p>
        <p class="mt-0.5 text-blue-700">
          이 일정은 최초 공정표에서 생성된 기준 데이터로, 화면에서 직접 수정할 수 없습니다. 실행
          일정을 조정하려면 하위의 빨간 실행/진행선(연간/월간 작업계획)을 선택해 주세요.
          <span v-if="plan.weightPct != null">· 보할율 {{ plan.weightPct }}%</span>
        </p>
      </div>
    </div>

    <template v-if="!plan.__baseline">
      <div
        v-if="plan.planType === '주간'"
        class="mb-4 rounded-xl border border-forena-100 bg-white p-3.5"
      >
        <div class="mb-3 flex items-center gap-1.5">
          <ClipboardList class="h-3.5 w-3.5 text-flare-600" />
          <span class="text-[11px] font-bold uppercase tracking-wide text-forena-400"
            >세부 계획서 정보</span
          >
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-lg bg-forena-50/60 px-3 py-2">
            <p class="text-[10px] font-bold text-forena-400">협력사</p>
            <p class="mt-1 text-sm font-semibold text-forena-900">
              {{ plan.partner || '-' }}
            </p>
          </div>
          <div class="rounded-lg bg-forena-50/60 px-3 py-2">
            <p class="text-[10px] font-bold text-forena-400">담당자</p>
            <p class="mt-1 text-sm font-semibold text-forena-900">
              {{ plan.manager || '-' }}
            </p>
          </div>
          <div class="rounded-lg bg-forena-50/60 px-3 py-2">
            <p class="text-[10px] font-bold text-forena-400">연락처</p>
            <p class="mt-1 text-sm font-semibold text-forena-900">
              {{ plan.contact || '-' }}
            </p>
          </div>
          <div class="rounded-lg bg-forena-50/60 px-3 py-2">
            <p class="text-[10px] font-bold text-forena-400">월간 세부계획</p>
            <p class="mt-1 text-sm font-semibold text-forena-900">
              {{ monthlyPlanName }}
            </p>
            <p v-if="monthlyPlanPeriod" class="mt-0.5 text-[11px] tabular-nums text-forena-500">
              {{ monthlyPlanPeriod }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="extension"
        class="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5"
      >
        <CalendarPlus class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div class="flex-1">
          <p class="text-xs font-bold text-emerald-700">공정 분석을 통한 일정 연장</p>
          <p class="mt-1 text-[11px] text-emerald-800">
            종료일 <span class="font-bold tabular-nums">{{ plan.end }}</span> →
            <span class="font-bold tabular-nums">{{ extension.extendedEnd }}</span>
            (+{{ extension.addedDays }}일)
          </p>
          <p v-if="extension.reason" class="mt-1 text-[11px] leading-relaxed text-emerald-700/80">
            {{ extension.reason }}
          </p>
          <p class="mt-1 text-[10px] text-emerald-600">반영 {{ extension.decidedAt }}</p>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-forena-100 bg-forena-50/40 p-3.5">
          <div class="mb-2 flex items-center gap-1.5">
            <MapPin class="h-3.5 w-3.5 text-flare-600" />
            <span class="text-[11px] font-bold uppercase tracking-wide text-forena-400"
              >작업 위치</span
            >
          </div>
          <p class="text-sm font-semibold text-forena-900">
            {{ plan.location || '위치 미지정' }}
          </p>
        </div>

        <div class="rounded-xl border border-forena-100 bg-forena-50/40 p-3.5">
          <div class="mb-2 flex items-center gap-1.5">
            <CalendarRange class="h-3.5 w-3.5 text-flare-600" />
            <span class="text-[11px] font-bold uppercase tracking-wide text-forena-400"
              >작업 시간</span
            >
          </div>
          <p class="text-sm font-semibold tabular-nums text-forena-900">
            {{ displayWorkTime(plan) }}
          </p>
        </div>

        <div class="rounded-xl border border-forena-100 bg-forena-50/40 p-3.5">
          <div class="mb-2 flex items-center gap-1.5">
            <Users class="h-3.5 w-3.5 text-flare-600" />
            <span class="text-[11px] font-bold uppercase tracking-wide text-forena-400"
              >필요 인원</span
            >
          </div>
          <ul v-if="plan.workers && plan.workers.length" class="space-y-1">
            <li
              v-for="(worker, index) in plan.workers"
              :key="index"
              class="flex items-baseline justify-between text-sm"
            >
              <span class="font-semibold text-forena-900">{{ worker.trade }}</span>
              <span class="tabular-nums text-forena-700">{{ worker.count }}명</span>
            </li>
          </ul>
          <p v-else class="text-sm font-bold text-forena-900">
            <span class="mr-1 text-flare-700">[{{ plan.trade }}]</span>
            {{ plan.requiredCount || 0 }}명
          </p>

          <div
            v-if="plan.requiredCount"
            class="mt-2 flex items-baseline justify-between border-t border-forena-100 pt-1.5"
          >
            <span class="text-[10px] font-bold uppercase text-forena-400">합계</span>
            <span class="text-xs font-bold tabular-nums text-flare-700"
              >{{ plan.requiredCount }}명</span
            >
          </div>
        </div>

        <div class="rounded-xl border border-forena-100 bg-forena-50/40 p-3.5">
          <div class="mb-2 flex items-center gap-1.5">
            <Wrench class="h-3.5 w-3.5 text-flare-600" />
            <span class="text-[11px] font-bold uppercase tracking-wide text-forena-400"
              >필요 장비</span
            >
          </div>

          <div v-if="plan.equipmentDisplay" class="flex flex-wrap gap-2">
            <span class="text-xs font-semibold text-forena-700">
              {{ plan.equipmentDisplay }}
            </span>
          </div>

          <div v-else-if="plan.equipment && plan.equipment.length" class="flex flex-wrap gap-2">
            <span
              v-for="(equipment, index) in plan.equipment"
              :key="index"
              class="text-xs font-semibold text-forena-700"
            >
              {{ equipment.type }} {{ equipment.count }}대
            </span>
          </div>

          <div v-else class="text-[11px] italic text-slate-400">등록된 장비 정보가 없습니다.</div>
        </div>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div class="rounded-xl border border-forena-100 bg-white p-4 shadow-sm">
          <p
            class="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-forena-400"
          >
            <ClipboardList class="h-3.5 w-3.5 text-forena-500" /> 작업 상세 내역
          </p>
          <div class="min-h-[80px] rounded-lg bg-slate-50 p-3">
            <p class="whitespace-pre-wrap text-xs leading-relaxed text-forena-800">
              {{ plan.note || plan.name + ' 공정 진행' }}
            </p>
          </div>
        </div>

        <div class="rounded-xl border border-rose-100 bg-rose-50/30 p-4 shadow-sm">
          <p
            class="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-500"
          >
            <AlertTriangle class="h-3.5 w-3.5 text-rose-500" /> 안전 유의사항
          </p>
          <div class="min-h-[80px] rounded-lg border border-rose-100 bg-white p-3">
            <p class="whitespace-pre-wrap text-xs leading-relaxed text-rose-800">
              추락/낙하/화재 등 위험요인 사전 점검 및 안전조치 철저. (지시서 및 일일 TBM 준수)
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
