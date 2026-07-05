import { computed, watch } from 'vue'
import { USER_ROLE } from '@/stores/authStore'

export const ROLE_VIEW_MODE = {
  MANAGER: 'site_manager',
  TRADE: 'process_owner',
}

export function isSiteManagerRole(role) {
  return [USER_ROLE.ADMIN, USER_ROLE.SITE_MANAGER, USER_ROLE.SITE_DIRECTOR].includes(role)
}

export function isTradeScopedRole(role) {
  return [USER_ROLE.SECTION_LEADER, USER_ROLE.SECTION_SUPERVISOR].includes(role)
}

export function cleanTrade(value) {
  return String(value || '').trim()
}

export function tradeMatches(recordTrade, assignedTrade) {
  const left = cleanTrade(recordTrade)
  const right = cleanTrade(assignedTrade)
  if (!right) return true
  if (!left) return false
  return left === right || left.includes(right) || right.includes(left)
}

export function useAuthScope(auth) {
  const isManagerScope = computed(() => isSiteManagerRole(auth.userRole))
  const isTradeScope = computed(() => isTradeScopedRole(auth.userRole))
  const assignedTrade = computed(() => cleanTrade(auth.trade))
  const currentRoleMode = computed(() =>
    isTradeScope.value ? ROLE_VIEW_MODE.TRADE : ROLE_VIEW_MODE.MANAGER,
  )

  function syncRoleMode(targetRoleRef, targetTradeRef) {
    targetRoleRef.value = currentRoleMode.value
    if (isTradeScope.value && assignedTrade.value) {
      targetTradeRef.value = assignedTrade.value
    }
  }

  function watchRoleMode(targetRoleRef, targetTradeRef) {
    watch(
      [currentRoleMode, assignedTrade],
      () => syncRoleMode(targetRoleRef, targetTradeRef),
      { immediate: true },
    )
  }

  return {
    isManagerScope,
    isTradeScope,
    assignedTrade,
    currentRoleMode,
    syncRoleMode,
    watchRoleMode,
  }
}
