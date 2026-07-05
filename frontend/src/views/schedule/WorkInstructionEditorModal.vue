<script setup>
import { ref } from 'vue'
import {
  ArrowRightLeft,
  ClipboardList,
  Image as ImageIcon,
  MapPin,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Truck,
  Wrench,
  X,
} from 'lucide-vue-next'

defineProps({
  show: { type: Boolean, default: false },
  editing: { type: Object, default: null },
  isNew: { type: Boolean, default: false },
  draftSourcePlan: { type: Object, default: null },
  draftAutoFilled: { type: Object, default: () => ({}) },
  availableTrades: { type: Array, default: () => [] },
  equipmentList: { type: Object, default: () => ({}) },
  gates: { type: Array, default: () => [] },
  gateAssignment: { type: Array, default: () => [] },
  getGateLabel: { type: Function, default: (gate) => gate?.gateName || '' },
  formatDate: { type: Function, default: (value) => value },
  fileBadge: { type: Function, default: () => '' },
  formatSize: { type: Function, default: (value) => value },
})

const emit = defineEmits([
  'add-equipment',
  'clear-draft-highlight',
  'close',
  'file-change',
  'photo-change',
  'regenerate-draft',
  'remove-equipment',
  'remove-file',
  'remove-photo',
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
      v-if="show && editing"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      @click.self="emit('close')"
    >
      <div
        class="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div class="flex shrink-0 items-start justify-between border-b border-forena-100 px-6 py-4">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-flare-50">
              <ClipboardList class="h-5 w-5 text-flare-600" />
            </div>
            <div>
              <p class="text-base font-bold text-forena-900">
                {{ isNew ? '작업 지시서 작성' : '작업 지시서 수정' }}
              </p>
              <p class="mt-0.5 text-xs text-forena-500">
                <span class="font-mono text-forena-700">{{ editing.id }}</span> ·
                {{ formatDate(editing.date) }} ·
                <span class="font-bold text-forena-700">{{ editing.process }} 공종</span>
              </p>
            </div>
          </div>
          <button @click="emit('close')" class="text-slate-400 hover:text-forena-700">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div class="rounded-xl border border-flare-200 bg-flare-50/40 p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-2.5">
                <Sparkles class="mt-0.5 h-4 w-4 shrink-0 text-flare-600" />
                <div>
                  <p class="text-xs font-bold text-forena-900">명일 작업 예정으로 초안 자동 생성</p>
                  <p class="mt-0.5 text-[11px] text-forena-600">
                    선택한 세부작업의 위치 · 시간 · 인원 · 장비 · 상세를 자동 입력합니다. 게이트는
                    직접 지정하세요.
                  </p>
                </div>
              </div>
              <div class="flex shrink-0 gap-1.5">
                <button
                  v-if="draftSourcePlan"
                  @click="emit('regenerate-draft')"
                  class="inline-flex items-center gap-1 rounded-md border border-flare-300 bg-white px-2.5 py-1 text-[11px] font-bold text-flare-700 hover:bg-flare-50"
                >
                  <RefreshCw class="h-3 w-3" /> 다시 생성
                </button>
              </div>
            </div>

            <div v-if="draftSourcePlan" class="mt-3 rounded-lg bg-white p-3 ring-1 ring-flare-100">
              <p class="text-[10px] font-bold uppercase tracking-wide text-forena-400">
                원문 (연결된 주간 세부작업)
              </p>
              <p class="mt-1 text-[11px] leading-relaxed text-forena-700">
                {{ draftSourcePlan.plan }}
              </p>
            </div>
          </div>

          <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                >작업 일 <span class="text-rose-500">*</span></label
              >
              <input
                type="date"
                v-model="editing.date"
                class="w-full rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-flare-400"
              />
            </div>
            <div>
              <label
                class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                >작업 시간 <span class="text-rose-500">*</span
                ><span
                  v-if="draftAutoFilled.workTime"
                  class="ml-1 rounded bg-flare-100 px-1 text-[9px] font-bold text-flare-700"
                  >자동</span
                ></label
              >
              <input
                v-model="editing.workTime"
                placeholder="예: 07:00 ~ 17:00"
                @input="emit('clear-draft-highlight', 'workTime')"
                class="w-full rounded-md border bg-white px-2.5 py-1.5 text-xs outline-none focus:border-flare-400"
                :class="draftAutoFilled.workTime ? 'border-flare-300' : 'border-forena-200'"
              />
            </div>
            <div>
              <label
                class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                >공종 명</label
              >
              <select
                v-model="editing.process"
                disabled
                class="w-full rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-flare-400 disabled:bg-forena-50/40"
              >
                <option v-for="p in availableTrades" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label
                class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                >협력사 명 <span class="text-rose-500">*</span></label
              >
              <input
                v-model="editing.partner"
                placeholder="예: 한울중기"
                class="w-full rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-flare-400"
              />
            </div>
            <div>
              <label
                class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                >필요 인원<span
                  v-if="draftAutoFilled.workers"
                  class="ml-1 rounded bg-flare-100 px-1 text-[9px] font-bold text-flare-700"
                  >자동</span
                ></label
              >
              <input
                type="number"
                min="0"
                v-model.number="editing.workers"
                @input="emit('clear-draft-highlight', 'workers')"
                class="w-full rounded-md border bg-white px-2.5 py-1.5 text-xs tabular-nums outline-none focus:border-flare-400"
                :class="draftAutoFilled.workers ? 'border-flare-300' : 'border-forena-200'"
              />
            </div>
            <div class="sm:col-span-3">
              <label
                class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                ><MapPin class="mr-0.5 inline h-3 w-3" />작업 위치
                <span class="text-rose-500">*</span
                ><span
                  v-if="draftAutoFilled.location"
                  class="ml-1 rounded bg-flare-100 px-1 text-[9px] font-bold text-flare-700"
                  >자동</span
                ></label
              >
              <input
                v-model="editing.location"
                placeholder="예: 본동 3층 슬라브"
                @input="emit('clear-draft-highlight', 'location')"
                class="w-full rounded-md border bg-white px-2.5 py-1.5 text-xs outline-none focus:border-flare-400"
                :class="draftAutoFilled.location ? 'border-flare-300' : 'border-forena-200'"
              />
            </div>
          </div>

          <div class="mt-5 rounded-xl border border-forena-100 bg-forena-50/30 p-4">
            <div class="mb-2 flex items-center justify-between">
              <p class="flex items-center gap-1.5 text-[11px] font-bold text-forena-700">
                <Truck class="h-3.5 w-3.5 text-flare-600" /> 필요 중장비 + 게이트 배정 ({{
                  editing.equipment.length
                }})
                <span
                  v-if="draftAutoFilled.equipment"
                  class="ml-1 rounded bg-flare-100 px-1 text-[9px] font-bold text-flare-700"
                  >자동 입력됨</span
                >
              </p>
            </div>

            <div
              class="grid grid-cols-2 gap-2 rounded-lg bg-white p-3 ring-1 ring-forena-100 sm:grid-cols-5"
            >
              <div class="sm:col-span-2">
                <label class="mb-1 block text-[10px] font-bold text-forena-500">장비명</label>
                <select
                  v-model="editing.equipmentInput.name"
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
              </div>
              <div>
                <label class="mb-1 block text-[10px] font-bold text-forena-500">대수</label>
                <input
                  type="number"
                  min="1"
                  v-model.number="editing.equipmentInput.count"
                  class="w-full rounded-md border border-forena-200 px-2 py-1.5 text-xs tabular-nums outline-none focus:border-flare-400"
                />
              </div>
              <div class="flex-1">
                <label class="block text-xs font-medium text-slate-500 mb-1">입차 게이트</label>
                <select
                  v-model="editing.equipmentInput.gateIn"
                  class="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-flare-500 outline-none"
                >
                  <option :value="null" disabled>{{ gates.length ? '게이트 선택' : '등록된 게이트 없음' }}</option>
                  <option
                    v-for="g in gates"
                    :key="g.gateIdx"
                    :value="g.gateIdx"
                    :class="g.status === '혼잡' ? 'text-rose-500' : 'text-emerald-500'"
                  >
                    {{ getGateLabel(g) }}
                  </option>
                </select>
              </div>
              <div class="flex-1">
                <label class="block text-xs font-medium text-slate-500 mb-1">출차 게이트</label>
                <select
                  v-model="editing.equipmentInput.gateOut"
                  class="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-flare-500 outline-none"
                >
                  <option :value="null" disabled>{{ gates.length ? '게이트 선택' : '등록된 게이트 없음' }}</option>
                  <option v-for="g in gates" :key="g.gateIdx" :value="g.gateIdx">
                    {{ getGateLabel(g) }}
                  </option>
                </select>
              </div>
              <div class="sm:col-span-5">
                <button
                  @click="emit('add-equipment')"
                  class="inline-flex items-center gap-1 rounded-md border border-flare-200 bg-flare-50 px-2.5 py-1 text-[11px] font-bold text-flare-700 hover:bg-flare-100"
                >
                  <Plus class="h-3 w-3" /> 장비 추가
                </button>
              </div>
            </div>

            <div v-if="editing.equipment.length" class="mt-2 space-y-1.5">
              <div
                v-for="(eq, i) in editing.equipment"
                :key="eq.id"
                class="flex items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-forena-100"
              >
                <Wrench class="h-3.5 w-3.5 text-forena-400" />
                <span class="font-semibold text-xs text-forena-900">{{ eq.name }}</span>
                <span
                  class="rounded-md bg-forena-50 px-1.5 py-0.5 text-[10px] font-bold text-forena-700 tabular-nums"
                  >{{ eq.count }}대</span
                >
                <span class="ml-auto flex items-center gap-1.5 text-[11px]">
                  <select
                    v-model="eq.gateIn"
                    class="rounded border border-forena-200 px-1.5 py-0.5 text-[11px] outline-none focus:border-flare-400"
                  >
                    <option v-if="!gates.length" :value="null" disabled>게이트 없음</option>
                    <option v-for="g in gates" :key="g.gateIdx" :value="g.gateIdx">
                      입 · {{ g.gateName }}
                    </option>
                  </select>
                  <ArrowRightLeft class="h-3 w-3 text-forena-400" />
                  <select
                    v-model="eq.gateOut"
                    class="rounded border border-forena-200 px-1.5 py-0.5 text-[11px] outline-none focus:border-flare-400"
                  >
                    <option v-if="!gates.length" :value="null" disabled>게이트 없음</option>
                    <option v-for="g in gates" :key="g.gateIdx" :value="g.gateIdx">
                      출 · {{ g.gateName }}
                    </option>
                  </select>
                </span>
                <button
                  @click="emit('remove-equipment', i)"
                  class="text-slate-400 hover:text-rose-600"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div class="mt-3">
              <p class="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-forena-500">
                현재 일자 게이트 혼잡도
              </p>
              <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <div
                  v-for="g in gateAssignment"
                  :key="g.gateIdx"
                  class="rounded-md border px-2 py-1.5"
                  :class="
                    g.level === 'high'
                      ? 'border-rose-200 bg-rose-50/40'
                      : g.level === 'mid'
                        ? 'border-amber-200 bg-amber-50/40'
                        : 'border-forena-100 bg-white'
                  "
                >
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold text-forena-800">{{ g.name }}</span>
                    <span v-if="g.level === 'high'" class="text-[9px] font-bold text-rose-600"
                      >과밀</span
                    >
                    <span v-else-if="g.level === 'mid'" class="text-[9px] font-bold text-amber-600"
                      >혼잡</span
                    >
                    <span v-else class="text-[9px] font-bold text-emerald-600">원활</span>
                  </div>
                  <p class="mt-0.5 text-[10px] tabular-nums text-forena-500">
                    입차 {{ g.in }} · 출차 {{ g.out }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label
                class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                >작업 상세 내역 <span class="text-rose-500">*</span
                ><span
                  v-if="draftAutoFilled.workDetail"
                  class="ml-1 rounded bg-flare-100 px-1 text-[9px] font-bold text-flare-700"
                  >자동</span
                ></label
              >
              <textarea
                v-model="editing.workDetail"
                rows="5"
                @input="emit('clear-draft-highlight', 'workDetail')"
                placeholder="작업 절차, 범위, 협의사항 등"
                class="w-full resize-none rounded-md border bg-white px-2.5 py-1.5 text-xs leading-relaxed outline-none focus:border-flare-400"
                :class="draftAutoFilled.workDetail ? 'border-flare-300' : 'border-forena-200'"
              ></textarea>
            </div>
            <div>
              <label
                class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                >안전 유의사항</label
              >
              <textarea
                v-model="editing.safety"
                rows="5"
                placeholder="추락/낙하/화재 등 위험요인 및 안전조치"
                class="w-full resize-none rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs leading-relaxed outline-none focus:border-flare-400"
              ></textarea>
            </div>
            <div class="md:col-span-2">
              <label
                class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
                >특이사항</label
              >
              <textarea
                v-model="editing.notes"
                rows="2"
                placeholder="기상, 선행공정 의존성, 추가 요청 등"
                class="w-full resize-none rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs leading-relaxed outline-none focus:border-flare-400"
              ></textarea>
            </div>
          </div>

          <div class="mt-5 rounded-xl border border-forena-100 bg-forena-50/30 p-3.5">
            <div class="mb-2 flex items-center justify-between">
              <p class="flex items-center gap-1.5 text-[11px] font-bold text-forena-700">
                <ImageIcon class="h-3.5 w-3.5 text-flare-600" /> 현장 / 도면 사진 ({{
                  editing.photos.length
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
              v-if="editing.photos.length"
              class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5"
            >
              <div
                v-for="(photo, i) in editing.photos"
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
                <div
                  class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 to-transparent px-1.5 py-1"
                >
                  <p class="truncate text-[9px] font-semibold text-white">{{ photo.name }}</p>
                </div>
              </div>
            </div>
            <p v-else class="text-[11px] text-slate-400">첨부된 사진이 없습니다.</p>
          </div>

          <div class="mt-3 rounded-xl border border-forena-100 bg-forena-50/30 p-3.5">
            <div class="mb-2 flex items-center justify-between">
              <p class="flex items-center gap-1.5 text-[11px] font-bold text-forena-700">
                <Paperclip class="h-3.5 w-3.5 text-flare-600" /> 첨부 파일 ({{
                  editing.files.length
                }})
                <span class="ml-1 text-[10px] font-normal text-forena-400"
                  >PDF · Excel · 이미지</span
                >
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
            <ul v-if="editing.files.length" class="space-y-1.5">
              <li
                v-for="(f, i) in editing.files"
                :key="f.id"
                class="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-forena-100"
              >
                <span
                  class="rounded-md bg-flare-50 px-1.5 py-0.5 text-[9px] font-bold text-flare-700"
                  >{{ fileBadge(f.type) }}</span
                >
                <span class="flex-1 truncate text-xs text-forena-800">{{ f.name }}</span>
                <span class="shrink-0 text-[10px] text-forena-400 tabular-nums">{{
                  formatSize(f.size)
                }}</span>
                <button @click="emit('remove-file', i)" class="text-slate-400 hover:text-rose-600">
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </li>
            </ul>
            <p v-else class="text-[11px] text-slate-400">첨부된 파일이 없습니다.</p>
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
              @click="emit('submit')"
              class="inline-flex items-center gap-1.5 rounded-lg bg-flare-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-flare-600"
            >
              <Send class="h-3.5 w-3.5" /> 제출
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
