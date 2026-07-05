<script setup>

import { Plus } from 'lucide-vue-next'

import { useSiteRegister } from '@/composables/system/useSiteRegister'

import SiteRegisterHubSection from '@/components/system/site/SiteRegisterHubSection.vue'

import SiteProjectsSection from '@/components/system/site/SiteProjectsSection.vue'

import SiteRegisterModals from '@/components/system/site/SiteRegisterModals.vue'



const {

  T,

  ROLE_OPTIONS_HUB,

  toastMsg,

  toastVariant,

  hubSections,

  expanded,

  accountStatusTheadClass,

  rows,

  siteModalOpen,

  form,

  siteEditOpen,

  editSiteForm,

  modalOpen,

  formEdit,

  openSiteModal,

  accordionToggle,

  openEditModal,

  activateAccount,

  deactivateAccount,

  openSiteAccounts,

  openEditSite,

  deactivateSite,

  activateSite,

  closeSiteModal,

  submitRegister,

  closeSiteEdit,

  submitSiteEdit,

  closeAccountModal,

  submitAccountModal,

  notifyPasswordResetEmailSent,

  formatSiteCode,

  formatPhoneNumber,

  formatEmailInput,

  normalizeEmail,

} = useSiteRegister()

</script>



<template>

  <div class="space-y-6 pb-10">

    <div

      v-if="toastMsg"

      class="fixed top-16 left-1/2 z-[100] max-w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-lg"

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



    <div class="flex shrink-0 flex-wrap items-start justify-between gap-3">

      <div>

        <p class="text-[11px] font-bold uppercase tracking-widest text-flare-600">

          {{ T.kicker }}

        </p>

        <h1 class="text-xl font-bold text-forena-900">{{ T.title }}</h1>

      </div>

      <div class="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">

        <button

          type="button"

          class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-forena-700 to-forena-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-forena-800 hover:to-black"

          @click="openSiteModal"

        >

          <Plus class="h-3.5 w-3.5 shrink-0" />

          {{ T.registerSite }}

        </button>

      </div>

    </div>



    <SiteRegisterHubSection

      :T="T"

      :hub-sections="hubSections"

      :expanded="expanded"

      :account-status-thead-class="accountStatusTheadClass"

      @toggle-accordion="accordionToggle"

      @edit="openEditModal"

      @activate="activateAccount"

      @deactivate="deactivateAccount"

    />



    <SiteProjectsSection

      :T="T"

      :rows="rows"

      @open-site-accounts="openSiteAccounts"

      @edit-site="openEditSite"

      @deactivate-site="deactivateSite"

      @activate-site="activateSite"

    />



    <SiteRegisterModals

      :T="T"

      :ROLE_OPTIONS_HUB="ROLE_OPTIONS_HUB"

      :site-modal-open="siteModalOpen"

      :form="form"

      :site-edit-open="siteEditOpen"

      :edit-site-form="editSiteForm"

      :modal-open="modalOpen"

      :form-edit="formEdit"

      :format-site-code="formatSiteCode"

      :format-phone-number="formatPhoneNumber"

      :format-email-input="formatEmailInput"

      :normalize-email="normalizeEmail"

      @close-site-modal="closeSiteModal"

      @submit-register="submitRegister"

      @close-site-edit="closeSiteEdit"

      @submit-site-edit="submitSiteEdit"

      @close-account-modal="closeAccountModal"

      @submit-account-modal="submitAccountModal"

      @notify-password-reset="notifyPasswordResetEmailSent"

    />

  </div>

</template>


