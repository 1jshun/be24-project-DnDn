<script setup>
import { Truck } from 'lucide-vue-next'

defineProps({
  equipments: {
    type: Array,
    default: () => [],
  },
  hasEquipments: {
    type: Boolean,
    default: false,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <div class="w-full rounded-3xl border border-forena-100 bg-white p-6 shadow-card ring-1 ring-forena-50">
    <div class="flex flex-col gap-3 border-b border-forena-50 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-forena-700 to-forena-900 text-white shadow-md">
          <Truck class="h-5 w-5" />
        </span>
        <div>
          <h2 class="text-lg font-bold text-forena-900">금일 투입 중장비 현황</h2>
          <p class="text-sm text-forena-500">
            작업지시서에 등록된 필요 중장비와 게이트 배정 현황입니다.
          </p>
        </div>
      </div>

      <span
        class="inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ring-1"
        :class="hasEquipments ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-50 text-slate-600 ring-slate-200'"
      >
        {{ hasEquipments ? `${equipments.length}건 연동 완료` : '작업지시서 장비 없음' }}
      </span>
    </div>

    <div v-if="isLoading" class="mt-6 rounded-2xl border border-forena-100 bg-forena-50/50 p-6 text-center text-sm font-semibold text-forena-500">
      작업지시서 장비 데이터를 불러오는 중입니다...
    </div>

    <div
      v-else-if="!hasEquipments"
      class="mt-6 flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-forena-100 bg-forena-50/40 p-8 text-center"
    >
      <Truck class="h-8 w-8 text-forena-300" />
      <p class="mt-3 text-sm font-bold text-forena-900">금일 등록된 중장비 배정이 없습니다.</p>
      <p class="mt-1 text-xs text-forena-500">
        작업지시서에 장비명, 대수, 게이트가 등록되면 이 영역에 자동으로 표시됩니다.
      </p>
    </div>

    <div v-else class="mt-6 overflow-x-auto">
      <table class="min-w-full divide-y divide-forena-100 text-sm">
        <thead>
          <tr class="text-left text-xs font-bold uppercase tracking-[0.18em] text-forena-500">
            <th class="px-4 py-3">장비명 / 유형</th>
            <th class="px-4 py-3">대수</th>
            <th class="px-4 py-3">배정 게이트</th>
            <th class="px-4 py-3">작업 위치</th>
            <th class="px-4 py-3">관련 지시서</th>
            <th class="px-4 py-3">현재 상태</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-forena-50">
          <tr
            v-for="equipment in equipments"
            :key="equipment.id"
            class="transition-colors hover:bg-slate-50/80"
          >
            <td class="px-4 py-4">
              <div class="font-bold text-forena-900">{{ equipment.name }}</div>
              <div class="mt-1 text-xs font-medium text-forena-500">{{ equipment.type }}</div>
            </td>

            <td class="px-4 py-4">
              <span class="inline-flex rounded-full bg-forena-50 px-3 py-1 text-xs font-black text-forena-800 ring-1 ring-forena-100">
                {{ equipment.count }}대
              </span>
            </td>

            <td class="px-4 py-4 font-medium text-forena-700">
              {{ equipment.gate }}
            </td>

            <td class="px-4 py-4">
              <div class="font-semibold text-forena-800">{{ equipment.workLocation }}</div>
              <div class="mt-1 max-w-[360px] truncate text-xs text-forena-500">
                {{ equipment.workDetail }}
              </div>
            </td>

            <td class="px-4 py-4">
              <div class="font-semibold text-sky-700">
                {{ equipment.instruction }}
              </div>
              <div class="mt-1 max-w-[280px] truncate text-xs text-forena-500">
                {{ equipment.title }}
              </div>
            </td>

            <td class="px-4 py-4">
              <span
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold"
                :class="equipment.statusClass"
              >
                {{ equipment.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
