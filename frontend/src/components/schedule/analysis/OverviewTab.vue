<script setup>
import { AlertTriangle, BarChart3, Layers } from 'lucide-vue-next'

defineProps({
  noDataYet: { type: Boolean, default: false },
  groupProgress: { type: Array, default: () => [] },
  selectedTradeId: { type: [String, Number, null], default: null },
  statusColor: { type: Function, required: true },
  riskColor: { type: Function, required: true },
  arcPath: { type: Function, required: true },
})

const emit = defineEmits(['select-trade'])

function selectTrade(tradeId) {
  emit('select-trade', tradeId)
}
</script>

<template>
  <div class="space-y-5">
    <!-- ──────────────────────────────────────────────────────────── -->
    <!-- 🟠 메인 — 공종별 진척률 도넛 차트 그리드                       -->
    <!-- ──────────────────────────────────────────────────────────── -->
    <div
      v-if="!noDataYet"
      class="overflow-hidden rounded-2xl border border-forena-100/90 bg-white/95 p-5 shadow-card"
    >
      <!-- 카드 헤더 -->
      <div class="mb-4 flex flex-wrap items-center gap-2 border-b border-forena-100 pb-3">
        <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-flare-50">
          <BarChart3 class="h-4 w-4 text-flare-600" />
        </div>
        <h2 class="text-sm font-bold text-forena-900">공종별 진척률</h2>
        <span class="hidden text-[11px] text-forena-400 sm:inline"
          >계획 vs 실제 — 도넛 차트로 한눈에 확인</span
        >
        <div class="ml-auto flex items-center gap-3 text-[10px] text-forena-500">
          <span class="inline-flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-full bg-forena-400/60"></span>계획율
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-full bg-flare-500"></span>실제율
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-full bg-rose-500"></span>지연
          </span>
        </div>
      </div>

      <!-- 도넛 그리드: 최대 3열 반응형 -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="g in groupProgress"
          :key="g.id"
          @click="selectTrade(g.id)"
          class="group relative cursor-pointer overflow-hidden rounded-xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
          :class="[
            g.isDelayed ? 'border-rose-200 bg-rose-50/20' : 'border-forena-100',
            selectedTradeId === g.id ? 'ring-2 ring-flare-400' : '',
          ]"
        >
          <!-- 상태 뱃지 -->
          <span
            class="absolute right-3 top-3 rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1"
            :class="statusColor(g.statusLabel)"
          >
            {{ g.statusLabel }}
          </span>

          <!-- 공종명 + 협력사 -->
          <div class="mb-3 pr-16">
            <p class="text-base font-extrabold leading-tight text-forena-900">
              {{ g.group }}
            </p>
            <p class="mt-1 text-[10px] text-forena-400">{{ g.partner || '협력사 미지정' }}</p>
          </div>

          <!-- SVG 도넛 -->
          <div class="flex items-center justify-center py-1">
            <svg viewBox="0 0 100 100" class="h-32 w-32">
              <!-- 배경 트랙 -->
              <circle cx="50" cy="50" r="36" fill="none" stroke="#f1f5f9" stroke-width="10" />
              <!-- 계획율 (반투명 forena 톤) -->
              <path
                v-if="g.plan > 0"
                :d="arcPath(g.plan)"
                fill="none"
                stroke="#94a3b8"
                stroke-opacity="0.5"
                stroke-width="10"
                stroke-linecap="round"
              />
              <!-- 실제율 (정상이면 flare, 지연이면 rose) -->
              <path
                v-if="g.actual > 0"
                :d="arcPath(g.actual)"
                fill="none"
                :stroke="g.isDelayed ? '#f43f5e' : '#f59e0b'"
                stroke-width="10"
                stroke-linecap="round"
              />
              <!-- 중앙 실제율 텍스트 -->
              <text
                x="50"
                y="48"
                text-anchor="middle"
                class="fill-forena-900"
                font-size="18"
                font-weight="700"
              >
                {{ g.actual }}%
              </text>
              <text x="50" y="62" text-anchor="middle" class="fill-forena-400" font-size="8">
                실제율
              </text>
            </svg>
          </div>

          <!-- 하단: 계획 / 실제 / 차이 -->
          <div
            class="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-forena-50/60 p-2 text-center text-[11px]"
          >
            <div>
              <p class="text-forena-500">계획</p>
              <p class="font-bold tabular-nums text-forena-700">{{ g.plan }}%</p>
            </div>
            <div>
              <p class="text-forena-500">실제</p>
              <p
                class="font-bold tabular-nums"
                :class="
                  g.isDelayed ? 'text-rose-600' : g.started ? 'text-emerald-600' : 'text-forena-500'
                "
              >
                {{ g.actual }}%
              </p>
            </div>
            <div>
              <p class="text-forena-500">차이</p>
              <p
                class="font-bold tabular-nums"
                :class="
                  g.diff < 0 ? 'text-rose-600' : g.diff > 0 ? 'text-emerald-600' : 'text-forena-500'
                "
              >
                {{ g.diff > 0 ? '+' : '' }}{{ g.diff }}%
              </p>
            </div>
          </div>

          <!-- 위험도 + 종료 예정 (작게) -->
          <div class="mt-2 flex items-center justify-between text-[10px] text-forena-400">
            <span class="inline-flex items-center gap-1">
              위험도
              <span class="rounded px-1 py-0.5 font-bold" :class="riskColor(g.risk)">{{
                g.risk
              }}</span>
            </span>
            <span class="tabular-nums">~{{ g.forecastEnd || g.plannedEnd || '-' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 데이터 없음 상태 -->
    <div
      v-else
      class="flex h-60 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-forena-200 bg-white text-sm text-forena-400"
    >
      <Layers class="h-8 w-8 text-forena-300" />
      <p>표시할 공정 데이터가 없습니다</p>
      <p class="text-[11px]">필터를 조정하거나 데이터를 다시 불러와주세요</p>
    </div>

    <!-- ──────────────────────────────────────────────────────────── -->
    <!-- 지연 감지 기준 안내 (컴팩트)                                    -->
    <!-- ──────────────────────────────────────────────────────────── -->
    <div v-if="!noDataYet" class="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
      <p class="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
        <AlertTriangle class="h-3.5 w-3.5" /> 지연 감지 기준
      </p>
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-amber-800">
        <span class="flex items-center gap-1">
          <span class="h-1.5 w-1.5 rounded-full bg-amber-400"></span>계획 대비 실제 진척률 차이 10%
          이상
        </span>
        <span class="flex items-center gap-1">
          <span class="h-1.5 w-1.5 rounded-full bg-orange-400"></span>예정 종료일 3일 이내인데 실제
          진척률 70% 미만
        </span>
        <span class="flex items-center gap-1">
          <span class="h-1.5 w-1.5 rounded-full bg-rose-400"></span>선행 공정 지연으로 후속 공정
          영향 발생
        </span>
      </div>
    </div>
  </div>

  <!-- ════════════════════════════════════════════════════════════════ -->
  <!-- TAB 2: 지연 위험 작업                                              -->
  <!-- ════════════════════════════════════════════════════════════════ -->
</template>
