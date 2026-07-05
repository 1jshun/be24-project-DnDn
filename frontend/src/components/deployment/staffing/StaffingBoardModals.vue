<script setup>
import { AlertTriangle, Plus, Trash2 } from 'lucide-vue-next'
import { toastClass } from '@/utils/deployment/staffingBoardUi'

const props = defineProps({
  zoneEditOpen: { type: Boolean, default: false },
  zoneEditDraft: { type: Object, default: null },
  TRADE_OPTIONS: { type: Array, default: () => [] },
  assignOverflowOpen: { type: Boolean, default: false },
  assignOverflowMeta: { type: Object, default: null },
  saveConfirmOpen: { type: Boolean, default: false },
  resetConfirmOpen: { type: Boolean, default: false },
  resetConfirmRows: { type: Array, default: () => [] },
  resetConfirmTotal: { type: Number, default: 0 },
  toasts: { type: Array, default: () => [] },
  T: { type: Object, required: true },
})

const emit = defineEmits([
  'close-zone-edit',
  'save-zone-edit',
  'add-zone-row',
  'remove-zone-row',
  'close-assign-overflow',
  'close-save-confirm',
  'execute-save',
  'close-reset-confirm',
  'execute-reset',
])

function closeZoneEdit() {
  emit('close-zone-edit')
}

function saveZoneEdit() {
  emit('save-zone-edit')
}

function addZoneEditRow() {
  emit('add-zone-row')
}

function removeZoneEditRow(idx) {
  emit('remove-zone-row', idx)
}

function closeAssignOverflow() {
  emit('close-assign-overflow')
}

function closeSaveConfirm() {
  emit('close-save-confirm')
}

function executeFinalizeSave() {
  emit('execute-save')
}

function closeResetConfirm() {
  emit('close-reset-confirm')
}

