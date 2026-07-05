<script setup>
import { ref } from 'vue'
import {
  ClipboardList,
  Image as ImageIcon,
  MapPin,
  Paperclip,
  Plus,
  Save,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-vue-next'

defineProps({
  show: { type: Boolean, default: false },
  report: { type: Object, default: null },
  isNewReport: { type: Boolean, default: false },
  equipmentList: { type: Object, default: () => ({}) },
  calcInfo: { type: Object, default: null },
  formatDate: { type: Function, default: (value) => value },
  fileBadge: { type: Function, default: () => '' },
})

const emit = defineEmits([
  'add-equipment',
  'close',
  'file-change',
  'photo-change',
  'remove-equipment',
  'remove-file',
  'remove-photo',
  'save-draft',
  'submit',
])

const photoInputRef = ref(null)
const fileInputRef = ref(null)

function openPhotoPicker() {
  photoInputRef.value?.click()
}

function openFilePicker() {
  fileInputRef.value?.click()
}
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
      v-if="show && report"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      @click.self="emit('close')"
    >
      <div
        class="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div class="flex shrink-0 items-start justify-between border-b border-forena-100 px-6 py-4">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-flare-50">
              <ClipboardList class="h-5 w-5 text-flare-600" />
            </div>
            <div>
              <p class="text-base font-bold text-forena-900">
                {{ isNewReport ? '공사일보 작성' : '공사일보 수정' }}
              </p>
              <p class="mt-0.5 text-xs text-forena-500">
                <span class="font-bold text-forena-700">{{ report.process }} 공종</span>
                · {{ formatDate(report.date) }} · 작성자 {{ report.author }}
              </p>
            </div>
          </div>
          <button @click="emit('close')" class="text-slate-400 hover:text-forena-700">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div class="space-y-4">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div class="sm:col-span-3">
                <label
                  class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                  ><MapPin class="mr-0.5 inline h-3 w-3" />작업 위치
                  <span class="text-rose-500">*</span></label
                >
                <input
                  v-model="report.location"
                  class="w-full rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-flare-400"
                />
              </div>
              <div>
                <label
                  class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                  ><Users class="mr-0.5 inline h-3 w-3" />금일 작업 인력 수</label
                >
                <input
                  type="number"
                  min="0"
                  v-model.number="report.workers"
                  class="w-full rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs tabular-nums outline-none focus:border-flare-400"
                />
              </div>
              <div class="sm:col-span-2">
                <label
                  class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                  >완료 / 미완료</label
                >
                <select
                  v-model="report.completion"
                  class="w-full rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-flare-400"
                >
                  <option>미완료</option>
                  <option>완료</option>
                </select>
              </div>
            </div>

            <div>
              <label
                class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                >금일 투입 장비 목록</label
              >
              <div class="flex gap-2">
                <select
                  v-model="report.equipmentInput.name"
                  class="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">장비 선택</option>
                  <optgroup
                    v-for="(items, category) in equipmentList"
                    :key="category"
                    :label="category"
                  >
                    <option
                      v-for="equipment in items"
                      :key="`${category}_${equipment}`"
                      :value="equipment"
                    >
                      {{ equipment }}
                    </option>
                  </optgroup>
                </select>
                <input
                  type="number"
                  min="1"
                  v-model.number="report.equipmentInput.count"
                  class="w-16 rounded-lg border border-slate-200 px-2 py-2 text-sm text-center tabular-nums"
                />
                <button
                  @click="emit('add-equipment')"
                  class="inline-flex items-center gap-1 rounded-md border border-flare-200 bg-flare-50 px-2.5 py-1 text-xs font-bold text-flare-700 hover:bg-flare-100"
                >
                  <Plus class="h-3 w-3" />추가
                </button>
              </div>
              <div v-if="report.equipmentList.length" class="mt-2 flex flex-wrap gap-1.5">
                <span
                  v-for="(eq, i) in report.equipmentList"
                  :key="i"
                  class="inline-flex items-center gap-1 rounded-md bg-forena-50 px-2 py-0.5 text-[11px] font-semibold text-forena-700"
                  >{{ eq
                  }}<button
                    @click="emit('remove-equipment', i)"
                    class="text-slate-400 hover:text-rose-600"
                  >
                    <X class="h-3 w-3" /></button
                ></span>
              </div>
            </div>

            <div>
              <label
                class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                >금일 작업 완료 내용 <span class="text-rose-500">*</span></label
              >
              <textarea
                v-model="report.todayWork"
                rows="4"
                class="w-full resize-none rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs leading-relaxed outline-none focus:border-flare-400"
              ></textarea>
            </div>

            <div>
              <label
                class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                >월간 세부계획 기간</label
              >
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="mb-0.5 block text-[10px] text-forena-400">시작일</label>
                  <input
                    type="date"
                    v-model="report.startDate"
                    class="w-full rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-flare-400"
                  />
                </div>
                <div>
                  <label class="mb-0.5 block text-[10px] text-forena-400">종료일</label>
                  <input
                    type="date"
                    v-model="report.endDate"
                    class="w-full rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-flare-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                >이전 누적 진척률 (%)</label
              >
              <input
                type="number"
                min="0"
                max="100"
                v-model.number="report.prevProgress"
                class="w-full rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs tabular-nums outline-none focus:border-flare-400"
              />
            </div>

            <div>
              <div class="mb-1 flex items-center justify-between">
                <label class="text-[10px] font-bold uppercase tracking-wide text-forena-500"
                  >금일 진척률</label
                >
                <span class="text-xs font-bold tabular-nums text-flare-700"
                  >{{ report.progress }}%</span
                >
              </div>
              <div class="flex items-center gap-3">
                <div class="min-w-0 flex-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    v-model.number="report.progress"
                    class="w-full accent-flare-500"
                  />
                  <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-forena-100">
                    <div
                      class="h-full rounded-full bg-flare-500 transition-all"
                      :style="{ width: report.progress + '%' }"
                    ></div>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  v-model.number="report.progress"
                  class="w-20 rounded-md border border-forena-200 bg-white px-2 py-1 text-xs tabular-nums outline-none focus:border-flare-400"
                />
              </div>
              <p v-if="calcInfo" class="mt-1 text-[10px] text-forena-400">
                금일 증가분:
                <span class="font-semibold text-forena-700">{{ calcInfo.increment }}%</span> (기간
                {{ calcInfo.duration }}일 ·
                <template v-if="calcInfo.isScheduleChangeTarget">
                  승인 변경 목표 {{ calcInfo.dailyAllocation }}%
                  <span class="text-forena-300">
                    / 기본 {{ calcInfo.normalDailyAllocation }}%
                  </span>
                </template>
                <template v-else-if="calcInfo.isMonthlyScheduleWeight">
                  세부일정 가중치 {{ calcInfo.dailyAllocation }}%
                </template>
                <template v-else>일일 배분율 {{ calcInfo.dailyAllocation }}%</template>)
              </p>
            </div>

            <div class="rounded-lg border border-flare-100 bg-flare-50/40 p-3">
              <div class="mb-2 flex items-center justify-between">
                <label class="text-[10px] font-bold uppercase tracking-wide text-flare-600">
                  월간 세부계획 진척률
                  <span class="font-normal text-flare-400">(하위 일정 기준 자동 계산)</span>
                </label>
                <span class="text-sm font-bold tabular-nums text-flare-700"
                  >{{ report.processProgress }}%</span
                >
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-flare-100">
                <div
                  class="h-full rounded-full bg-flare-500 transition-all"
                  :style="{ width: report.processProgress + '%' }"
                ></div>
              </div>
              <p v-if="calcInfo" class="mt-1.5 text-[10px] text-forena-500">
                <span v-if="calcInfo.isScheduleChangeTarget" class="block mb-0.5 text-forena-600">
                  <span class="font-bold">산식:</span> 승인 변경 하루 목표
                  <span class="font-bold">{{ calcInfo.dailyAllocation }}%</span> × 금일 완료율
                  <span class="font-bold">{{ report.progress }}%</span> = 금일 증가
                  <span class="font-bold">{{ calcInfo.increment }}%</span>
                </span>
                <span
                  v-else-if="calcInfo.isMonthlyScheduleWeight"
                  class="block mb-0.5 text-forena-600"
                >
                  <span class="font-bold">산식:</span> 세부일정 가중치
                  <span class="font-bold">{{ calcInfo.dailyAllocation }}%</span> × 금일 완료율
                  <span class="font-bold">{{ report.progress }}%</span> = 금일 증가
                  <span class="font-bold">{{ calcInfo.increment }}%</span>
                </span>
                <span v-else class="block mb-0.5 text-forena-600">
                  <span class="font-bold">산식:</span> 하루 목표
                  <span class="font-bold">{{ calcInfo.dailyAllocation }}%</span> ÷ 금일 세부작업
                  <span class="font-bold">{{ calcInfo.tasksTodayCount }}건</span> = 건당 최대
                  <span class="font-bold">{{ calcInfo.weightPerTask }}%</span> 반영
                </span>
                이전 누적
                <span class="font-bold text-forena-700">{{ report.prevProgress }}%</span> + 금일
                증가분 <span class="font-bold text-forena-700">{{ calcInfo.increment }}%</span> =
                <span class="font-bold text-flare-700">{{ report.processProgress }}%</span>
              </p>
              <p v-else class="mt-1.5 text-[10px] text-amber-600">
                ⚠ 월간 세부계획 기간(시작일·종료일)을 입력하면 자동 계산됩니다.
              </p>
            </div>

            <div>
              <label
                class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                >특이사항</label
              >
              <textarea
                v-model="report.notes"
                rows="2"
                class="w-full resize-none rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs leading-relaxed outline-none focus:border-flare-400"
              ></textarea>
            </div>

            <div class="mt-5 rounded-xl border border-forena-100 bg-forena-50/30 p-3.5">
              <div class="mb-2 flex items-center justify-between">
                <p class="flex items-center gap-1.5 text-[11px] font-bold text-forena-700">
                  <ImageIcon class="h-3.5 w-3.5 text-flare-600" /> 현장 / 도면 사진 ({{
                    report.photos.length
                  }})
                </p>
                <button
                  @click="openPhotoPicker"
                  class="inline-flex items-center gap-1 rounded-md border border-flare-200 bg-flare-50 px-2.5 py-1 text-[11px] font-bold text-flare-700 hover:bg-flare-100"
                >
                  <Plus class="h-3 w-3" /> 사진 추가
                </button>
                <input
                  ref="photoInputRef"
                  type="file"
                  class="sr-only"
                  accept="image/*"
                  multiple
                  @change="emit('photo-change', $event)"
                />
              </div>
              <div
                v-if="report.photos.length"
                class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5"
              >
                <div
                  v-for="(photo, i) in report.photos"
                  :key="photo.id"
                  class="group relative aspect-square overflow-hidden rounded-lg border border-forena-200 bg-white"
                >
                  <img :src="photo.dataUrl" :alt="photo.name" class="h-full w-full object-cover" />
                  <button
                    @click="emit('remove-photo', i)"
                    class="absolute right-1 top-1 rounded-md bg-slate-900/70 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-rose-600"
                  >
                    <Trash2 class="h-3 w-3" />
                  </button>
                </div>
              </div>
              <p v-else class="text-[11px] text-slate-400">첨부된 사진이 없습니다.</p>
            </div>

            <div class="mt-3 rounded-xl border border-forena-100 bg-forena-50/30 p-3.5">
              <div class="mb-2 flex items-center justify-between">
                <p class="flex items-center gap-1.5 text-[11px] font-bold text-forena-700">
                  <Paperclip class="h-3.5 w-3.5 text-flare-600" /> 첨부 파일 ({{
                    report.files.length
                  }})
                </p>
                <button
                  @click="openFilePicker"
                  class="inline-flex items-center gap-1 rounded-md border border-flare-200 bg-flare-50 px-2.5 py-1 text-[11px] font-bold text-flare-700 hover:bg-flare-100"
                >
                  <Plus class="h-3 w-3" /> 파일 추가
                </button>
                <input
                  ref="fileInputRef"
                  type="file"
                  class="sr-only"
                  accept=".pdf,.xls,.xlsx,.csv,image/*"
                  multiple
                  @change="emit('file-change', $event)"
                />
              </div>
              <ul v-if="report.files.length" class="space-y-1.5">
                <li
                  v-for="(f, i) in report.files"
                  :key="f.id"
                  class="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-forena-100"
                >
                  <span
                    class="rounded-md bg-flare-50 px-1.5 py-0.5 text-[9px] font-bold text-flare-700"
                    >{{ fileBadge(f.type) }}</span
                  >
                  <span class="flex-1 truncate text-xs text-forena-800">{{ f.name }}</span>
                  <button
                    @click="emit('remove-file', i)"
                    class="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </li>
              </ul>
              <p v-else class="text-[11px] text-slate-400">첨부된 파일이 없습니다.</p>
            </div>
          </div>
        </div>

        <div
          class="flex shrink-0 items-center justify-between gap-2 border-t border-forena-100 bg-forena-50/40 px-6 py-3"
        >
          <p class="text-[11px] text-forena-500">
            <span class="text-rose-500">*</span> 표시는 필수 입력 항목입니다.
          </p>
          <div class="flex gap-2">
            <button
              @click="emit('close')"
              class="rounded-lg border border-forena-200 bg-white px-4 py-2 text-xs font-semibold text-forena-700 hover:bg-forena-50"
            >
              취소
            </button>
            <button
              @click="emit('save-draft')"
              class="inline-flex items-center gap-1.5 rounded-lg border border-forena-200 bg-white px-4 py-2 text-xs font-bold text-forena-700 hover:bg-forena-50"
            >
              <Save class="h-3.5 w-3.5" /> 임시 저장
            </button>
            <button
              @click="emit('submit')"
              class="inline-flex items-center gap-1.5 rounded-lg bg-flare-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-flare-600"
            >
              <Send class="h-3.5 w-3.5" /> 공사일보 제출
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
