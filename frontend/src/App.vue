<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'
import { useAuthStore } from '@/stores/authStore'

const route = useRoute()
const auth = useAuthStore()

const isLoginRoute = computed(() => route.name === 'login' || route.path === '/login')
const isUploadRoute = computed(() => route.path === '/site/upload')
</script>

<template>
  <template v-if="isLoginRoute">
    <div class="min-h-screen w-full flex-1 overflow-x-hidden overflow-y-auto">
      <RouterView />
    </div>
  </template>
  <!-- 사이드바 없는 일반 페이지 (upload 등) -->
  <template v-else-if="isUploadRoute">
    <div class="min-h-screen w-full overflow-y-auto bg-mesh-page bg-forena-50 text-slate-900">
      <main class="p-6">
        <RouterView />
      </main>
    </div>
  </template>
  <div
    v-else
    class="relative flex min-h-0 flex-1 overflow-hidden bg-mesh-page bg-forena-50 text-slate-900"
  >
    <AppSidebar />
    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <main class="min-h-0 flex-1 overflow-y-auto p-6">
        <RouterView :key="String(auth.projectId ?? '')" />
      </main>
    </div>
  </div>
</template>
