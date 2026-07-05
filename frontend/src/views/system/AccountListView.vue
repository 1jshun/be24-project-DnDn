<script setup>
import { ChevronDown, Plus, ArrowLeft } from 'lucide-vue-next'
import { useAccountList } from '@/composables/system/useAccountList'
import AccountStatusSection from '@/components/system/account/AccountStatusSection.vue'
import AccountModals from '@/components/system/account/AccountModals.vue'

const {
  T,
  ROLE_OPTIONS,
  projectIdxParam,
  toastMsg,
  toastVariant,
  currentSiteDisplay,
  sortedProjectOptions,
  workerAffiliationTab,
  directorFieldAccounts,
  hqFieldAccounts,
  tradeFieldAccounts,
  tradeGroupedRows,
  tradeAccordionOpen,
  accountStatusTheadClass,
  modalOpen,
  modalMode,
  formCreate,
  formEdit,
  projectOptions,
  tradeOptions,
  editTradeOptions,
  tradeLoading,
  editTradeLoading,
  needsSiteForRole,
  needsTrade,
  editNeedsSite,
  editNeedsTrade,
  selectedProjectLabel,
  emailCheckState,
  approveOpen,
  approvePassword,
  rejectOpen,
  rejectNote,
  requestDetailOpen,
  selectedRequest,
  bulkRejectOpen,
  bulkRejectNoteInput,
  bulkRejectBusy,
  bulkRejectEligible,
  formatLoginId,
  formatPhoneNumber,
  formatEmailInput,
  normalizeEmail,
  projectOptionLabel,
  statusLabel,
  isPendingRequest,
  requestRowTitle,
  requestRowDetailText,
  requestSiteNameForDetail,
  formatReqDate,
  requestRowRequestedRoleStr,
  requestRowRoleStr,
  openCreateModal,
  goBackToSiteHub,
  onSiteSwitcherChange,
  openEditModal,
  activateAccount,
  deactivateAccount,
  toggleTradeAccordion,
  closeModal,
  submitModal,
  onCreateEmailInput,
  notifyPasswordResetEmailSent,
  closeRequestDetail,
  startApproveFromDetail,
  startRejectFromDetail,
  closeApprove,
  submitApprove,
  closeReject,
  submitReject,
  closeBulkRejectModal,
  submitBulkRejectRequests,
} = useAccountList()
</script>

