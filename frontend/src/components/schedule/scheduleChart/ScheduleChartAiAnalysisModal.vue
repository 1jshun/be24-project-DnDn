<script setup>
import { BrainCircuit, Search, X } from 'lucide-vue-next'

defineProps({
  aiTasks: { type: Array, required: true },
  filteredTasks: { type: Array, required: true },
  searchKey: { type: String, default: '' },
  filterGroup: { type: String, default: '' },
  filterReview: { type: String, default: '' },
  filterCp: { type: String, default: '' },
  selectedTaskId: { type: [Number, String], default: null },
  isConfirmed: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
  confidenceClass: { type: Function, required: true },
  reviewStatusClass: { type: Function, required: true },
})

const emit = defineEmits([
  'close',
  'update-search-key',
  'update-filter-group',
  'update-filter-review',
  'update-filter-cp',
  'bulk-approve',
  'bulk-exclude',
])
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    @click.self="emit('close')"
  >
    <div
      class="flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      style="max-height: 90vh"
    >
      <!-- 모달 헤더 -->
      <div class="flex flex-wrap items-center gap-3 border-b border-forena-100 px-6 py-4">
        <BrainCircuit class="h-4 w-4 text-flare-600 shrink-0" />
        <h3 class="text-sm font-bold text-forena-900">AI 분석 결과 — 검토 테이블</h3>
        <span class="rounded-md bg-forena-100 px-1.5 py-0.5 text-[10px] font-bold text-forena-600"
          >{{ filteredTasks.length }}건</span
        >
        <span
          v-if="isConfirmed"
          class="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200"
          >확정 — 직접 수정 불가</span
        >

        <!-- 필터 영역 -->
        <div class="ml-auto flex flex-wrap items-center gap-2">
          <div class="relative">
            <Search class="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-forena-400" />
            <input
              :value="searchKey"
              @input="emit('update-search-key', $event.target.value)"
              type="text"
              placeholder="작업/공종 검색"
              class="w-40 rounded-lg border border-forena-200 bg-white pl-7 pr-2 py-1.5 text-xs outline-none focus:border-flare-400"
            />
          </div>
          <select
            :value="filterGroup"
            @change="emit('update-filter-group', $event.target.value)"
            class="rounded-lg border border-forena-200 bg-white px-2 py-1.5 text-xs outline-none"
          >
            <option value="">전체 공종</option>
            <option v-for="g in [...new Set(aiTasks.map((t) => t.group))]" :key="g">
              {{ g }}
            </option>
          </select>
          <select
            :value="filterReview"
            @change="emit('update-filter-review', $event.target.value)"
            class="rounded-lg border border-forena-200 bg-white px-2 py-1.5 text-xs outline-none"
          >
            <option value="">전체 상태</option>
            <option>미검토</option>
            <option>검토 중</option>
            <option>승인</option>
            <option>수정 요청</option>
            <option>제외</option>
          </select>
          <select
            :value="filterCp"
            @change="emit('update-filter-cp', $event.target.value)"
            class="rounded-lg border border-forena-200 bg-white px-2 py-1.5 text-xs outline-none"
          >
            <option value="">CP 전체</option>
            <option value="cp">CP만</option>
            <option value="noncp">CP 제외</option>
          </select>
          <div v-if="canEdit && !isConfirmed" class="flex gap-1">
            <button
              @click="emit('bulk-approve')"
              class="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
            >
              일괄 승인
            </button>
            <button
              @click="emit('bulk-exclude')"
              class="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
            >
              일괄 제외
            </button>
          </div>
          <button @click="emit('close')" class="ml-1 rounded-lg p-1 hover:bg-forena-50">
            <X class="h-4 w-4 text-slate-400 hover:text-forena-700" />
          </button>
        </div>
      </div>

      <!-- 테이블 본문 (스크롤) -->
      <div class="overflow-auto flex-1">
        <table class="w-full min-w-[1100px] text-xs">
          <thead
            class="sticky top-0 bg-forena-50/95 text-[10px] font-bold uppercase text-forena-500 shadow-sm"
          >
            <tr>
              <th class="w-8 px-3 py-2.5"><input type="checkbox" disabled /></th>
              <th class="px-3 py-2.5 text-center">공종</th>
              <th class="px-3 py-2.5 text-center">작업명</th>
              <th class="px-3 py-2.5 text-center">시작일</th>
              <th class="px-3 py-2.5 text-center">종료일</th>
              <th class="px-3 py-2.5 text-center">기간</th>
              <th class="px-3 py-2.5 text-center">선행</th>
              <th class="px-3 py-2.5 text-center">후속</th>
              <th class="px-3 py-2.5 text-center">CP</th>
              <th class="px-3 py-2.5 text-center">보할</th>
              <th class="px-3 py-2.5 text-center">신뢰도</th>
              <th class="px-3 py-2.5 text-center">상태</th>
              <th class="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-forena-50">
            <tr
              v-for="t in filteredTasks"
              :key="t.id"
              class="cursor-pointer transition hover:bg-forena-50/40"
              :class="selectedTaskId === t.id ? 'bg-flare-50/50' : ''"
            >
              <td class="px-5 py-2" @click.stop>
                <input type="checkbox" v-model="t.checked" :disabled="isConfirmed" />
              </td>
              <td class="px-3 py-2 text-center">
                <p class="font-semibold text-forena-700">{{ t.group }}</p>
                <p class="text-[10px] text-slate-400">{{ t.sub }}</p>
              </td>
              <td class="px-3 py-2 text-center font-semibold text-forena-900">{{ t.name }}</td>
              <td class="px-3 py-2 text-center tabular-nums text-slate-600">{{ t.start }}</td>
              <td class="px-3 py-2 text-center tabular-nums text-slate-600">{{ t.end }}</td>
              <td class="px-3 py-2 text-center tabular-nums text-slate-500">{{ t.durDays }}일</td>
              <td class="px-3 py-2 text-center text-[11px] text-slate-500">
                {{ t.prev || '-' }}
              </td>
              <td class="px-3 py-2 text-center text-[11px] text-slate-500">
                {{ t.next || '-' }}
              </td>
              <td class="px-3 py-2 text-center">
                <span
                  v-if="t.isCritical"
                  class="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700"
                  >CP</span
                >
                <span v-else class="text-slate-300">—</span>
              </td>
              <td class="px-3 py-2 text-center tabular-nums font-bold text-forena-700">
                {{ t.weight }}%
              </td>
              <td
                class="px-3 py-2 text-center tabular-nums font-bold"
                :class="confidenceClass(t.confidence)"
              >
                {{ t.confidence }}%
              </td>
              <td class="px-3 py-2 flex items-center justify-center">
                <span
                  class="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                  :class="reviewStatusClass(t.reviewStatus)"
                  >{{ t.reviewStatus }}</span
                >
              </td>
            </tr>
            <tr v-if="!filteredTasks.length">
              <td colspan="13" class="px-3 py-12 text-center text-sm text-slate-400">
                조회된 작업이 없습니다.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 모달 푸터 -->
      <div class="flex items-center justify-between border-t border-forena-100 px-6 py-3">
        <p class="text-[11px] text-forena-400">
          전체 {{ aiTasks.length }}건 중 {{ filteredTasks.length }}건 표시
        </p>
        <button
          @click="emit('close')"
          class="rounded-lg border border-forena-200 bg-white px-4 py-2 text-xs font-bold text-forena-700 hover:bg-forena-50"
        >
          닫기
        </button>
      </div>
    </div>
  </div>

  <!-- ============================================================ -->
  <!-- 모달: 기준 공정표 확정 — 검증 미리보기                          -->
</template>
