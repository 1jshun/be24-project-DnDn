<script setup>
import { AlertTriangle, CheckCircle2, FileCheck2, Trash2, X } from 'lucide-vue-next'

defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  category: {
    type: String,
    default: '',
  },
  fileName: {
    type: String,
    default: '',
  },
  rows: {
    type: Array,
    default: () => [],
  },
  stats: {
    type: Object,
    default: () => ({
      total: 0,
      ok: 0,
      warnings: 0,
      errors: 0,
    }),
  },
})

defineEmits(['cancel', 'confirm', 'fix-row', 'remove-row'])
</script>

<template>
  <transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      @click.self="$emit('cancel')"
    >
      <div
        class="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div class="flex shrink-0 items-start justify-between border-b border-forena-100 px-6 py-4">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-flare-50">
              <FileCheck2 class="h-5 w-5 text-flare-600" />
            </div>
            <div>
              <p class="text-base font-bold text-forena-900">{{ category }} 계획서 반영 확인</p>
              <p class="mt-0.5 text-xs text-forena-500">
                <span class="font-semibold text-forena-700">{{ fileName }}</span> 에서 추출한 작업이
                간트차트에 정확히 반영되었는지 확인해주세요.
              </p>
            </div>
          </div>
          <button @click="$emit('cancel')" class="text-slate-400 hover:text-forena-700">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div
          class="grid shrink-0 grid-cols-4 gap-3 border-b border-forena-100 bg-forena-50/40 px-6 py-3"
        >
          <div class="rounded-lg bg-white px-3 py-2 ring-1 ring-forena-100">
            <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">전체</p>
            <p class="mt-0.5 text-xl font-bold tabular-nums text-forena-900">
              {{ stats.total }}
            </p>
          </div>
          <div class="rounded-lg bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
            <p class="text-[10px] font-bold uppercase tracking-wide text-emerald-600">정상</p>
            <p class="mt-0.5 text-xl font-bold tabular-nums text-emerald-700">
              {{ stats.ok }}
            </p>
          </div>
          <div class="rounded-lg bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
            <p class="text-[10px] font-bold uppercase tracking-wide text-amber-600">경고</p>
            <p class="mt-0.5 text-xl font-bold tabular-nums text-amber-700">
              {{ stats.warnings }}
            </p>
          </div>
          <div class="rounded-lg bg-rose-50 px-3 py-2 ring-1 ring-rose-100">
            <p class="text-[10px] font-bold uppercase tracking-wide text-rose-600">오류</p>
            <p class="mt-0.5 text-xl font-bold tabular-nums text-rose-700">
              {{ stats.errors }}
            </p>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <p class="mb-2 text-[11px] font-bold uppercase tracking-wide text-forena-400">
            파싱된 작업 ({{ rows.length }}건)
          </p>
          <div class="overflow-hidden rounded-lg border border-forena-100">
            <table class="w-full text-xs">
              <thead class="bg-forena-50/60 text-forena-500">
                <tr>
                  <th class="px-3 py-2 text-left font-bold">상태</th>
                  <th class="px-3 py-2 text-left font-bold">공정명</th>
                  <th class="px-3 py-2 text-left font-bold">공종</th>
                  <th class="px-3 py-2 text-left font-bold">위치</th>
                  <th class="px-3 py-2 text-left font-bold tabular-nums">시작일</th>
                  <th class="px-3 py-2 text-left font-bold tabular-nums">종료일</th>
                  <th class="px-3 py-2 text-right font-bold">처리</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-forena-100 bg-white">
                <tr
                  v-for="row in rows"
                  :key="row.id"
                  :class="
                    row.issue === 'error'
                      ? 'bg-rose-50/40'
                      : row.issue === 'warning'
                        ? 'bg-amber-50/40'
                        : ''
                  "
                >
                  <td class="px-3 py-2">
                    <span
                      v-if="row.issue === 'error'"
                      class="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700"
                    >
                      <AlertTriangle class="h-3 w-3" /> 오류
                    </span>
                    <span
                      v-else-if="row.issue === 'warning'"
                      class="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
                    >
                      <AlertTriangle class="h-3 w-3" /> 경고
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"
                    >
                      <CheckCircle2 class="h-3 w-3" /> 정상
                    </span>
                  </td>
                  <td class="px-3 py-2 font-semibold text-forena-900">
                    <input
                      v-model="row.name"
                      class="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs hover:border-forena-200 focus:border-flare-400 focus:bg-white focus:outline-none"
                    />
                  </td>
                  <td class="px-3 py-2 text-forena-600">
                    <input
                      v-model="row.trade"
                      class="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs hover:border-forena-200 focus:border-flare-400 focus:bg-white focus:outline-none"
                    />
                  </td>
                  <td class="px-3 py-2 text-forena-600">
                    <input
                      v-model="row.location"
                      class="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs hover:border-forena-200 focus:border-flare-400 focus:bg-white focus:outline-none"
                    />
                  </td>
                  <td class="px-3 py-2 tabular-nums">
                    <input
                      v-model="row.start"
                      type="date"
                      class="rounded border px-1 py-0.5 text-[11px]"
                      :class="!row.start ? 'border-rose-300 bg-rose-50' : 'border-forena-200'"
                    />
                  </td>
                  <td class="px-3 py-2 tabular-nums">
                    <input
                      v-model="row.end"
                      type="date"
                      class="rounded border px-1 py-0.5 text-[11px]"
                      :class="!row.end ? 'border-rose-300 bg-rose-50' : 'border-forena-200'"
                    />
                  </td>
                  <td class="px-3 py-2 text-right">
                    <button
                      v-if="row.issue"
                      @click="$emit('fix-row', row)"
                      class="rounded-md bg-flare-50 px-2 py-1 text-[10px] font-bold text-flare-700 ring-1 ring-flare-200 hover:bg-flare-100"
                    >
                      자동 수정
                    </button>
                    <button
                      @click="$emit('remove-row', row)"
                      class="ml-1 rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p
            v-if="stats.errors > 0"
            class="mt-3 flex items-center gap-1.5 text-[11px] text-rose-600"
          >
            <AlertTriangle class="h-3.5 w-3.5" />
            오류 {{ stats.errors }}건이 있습니다. 자동 수정 또는 직접 수정 후 반영해주세요.
          </p>
        </div>

        <div
          class="flex shrink-0 items-center justify-end gap-2 border-t border-forena-100 bg-forena-50/40 px-6 py-3"
        >
          <button
            @click="$emit('cancel')"
            class="rounded-lg border border-forena-200 bg-white px-4 py-2 text-xs font-semibold text-forena-700 hover:bg-forena-50"
          >
            취소
          </button>
          <button
            @click="$emit('confirm')"
            :disabled="stats.errors > 0"
            class="inline-flex items-center gap-1.5 rounded-lg bg-flare-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-flare-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <CheckCircle2 class="h-3.5 w-3.5" />
            간트차트에 반영
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