<template>
  <div class="space-y-6 pb-10">
    <div
      v-if="toastMsg"
      class="fixed top-16 left-1/2 z-[300] max-w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-lg"
      :class="
        toastVariant === 'danger'
          ? 'border-rose-200 bg-rose-50 text-rose-900'
          : toastVariant === 'warning'
            ? 'border-amber-200 bg-amber-50 text-amber-950'
            : 'border-sky-200 bg-sky-50 text-sky-900'
      "
    >
      {{ toastMsg }}
    </div>

    <div class="flex shrink-0 flex-col gap-3">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-[11px] font-bold uppercase tracking-widest text-flare-600">
            {{ T.kicker }}
          </p>
          <div class="mt-1 flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2">
            <h1 class="text-xl font-bold leading-tight text-forena-900">{{ T.title }}</h1>
            <label
              class="relative inline-flex min-w-0 max-w-[min(100%,22rem)] flex-1 items-center sm:flex-initial"
            >
              <span class="sr-only">{{ currentSiteDisplay }}</span>
              <select
                class="w-full min-w-0 cursor-pointer appearance-none border-0 border-b border-forena-200/70 bg-transparent py-0.5 pr-7 pb-1 pl-0 text-sm font-semibold text-forena-900 shadow-none transition hover:border-flare-400/70 focus:border-flare-500 focus:outline-none focus:ring-0"
                :value="Number.isFinite(projectIdxParam) ? projectIdxParam : ''"
                :aria-label="currentSiteDisplay"
                @change="onSiteSwitcherChange"
              >
                <option v-for="p in sortedProjectOptions" :key="p.idx" :value="p.idx">
                  {{ projectOptionLabel(p) }}
                </option>
              </select>
              <ChevronDown
                class="pointer-events-none absolute top-1/2 right-0 h-4 w-4 -translate-y-1/2 text-forena-500/75"
                aria-hidden="true"
              />
            </label>
          </div>
        </div>
        <div class="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-forena-700 to-forena-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-forena-800 hover:to-black"
            @click="openCreateModal"
          >
            <Plus class="h-3.5 w-3.5 shrink-0" />
            {{ T.newAccount }}
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-forena-200 bg-white px-3 py-1.5 text-xs font-semibold text-forena-800 shadow-sm hover:bg-forena-50"
            @click="goBackToSiteHub"
          >
            <ArrowLeft class="h-3.5 w-3.5 shrink-0 text-flare-600" />
            {{ T.backToSites }}
          </button>
        </div>
      </div>
    </div>

    <AccountStatusSection
      :T="T"
      v-model:worker-affiliation-tab="workerAffiliationTab"
      :director-field-accounts="directorFieldAccounts"
      :hq-field-accounts="hqFieldAccounts"
      :trade-field-accounts="tradeFieldAccounts"
      :trade-grouped-rows="tradeGroupedRows"
      :trade-accordion-open="tradeAccordionOpen"
      :account-status-thead-class="accountStatusTheadClass"
      @edit="openEditModal"
      @activate="activateAccount"
      @deactivate="deactivateAccount"
      @toggle-trade-accordion="toggleTradeAccordion"
    />

    <AccountModals
      :T="T"
      :ROLE_OPTIONS="ROLE_OPTIONS"
      :modal-open="modalOpen"
      :modal-mode="modalMode"
      :form-create="formCreate"
      :form-edit="formEdit"
      :project-options="projectOptions"
      :sorted-project-options="sortedProjectOptions"
      :trade-options="tradeOptions"
      :edit-trade-options="editTradeOptions"
      :trade-loading="tradeLoading"
      :edit-trade-loading="editTradeLoading"
      :needs-site-for-role="needsSiteForRole"
      :needs-trade="needsTrade"
      :edit-needs-site="editNeedsSite"
      :edit-needs-trade="editNeedsTrade"
      :selected-project-label="selectedProjectLabel"
      :email-check-state="emailCheckState"
      :approve-open="approveOpen"
      v-model:approve-password="approvePassword"
      :reject-open="rejectOpen"
      v-model:reject-note="rejectNote"
      :request-detail-open="requestDetailOpen"
      :selected-request="selectedRequest"
      :bulk-reject-open="bulkRejectOpen"
      v-model:bulk-reject-note-input="bulkRejectNoteInput"
      :bulk-reject-busy="bulkRejectBusy"
      :bulk-reject-eligible="bulkRejectEligible"
      :format-login-id="formatLoginId"
      :format-phone-number="formatPhoneNumber"
      :format-email-input="formatEmailInput"
      :normalize-email="normalizeEmail"
      :project-option-label="projectOptionLabel"
      :status-label="statusLabel"
      :is-pending-request="isPendingRequest"
      :request-row-title="requestRowTitle"
      :request-row-detail-text="requestRowDetailText"
      :request-site-name-for-detail="requestSiteNameForDetail"
      :format-req-date="formatReqDate"
      :request-row-requested-role-str="requestRowRequestedRoleStr"
      :request-row-role-str="requestRowRoleStr"
      @close-modal="closeModal"
      @submit-modal="submitModal"
      @create-email-input="onCreateEmailInput"
      @notify-password-reset="notifyPasswordResetEmailSent"
      @close-request-detail="closeRequestDetail"
      @start-approve-from-detail="startApproveFromDetail"
      @start-reject-from-detail="startRejectFromDetail"
      @close-approve="closeApprove"
      @submit-approve="submitApprove"
      @close-reject="closeReject"
      @submit-reject="submitReject"
      @close-bulk-reject="closeBulkRejectModal"
      @submit-bulk-reject="submitBulkRejectRequests"
    />
  </div>
</template>
