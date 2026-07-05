<script setup>
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Eye,
  FileText,
  MapPin,
  Pencil,
  Wrench,
  X,
} from 'lucide-vue-next'

defineProps({
  viewing: { type: Object, default: null },
  canEdit: { type: Boolean, default: false },
  canReview: { type: Boolean, default: false },
  statusMeta: { type: Function, required: true },
  gateName: { type: Function, default: (value) => value },
  formatSize: { type: Function, default: (value) => value },
})

const emit = defineEmits(['approve', 'close', 'edit', 'reject'])
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
      v-if="viewing"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      @click.self="emit('close')"
    >
      <div
        class="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div
          class="flex shrink-0 items-center justify-between border-b border-forena-100 px-6 py-4"
        >
          <p class="text-sm font-bold text-forena-900">작업 상세</p>
          <div class="flex items-center gap-1">
            <button
              v-if="canEdit"
              @click="emit('edit')"
              class="rounded-md p-1.5 text-forena-500 hover:bg-forena-50 hover:text-forena-800"
              title="수정"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button @click="emit('close')" class="text-slate-400 hover:text-forena-700">
              <X class="h-5 w-5" />
            </button>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div class="flex items-start gap-2">
            <h2 class="text-lg font-bold text-forena-900">{{ viewing.location }}</h2>
            <span
              class="mt-1.5 rounded-md bg-forena-100 px-1.5 py-0.5 text-[10px] font-bold text-forena-700"
              >{{ viewing.process }}</span
            >
          </div>
          <p class="mt-0.5 font-mono text-xs text-forena-500">{{ viewing.id }}</p>

          <div class="mt-2 flex flex-wrap gap-1.5">
            <span
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1"
              :class="statusMeta(viewing.status).cls"
              ><component :is="statusMeta(viewing.status).icon" class="h-3 w-3" />
              {{ viewing.status }}</span
            >
            <span
              class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200"
              >{{ viewing.partner }}</span
            >
          </div>

          <div class="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div class="rounded-xl border border-forena-100 bg-forena-50/40 px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">작업 위치</p>
              <p class="mt-1 flex items-center gap-1 text-sm font-bold text-forena-900">
                <MapPin class="h-3.5 w-3.5 text-flare-600" />{{ viewing.location }}
              </p>
            </div>
            <div class="rounded-xl border border-forena-100 bg-forena-50/40 px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">작업 시간</p>
              <p class="mt-1 text-sm font-bold tabular-nums text-forena-900">
                {{ viewing.workTime }}
              </p>
            </div>
            <div class="rounded-xl border border-forena-100 bg-forena-50/40 px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">필요 인원</p>
              <p class="mt-1 text-2xl font-bold tabular-nums text-forena-900">
                {{ viewing.workers }}<span class="text-sm font-normal text-slate-400 ml-1">명</span>
              </p>
            </div>
            <div class="rounded-xl border border-rose-200 bg-rose-50/40 px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-rose-600">
                작성자 / 작성일
              </p>
              <p class="mt-1 text-sm font-bold text-rose-700">
                {{ viewing.author
                }}<span class="ml-1 text-[11px] font-normal text-rose-500">{{
                  viewing.createdAt
                }}</span>
              </p>
            </div>
          </div>

          <div class="mt-3 rounded-xl border border-forena-100 px-4 py-3">
            <div class="flex items-center justify-between">
              <p class="text-[10px] font-bold uppercase tracking-wide text-forena-500">
                필요 장비 + 게이트
              </p>
              <span v-if="viewing.equipment.length" class="text-[10px] font-bold text-emerald-700"
                >배정 완료</span
              >
            </div>
            <div v-if="viewing.equipment.length" class="mt-2 space-y-1.5">
              <div
                v-for="eq in viewing.equipment"
                :key="eq.id"
                class="flex flex-wrap items-center gap-2 rounded-lg bg-forena-50/60 px-3 py-1.5"
              >
                <Wrench class="h-3.5 w-3.5 text-forena-500" />
                <span class="text-xs font-semibold text-forena-900"
                  >{{ eq.name }} {{ eq.count }}대</span
                >
                <span class="ml-auto inline-flex items-center gap-1 text-[11px] text-forena-700">
                  <span class="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700"
                    >입 · {{ gateName(eq.gateIn) }}</span
                  >
                  <ArrowRightLeft class="h-3 w-3 text-forena-400" />
                  <span class="rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-700"
                    >출 · {{ gateName(eq.gateOut) }}</span
                  >
                </span>
              </div>
            </div>
            <p v-else class="mt-1 text-xs text-slate-400">투입 장비 없음</p>
          </div>

          <div class="mt-3 rounded-xl border border-forena-100 px-4 py-3">
            <p class="text-[10px] font-bold uppercase tracking-wide text-forena-500">
              작업 상세 내역
            </p>
            <p class="mt-1 text-xs leading-relaxed text-forena-800">{{ viewing.workDetail }}</p>
          </div>

          <div
            v-if="viewing.safety"
            class="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3"
          >
            <p class="text-[10px] font-bold uppercase tracking-wide text-amber-700">
              안전 유의사항
            </p>
            <p class="mt-1 text-xs leading-relaxed text-amber-900">{{ viewing.safety }}</p>
          </div>

          <div v-if="viewing.notes" class="mt-3 rounded-xl border border-forena-100 px-4 py-3">
            <p class="text-[10px] font-bold uppercase tracking-wide text-forena-500">특이사항</p>
            <p class="mt-1 text-xs leading-relaxed text-forena-800">{{ viewing.notes }}</p>
          </div>

          <div
            v-if="viewing.files?.length"
            class="mt-3 rounded-xl border border-forena-100 px-4 py-3"
          >
            <p class="text-[10px] font-bold uppercase tracking-wide text-forena-500">관련 문서</p>
            <ul class="mt-1.5 space-y-1">
              <li
                v-for="f in viewing.files"
                :key="f.id"
                class="flex items-center gap-2 text-xs text-forena-800"
              >
                <FileText class="h-3.5 w-3.5 text-forena-400" />
                <span class="flex-1 truncate">{{ f.name }}</span>
                <span class="text-[10px] text-forena-400 tabular-nums">{{
                  formatSize(f.size)
                }}</span>
                <button
                  class="rounded p-1 text-forena-400 hover:bg-forena-50 hover:text-forena-700"
                >
                  <Eye class="h-3.5 w-3.5" />
                </button>
              </li>
            </ul>
          </div>

          <div
            v-if="viewing.photos?.length"
            class="mt-3 rounded-xl border border-forena-100 px-4 py-3"
          >
            <p class="text-[10px] font-bold uppercase tracking-wide text-forena-500">현장 사진</p>
            <div class="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              <div
                v-for="photo in viewing.photos"
                :key="photo.id"
                class="aspect-square overflow-hidden rounded-lg border border-forena-200 bg-white"
              >
                <img :src="photo.dataUrl" :alt="photo.name" class="h-full w-full object-cover" />
              </div>
            </div>
          </div>

          <div
            v-if="viewing.history?.length"
            class="mt-3 rounded-xl border border-forena-100 px-4 py-3"
          >
            <p class="text-[10px] font-bold uppercase tracking-wide text-forena-500">상태 이력</p>
            <ul class="mt-1.5 space-y-1">
              <li
                v-for="(h, i) in viewing.history"
                :key="i"
                class="flex items-center gap-2 text-[11px]"
              >
                <span class="font-mono text-forena-400 tabular-nums">{{ h.at }}</span>
                <span class="text-forena-700">{{ h.who }}</span>
                <span class="rounded bg-forena-50 px-1.5 py-0.5 font-bold text-forena-700">{{
                  h.what
                }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div
          class="flex shrink-0 items-center justify-end gap-2 border-t border-forena-100 bg-white px-6 py-3"
        >
          <button
            v-if="canReview"
            @click="emit('reject')"
            class="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
          >
            <AlertTriangle class="h-3.5 w-3.5" /> 반려
          </button>
          <button
            v-if="canReview"
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
