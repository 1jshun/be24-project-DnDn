<script setup>
import { X } from 'lucide-vue-next'

defineProps({
  T: { type: Object, required: true },
  ROLE_OPTIONS_HUB: { type: Array, required: true },
  siteModalOpen: { type: Boolean, required: true },
  form: { type: Object, required: true },
  siteEditOpen: { type: Boolean, required: true },
  editSiteForm: { type: Object, required: true },
  modalOpen: { type: Boolean, required: true },
  formEdit: { type: Object, required: true },
  formatSiteCode: { type: Function, required: true },
  formatPhoneNumber: { type: Function, required: true },
  formatEmailInput: { type: Function, required: true },
  normalizeEmail: { type: Function, required: true },
})

const emit = defineEmits([
  'close-site-modal',
  'submit-register',
  'close-site-edit',
  'submit-site-edit',
  'close-account-modal',
  'submit-account-modal',
  'notify-password-reset',
])
</script>

<template>
  <Teleport to="body">
    <div
      v-if="siteModalOpen"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-forena-950/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      @click.self="emit('close-site-modal')"
    >
      <div
        class="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-forena-100 bg-white shadow-[0_24px_64px_rgba(0,26,61,0.12)]"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-center justify-between border-b border-forena-50 px-4 py-3">
          <h2 class="text-sm font-bold text-forena-900">{{ T.modalTitle }}</h2>
          <button
            type="button"
            class="rounded-lg p-1 text-forena-400 hover:bg-forena-50"
            @click="emit('close-site-modal')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <div class="space-y-3 px-4 py-4 text-sm">
          <label class="block">
            <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.fieldCode }}</span>
            <input
              v-model="form.siteCode"
              type="text"
              class="w-full rounded-lg border border-forena-200 px-3 py-2 font-mono text-sm"
              :placeholder="T.codePh"
              maxlength="4"
              spellcheck="false"
              autocapitalize="characters"
              autocomplete="off"
              @input="form.siteCode = formatSiteCode(form.siteCode)"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.fieldName }}</span>
            <input
              v-model="form.siteName"
              type="text"
              class="w-full rounded-lg border border-forena-200 px-3 py-2"
              :placeholder="T.namePh"
              maxlength="60"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.fieldAddress }}</span>
            <input
              v-model="form.address"
              type="text"
              class="w-full rounded-lg border border-forena-200 px-3 py-2"
              :placeholder="T.addrPh"
              maxlength="120"
            />
          </label>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.fieldStart }}</span>
              <input
                v-model="form.startDate"
                type="date"
                class="w-full rounded-lg border border-forena-200 px-3 py-2 text-sm"
                :max="form.endDate || undefined"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.fieldEnd }}</span>
              <input
                v-model="form.endDate"
                type="date"
                class="w-full rounded-lg border border-forena-200 px-3 py-2 text-sm"
                :min="form.startDate || undefined"
              />
            </label>
          </div>
        </div>
        <div class="flex gap-2 border-t border-forena-50 bg-forena-50/40 px-4 py-3">
          <button
            type="button"
            class="flex-1 rounded-lg border border-forena-200 bg-white py-2.5 text-xs font-bold text-forena-700"
            @click="emit('close-site-modal')"
          >
            {{ T.cancel }}
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-gradient-to-r from-forena-700 to-forena-900 py-2.5 text-xs font-bold text-white hover:from-forena-800 hover:to-black"
            @click="emit('submit-register')"
          >
            {{ T.saveRegister }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="siteEditOpen"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-forena-950/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      @click.self="emit('close-site-edit')"
    >
      <div
        class="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-forena-100 bg-white shadow-[0_24px_64px_rgba(0,26,61,0.12)]"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-center justify-between border-b border-forena-50 px-4 py-3">
          <h2 class="text-sm font-bold text-forena-900">{{ T.modalEditSite }}</h2>
          <button
            type="button"
            class="rounded-lg p-1 text-forena-400 hover:bg-forena-50"
            @click="emit('close-site-edit')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <div class="space-y-3 px-4 py-4 text-sm">
          <label class="block">
            <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.fieldCode }}</span>
            <input
              v-model="editSiteForm.siteCode"
              type="text"
              class="w-full rounded-lg border border-forena-200 px-3 py-2 font-mono text-sm"
              :placeholder="T.codePh"
              maxlength="4"
              spellcheck="false"
              autocapitalize="characters"
              autocomplete="off"
              @input="editSiteForm.siteCode = formatSiteCode(editSiteForm.siteCode)"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.fieldName }}</span>
            <input
              v-model="editSiteForm.siteName"
              type="text"
              class="w-full rounded-lg border border-forena-200 px-3 py-2"
              :placeholder="T.namePh"
              maxlength="60"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.fieldAddress }}</span>
            <input
              v-model="editSiteForm.address"
              type="text"
              class="w-full rounded-lg border border-forena-200 px-3 py-2"
              :placeholder="T.addrPh"
              maxlength="120"
            />
          </label>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.fieldStart }}</span>
              <input
                v-model="editSiteForm.startDate"
                type="date"
                class="w-full rounded-lg border border-forena-200 px-3 py-2 text-sm"
                :max="editSiteForm.endDate || undefined"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-[11px] font-bold text-forena-500">{{ T.fieldEnd }}</span>
              <input
                v-model="editSiteForm.endDate"
                type="date"
                class="w-full rounded-lg border border-forena-200 px-3 py-2 text-sm"
                :min="editSiteForm.startDate || undefined"
              />
            </label>
          </div>
        </div>
        <div class="flex gap-2 border-t border-forena-50 bg-forena-50/40 px-4 py-3">
          <button
            type="button"
            class="flex-1 rounded-lg border border-forena-200 bg-white py-2.5 text-xs font-bold text-forena-700"
            @click="emit('close-site-edit')"
          >
            {{ T.cancel }}
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-gradient-to-r from-forena-700 to-forena-900 py-2.5 text-xs font-bold text-white hover:from-forena-800 hover:to-black"
            @click="emit('submit-site-edit')"
          >
            {{ T.saveAccount }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="modalOpen"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-forena-950/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      @click.self="emit('close-account-modal')"
    >
      <div
        class="flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-flare-100/90 bg-white shadow-[0_24px_64px_rgba(0,26,61,0.12)]"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-center justify-between border-b border-forena-100/80 px-4 py-3">
          <h2 class="text-sm font-bold text-forena-900">{{ T.modalEdit }}</h2>
          <button
            type="button"
            class="rounded-lg p-1 text-forena-400 hover:bg-forena-50"
            @click="emit('close-account-modal')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
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
              <option v-for="ro in ROLE_OPTIONS_HUB" :key="ro.value" :value="ro.value">
                {{ ro.label }}
              </option>
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
        </div>

        <div class="flex gap-2 border-t border-forena-100/80 bg-white px-4 py-3">
          <button
            type="button"
            class="flex-1 rounded-lg border border-forena-200 bg-white py-2.5 text-xs font-bold text-forena-700 hover:bg-white"
            @click="emit('close-account-modal')"
          >
            {{ T.cancel }}
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-gradient-to-r from-forena-700 to-forena-900 py-2.5 text-xs font-bold text-white hover:from-forena-800 hover:to-black"
            @click="emit('submit-account-modal')"
          >
            {{ T.saveAccount }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
