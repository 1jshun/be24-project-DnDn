<script setup>
import {
  BrainCircuit,
  FileSpreadsheet,
  FileText,
  Flag,
  Layers,
  RefreshCw,
  Upload,
  X,
} from 'lucide-vue-next'

defineProps({
  docTypes: {
    type: Array,
    required: true,
  },
  uploads: {
    type: Object,
    required: true,
  },
  colorMap: {
    type: Object,
    required: true,
  },
  getStatusLabel: {
    type: Function,
    required: true,
  },
  getStatusClass: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['drag-over', 'drop-file', 'file-select', 'remove-file', 'run-analysis'])
</script>

<template>
  <div
    class="grid gap-4"
    :class="docTypes.length === 1 ? 'grid-cols-1' : 'md:grid-cols-2 xl:grid-cols-4'"
  >
    <div
      v-for="dt in docTypes"
      :key="dt.key"
      class="overflow-hidden rounded-2xl border bg-white/95 shadow-card flex flex-col transition"
      :class="uploads[dt.key].fileName || !dt.required ? 'border-forena-100/90' : 'border-rose-200'"
    >
      <!-- 카드 헤더 -->
      <div
        class="flex items-center gap-2.5 border-b border-forena-100 px-4 py-3"
        :class="colorMap[dt.color].bg"
      >
        <div
          class="flex h-8 w-8 items-center justify-center rounded-xl"
          :class="
            dt.color === 'blue'
              ? 'bg-sky-100'
              : dt.color === 'amber'
                ? 'bg-amber-100'
                : dt.color === 'violet'
                  ? 'bg-violet-100'
                  : 'bg-emerald-100'
          "
        >
          <FileSpreadsheet
            v-if="dt.icon === 'spreadsheet'"
            class="h-4 w-4"
            :class="colorMap[dt.color].icon"
          />
          <Flag v-else-if="dt.icon === 'flag'" class="h-4 w-4" :class="colorMap[dt.color].icon" />
          <Layers v-else class="h-4 w-4" :class="colorMap[dt.color].icon" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <p class="text-sm font-bold text-forena-900">{{ dt.label }}</p>
            <span
              v-if="dt.required"
              class="rounded bg-rose-100 px-1 py-0.5 text-[9px] font-bold text-rose-600"
              >필수</span
            >
            <span
              v-else
              class="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-500"
              >선택</span
            >
          </div>
        </div>
        <span
          class="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
          :class="getStatusClass(uploads[dt.key].status)"
        >
          {{
            !dt.required && !uploads[dt.key].fileName
              ? '선택'
              : getStatusLabel(uploads[dt.key].status)
          }}
        </span>
      </div>

      <div class="flex flex-1 flex-col p-4 gap-3">
        <p class="text-[11px] leading-relaxed text-forena-500">{{ dt.desc }}</p>

        <!-- 업로드 영역 -->
        <div
          v-if="!uploads[dt.key].fileName"
          class="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition cursor-pointer"
          :class="colorMap[dt.color].dragBorder"
          @dragover="emit('drag-over', $event)"
          @drop="emit('drop-file', dt.key, $event)"
        >
          <Upload class="h-6 w-6 mb-1.5" :class="colorMap[dt.color].icon" />
          <p class="text-xs font-semibold text-forena-700">파일을 끌어다 놓거나</p>
          <label
            class="mt-2 cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-bold text-white transition"
            :class="
              dt.color === 'blue'
                ? 'bg-sky-600 hover:bg-sky-700'
                : dt.color === 'amber'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : dt.color === 'violet'
                    ? 'bg-violet-600 hover:bg-violet-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
            "
          >
            파일 선택
            <input
              type="file"
              class="sr-only"
              :accept="dt.acceptedFormats.join(',')"
              @change="emit('file-select', dt.key, $event)"
            />
          </label>
          <p class="mt-2 text-[11px] text-forena-400">{{ dt.acceptedFormats.join(' · ') }}</p>
        </div>

        <!-- 파일 등록 후 -->
        <div v-else class="rounded-xl border border-forena-100 bg-forena-50/30 p-3">
          <div class="flex items-center gap-2 mb-2">
            <FileText class="h-4 w-4 text-forena-500 shrink-0" />
            <p class="flex-1 min-w-0 truncate text-xs font-semibold text-forena-800">
              {{ uploads[dt.key].fileName }}
            </p>
            <button
              @click="emit('remove-file', dt.key)"
              class="rounded p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>

          <!-- 프로그레스 바 -->
          <div v-if="['uploading', 'analyzing'].includes(uploads[dt.key].status)" class="mb-2">
            <div class="flex items-center justify-between mb-1 text-[10px] text-forena-500">
              <span>{{
                uploads[dt.key].status === 'uploading' ? '업로드 중…' : 'AI 분석 중…'
              }}</span>
              <span class="tabular-nums font-bold"
                >{{ Math.round(uploads[dt.key].progress) }}%</span
              >
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-forena-100">
              <div
                class="h-full rounded-full transition-all duration-300"
                :class="
                  dt.color === 'blue'
                    ? 'bg-sky-500'
                    : dt.color === 'amber'
                      ? 'bg-amber-500'
                      : dt.color === 'violet'
                        ? 'bg-violet-500'
                        : 'bg-emerald-500'
                "
                :style="{ width: uploads[dt.key].progress + '%' }"
              />
            </div>
          </div>

          <!-- 완료 결과 요약 -->
          <div
            v-if="uploads[dt.key].status === 'done' && uploads[dt.key].result"
            class="grid grid-cols-2 gap-1.5 text-[10px]"
          >
            <template v-if="dt.key === 'master'">
              <div class="rounded bg-white px-2 py-1 text-center">
                <p class="text-forena-400">추출 작업</p>
                <p class="font-bold text-forena-800">{{ uploads[dt.key].result.tasks }}건</p>
              </div>
              <div class="rounded bg-white px-2 py-1 text-center">
                <p class="text-forena-400">CP 공정</p>
                <p class="font-bold text-rose-700">{{ uploads[dt.key].result.cpTasks }}건</p>
              </div>
              <div class="col-span-2 rounded bg-white px-2 py-1 flex items-center justify-between">
                <span class="text-forena-400">AI 신뢰도</span>
                <span
                  class="font-bold"
                  :class="
                    uploads[dt.key].result.confidence >= 90 ? 'text-emerald-600' : 'text-amber-600'
                  "
                >
                  {{ uploads[dt.key].result.confidence }}%
                </span>
              </div>
            </template>
            <template v-else-if="dt.key === 'milestone'">
              <div class="rounded bg-white px-2 py-1 text-center">
                <p class="text-forena-400">마일스톤</p>
                <p class="font-bold text-forena-800">{{ uploads[dt.key].result.milestones }}개</p>
              </div>
              <div class="rounded bg-white px-2 py-1 text-center">
                <p class="text-forena-400">AI 신뢰도</p>
                <p class="font-bold text-emerald-600">{{ uploads[dt.key].result.confidence }}%</p>
              </div>
            </template>
            <template v-else-if="dt.key === 'trade'">
              <div class="rounded bg-white px-2 py-1 text-center">
                <p class="text-forena-400">공종 수</p>
                <p class="font-bold text-forena-800">{{ uploads[dt.key].result.trades }}종</p>
              </div>
              <div class="rounded bg-white px-2 py-1 text-center">
                <p class="text-forena-400">세부 작업</p>
                <p class="font-bold text-forena-800">{{ uploads[dt.key].result.tasks }}건</p>
              </div>
              <div class="col-span-2 rounded bg-white px-2 py-1 flex items-center justify-between">
                <span class="text-forena-400">AI 신뢰도</span>
                <span class="font-bold text-amber-600"
                  >{{ uploads[dt.key].result.confidence }}%</span
                >
              </div>
            </template>
            <template v-else-if="dt.key === 'bohal'">
              <div class="rounded bg-white px-2 py-1 text-center">
                <p class="text-forena-400">추출 작업</p>
                <p class="font-bold text-forena-800">{{ uploads[dt.key].result.tasks }}건</p>
              </div>
              <div class="rounded bg-white px-2 py-1 text-center">
                <p class="text-forena-400">공종 수</p>
                <p class="font-bold text-forena-800">{{ uploads[dt.key].result.trades }}종</p>
              </div>
              <div class="col-span-2 rounded bg-white px-2 py-1 flex items-center justify-between">
                <span class="text-forena-400">기간 추정</span>
                <span class="font-bold text-violet-700 text-[10px] tabular-nums">
                  {{ uploads[dt.key].result.dateRange || '—' }}
                </span>
              </div>
            </template>
          </div>

          <!-- 오류 -->
          <div
            v-if="uploads[dt.key].status === 'error'"
            class="rounded bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700"
          >
            {{ uploads[dt.key].error || '분석 중 오류가 발생했습니다.' }}
          </div>

          <!-- 액션 버튼 -->
          <div class="flex gap-1.5 mt-2">
            <button
              v-if="uploads[dt.key].status === 'idle'"
              @click="emit('run-analysis', dt.key)"
              class="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold text-white"
              :class="
                dt.color === 'blue'
                  ? 'bg-sky-600 hover:bg-sky-700'
                  : dt.color === 'amber'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : dt.color === 'violet'
                      ? 'bg-violet-600 hover:bg-violet-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
              "
            >
              <BrainCircuit class="h-3 w-3" /> AI 분석 실행
            </button>
            <button
              v-if="uploads[dt.key].status === 'done'"
              @click="emit('run-analysis', dt.key)"
              class="flex items-center justify-center gap-1 rounded-lg border border-forena-200 bg-white px-2 py-1.5 text-[11px] font-bold text-forena-600 hover:bg-forena-50"
            >
              <RefreshCw class="h-3 w-3" /> 재분석
            </button>
          </div>
        </div>

        <!-- AI 기능 설명 -->
        <div class="mt-auto">
          <p class="text-[10px] font-bold uppercase text-forena-400 mb-1.5">추출/활용 항목</p>
          <div class="flex flex-col gap-1">
            <div
              v-for="cap in dt.aiCapabilities"
              :key="cap"
              class="flex items-center gap-1.5 text-[11px] text-forena-600"
            >
              <span class="h-1 w-1 shrink-0 rounded-full" :class="colorMap[dt.color].dot"></span>
              {{ cap }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
