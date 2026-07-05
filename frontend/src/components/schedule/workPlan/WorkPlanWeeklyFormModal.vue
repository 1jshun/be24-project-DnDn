<script setup>
import { computed } from 'vue'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Plus,
  Save,
  Trash2,
  Users,
  Wrench,
  X,
} from 'lucide-vue-next'
import { EQUIPMENT_GROUPS, WORKER_TRADES } from '@/utils/schedule/workPlan.js'
import { formatPhoneNumber } from '@/utils/inputFormat'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  form: {
    type: Object,
    default: null,
  },
  monthlyPlanOptions: {
    type: Array,
    default: () => [],
  },
  valid: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'cancel',
  'select-monthly-plan',
  'add-item',
  'remove-item',
  'add-worker',
  'remove-worker',
  'add-equipment',
  'remove-equipment',
  'submit',
])

const weeklyForm = computed(() => props.form)
const weeklyFormValid = computed(() => props.valid)

function cancelWeeklyForm() {
  emit('cancel')
}

function onSelectMonthlyPlan() {
  emit('select-monthly-plan')
}

function addWeeklyItem() {
  emit('add-item')
}

function removeWeeklyItem(index) {
  emit('remove-item', index)
}

function addWorker(item) {
  emit('add-worker', item)
}

function removeWorker(item, index) {
  emit('remove-worker', item, index)
}

function addEquipment(item) {
  emit('add-equipment', item)
}

function removeEquipment(item, index) {
  emit('remove-equipment', item, index)
}

function submitWeeklyForm() {
  emit('submit')
}

function itemWorkerTotal(item) {
  if (!item || !Array.isArray(item.workers)) return 0
  return item.workers.reduce((sum, worker) => sum + (Number(worker.count) || 0), 0)
}

