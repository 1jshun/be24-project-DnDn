<script setup>
import { X } from 'lucide-vue-next'
import { userRoleLabel } from '@/stores/authStore'

defineProps({
  T: { type: Object, required: true },
  ROLE_OPTIONS: { type: Array, required: true },
  modalOpen: { type: Boolean, required: true },
  modalMode: { type: String, required: true },
  formCreate: { type: Object, required: true },
  formEdit: { type: Object, required: true },
  projectOptions: { type: Array, required: true },
  sortedProjectOptions: { type: Array, required: true },
  tradeOptions: { type: Array, required: true },
  editTradeOptions: { type: Array, required: true },
  tradeLoading: { type: Boolean, required: true },
  editTradeLoading: { type: Boolean, required: true },
  needsSiteForRole: { type: Boolean, required: true },
  needsTrade: { type: Boolean, required: true },
  editNeedsSite: { type: Boolean, required: true },
  editNeedsTrade: { type: Boolean, required: true },
  selectedProjectLabel: { type: String, required: true },
  emailCheckState: { type: String, required: true },
  approveOpen: { type: Boolean, required: true },
  rejectOpen: { type: Boolean, required: true },
  requestDetailOpen: { type: Boolean, required: true },
  selectedRequest: { type: Object, default: null },
  bulkRejectOpen: { type: Boolean, required: true },
  bulkRejectBusy: { type: Boolean, required: true },
  bulkRejectEligible: { type: Array, required: true },
  formatLoginId: { type: Function, required: true },
  formatPhoneNumber: { type: Function, required: true },
  formatEmailInput: { type: Function, required: true },
  normalizeEmail: { type: Function, required: true },
  projectOptionLabel: { type: Function, required: true },
  statusLabel: { type: Function, required: true },
  isPendingRequest: { type: Function, required: true },
  requestRowTitle: { type: Function, required: true },
  requestRowDetailText: { type: Function, required: true },
  requestSiteNameForDetail: { type: Function, required: true },
  formatReqDate: { type: Function, required: true },
  requestRowRequestedRoleStr: { type: Function, required: true },
  requestRowRoleStr: { type: Function, required: true },
})

const approvePasswordModel = defineModel('approvePassword', { type: String, required: true })
const rejectNoteModel = defineModel('rejectNote', { type: String, required: true })
const bulkRejectNoteInputModel = defineModel('bulkRejectNoteInput', { type: String, required: true })

const emit = defineEmits([
  'close-modal',
  'submit-modal',
  'create-email-input',
  'notify-password-reset',
  'close-request-detail',
  'start-approve-from-detail',
  'start-reject-from-detail',
  'close-approve',
  'submit-approve',
  'close-reject',
  'submit-reject',
  'close-bulk-reject',
  'submit-bulk-reject',
])
</script>

