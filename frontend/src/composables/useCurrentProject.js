import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

export const DEFAULT_PROJECT_ID = 1

function firstValue(value) {
  return Array.isArray(value) ? value[0] : value
}

export function toProjectId(value) {
  const n = Number(firstValue(value))
  return Number.isFinite(n) && n > 0 ? n : null
}

export function resolveProjectId(routeLike) {
  const params = routeLike?.params ?? {}
  const query = routeLike?.query ?? {}

  return (
    toProjectId(params.projectId) ??
    toProjectId(params.projectIdx) ??
    toProjectId(query.projectId) ??
    toProjectId(query.projectIdx) ??
    toProjectId(query.siteId)
  )
}

export function useCurrentProject(fallbackProjectId = DEFAULT_PROJECT_ID) {
  const route = useRoute()
  const auth = useAuthStore()

  const currentProjectId = computed(
    () =>
      toProjectId(auth.projectId) ??
      resolveProjectId(route) ??
      toProjectId(fallbackProjectId) ??
      DEFAULT_PROJECT_ID,
  )

  return {
    currentProjectId,
  }
}
