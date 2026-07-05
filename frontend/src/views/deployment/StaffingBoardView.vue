<script setup>
import { useStaffingBoard } from '@/composables/deployment/useStaffingBoard'
import StaffingZoneTradePanel from '@/components/deployment/staffing/StaffingZoneTradePanel.vue'
import StaffingWorkerPoolPanel from '@/components/deployment/staffing/StaffingWorkerPoolPanel.vue'
import StaffingBoardModals from '@/components/deployment/staffing/StaffingBoardModals.vue'

const {
  T,
  TRADE_OPTIONS,
  isTradeScoped,
  zonesByTrade,
  isTradeGroupExpanded,
  toggleTradeGroup,
  openResetConfirm,
  openZoneEdit,
  removeFromSubZone,
  openWorkerProfile,
  poolAffiliationFilter,
  poolTradeOptions,
  workerPoolSearch,
  selectedWaitingIds,
  showOnlyUnassignedInPool,
  assignTargetSubZoneId,
  assignOptions,
  boardKindBreakdown,
  staffingTableRows,
  poolTotalPages,
  poolCurrentPage,
  poolHeaderAllChecked,
  poolSelectableWaitingIds,
  poolPagedGroups,
  poolHeaderCheckboxRef,
  poolGroupAllChecked,
  poolGroupSelectableIds,
  poolGroupIsOpen,
  togglePoolGroupExpanded,
  togglePoolHeaderSelectAll,
  togglePoolGroupSelectAll,
  toggleSelectWaiting,
  assignSelectedWorkers,
  poolGoToPage,
  onToggleUnassignedFilter,
  autoRecommend,
  openSaveConfirm,
  zoneEditOpen,
  zoneEditDraft,
  assignOverflowOpen,
  assignOverflowMeta,
  saveConfirmOpen,
  resetConfirmOpen,
  resetConfirmRows,
  resetConfirmTotal,
  toasts,
  closeZoneEdit,
  saveZoneEdit,
  addZoneEditRow,
  removeZoneEditRow,
  closeAssignOverflow,
  closeSaveConfirm,
  executeFinalizeSave,
  closeResetConfirm,
  executeReset,
} = useStaffingBoard()
</script>

<template>
  <div class="space-y-6 pb-10">
    <div class="flex shrink-0 flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-widest text-flare-600">
          {{ T.pageKicker }}
        </p>
        <h1 class="text-xl font-bold text-forena-900">{{ T.boardTitle }}</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-if="!isTradeScoped"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-flare-200 bg-flare-50 px-3 py-1.5 text-xs font-semibold text-forena-800 hover:bg-flare-100"
          @click="autoRecommend"
        >
          {{ T.autoRec }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-forena-700 to-forena-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-forena-800 hover:to-forena-950"
          @click="openSaveConfirm"
        >
          {{ T.confirm }}
        </button>
      </div>
    </div>

    <StaffingZoneTradePanel
      :T="T"
      :zones-by-trade="zonesByTrade"
      :is-trade-group-expanded="isTradeGroupExpanded"
      @open-reset-confirm="openResetConfirm"
      @toggle-trade-group="toggleTradeGroup"
      @open-zone-edit="openZoneEdit"
      @remove-from-sub-zone="removeFromSubZone"
      @open-worker-profile="openWorkerProfile"
    />

    <StaffingWorkerPoolPanel
      :T="T"
      v-model:pool-affiliation-filter="poolAffiliationFilter"
      v-model:worker-pool-search="workerPoolSearch"
      v-model:assign-target-sub-zone-id="assignTargetSubZoneId"
      :pool-trade-options="poolTradeOptions"
      :selected-waiting-ids="selectedWaitingIds"
      :show-only-unassigned-in-pool="showOnlyUnassignedInPool"
      :assign-options="assignOptions"
      :board-kind-breakdown="boardKindBreakdown"
      :staffing-table-rows="staffingTableRows"
      :pool-total-pages="poolTotalPages"
      :pool-current-page="poolCurrentPage"
      :pool-header-all-checked="poolHeaderAllChecked"
      :pool-selectable-waiting-ids="poolSelectableWaitingIds"
      :pool-paged-groups="poolPagedGroups"
      :pool-header-checkbox-ref="poolHeaderCheckboxRef"
      :pool-group-all-checked="poolGroupAllChecked"
      :pool-group-selectable-ids="poolGroupSelectableIds"
      :pool-group-is-open="poolGroupIsOpen"
      @assign="assignSelectedWorkers"
      @toggle-unassigned-filter="onToggleUnassignedFilter"
      @go-to-page="poolGoToPage"
      @toggle-pool-header-select-all="togglePoolHeaderSelectAll"
      @toggle-pool-group-select-all="togglePoolGroupSelectAll"
      @toggle-pool-group-expanded="togglePoolGroupExpanded"
      @toggle-select-waiting="toggleSelectWaiting"
      @open-worker-profile="openWorkerProfile"
    />

    <StaffingBoardModals
      :T="T"
      :TRADE_OPTIONS="TRADE_OPTIONS"
      :zone-edit-open="zoneEditOpen"
      :zone-edit-draft="zoneEditDraft"
      :assign-overflow-open="assignOverflowOpen"
      :assign-overflow-meta="assignOverflowMeta"
      :save-confirm-open="saveConfirmOpen"
      :reset-confirm-open="resetConfirmOpen"
      :reset-confirm-rows="resetConfirmRows"
      :reset-confirm-total="resetConfirmTotal"
      :toasts="toasts"
      @close-zone-edit="closeZoneEdit"
      @save-zone-edit="saveZoneEdit"
      @add-zone-row="addZoneEditRow"
      @remove-zone-row="removeZoneEditRow"
      @close-assign-overflow="closeAssignOverflow"
      @close-save-confirm="closeSaveConfirm"
      @execute-save="executeFinalizeSave"
      @close-reset-confirm="closeResetConfirm"
      @execute-reset="executeReset"
    />
  </div>
</template>
