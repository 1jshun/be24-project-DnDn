<script setup>
import { BrainCircuit, Download, Eye, FileText, RefreshCw, Upload, X } from 'lucide-vue-next'

defineProps({
  uploadForm: { type: Object, required: true },
  uploadedDocs: { type: Array, required: true },
  aiAnalyzing: { type: Boolean, default: false },
})

const emit = defineEmits([
  'close',
  'upload-file',
  'update-doc-type',
  'update-desc',
  'run-analysis',
  'load-existing-doc',
  'manual-input',
  'view-doc',
  'download-doc',
  'reanalyze',
])
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
      <!-- 헤더 -->
      <div class="flex items-center gap-2 border-b border-forena-100 px-6 py-4">
        <FileText class="h-4 w-4 text-flare-600" />
        <h3 class="text-sm font-bold text-forena-900">문서 등록</h3>
        <span class="ml-1 text-[11px] text-forena-400"
          >기준 공정표를 만들 원본 문서를 업로드하고 AI 분석을 실행합니다.</span
        >
        <button @click="emit('close')" class="ml-auto rounded-lg p-1 hover:bg-forena-50">
          <X class="h-4 w-4 text-slate-400 hover:text-forena-700" />
        </button>
      </div>

      <!-- 본문 -->
      <div class="grid gap-4 p-6 lg:grid-cols-12">
        <!-- 업로드 폼 -->
        <div class="lg:col-span-5 space-y-3">
          <div
            class="rounded-xl border-2 border-dashed border-forena-200 bg-forena-50/40 p-5 text-center"
          >
            <Upload class="mx-auto h-8 w-8 text-forena-300" />
            <p class="mt-2 text-sm font-semibold text-forena-700">
              파일을 끌어 놓거나 클릭하여 업로드
            </p>
            <p class="mt-0.5 text-[10px] text-forena-400">Excel · PDF · Image · Word · HWP</p>
            <label
              class="mt-3 inline-block cursor-pointer rounded-lg bg-forena-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-forena-900"
            >
              파일 선택
              <input
                type="file"
                class="sr-only"
                accept=".xlsx,.xls,.pdf,.png,.jpg,.jpeg,.doc,.docx,.hwp"
                @change="emit('upload-file', $event)"
              />
            </label>
            <p v-if="uploadForm.fileName" class="mt-2 text-xs font-bold text-flare-700">
              📎 {{ uploadForm.fileName }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] font-bold uppercase text-forena-400">문서 유형</label>
              <select
                :value="uploadForm.docType"
                @change="emit('update-doc-type', $event.target.value)"
                class="mt-1 w-full rounded-lg border border-forena-200 bg-white px-2.5 py-2 text-xs text-forena-800 outline-none focus:border-flare-400"
              >
                <option>마스터 공정표</option>
                <option>마일스톤 공정표</option>
                <option>공종별 시공계획서</option>
                <option>기타 공정 자료</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] font-bold uppercase text-forena-400">문서 설명</label>
              <input
                :value="uploadForm.desc"
                @input="emit('update-desc', $event.target.value)"
                type="text"
                placeholder="간단 설명 (선택)"
                class="mt-1 w-full rounded-lg border border-forena-200 bg-white px-2.5 py-2 text-xs text-forena-800 outline-none focus:border-flare-400"
              />
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              @click="emit('run-analysis')"
              :disabled="aiAnalyzing"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-flare-600 px-3 py-2 text-xs font-bold text-white hover:bg-flare-700 disabled:opacity-60"
            >
              <BrainCircuit class="h-3.5 w-3.5" />
              {{ aiAnalyzing ? '분석 중…' : 'AI 분석 실행' }}
            </button>
            <button
              @click="emit('load-existing-doc')"
              class="inline-flex items-center gap-1.5 rounded-lg border border-forena-200 bg-white px-3 py-2 text-xs font-semibold text-forena-700 hover:bg-forena-50"
            >
              기존 문서 불러오기
            </button>
            <button
              @click="emit('manual-input')"
              class="inline-flex items-center gap-1.5 rounded-lg border border-forena-200 bg-white px-3 py-2 text-xs font-semibold text-forena-700 hover:bg-forena-50"
            >
              직접 입력
            </button>
          </div>
        </div>

        <!-- 문서 이력 -->
        <div class="lg:col-span-7">
          <p class="mb-2 text-[11px] font-bold text-forena-500">
            업로드 문서 ({{ uploadedDocs.length }})
          </p>
          <div class="overflow-hidden rounded-xl border border-forena-100">
            <table class="w-full text-xs">
              <thead class="bg-forena-50/60 text-[10px] font-bold uppercase text-forena-500">
                <tr>
                  <th class="px-3 py-2 text-left">문서명</th>
                  <th class="px-3 py-2 text-left">유형</th>
                  <th class="px-3 py-2 text-left">업로드</th>
                  <th class="px-3 py-2 text-left">상태</th>
                  <th class="px-3 py-2 text-right">액션</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-forena-50">
                <tr v-for="d in uploadedDocs" :key="d.id" class="hover:bg-forena-50/40">
                  <td class="px-3 py-2 font-semibold text-forena-800">{{ d.name }}</td>
                  <td class="px-3 py-2 text-forena-600">{{ d.type }}</td>
                  <td class="px-3 py-2 tabular-nums text-slate-500">{{ d.uploadedAt }}</td>
                  <td class="px-3 py-2">
                    <span
                      class="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                      :class="
                        d.reflectStatus === '반영 완료'
                          ? 'bg-emerald-50 text-emerald-700'
                          : d.reflectStatus === '검토 중'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-slate-100 text-slate-500'
                      "
                    >
                      {{ d.reflectStatus }}
                    </span>
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex items-center justify-end gap-1">
                      <button
                        @click="emit('view-doc', d)"
                        title="원본 보기"
                        class="rounded p-1 text-forena-500 hover:bg-forena-100"
                      >
                        <Eye class="h-3.5 w-3.5" />
                      </button>
                      <button
                        @click="emit('download-doc', d)"
                        title="다운로드"
                        class="rounded p-1 text-forena-500 hover:bg-forena-100"
                      >
                        <Download class="h-3.5 w-3.5" />
                      </button>
                      <button
                        @click="emit('reanalyze', d.id)"
                        title="재분석"
                        class="rounded p-1 text-flare-600 hover:bg-flare-50"
                      >
                        <RefreshCw class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 푸터 -->
      <div class="flex justify-end gap-2 border-t border-forena-100 px-6 py-4">
        <button
          @click="emit('close')"
          class="rounded-lg border border-forena-200 bg-white px-4 py-2 text-xs font-bold text-forena-700 hover:bg-forena-50"
        >
          닫기
        </button>
      </div>
    </div>
  </div>
</template>