function itemEquipmentTotal(item) {
  if (!item || !Array.isArray(item.equipment)) return 0
  return item.equipment.reduce((sum, equipment) => sum + (Number(equipment.count) || 0), 0)
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
      v-if="show && weeklyForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      @click.self="cancelWeeklyForm"
    >
      <div
        class="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <!-- 헤더 -->
        <div class="flex shrink-0 items-start justify-between border-b border-forena-100 px-6 py-4">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-flare-50">
              <ClipboardList class="h-5 w-5 text-flare-600" />
            </div>
            <div>
              <p class="text-base font-bold text-forena-900">세부 계획서 작성</p>
              <p class="mt-0.5 text-xs text-forena-500">
                협력사 담당자가 직접 작성합니다. 일자별
                <span class="font-bold text-flare-700">공정명·작업구역·인력·장비</span>는 모두
                필수입니다.
              </p>
            </div>
          </div>
          <button @click="cancelWeeklyForm" class="text-slate-400 hover:text-forena-700">
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- 월간 계획 선택 -->
        <div class="shrink-0 border-b border-forena-100 bg-white px-6 py-4">
          <label class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500">
            월간 계획 선택 <span class="text-rose-500">*</span>
          </label>

          <select
            v-model="weeklyForm.monthlyPlanId"
            @change="onSelectMonthlyPlan"
            class="w-full rounded-md border border-forena-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-flare-400"
          >
            <option :value="null">월간 세부계획을 선택하세요</option>
            <option v-for="opt in monthlyPlanOptions" :key="opt.id" :value="opt.id">
              {{ opt.label }}
            </option>
          </select>

          <div
            v-if="weeklyForm.monthlyPlanId"
            class="mt-3 rounded-lg border border-flare-100 bg-flare-50/50 px-3 py-2 text-xs text-forena-700"
          >
            <p class="font-bold text-forena-900">
              {{ weeklyForm.monthlyPlanName }}
            </p>
            <p class="mt-1">
              위치 {{ weeklyForm.monthlyLocation || '-' }} · 기간 {{ weeklyForm.monthlyStart }} ~
              {{ weeklyForm.monthlyEnd }}
            </p>
          </div>
        </div>
        <!-- 협력사 정보 -->
        <div
          class="grid shrink-0 grid-cols-1 gap-3 border-b border-forena-100 bg-forena-50/40 px-6 py-4 sm:grid-cols-4"
        >
          <div>
            <label class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
              >협력사 <span class="text-rose-500">*</span></label
            >
            <input
              v-model="weeklyForm.partner"
              placeholder="예: (주)대우전기"
              class="w-full rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-flare-400"
            />
          </div>
          <div>
            <label class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
              >담당자 <span class="text-rose-500">*</span></label
            >
            <input
              v-model="weeklyForm.manager"
              placeholder="예: 김현수 반장"
              class="w-full rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-flare-400"
            />
          </div>
          <div>
            <label class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
              >연락처 <span class="text-rose-500">*</span></label
            >
            <input
              v-model="weeklyForm.contact"
              type="tel"
              placeholder="010-0000-0000"
              inputmode="tel"
              maxlength="13"
              autocomplete="tel"
              required
              class="w-full rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-flare-400"
              @input="weeklyForm.contact = formatPhoneNumber(weeklyForm.contact)"
            />
          </div>
          <div>
            <label class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-forena-500"
              >일정 시작일</label
            >
            <input
              type="date"
              v-model="weeklyForm.weekStart"
              class="w-full rounded-md border border-forena-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-flare-400"
            />
          </div>
        </div>

        <!-- 일자별 작업 입력 -->
        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div class="mb-2 flex items-center justify-between">
            <p class="text-[11px] font-bold uppercase tracking-wide text-forena-400">
              일자별 작업 ({{ weeklyForm.items.length }}건)
            </p>
            <button
              @click="addWeeklyItem"
              class="inline-flex items-center gap-1 rounded-md border border-flare-200 bg-flare-50 px-2.5 py-1 text-[11px] font-bold text-flare-700 hover:bg-flare-100"
            >
              <Plus class="h-3 w-3" /> 작업 추가
            </button>
          </div>

          <div class="space-y-3">
            <div
              v-for="(item, idx) in weeklyForm.items"
              :key="item.id"
              class="rounded-xl border border-forena-100 bg-white p-3.5"
            >
              <div class="mb-2.5 flex items-center justify-between">
                <span
                  class="rounded-md bg-forena-50 px-2 py-0.5 text-[10px] font-bold text-forena-600"
                  >#{{ idx + 1 }}</span
                >
                <button
                  v-if="weeklyForm.items.length > 1"
                  @click="removeWeeklyItem(idx)"
                  class="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
              <div class="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label class="mb-1 block text-[10px] font-bold text-forena-500"
                    >작업일자 <span class="text-rose-500">*</span></label
                  >
                  <input
                    type="date"
                    v-model="item.date"
                    class="w-full rounded-md border border-forena-200 px-2 py-1.5 text-xs outline-none focus:border-flare-400"
                  />
                </div>
                <div class="lg:col-span-2">
                  <label class="mb-1 block text-[10px] font-bold text-forena-500"
                    >일일 작업 내용 <span class="text-rose-500">*</span></label
                  >
                  <input
                    v-model="item.processName"
                    placeholder="예: 타설 전 거푸집 및 철근 상태 점검"
                    class="w-full rounded-md border border-forena-200 px-2 py-1.5 text-xs outline-none focus:border-flare-400"
                  />
                </div>
                <div class="lg:col-span-2">
                  <label class="mb-1 block text-[10px] font-bold text-forena-500"
                    >세부 작업 위치 <span class="text-rose-500">*</span></label
                  >
                  <input
                    v-model="item.zone"
                    placeholder="예: B2층 전기실"
                    class="w-full rounded-md border border-forena-200 px-2 py-1.5 text-xs outline-none focus:border-flare-400"
                  />
                </div>
                <div class="lg:col-span-2">
                  <div class="mb-1 flex items-center justify-between">
                    <label class="block text-[10px] font-bold text-forena-500">
                      <Users class="mr-0.5 inline h-3 w-3" />인력
                      <span class="text-rose-500">*</span>
                    </label>
                    <span
                      v-if="itemWorkerTotal(item) > 0"
                      class="rounded bg-flare-50 px-1.5 py-0.5 text-[10px] font-bold text-flare-700"
                    >
                      총 {{ itemWorkerTotal(item) }}명
                    </span>
                  </div>
                  <div class="space-y-1.5">
                    <div
                      v-for="(wk, wIdx) in item.workers"
                      :key="wk.tradeId"
                      class="flex items-center gap-1"
                    >
                      <select
                        v-model="wk.trade"
                        class="min-w-0 flex-1 rounded-md border border-forena-200 px-1.5 py-1.5 text-xs outline-none focus:border-flare-400"
                      >
                        <option v-for="t in WORKER_TRADES" :key="t" :value="t">
                          {{ t }}
                        </option>
                      </select>
                      <input
                        v-model.number="wk.count"
                        type="number"
                        min="1"
                        max="999"
                        class="w-12 rounded-md border border-forena-200 px-1.5 py-1.5 text-xs tabular-nums outline-none focus:border-flare-400"
                      />
                      <span class="text-[10px] text-forena-500">명</span>
                      <button
                        v-if="item.workers.length > 1"
                        type="button"
                        @click="removeWorker(item, wIdx)"
                        class="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="인력 삭제"
                      >
                        <Trash2 class="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      @click="addWorker(item)"
                      class="w-full rounded-md border border-dashed border-forena-200 px-2 py-1 text-[10px] font-semibold text-forena-500 hover:border-flare-300 hover:bg-flare-50 hover:text-flare-700"
                    >
                      + 직종 추가
                    </button>
                  </div>
                </div>
                <div class="lg:col-span-3">
                  <div class="mb-1 flex items-center justify-between">
                    <label class="block text-[10px] font-bold text-forena-500">
                      <Wrench class="mr-0.5 inline h-3 w-3" />장비
                      <span class="text-rose-500">*</span>
                    </label>
                    <span
                      v-if="itemEquipmentTotal(item) > 0"
                      class="rounded bg-flare-50 px-1.5 py-0.5 text-[10px] font-bold text-flare-700"
                    >
                      총 {{ itemEquipmentTotal(item) }}대
                    </span>
                  </div>
                  <div class="space-y-1.5">
                    <div
                      v-for="(eq, eIdx) in item.equipment"
                      :key="eq.equipId"
                      class="flex items-center gap-1"
                    >
                      <select
                        v-model="eq.type"
                        class="min-w-0 flex-1 rounded-md border border-forena-200 px-1.5 py-1.5 text-xs outline-none focus:border-flare-400"
                      >
                        <optgroup v-for="g in EQUIPMENT_GROUPS" :key="g.label" :label="g.label">
                          <option v-for="t in g.items" :key="t" :value="t">
                            {{ t }}
                          </option>
                        </optgroup>
                      </select>
                      <input
                        v-model.number="eq.count"
                        type="number"
                        min="1"
                        max="99"
                        class="w-12 rounded-md border border-forena-200 px-1.5 py-1.5 text-xs tabular-nums outline-none focus:border-flare-400"
                      />
                      <span class="text-[10px] text-forena-500">대</span>
                      <button
                        v-if="item.equipment.length > 1"
                        type="button"
                        @click="removeEquipment(item, eIdx)"
                        class="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="장비 삭제"
                      >
                        <Trash2 class="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      @click="addEquipment(item)"
                      class="w-full rounded-md border border-dashed border-forena-200 px-2 py-1 text-[10px] font-semibold text-forena-500 hover:border-flare-300 hover:bg-flare-50 hover:text-flare-700"
                    >
                      + 장비 추가
                    </button>
                  </div>
                </div>
                <div class="lg:col-span-5">
                  <label class="mb-1 block text-[10px] font-bold text-forena-500">비고</label>
                  <input
                    v-model="item.note"
                    placeholder="안전 유의사항, 선·후행 공정과의 협의사항 등"
                    class="w-full rounded-md border border-forena-200 px-2 py-1.5 text-xs outline-none focus:border-flare-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 푸터 -->
        <div
          class="flex shrink-0 items-center justify-between gap-2 border-t border-forena-100 bg-forena-50/40 px-6 py-3"
        >
          <p class="text-[11px] text-forena-500">
            <span v-if="!weeklyFormValid" class="text-rose-600">
              <AlertTriangle class="mr-0.5 inline h-3 w-3" />
              협력사·담당자 및 모든 작업의 필수 항목을 입력해주세요.
            </span>
            <span v-else class="text-emerald-700">
              <CheckCircle2 class="mr-0.5 inline h-3 w-3" />
              제출 준비가 완료되었습니다.
            </span>
          </p>
          <div class="flex gap-2">
            <button
              @click="cancelWeeklyForm"
              class="rounded-lg border border-forena-200 bg-white px-4 py-2 text-xs font-semibold text-forena-700 hover:bg-forena-50"
            >
              취소
            </button>
            <button
              @click="submitWeeklyForm"
              :disabled="!weeklyFormValid"
              class="inline-flex items-center gap-1.5 rounded-lg bg-flare-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-flare-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Save class="h-3.5 w-3.5" />
              계획서 제출
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
