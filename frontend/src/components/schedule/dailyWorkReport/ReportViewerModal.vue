<script setup>
import { AlertTriangle, CheckCircle2, FileText, MapPin, Users, Wrench, X } from 'lucide-vue-next'

defineProps({
  report: { type: Object, default: null },
  isManager: { type: Boolean, default: false },
  formatDate: { type: Function, default: (value) => value },
  formatSize: { type: Function, default: (value) => value },
})

const emit = defineEmits(['approve', 'close', 'reject'])
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
      v-if="report"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      @click.self="emit('close')"
    >
      <div
        class="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div class="flex shrink-0 items-start justify-between border-b border-forena-100 px-6 py-4">
          <div class="flex items-start gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forena-50"
            >
              <FileText class="h-5 w-5 text-forena-700" />
            </div>
            <div>
              <p class="text-base font-bold text-forena-900">{{ report.process }} 공종 공사일보</p>
              <p class="mt-0.5 text-xs text-forena-500">
                {{ formatDate(report.date) }} · 작성자 {{ report.author }}
                <span v-if="report.submittedAt"> · 제출 {{ report.submittedAt }}</span>
              </p>
            </div>
          </div>
          <button @click="emit('close')" class="text-slate-400 hover:text-forena-700">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div class="rounded-xl border border-forena-100 bg-forena-50/40 p-3.5">
              <p
                class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-forena-400"
              >
                <MapPin class="h-3 w-3" />작업 위치
              </p>
              <p class="mt-1 text-sm font-bold text-forena-900">{{ report.location }}</p>
            </div>
            <div class="rounded-xl border border-forena-100 bg-forena-50/40 p-3.5">
              <p
                class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-forena-400"
              >
                <Users class="h-3 w-3" />작업 인력
              </p>
              <p class="mt-1 text-2xl font-bold tabular-nums text-forena-900">
                {{ report.workers }}<span class="text-sm font-normal text-slate-400 ml-1">명</span>
              </p>
            </div>
            <div class="rounded-xl border border-forena-100 bg-forena-50/40 p-3.5">
              <p
                class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-forena-400"
              >
                <Wrench class="h-3 w-3" />중장비
              </p>
              <p class="mt-1 text-2xl font-bold tabular-nums text-forena-900">
                {{ report.equipmentCount
                }}<span class="text-sm font-normal text-slate-400 ml-1">대</span>
              </p>
              <div v-if="report.equipmentList.length" class="mt-1.5 flex flex-wrap gap-1">
                <span
                  v-for="(eq, i) in report.equipmentList"
                  :key="i"
                  class="inline-flex items-center rounded-md bg-forena-50 px-1.5 py-0.5 text-[10px] font-semibold text-forena-700"
                >
                  {{ eq }}
                </span>
              </div>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-3">
            <div class="rounded-xl border border-forena-100 p-3.5">
              <div class="mb-1 flex items-center justify-between">
                <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">
                  금일 진척률
                </p>
                <span class="text-xs font-bold tabular-nums text-flare-700"
                  >{{ report.progress }}%</span
                >
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-forena-100">
                <div
                  class="h-full rounded-full bg-flare-500"
                  :style="{ width: report.progress + '%' }"
                ></div>
              </div>
            </div>
            <div class="rounded-xl border border-forena-100 p-3.5">
              <div class="mb-1 flex items-center justify-between">
                <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">
                  월간 세부계획 진척률
                </p>
                <span class="text-xs font-bold tabular-nums text-flare-700"
                  >{{ report.processProgress }}%</span
                >
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-forena-100">
                <div
                  class="h-full rounded-full bg-flare-500"
                  :style="{ width: report.processProgress + '%' }"
                ></div>
              </div>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3">
            <div class="rounded-xl border border-forena-100 p-3.5">
              <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">
                금일 작업 완료
              </p>
              <p class="mt-1 text-xs leading-relaxed text-forena-800">
                {{ report.todayWork }}
              </p>
            </div>
          </div>

          <div
            v-if="report.notes"
            class="mt-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3.5"
          >
            <p class="text-[10px] font-bold uppercase tracking-wide text-amber-700">특이사항</p>
            <p class="mt-1 text-xs leading-relaxed text-amber-900">{{ report.notes }}</p>
          </div>

          <div
            v-if="report.photos?.length"
            class="mt-3 rounded-xl border border-forena-100 px-4 py-3"
          >
            <p class="text-[10px] font-bold uppercase tracking-wide text-forena-500">현장 사진</p>
            <div class="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              <div
                v-for="photo in report.photos"
                :key="photo.id"
                class="aspect-square overflow-hidden rounded-lg border border-forena-200 bg-white"
              >
                <img :src="photo.dataUrl" :alt="photo.name" class="h-full w-full object-cover" />
              </div>
            </div>
          </div>

          <div
            v-if="report.files?.length"
            class="mt-3 rounded-xl border border-forena-100 px-4 py-3"
          >
            <p class="text-[10px] font-bold uppercase tracking-wide text-forena-500">관련 문서</p>
            <ul class="mt-1.5 space-y-1">
              <li
                v-for="f in report.files"
                :key="f.id"
                class="flex items-center gap-2 text-xs text-forena-800"
              >
                <FileText class="h-3.5 w-3.5 text-forena-400" />
                <span class="flex-1 truncate">{{ f.name }}</span>
                <span class="text-[10px] text-forena-400 tabular-nums">{{
                  formatSize(f.size)
                }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div
          v-if="isManager"
          class="flex shrink-0 items-center justify-end gap-2 border-t border-forena-100 bg-forena-50/40 px-6 py-3"
        >
          <button
            @click="emit('reject')"
            class="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
          >
            <AlertTriangle class="h-3.5 w-3.5" /> 반려
          </button>
          <button
            @click="emit('approve')"
            class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-600"
          >
            <CheckCircle2 class="h-3.5 w-3.5" /> 승인
          </button>
          <button
            @click="emit('close')"
            class="rounded-lg border border-forena-200 bg-white px-4 py-2 text-xs font-semibold text-forena-700 hover:bg-forena-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
