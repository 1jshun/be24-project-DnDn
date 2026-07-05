<script setup>
import {
  BrainCircuit,
  CheckCircle2,
  Clock,
  FilePlus2,
  FileText,
  MoveRight,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from 'lucide-vue-next'

defineProps({
  firstSetup: { type: Object, required: true },
  setupReady: { type: Boolean, default: false },
  setupAnalyzing: { type: Boolean, default: false },
  setupDone: { type: Boolean, default: false },
})

const emit = defineEmits(['exit', 'drop-file', 'pick-file', 'clear-file', 'run-analysis'])

function fmtFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div class="space-y-5">
    <!-- 안내 헤더 -->
    <div
      class="overflow-hidden rounded-2xl border border-flare-200 bg-gradient-to-br from-flare-50/70 to-white p-6 shadow-card"
    >
      <div class="flex items-start gap-4">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-flare-500/10 ring-1 ring-flare-300"
        >
          <FilePlus2 class="h-6 w-6 text-flare-600" />
        </div>
        <div class="flex-1">
          <p class="text-[11px] font-bold uppercase tracking-wider text-flare-600">
            공정표 최초 세팅
          </p>
          <h2 class="mt-1 text-lg font-bold text-forena-900">아직 등록된 공정표가 없습니다</h2>
          <p class="mt-1.5 text-xs leading-relaxed text-forena-600">
            현장의 공정 일정을 시작하려면 마스터 공정표 · 마일스톤 공정표 · 공종별 시공계획서를
            차례로 등록해주세요. 업로드 후 AI 분석을 통해 공정 데이터가 생성되며 전체 공정표 화면이
            활성화됩니다.
          </p>

          <!-- 단계 흐름 -->
          <div class="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
            <div
              class="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 ring-1 ring-flare-200"
            >
              <span
                class="flex h-5 w-5 items-center justify-center rounded-full bg-flare-500 text-[10px] font-bold text-white"
                >1</span
              >
              <span class="font-bold text-forena-800">문서 업로드</span>
            </div>
            <MoveRight class="h-3.5 w-3.5 text-flare-400" />
            <div
              class="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 ring-1 ring-forena-200"
            >
              <span
                class="flex h-5 w-5 items-center justify-center rounded-full bg-forena-300 text-[10px] font-bold text-white"
                >2</span
              >
              <span class="font-bold text-forena-700">AI 분석</span>
            </div>
            <MoveRight class="h-3.5 w-3.5 text-flare-400" />
            <div
              class="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 ring-1 ring-forena-200"
            >
              <span
                class="flex h-5 w-5 items-center justify-center rounded-full bg-forena-300 text-[10px] font-bold text-white"
                >3</span
              >
              <span class="font-bold text-forena-700">공정 데이터 생성</span>
            </div>
            <MoveRight class="h-3.5 w-3.5 text-flare-400" />
            <div
              class="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 ring-1 ring-forena-200"
            >
              <span
                class="flex h-5 w-5 items-center justify-center rounded-full bg-forena-300 text-[10px] font-bold text-white"
                >4</span
              >
              <span class="font-bold text-forena-700">전체 공정표 확인</span>
            </div>
          </div>
        </div>
        <button
          @click="emit('exit')"
          class="shrink-0 rounded-lg border border-forena-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-forena-600 hover:bg-forena-50"
        >
          건너뛰기
        </button>
      </div>
    </div>

    <!-- 3개 업로드 카드 -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="(doc, key) in firstSetup"
        :key="key"
        class="overflow-hidden rounded-2xl border bg-white shadow-card transition"
        :class="doc.status === 'done' ? 'border-emerald-300' : 'border-forena-200'"
      >
        <!-- 카드 헤더 -->
        <div class="flex items-center justify-between border-b border-forena-100 px-4 py-3">
          <div class="flex items-center gap-2">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg"
              :class="doc.status === 'done' ? 'bg-emerald-50' : 'bg-flare-50'"
            >
              <FileText
                class="h-4 w-4"
                :class="doc.status === 'done' ? 'text-emerald-600' : 'text-flare-600'"
              />
            </div>
            <p class="text-sm font-bold text-forena-900">{{ doc.name }}</p>
          </div>
          <span
            class="rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1"
            :class="
              doc.status === 'done'
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : doc.status === 'uploading'
                  ? 'bg-amber-50 text-amber-700 ring-amber-200'
                  : 'bg-slate-100 text-slate-500 ring-slate-200'
            "
          >
            {{
              doc.status === 'done'
                ? '업로드 완료'
                : doc.status === 'uploading'
                  ? '업로드 중...'
                  : '대기'
            }}
          </span>
        </div>

        <div class="p-4">
          <p class="text-[11px] leading-relaxed text-forena-500">{{ doc.desc }}</p>

          <!-- 드래그 앤 드롭 / 클릭 영역 -->
          <div
            v-if="!doc.file"
            class="mt-3 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-forena-200 bg-forena-50/30 px-4 py-6 text-center transition hover:border-flare-300 hover:bg-flare-50/30"
            @dragover.prevent
            @drop.prevent="emit('drop-file', key, $event)"
          >
            <Upload class="h-6 w-6 text-forena-300" />
            <p class="text-[11px] font-semibold text-forena-600">파일을 끌어다 놓거나 클릭</p>
            <p class="text-[10px] text-forena-400">Excel · PDF · Word · HWP</p>
            <label
              class="cursor-pointer rounded-lg bg-forena-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-forena-900"
            >
              파일 선택
              <input
                type="file"
                class="sr-only"
                accept=".xlsx,.xls,.pdf,.doc,.docx,.hwp"
                @change="emit('pick-file', key, $event)"
              />
            </label>
          </div>

          <!-- 업로드된 파일 -->
          <div
            v-else
            class="mt-3 flex items-center gap-2 rounded-lg border bg-white p-2.5"
            :class="doc.status === 'done' ? 'border-emerald-200' : 'border-forena-200'"
          >
            <FileText
              class="h-4 w-4 shrink-0"
              :class="doc.status === 'done' ? 'text-emerald-600' : 'text-flare-600'"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-[11px] font-bold text-forena-800">{{ doc.file.name }}</p>
              <p class="text-[10px] tabular-nums text-forena-400">
                {{ fmtFileSize(doc.file.size) }}
              </p>
            </div>
            <CheckCircle2 v-if="doc.status === 'done'" class="h-4 w-4 shrink-0 text-emerald-500" />
            <RefreshCw
              v-else-if="doc.status === 'uploading'"
              class="h-4 w-4 shrink-0 animate-spin text-amber-500"
            />
            <button
              @click="emit('clear-file', key)"
              class="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- AI 분석 실행 + 진행 상태 -->
    <div class="overflow-hidden rounded-2xl border border-forena-200 bg-white p-5 shadow-card">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-flare-50">
          <BrainCircuit class="h-5 w-5 text-flare-600" />
        </div>
        <div class="flex-1">
          <p class="text-sm font-bold text-forena-900">AI 분석 실행</p>
          <p class="mt-0.5 text-[11px] text-forena-500">
            <span v-if="setupDone" class="font-bold text-emerald-600"
              >분석 완료 — 공정 데이터 생성됨. 전체 공정표로 이동합니다...</span
            >
            <span v-else-if="setupAnalyzing" class="font-bold text-flare-600"
              >AI가 문서를 분석하고 있습니다...</span
            >
            <span v-else-if="setupReady"
              >3개 문서 모두 업로드됨. AI 분석을 시작할 수 있습니다.</span
            >
            <span v-else>3개 문서를 모두 업로드하면 AI 분석을 시작할 수 있습니다.</span>
          </p>
        </div>
        <button
          @click="emit('run-analysis')"
          :disabled="!setupReady || setupAnalyzing || setupDone"
          class="inline-flex items-center gap-1.5 rounded-lg bg-flare-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-flare-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Sparkles class="h-3.5 w-3.5" />
          {{ setupAnalyzing ? '분석 중...' : setupDone ? '완료' : 'AI 분석 시작' }}
        </button>
      </div>

      <!-- 진행 단계 표시 -->
      <div v-if="setupAnalyzing || setupDone" class="mt-4 grid grid-cols-4 gap-2">
        <div
          v-for="(step, i) in ['문서 인식', '구조 추출', '관계 분석', '공정 생성']"
          :key="i"
          class="rounded-lg border bg-white p-2 text-center"
          :class="
            setupDone || (setupAnalyzing && i < 2)
              ? 'border-emerald-300 bg-emerald-50/40'
              : 'border-forena-100'
          "
        >
          <p
            class="text-[10px] font-bold"
            :class="setupDone || (setupAnalyzing && i < 2) ? 'text-emerald-700' : 'text-forena-400'"
          >
            {{ step }}
          </p>
          <CheckCircle2
            v-if="setupDone || (setupAnalyzing && i < 2)"
            class="mx-auto mt-1 h-3.5 w-3.5 text-emerald-500"
          />
          <RefreshCw
            v-else-if="setupAnalyzing && i === 2"
            class="mx-auto mt-1 h-3.5 w-3.5 animate-spin text-amber-500"
          />
          <Clock v-else class="mx-auto mt-1 h-3.5 w-3.5 text-slate-300" />
        </div>
      </div>
    </div>
  </div>
</template>