<template>
  <Teleport to="body">
    <div
      v-if="requestDetailOpen && selectedRequest"
      class="fixed inset-0 z-[205] flex items-center justify-center bg-forena-950/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      @click.self="emit('close-request-detail')"
    >
      <div
        class="flex max-h-[min(92vh,680px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-flare-100/90 bg-white shadow-[0_24px_64px_rgba(0,26,61,0.12)]"
        role="dialog"
        aria-modal="true"
      >
        <div
          class="flex items-start justify-between gap-2 border-b border-forena-100/80 px-4 py-3"
        >
          <h2 class="min-w-0 flex-1 text-sm font-bold leading-snug text-forena-900">
            {{ T.detailModalTitle }}
          </h2>
          <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <span
              class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1"
              :class="
                isPendingRequest(selectedRequest)
                  ? 'bg-amber-50 text-amber-900 ring-amber-200/80'
                  : String(selectedRequest.status).toUpperCase() === 'APPROVED'
                    ? 'bg-emerald-50 text-emerald-800 ring-emerald-200/80'
                    : 'bg-slate-100 text-slate-600 ring-slate-200/80'
              "
            >
              {{ statusLabel(selectedRequest.status) }}
            </span>
            <template v-if="isPendingRequest(selectedRequest)">
              <template v-if="selectedRequest.demo">
                <span
                  class="max-w-[8rem] text-right text-[10px] font-medium leading-tight text-slate-400"
                >
                  {{ T.demoRequestHint }}
                </span>
              </template>
              <template v-else>
                <button
                  type="button"
                  class="rounded-lg bg-forena-800 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-forena-900"
                  @click.stop="emit('start-approve-from-detail')"
                >
                  {{ T.reqApprove }}
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50"
                  @click.stop="emit('start-reject-from-detail')"
                >
                  {{ T.reqReject }}
                </button>
              </template>
            </template>
            <button
              type="button"
              class="rounded-lg p-1 text-forena-400 hover:bg-forena-50"
              :aria-label="T.cancel"
              @click.stop="emit('close-request-detail')"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm text-forena-800">
          <dl class="space-y-2.5">
            <div>
              <dt class="text-[11px] font-bold text-forena-500">{{ T.colReqTitle }}</dt>
              <dd class="mt-0.5 font-semibold text-forena-900">
                {{ requestRowTitle(selectedRequest) }}
              </dd>
            </div>
            <div>
              <dt class="text-[11px] font-bold text-forena-500">{{ T.lblDetailAt }}</dt>
              <dd class="mt-0.5">{{ formatReqDate(selectedRequest) }}</dd>
            </div>
            <div>
              <dt class="text-[11px] font-bold text-forena-500">{{ T.lblDetailSiteCode }}</dt>
              <dd class="mt-0.5">{{ requestSiteNameForDetail(selectedRequest) }}</dd>
            </div>
            <div>
              <dt class="text-[11px] font-bold text-forena-500">
                {{ T.lblDetailRequestedLoginId }}
              </dt>
              <dd class="mt-0.5 font-mono text-xs">
                {{ selectedRequest.requestedLoginId ?? selectedRequest.loginId ?? '—' }}
              </dd>
            </div>
            <div>
              <dt class="text-[11px] font-bold text-forena-500">
                {{ T.lblDetailRequestedName }}
              </dt>
              <dd class="mt-0.5">{{ selectedRequest.requestedName ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-[11px] font-bold text-forena-500">
                {{ T.lblDetailRequestedRole }}
              </dt>
              <dd class="mt-0.5">
                {{ userRoleLabel(requestRowRequestedRoleStr(selectedRequest)) }}
              </dd>
            </div>
            <div>
              <dt class="text-[11px] font-bold text-forena-500">{{ T.lblDetailName }}</dt>
              <dd class="mt-0.5">{{ selectedRequest.name ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-[11px] font-bold text-forena-500">{{ T.lblDetailRole }}</dt>
              <dd class="mt-0.5">{{ userRoleLabel(requestRowRoleStr(selectedRequest)) }}</dd>
            </div>
            <div>
              <dt class="text-[11px] font-bold text-forena-500">{{ T.lblDetailTrade }}</dt>
              <dd class="mt-0.5">{{ selectedRequest.trade ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-[11px] font-bold text-forena-500">{{ T.lblDetailBody }}</dt>
              <dd class="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">
                {{ requestRowDetailText(selectedRequest) }}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="modalOpen"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-forena-950/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      @click.self="emit('close-modal')"
    >
      <div
        class="flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-flare-100/90 bg-white shadow-[0_24px_64px_rgba(0,26,61,0.12)]"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-center justify-between border-b border-forena-100/80 px-4 py-3">
          <h2 class="text-sm font-bold text-forena-900">
            {{ modalMode === 'create' ? T.modalCreate : T.modalEdit }}
          </h2>
          <button
            type="button"
            class="rounded-lg p-1 text-forena-400 hover:bg-forena-50"
            @click="emit('close-modal')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
          <template v-if="modalMode === 'create'">
            <label class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">로그인 ID</span>
              <input
                v-model="formCreate.loginId"
                type="text"
                class="w-full rounded-lg border border-forena-200 px-3 py-2 text-sm font-mono"
                placeholder="user01"
                maxlength="30"
                spellcheck="false"
                autocapitalize="off"
                autocomplete="off"
                @input="formCreate.loginId = formatLoginId(formCreate.loginId)"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.pwdNew }}</span>
              <input
                v-model="formCreate.password"
                type="password"
                class="w-full rounded-lg border border-forena-200 px-3 py-2"
                minlength="8"
                maxlength="32"
                autocomplete="new-password"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.phone }}</span>
              <input
                v-model="formCreate.phone"
                type="tel"
                class="w-full rounded-lg border border-forena-200 px-3 py-2"
                placeholder="010-1234-5678"
                inputmode="tel"
                maxlength="13"
                autocomplete="tel"
                @input="formCreate.phone = formatPhoneNumber(formCreate.phone)"
              />
            </label>
            <div class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.email }}</span>
              <div class="relative">
                <input
                  v-model="formCreate.email"
                  type="email"
                  class="w-full rounded-lg border border-forena-200 px-3 py-2 pr-8"
                  placeholder="name@example.com"
                  maxlength="80"
                  autocomplete="email"
                  @input="emit('create-email-input')"
                  @blur="formCreate.email = normalizeEmail(formCreate.email)"
                />
                <span
                  v-if="emailCheckState === 'available'"
                  class="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm font-bold text-emerald-500"
                  aria-label="사용 가능한 이메일"
                >✓</span>
                <span
                  v-else-if="emailCheckState === 'taken'"
                  class="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm font-bold text-rose-500"
                  aria-label="이미 사용 중인 이메일"
                >✗</span>
                <span
                  v-else-if="emailCheckState === 'checking'"
                  class="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[10px] text-forena-400"
                >…</span>
              </div>
              <p
                v-if="emailCheckState === 'taken'"
                class="mt-1 text-[11px] font-semibold text-rose-500"
              >
                이미 사용 중인 이메일입니다.
              </p>
            </div>
            <label class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">이름</span>
              <input
                v-model="formCreate.name"
                type="text"
                class="w-full rounded-lg border border-forena-200 px-3 py-2"
                maxlength="30"
                autocomplete="name"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">{{
                T.rolePickHint
              }}</span>
              <select
                v-model="formCreate.role"
                class="w-full rounded-lg border border-forena-200/90 bg-white px-3 py-2 text-sm shadow-sm"
              >
                <option v-for="ro in ROLE_OPTIONS" :key="ro.value" :value="ro.value">
                  {{ ro.label }}
                </option>
              </select>
            </label>
            <label v-if="needsSiteForRole" class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.sitePick }}</span>
              <select
                v-model.number="formCreate.projectIdx"
                class="w-full rounded-lg border border-forena-200 bg-white px-3 py-2 text-sm"
              >
                <option :value="null">현장 선택</option>
                <option v-for="p in projectOptions" :key="p.idx" :value="p.idx">
                  {{ p.name }}
                </option>
              </select>
              <p v-if="selectedProjectLabel" class="mt-1 text-[10px] text-forena-400">
                선택: {{ selectedProjectLabel }}
              </p>
            </label>
            <label v-if="needsTrade" class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">{{
                T.tradePick
              }}</span>
              <span class="mb-1 block text-[10px] text-forena-400">{{ T.tradeHint }}</span>
              <select
                v-model="formCreate.trade"
                class="w-full rounded-lg border border-forena-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                :disabled="tradeLoading || formCreate.projectIdx == null"
              >
                <option value="">{{ tradeLoading ? '불러오는 중…' : '공종 선택' }}</option>
                <option v-for="t in tradeOptions" :key="t" :value="t">{{ t }}</option>
              </select>
            </label>
          </template>

          <template v-else>
            <p class="rounded-lg bg-forena-50 px-3 py-2 text-[11px] text-forena-600">
              {{ T.loginIdRo }}
            </p>
            <label class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">{{
                T.lblAccountName
              }}</span>
              <input
                v-model="formEdit.name"
                type="text"
                class="w-full rounded-lg border border-forena-200 px-3 py-2"
                maxlength="30"
                autocomplete="name"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.phone }}</span>
              <input
                v-model="formEdit.phone"
                type="tel"
                class="w-full rounded-lg border border-forena-200 px-3 py-2"
                placeholder="010-1234-5678"
                inputmode="tel"
                maxlength="13"
                autocomplete="tel"
                @input="formEdit.phone = formatPhoneNumber(formEdit.phone)"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.email }}</span>
              <input
                v-model="formEdit.email"
                type="email"
                class="w-full rounded-lg border border-forena-200 px-3 py-2"
                placeholder="name@example.com"
                maxlength="80"
                autocomplete="email"
                @input="formEdit.email = formatEmailInput(formEdit.email)"
                @blur="formEdit.email = normalizeEmail(formEdit.email)"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">{{
                T.rolePickHint
              }}</span>
              <select
                v-model="formEdit.role"
                class="w-full rounded-lg border border-forena-200 bg-white px-3 py-2"
              >
                <option v-for="ro in ROLE_OPTIONS" :key="ro.value" :value="ro.value">
                  {{ ro.label }}
                </option>
              </select>
            </label>
            <label v-if="editNeedsSite" class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.sitePick }}</span>
              <select
                v-model.number="formEdit.projectIdx"
                class="w-full rounded-lg border border-forena-200 bg-white px-3 py-2 text-sm"
              >
                <option :value="null">현장 선택</option>
                <option v-for="p in sortedProjectOptions" :key="'e-' + p.idx" :value="p.idx">
                  {{ projectOptionLabel(p) }}
                </option>
              </select>
            </label>
            <label v-if="editNeedsTrade" class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">{{
                T.tradePick
              }}</span>
              <span class="mb-1 block text-[10px] text-forena-400">{{ T.tradeHint }}</span>
              <select
                v-model="formEdit.trade"
                class="w-full rounded-lg border border-forena-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                :disabled="editTradeLoading || formEdit.projectIdx == null"
              >
                <option value="">{{ editTradeLoading ? '불러오는 중…' : '공종 선택' }}</option>
                <option v-for="t in editTradeOptions" :key="'et-' + t" :value="t">{{ t }}</option>
              </select>
            </label>
            <div class="mt-3 space-y-2 border-t border-forena-100 pt-3">
              <p class="text-[11px] font-bold text-black">{{ T.pwdEditSectionTitle }}</p>
              <button
                type="button"
                class="w-full rounded-lg border border-forena-200 bg-white py-2 text-xs font-bold text-black shadow-sm transition hover:bg-slate-50"
                @click="emit('notify-password-reset')"
              >
                {{ T.pwdResetMail }}
              </button>
            </div>
          </template>
        </div>

        <div class="flex gap-2 border-t border-forena-100/80 bg-white px-4 py-3">
          <button
            type="button"
            class="flex-1 rounded-lg border border-forena-200 bg-white py-2.5 text-xs font-bold text-forena-700 hover:bg-white"
            @click="emit('close-modal')"
          >
            {{ T.cancel }}
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-gradient-to-r from-forena-700 to-forena-900 py-2.5 text-xs font-bold text-white hover:from-forena-800 hover:to-black"
            @click="emit('submit-modal')"
          >
            {{ T.save }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="approveOpen"
      class="fixed inset-0 z-[210] flex items-center justify-center bg-forena-950/45 p-4 backdrop-blur-[2px]"
      @click.self="emit('close-approve')"
    >
      <div class="w-full max-w-sm rounded-2xl border border-flare-100/90 bg-white p-4 shadow-xl">
        <h3 class="text-sm font-bold text-forena-900">{{ T.modalApproveTitle }}</h3>
        <p class="mt-1 text-[11px] leading-snug text-forena-500">
          {{ T.approvePwdOptionalHint }}
        </p>
        <label class="mt-3 block text-sm">
          <span class="mb-1 block text-[11px] font-bold text-forena-500">{{
            T.labelInitialPwd
          }}</span>
          <input
            v-model="approvePasswordModel"
            type="password"
            class="w-full rounded-lg border border-forena-200 px-3 py-2"
            autocomplete="new-password"
            placeholder="선택 입력"
          />
        </label>
        <div class="mt-4 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-lg border border-forena-200 py-2 text-xs font-bold"
            @click="emit('close-approve')"
          >
            {{ T.cancel }}
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-forena-800 py-2 text-xs font-bold text-white hover:bg-forena-900"
            @click="emit('submit-approve')"
          >
            {{ T.reqApprove }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="rejectOpen"
      class="fixed inset-0 z-[210] flex items-center justify-center bg-forena-950/45 p-4 backdrop-blur-[2px]"
      @click.self="emit('close-reject')"
    >
      <div class="w-full max-w-sm rounded-2xl border border-flare-100/90 bg-white p-4 shadow-xl">
        <h3 class="text-sm font-bold text-forena-900">{{ T.modalRejectTitle }}</h3>
        <label class="mt-3 block text-sm">
          <span class="mb-1 block text-[11px] font-bold text-forena-500">{{
            T.labelRejectNote
          }}</span>
          <textarea
            v-model="rejectNoteModel"
            rows="3"
            class="w-full rounded-lg border border-forena-200 px-3 py-2 text-sm"
          />
        </label>
        <div class="mt-4 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-lg border border-forena-200 py-2 text-xs font-bold"
            @click="emit('close-reject')"
          >
            {{ T.cancel }}
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg border border-rose-200 bg-rose-50 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100"
            @click="emit('submit-reject')"
          >
            {{ T.reqReject }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="bulkRejectOpen"
      class="fixed inset-0 z-[212] flex items-center justify-center bg-forena-950/45 p-4 backdrop-blur-[2px]"
      @click.self="emit('close-bulk-reject')"
    >
      <div class="w-full max-w-sm rounded-2xl border border-flare-100/90 bg-white p-4 shadow-xl">
        <h3 class="text-sm font-bold text-forena-900">{{ T.bulkRejectModalTitle }}</h3>
        <p class="mt-1 text-xs text-forena-600">{{ bulkRejectEligible.length }}건</p>
        <label class="mt-3 block text-sm">
          <span class="mb-1 block text-[11px] font-bold text-forena-500">{{
            T.labelRejectNote
          }}</span>
          <textarea
            v-model="bulkRejectNoteInputModel"
            rows="3"
            class="w-full rounded-lg border border-forena-200 px-3 py-2 text-sm"
            :disabled="bulkRejectBusy"
          />
        </label>
        <div class="mt-4 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-lg border border-forena-200 py-2 text-xs font-bold"
            :disabled="bulkRejectBusy"
            @click="emit('close-bulk-reject')"
          >
            {{ T.cancel }}
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg border border-rose-200 bg-rose-50 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
            :disabled="bulkRejectBusy"
            @click="emit('submit-bulk-reject')"
          >
            {{ bulkRejectBusy ? '처리 중…' : T.bulkDismiss }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