function executeReset() {
  emit('execute-reset')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.zoneEditOpen && props.zoneEditDraft"
      class="fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="props.T.editZone"
    >
      <button
        type="button"
        class="absolute inset-0 bg-forena-900/40 backdrop-blur-[1px]"
        :aria-label="props.T.cancel"
        @click="closeZoneEdit"
      />
      <div
        class="relative z-10 w-full max-w-md rounded-2xl border border-forena-100 bg-white p-5 shadow-xl ring-1 ring-black/5"
        @click.stop
      >
        <h3 class="text-base font-bold text-forena-900">{{ props.T.editZone }}</h3>
        <div class="mt-4 space-y-3">
          <div>
            <label class="block text-[11px] font-bold text-forena-600">{{ props.T.zoneTitle }}</label>
            <input
              v-model="props.zoneEditDraft.title"
              type="text"
              class="mt-1 w-full rounded-xl border border-forena-200 bg-white px-3 py-2 text-sm text-forena-900 outline-none ring-forena-300 focus:ring-2"
            />
          </div>
          <div>
            <p class="text-[11px] font-bold text-forena-600">{{ props.T.tradeNeedRows }}</p>
            <ul class="mt-2 space-y-2">
              <li
                v-for="(row, idx) in props.zoneEditDraft.tradeRows"
                :key="idx"
                class="flex items-center gap-2"
              >
                <select
                  v-model="row.trade"
                  class="min-w-0 flex-1 rounded-xl border border-forena-200 bg-white px-2 py-2 text-sm font-semibold text-forena-800 outline-none ring-forena-300 focus:ring-2"
                >
                  <option v-for="opt in props.TRADE_OPTIONS" :key="opt.key" :value="opt.key">
                    {{ opt.label() }}
                  </option>
                </select>
                <input
                  v-model.number="row.need"
                  type="number"
                  min="0"
                  class="w-20 shrink-0 rounded-xl border border-forena-200 bg-white px-2 py-2 text-center text-sm font-bold tabular-nums text-forena-900 outline-none ring-forena-300 focus:ring-2"
                />
                <button
                  type="button"
                  class="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                  :disabled="props.zoneEditDraft.tradeRows.length <= 1"
                  @click="removeZoneEditRow(idx)"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </li>
            </ul>
            <button
              type="button"
              class="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-flare-700 hover:bg-flare-50"
              @click="addZoneEditRow"
            >
              <Plus class="h-3.5 w-3.5" />
              {{ props.T.addTradeRow }}
            </button>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-xl border border-forena-200 bg-white px-4 py-2 text-sm font-bold text-forena-700 hover:bg-forena-50"
            @click="closeZoneEdit"
          >
            {{ props.T.cancel }}
          </button>
          <button
            type="button"
            class="rounded-xl bg-gradient-to-r from-forena-700 to-forena-900 px-4 py-2 text-sm font-bold text-white hover:from-forena-800 hover:to-forena-950"
            @click="saveZoneEdit"
          >
            {{ props.T.save }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="props.assignOverflowOpen"
      class="fixed inset-0 z-[96] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="assign-overflow-title"
      aria-describedby="assign-overflow-desc"
    >
      <button
        type="button"
        class="absolute inset-0 bg-forena-900/40 backdrop-blur-[1px]"
        :aria-label="props.T.cancel"
        @click="closeAssignOverflow"
      />
      <div
        class="relative z-10 w-full max-w-sm rounded-2xl border border-forena-100 bg-white p-6 text-center shadow-xl ring-1 ring-black/5"
        @click.stop
      >
        <div
          class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 ring-1 ring-amber-200/80"
          aria-hidden="true"
        >
          <AlertTriangle class="h-6 w-6 shrink-0" stroke-width="2" />
        </div>
        <h3 id="assign-overflow-title" class="text-base font-bold text-forena-900">
          {{ props.T.assignOverflowTitle }}
        </h3>
        <p
          id="assign-overflow-desc"
          class="mt-3 whitespace-pre-line text-sm leading-relaxed text-forena-600"
        >
          {{ props.T.assignOverflowWarn }}
        </p>
        <p
          v-if="props.assignOverflowMeta"
          class="mt-3 rounded-lg bg-forena-50 px-3 py-2 text-xs font-semibold tabular-nums text-forena-800"
        >
          현재 선택 {{ props.assignOverflowMeta.selected }}{{ props.T.count }} · 투입 가능
          {{ props.assignOverflowMeta.remaining }}{{ props.T.count }}
        </p>
        <div class="mt-6 flex justify-center">
          <button
            type="button"
            class="rounded-xl bg-gradient-to-r from-forena-700 to-forena-900 px-6 py-2 text-sm font-bold text-white hover:from-forena-800 hover:to-forena-950"
            @click="closeAssignOverflow"
          >
            {{ props.T.assignOverflowOk }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="props.saveConfirmOpen"
      class="fixed inset-0 z-[95] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-confirm-title"
      aria-describedby="save-confirm-desc"
    >
      <button
        type="button"
        class="absolute inset-0 bg-forena-900/40 backdrop-blur-[1px]"
        :aria-label="props.T.cancel"
        @click="closeSaveConfirm"
      />
      <div
        class="relative z-10 w-full max-w-sm rounded-2xl border border-forena-100 bg-white p-6 text-center shadow-xl ring-1 ring-black/5"
        @click.stop
      >
        <div
          class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-forena-100 text-forena-700 ring-1 ring-forena-200/80"
          aria-hidden="true"
        >
          <AlertTriangle class="h-6 w-6 shrink-0" stroke-width="2" />
        </div>
        <h3 id="save-confirm-title" class="text-base font-bold text-forena-900">
          {{ props.T.savePlacementConfirmTitle }}
        </h3>
        <p
          id="save-confirm-desc"
          class="mt-3 whitespace-pre-line text-sm leading-relaxed text-forena-600"
        >
          {{ props.T.savePlacementConfirmWarn }}
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            class="rounded-xl border border-forena-200 bg-white px-4 py-2 text-sm font-bold text-forena-700 hover:bg-forena-50"
            @click="closeSaveConfirm"
          >
            {{ props.T.cancel }}
          </button>
          <button
            type="button"
            class="rounded-xl bg-gradient-to-r from-forena-700 to-forena-900 px-4 py-2 text-sm font-bold text-white hover:from-forena-800 hover:to-forena-950"
            @click="executeFinalizeSave"
          >
            {{ props.T.savePlacementConfirmProceed }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="props.resetConfirmOpen"
      class="fixed inset-0 z-[95] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="reset-confirm-title"
      aria-describedby="reset-confirm-desc"
    >
      <button
        type="button"
        class="absolute inset-0 bg-forena-900/40 backdrop-blur-[1px]"
        :aria-label="props.T.cancel"
        @click="closeResetConfirm"
      />
      <div
        class="relative z-10 w-full max-w-md rounded-2xl border border-forena-100 bg-white p-6 shadow-xl ring-1 ring-black/5"
        @click.stop
      >
        <div class="flex flex-col items-center text-center">
          <div
            class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 ring-1 ring-rose-200/80"
            aria-hidden="true"
          >
            <AlertTriangle class="h-6 w-6 shrink-0" stroke-width="2" />
          </div>
          <h3 id="reset-confirm-title" class="text-base font-bold text-forena-900">
            {{ props.T.resetConfirmTitle }}
          </h3>
          <p
            id="reset-confirm-desc"
            class="mt-2 whitespace-pre-line text-sm leading-relaxed text-forena-600"
          >
            {{ props.T.resetConfirmWarn }}
          </p>
        </div>

        <div class="mt-5 rounded-xl border border-slate-200/80 bg-slate-50/60 overflow-hidden">
          <div class="flex items-center justify-between border-b border-slate-200/70 px-4 py-2">
            <span class="text-xs font-bold text-forena-700">{{ props.T.resetConfirmZoneCol }}</span>
            <span class="text-xs font-bold text-forena-700">{{ props.T.resetConfirmCountCol }}</span>
          </div>
          <div
            v-if="props.resetConfirmRows.length === 0"
            class="px-4 py-4 text-center text-xs text-slate-400"
          >
            {{ props.T.resetConfirmNoAssigned }}
          </div>
          <div
            v-else
            class="max-h-52 overflow-y-auto divide-y divide-slate-200/50"
          >
            <div
              v-for="row in props.resetConfirmRows"
              :key="row.label"
              class="flex items-center justify-between px-4 py-2"
            >
              <span class="truncate text-xs text-forena-800">{{ row.label }}</span>
              <span class="ml-3 shrink-0 text-xs font-semibold tabular-nums text-rose-700">
                {{ row.count }}{{ props.T.countUnit }}
              </span>
            </div>
          </div>
          <div
            v-if="props.resetConfirmRows.length > 0"
            class="flex items-center justify-between border-t border-slate-200/70 bg-slate-100/60 px-4 py-2"
          >
            <span class="text-xs font-bold text-forena-800">{{ props.T.resetConfirmTotal }}</span>
            <span class="text-xs font-bold tabular-nums text-rose-700">
              {{ props.resetConfirmTotal }}{{ props.T.countUnit }}
            </span>
          </div>
        </div>

        <div class="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            class="rounded-xl border border-forena-200 bg-white px-5 py-2 text-sm font-bold text-forena-700 hover:bg-forena-50"
            @click="closeResetConfirm"
          >
            {{ props.T.cancel }}
          </button>
          <button
            type="button"
            class="rounded-xl bg-gradient-to-r from-rose-600 to-rose-800 px-5 py-2 text-sm font-bold text-white hover:from-rose-700 hover:to-rose-900"
            @click="executeReset"
          >
            {{ props.T.resetConfirmProceed }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      class="pointer-events-none fixed bottom-4 right-4 z-[80] flex max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      <div
        v-for="t in props.toasts"
        :key="t.id"
        class="pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold shadow-lg ring-1 ring-black/5"
        :class="toastClass(t.variant)"
      >
        <AlertTriangle
          v-if="t.variant === 'warning'"
          class="mt-0.5 h-5 w-5 shrink-0"
          aria-hidden="true"
        />
        <span>{{ t.message }}</span>
      </div>
    </div>
  </Teleport>
</template>
