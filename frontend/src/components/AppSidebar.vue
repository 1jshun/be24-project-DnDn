<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  Leaf,
  ChartGantt,
  CalendarCog,
  ListOrdered,
  NotebookPen,
  Users,
  HardHat,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CalendarRange,
  ChartPie,
  CloudSun,
  Truck,
  Shield,
  UserCog,
  LogOut,
  KeyRound,
  Check,
  MapPin,
  MapPinCheck,
  Files,
  FileText,
} from 'lucide-vue-next'
import { useAuthStore, USER_ROLE } from '@/stores/authStore'
import { getProjectList } from '@/api/project'
import brandLogoSrc from '@/assets/dndn-logo.png'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const siteMenuOpen = ref(false)
const siteMenuRoot = ref(/** @type {HTMLElement | null} */ (null))
/** 접힌 상태에서 Teleport 된 패널 — 외부 클릭 판별용 */
const siteMenuPanelRef = ref(/** @type {HTMLElement | null} */ (null))

/** 접힌 모드 floating 패널 위치 (메인 콘텐츠에 가리지 않도록 body 기준 fixed) */
const siteMenuFloatingStyle = ref(/** @type {Record<string, string>} */ ({}))

function updateSiteMenuFloatingPosition() {
  if (sidebarExpanded.value || !siteMenuOpen.value || !siteMenuRoot.value) return
  const r = siteMenuRoot.value.getBoundingClientRect()
  const gap = 8
  const minPanelPx = 192
  let left = r.right + gap
  if (left + minPanelPx > window.innerWidth - gap) {
    left = Math.max(gap, r.left - minPanelPx - gap)
  }
  const maxH = `min(18rem, calc(100vh - ${gap * 2}px))`
  siteMenuFloatingStyle.value = {
    top: `${Math.max(gap, r.top)}px`,
    left: `${left}px`,
    minWidth: '12rem',
    maxHeight: maxH,
  }
}

function onRepositionFloatingSiteMenu() {
  updateSiteMenuFloatingPosition()
}
function toggleSiteMenu() {
  if (!canSwitchSites.value) return
  siteMenuOpen.value = !siteMenuOpen.value
}

function closeSiteMenu() {
  siteMenuOpen.value = false
}

function onDocPointerDown(e) {
  const target = e.target instanceof Node ? e.target : null
  if (siteMenuOpen.value) {
    const root = siteMenuRoot.value
    const panel = siteMenuPanelRef.value
    const insideRoot = Boolean(root && target && root.contains(target))
    const insidePanel = Boolean(panel && target && panel.contains(target))
    if (!insideRoot && !insidePanel) {
      siteMenuOpen.value = false
    }
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onDocPointerDown)
  document.addEventListener('touchstart', onDocPointerDown)
  window.addEventListener('resize', onRepositionFloatingSiteMenu)
  window.addEventListener('scroll', onRepositionFloatingSiteMenu, true)
  loadProjectList()
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocPointerDown)
  document.removeEventListener('touchstart', onDocPointerDown)
  window.removeEventListener('resize', onRepositionFloatingSiteMenu)
  window.removeEventListener('scroll', onRepositionFloatingSiteMenu, true)
})

/** 사이드바 상단 현장 표시/스위처용 프로젝트 목록 */
const projectList = ref(/** @type {Array<{ id: number, name: string }>} */ ([]))
const projectListLoading = ref(false)

function mapProjectRow(raw) {
  const idx = raw?.idx ?? raw?.id ?? raw?.projectIdx ?? raw?.projectId
  const numIdx = Number(idx)
  if (!Number.isFinite(numIdx)) return null
  const rawName = typeof raw?.name === 'string' ? raw.name.trim() : ''
  const name = rawName || `현장 #${numIdx}`
  const active = raw?.active !== false
  return { id: numIdx, name, active }
}

async function loadProjectList() {
  if (projectListLoading.value) return
  if (!auth.isAuthenticated) return
  projectListLoading.value = true
  try {
    const list = await getProjectList()
    projectList.value = Array.isArray(list) ? list.map(mapProjectRow).filter(Boolean) : []
    autoSyncSiteCode()
  } catch {
    projectList.value = []
  } finally {
    projectListLoading.value = false
  }
}

/**
 * admin·HQ 계정은 로그인 응답에 siteCode가 없어서 URL 직접 접근 시
 * projectId는 복원되지만 siteCode가 빈 문자열인 상태가 됩니다.
 * 프로젝트 목록을 받아온 뒤 자동으로 siteCode를 채워 API 호출이 정상 동작하게 합니다.
 * - projectId 없음 → 첫 번째 현장 자동 선택
 * - projectId 있지만 siteCode 없음 → 프로젝트명에서 [코드] 추출 후 적용
 * - 모든 역할에서 현장 활성화 여부 동기화
 */
function extractSiteCodeFromProjectName(name) {
  const m = /^\[([^\]]+)\]/.exec(String(name || '').trim())
  return m ? m[1].trim() : ''
}

function autoSyncSiteCode() {
  if (projectList.value.length === 0) return

  const currentPid = Number(auth.projectId)
  const hasValidProject = Number.isFinite(currentPid) && currentPid > 0

  // 관리자/본사는 기존처럼 현장을 직접 전환한다.
  if (canSwitchSites.value && !hasValidProject) {
    onSelectProject(projectList.value[0])
    return
  }

  // 현장 계정은 백엔드가 siteCode 기준으로 필터링해 내려준 단일 현장을 그대로 고정한다.
  // 이전 세션 또는 새로고침 과정에서 projectId가 비어 있어도, 현장 선택 UI를 열지 않고 현재 현장으로 동기화한다.
  if (!canSwitchSites.value) {
    const assignedProject = hasValidProject
      ? projectList.value.find((p) => p.id === currentPid)
      : projectList.value[0]

    if (assignedProject) {
      const derivedSiteCode = extractSiteCodeFromProjectName(assignedProject.name) || auth.siteCode
      if (Number(auth.projectId) !== assignedProject.id || (!auth.siteCode && derivedSiteCode)) {
        auth.setProjectIdAndSiteCode(assignedProject.id, derivedSiteCode)
      }
      auth.setProjectActive(assignedProject.active ?? true)
    }
    return
  }

  const found = projectList.value.find((p) => p.id === currentPid)
  if (found) {
    if (!auth.siteCode) {
      const derivedSiteCode = extractSiteCodeFromProjectName(found.name)
      auth.setProjectIdAndSiteCode(found.id, derivedSiteCode)
    }
    auth.setProjectActive(found.active ?? true)
  }
}

/** 인증 변경 시 자동 재로드 (로그인 직후) */
watch(
  () => auth.isAuthenticated,
  (next) => {
    if (next) {
      loadProjectList()
    } else {
      projectList.value = []
      siteMenuOpen.value = false
    }
  },
)

const canSwitchSites = computed(
  () => auth.userRole === USER_ROLE.ADMIN || auth.userRole === USER_ROLE.HEADQUARTOR,
)

const currentProjectName = computed(() => {
  const pid = Number(auth.projectId)
  if (!Number.isFinite(pid) || pid <= 0) return ''
  const found = projectList.value.find((p) => p.id === pid)
  return found?.name ?? ''
})

function onSelectProject(project) {
  closeSiteMenu()
  if (!project || !Number.isFinite(project.id)) return
  if (Number(auth.projectId) === project.id) return
  const newSiteCode = extractSiteCodeFromProjectName(project.name)
  auth.setProjectIdAndSiteCode(project.id, newSiteCode)
  auth.setProjectActive(project.active ?? true)
}

function onLogout() {
  auth.logout()
  router.push('/login')
}

function goChangePassword() {
  router.push('/account/password')
}

const scheduleOpen = ref(true)
const deploymentOpen = ref(true)
const siteInfoOpen = ref(true)
const documentOpen = ref(true)
const accountMgmtOpen = ref(true)
const sidebarExpanded = ref(true)

watch(sidebarExpanded, (expanded) => {
  siteMenuOpen.value = false
  if (expanded) {
    scheduleOpen.value = true
    deploymentOpen.value = true
    siteInfoOpen.value = true
    documentOpen.value = true
    accountMgmtOpen.value = true
  }
})

watch(siteMenuOpen, async (open) => {
  if (open && !sidebarExpanded.value) {
    await nextTick()
    updateSiteMenuFloatingPosition()
  }
})

const L = {
  brandTitle: 'DnDn',
  brandSub: '현장 일정관리 시스템',
  productNameFull: 'DnDn 현장 일정관리 시스템',
  brandPlaceholder: '현장을 선택해주세요',
  brandSwitch: '현장 전환',
  brandLoading: '현장 정보를 불러오는 중…',
  scheduleGroup: '일정 관리',
  deploymentGroup: '투입 관리',
  siteInfoGroup: '현장 정보',
  documentGroup: '문서 관리',
  systemMgmtGroup: '시스템 관리',
  userMenuChangePwd: '비밀번호 수정',
  userMenuLogout: '로그아웃',
  sidebarCollapse: '사이드바 접기',
  sidebarExpand: '사이드바 펼치기',
}

const sidebarSiteTitle = computed(
  () =>
    currentProjectName.value || (projectListLoading.value ? L.brandLoading : L.brandPlaceholder),
)

const isCurrentProjectInactive = computed(
  () => Boolean(auth.projectId) && !auth.projectActive,
)

const scheduleNavAll = [
  {
    path: '/site/dashboard',
    label: 'ESG 대시보드',
    icon: Leaf,
  },
  {
    path: '/site/schedule',
    label: '전체 공정표',
    icon: ChartGantt,
  },
  {
    path: '/site/work-plan',
    label: '공정 계획',
    icon: CalendarCog,
  },
  {
    path: '/site/work-instructions',
    label: '작업 지시',
    icon: ListOrdered,
  },
  { path: '/site/daily-log', label: '공사 일보', icon: NotebookPen },
  {
    path: '/site/process-analysis',
    label: '공정 분석',
    icon: ChartPie,
  },
]

const deploymentNavAll = [
  {
    path: '/site/workers/manage',
    label: '근무자 관리',
    icon: Users,
    activePrefix: '/site/workers/manage',
  },
  { path: '/site/staffing', label: '인력 배치', icon: MapPinCheck },
]

const siteInfoNavAll = [
  { path: '/site/weather', label: '기상 관제', icon: CloudSun },
  { path: '/site/gate', label: '장비 입출차', icon: Truck },
]

const documentNavAll = [{ path: '/site/documents/upload', label: '업로드 문서', icon: Files }]

const accountNavAll = [
  {
    path: '/hr/accounts',
    label: '계정 및 권한 관리',
    icon: UserCog,
  },
]

/** 본사(HEADQUARTOR): 일정 그룹에서 대시보드·공정표만 노출 */
const scheduleItemsVisible = computed(() => {
  if (auth.userRole === USER_ROLE.HEADQUARTOR) {
    return scheduleNavAll.filter((i) => ['/site/dashboard', '/site/schedule'].includes(i.path))
  }
  return scheduleNavAll
})

/** 본사: 투입/현장/문서 미노출 */
const deploymentItemsVisible = computed(() =>
  auth.userRole === USER_ROLE.HEADQUARTOR ? [] : deploymentNavAll,
)
const siteInfoItemsVisible = computed(() =>
  auth.userRole === USER_ROLE.HEADQUARTOR ? [] : siteInfoNavAll,
)
const documentItemsVisible = computed(() =>
  auth.userRole === USER_ROLE.HEADQUARTOR ? [] : documentNavAll,
)

const navGroups = computed(() => {
  const groups = [
    {
      key: 'schedule',
      label: L.scheduleGroup,
      icon: CalendarRange,
      items: scheduleItemsVisible.value,
      open: scheduleOpen,
      iconClass: 'bg-gradient-to-br from-forena-500 to-forena-700',
      borderClass: 'border-forena-100',
    },
    {
      key: 'deployment',
      label: L.deploymentGroup,
      icon: Users,
      items: deploymentItemsVisible.value,
      open: deploymentOpen,
      iconClass: 'bg-gradient-to-br from-flare-500 to-flare-600',
      borderClass: 'border-flare-100',
    },
    {
      key: 'site-info',
      label: L.siteInfoGroup,
      icon: HardHat,
      items: siteInfoItemsVisible.value,
      open: siteInfoOpen,
      iconClass: 'bg-gradient-to-br from-forena-500 to-forena-700',
      borderClass: 'border-forena-100',
    },
    {
      key: 'document',
      label: L.documentGroup,
      icon: FileText,
      items: documentItemsVisible.value,
      open: documentOpen,
      iconClass: 'bg-gradient-to-br from-flare-500 to-flare-600',
      borderClass: 'border-flare-100',
    },
  ]

  /** 시스템 관리자(ADMIN)만 시스템 관리 그룹 */
  if (auth.userRole === USER_ROLE.ADMIN) {
    groups.push({
      key: 'account',
      label: L.systemMgmtGroup,
      icon: Shield,
      items: accountNavAll,
      open: accountMgmtOpen,
      iconClass: 'bg-gradient-to-br from-slate-600 to-forena-800',
      borderClass: 'border-slate-200',
    })
  }

  return groups.filter((g) => Array.isArray(g.items) && g.items.length > 0)
})

function pathActive(path, exact) {
  if (path === '/') return route.path === '/'
  if (exact) return route.path === path
  return route.path === path || route.path.startsWith(`${path}/`)
}

function navItemActive(item) {
  if (item.activePrefix && route.path.startsWith(item.activePrefix)) return true
  return pathActive(item.path, item.exact)
}

function linkClass(item) {
  const active = navItemActive(item)
  return [
    'relative flex items-center gap-2 rounded-xl py-2.5 pl-3 pr-3 text-sm font-medium transition-all duration-200',
    active
      ? [
          'font-semibold text-forena-900 shadow-sm ring-1 ring-forena-200/50',
          'bg-gradient-to-r from-forena-500/[0.12] via-flare-500/[0.06] to-transparent',
          'before:pointer-events-none before:absolute before:inset-y-2 before:left-0 before:z-10 before:w-[3px] before:rounded-full',
          'before:bg-gradient-to-r before:from-flare-500 before:via-flare-400/25 before:to-transparent',
        ].join(' ')
      : 'text-slate-600 hover:bg-white/90 hover:text-forena-800 hover:shadow-sm hover:ring-1 hover:ring-forena-100/80',
  ]
}

/** 접힌 네비 아이콘 행(`linkClassCollapsed` 비활성)과 동일한 넓이·패딩 */
function sidebarChromeBtnIdleCollapsed() {
  return [
    'relative flex w-full items-center justify-center rounded-xl p-2.5 text-slate-600 transition-all duration-200',
    'hover:bg-white/90 hover:text-forena-800 hover:ring-1 hover:ring-forena-100/80',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-flare-400/60',
  ].join(' ')
}

/** 펼친 네비 메뉴 링크(`linkClass` 비활성)와 동일한 패딩·타이포 */
function sidebarChromeBtnIdleExpanded() {
  return [
    'relative flex w-full items-center gap-2 rounded-xl py-2.5 pl-3 pr-3 text-sm font-medium text-slate-600 transition-all duration-200',
    'hover:bg-white/90 hover:text-forena-800 hover:shadow-sm hover:ring-1 hover:ring-forena-100/80',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-flare-400/60',
  ].join(' ')
}

/** 로고 우측 접기·계정 행 액션용 컴팩트 아이콘 버튼 */
function sidebarToolbarIconBtnClass(extra = '') {
  return [
    'relative flex shrink-0 items-center justify-center rounded-xl p-2.5 text-slate-600 transition-all duration-200',
    'hover:bg-white/90 hover:text-forena-800 hover:shadow-sm hover:ring-1 hover:ring-forena-100/80',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-flare-400/60',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}

function linkClassCollapsed(item) {
  const active = navItemActive(item)
  return [
    'relative flex w-full items-center justify-center rounded-xl p-2.5 transition-all duration-200',
    active
      ? 'bg-gradient-to-br from-forena-500/[0.14] to-flare-500/[0.08] text-forena-900 shadow-sm ring-1 ring-forena-200/50'
      : 'text-slate-600 hover:bg-white/90 hover:text-forena-800 hover:ring-1 hover:ring-forena-100/80',
  ]
}
</script>

<template>
  <aside
    class="scrollbar-hide hidden h-full min-h-0 shrink-0 flex-col border-r border-forena-200/50 bg-white/80 py-5 shadow-[4px_0_24px_rgba(0,46,85,0.06)] backdrop-blur-xl transition-[width] duration-300 ease-out md:flex"
    :class="sidebarExpanded ? 'w-72 px-3' : 'w-[4.5rem] px-1.5'"
  >
    <div class="flex shrink-0 flex-col gap-1" :class="sidebarExpanded ? '' : 'w-full'">
      <template v-if="sidebarExpanded">
        <div class="flex w-full min-w-0 items-start gap-2">
          <RouterLink
            to="/site/dashboard"
            class="group flex min-w-0 flex-1 flex-row items-center gap-3 rounded-2xl px-2 py-1 transition hover:bg-forena-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flare-400/50"
            :title="`${L.productNameFull} · ${sidebarSiteTitle}`"
          >
            <img :src="brandLogoSrc" alt="" class="sidebar-brand-logo shrink-0 object-contain" />
            <div class="flex min-w-0 flex-col items-start leading-none">
              <span class="sidebar-brand-title">{{ L.brandTitle }}</span>
              <span class="sidebar-brand-sub">{{ L.brandSub }}</span>
            </div>
          </RouterLink>
          <button
            type="button"
            :class="sidebarToolbarIconBtnClass()"
            :aria-expanded="sidebarExpanded"
            :aria-label="L.sidebarCollapse"
            @click="sidebarExpanded = !sidebarExpanded"
          >
            <ChevronsLeft class="h-4 w-4 shrink-0" />
          </button>
        </div>
      </template>
      <template v-else>
        <RouterLink
          to="/site/dashboard"
          class="group flex w-full min-w-0 justify-center rounded-2xl px-1 py-1 transition hover:bg-forena-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flare-400/50"
          :title="`${L.productNameFull} · ${sidebarSiteTitle}`"
        >
          <img
            :src="brandLogoSrc"
            alt=""
            class="sidebar-brand-logo sidebar-brand-logo--compact shrink-0 object-contain"
          />
        </RouterLink>
        <button
          type="button"
          :class="sidebarChromeBtnIdleCollapsed()"
          :aria-expanded="sidebarExpanded"
          :aria-label="L.sidebarExpand"
          @click="sidebarExpanded = !sidebarExpanded"
        >
          <ChevronsRight class="h-4 w-4 shrink-0" />
        </button>
      </template>

      <!-- 현장명 (본사·관리자만 드롭다운) -->
      <div ref="siteMenuRoot" class="relative min-w-0 w-full">
        <template v-if="sidebarExpanded">
          <button
            v-if="canSwitchSites"
            type="button"
            :class="[
              sidebarChromeBtnIdleExpanded(),
              'text-left font-bold tracking-tight text-forena-900 hover:text-forena-900',
            ]"
            aria-haspopup="menu"
            :aria-expanded="siteMenuOpen"
            :title="L.brandSwitch"
            @click.stop="toggleSiteMenu"
          >
            <span class="min-w-0 flex-1 truncate">{{ sidebarSiteTitle }}</span>
            <ChevronDown
              class="h-4 w-4 shrink-0 text-forena-500 transition"
              :class="siteMenuOpen ? 'rotate-180 text-flare-500' : ''"
            />
          </button>
          <p
            v-else
            class="truncate rounded-xl py-2.5 pl-3 pr-3 text-sm font-bold tracking-tight text-forena-900"
            :title="sidebarSiteTitle"
          >
            {{ sidebarSiteTitle }}
          </p>
        </template>
        <button
          v-else-if="canSwitchSites"
          type="button"
          :class="sidebarChromeBtnIdleCollapsed()"
          aria-haspopup="menu"
          :aria-expanded="siteMenuOpen"
          :title="`${L.brandSwitch}: ${sidebarSiteTitle}`"
          @click.stop="toggleSiteMenu"
        >
          <MapPin class="h-4 w-4 shrink-0" />
        </button>

        <Teleport to="body" :disabled="sidebarExpanded">
          <div
            v-show="canSwitchSites && siteMenuOpen"
            ref="siteMenuPanelRef"
            class="overflow-y-auto overflow-x-hidden rounded-xl border border-forena-200/90 bg-white/95 py-1 shadow-[0_12px_40px_rgba(0,26,61,0.14)] backdrop-blur-sm"
            :class="
              sidebarExpanded
                ? 'absolute left-0 right-0 top-full z-[80] mt-1 max-h-[18rem]'
                : 'fixed z-[9999] min-w-[12rem]'
            "
            :style="sidebarExpanded ? undefined : siteMenuFloatingStyle"
            role="menu"
          >
            <p v-if="projectListLoading" class="px-3 py-2 text-[11px] text-forena-500">
              {{ L.brandLoading }}
            </p>
            <p v-else-if="projectList.length === 0" class="px-3 py-2 text-[11px] text-forena-500">
              등록된 현장이 없습니다.
            </p>
            <button
              v-for="project in projectList"
              v-else
              :key="project.id"
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-forena-800 transition hover:bg-forena-50"
              :class="Number(auth.projectId) === project.id ? 'bg-flare-50/60 text-forena-900' : ''"
              role="menuitem"
              @click="onSelectProject(project)"
            >
              <Check
                v-if="Number(auth.projectId) === project.id"
                class="h-3.5 w-3.5 shrink-0 text-flare-500"
              />
              <span v-else class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span class="truncate">{{ project.name }}</span>
            </button>
          </div>
        </Teleport>
      </div>
    </div>

    <!-- 비활성 현장 안내 배너 -->
    <div
      v-if="sidebarExpanded && isCurrentProjectInactive"
      class="mx-1 mt-2 shrink-0 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2"
    >
      <p class="text-xs font-bold text-amber-700">비활성화된 현장</p>
      <p class="mt-0.5 text-[11px] leading-snug text-amber-600">읽기 전용 상태입니다. 데이터 수정이 제한됩니다.</p>
    </div>

    <!-- 네비 영역과 동일한 구분선 -->
    <div
      v-if="sidebarExpanded"
      class="mx-2 mt-3 shrink-0 border-t border-forena-100"
      aria-hidden="true"
    />
    <div v-else class="mx-auto my-2 h-px w-8 shrink-0 bg-forena-100" aria-hidden="true" />

    <nav
      class="min-h-0 min-w-0 flex-1 overflow-y-auto pb-4"
      :class="sidebarExpanded ? 'mt-3 space-y-1' : 'mt-0 flex flex-col items-center gap-0.5'"
      :aria-label="sidebarExpanded ? 'Navigation' : 'Navigation compact'"
    >
      <template v-if="sidebarExpanded">
        <div
          v-for="group in navGroups"
          :key="group.key"
          :class="group.key === 'schedule' ? '' : 'mt-4'"
        >
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-[10px] font-bold tracking-wider text-forena-400 uppercase transition hover:bg-white/60"
            @click="group.open.value = !group.open.value"
          >
            <span class="flex items-center gap-2 text-forena-800">
              <span
                class="flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-md shadow-forena-900/20"
                :class="group.iconClass"
              >
                <component :is="group.icon" class="h-3.5 w-3.5" />
              </span>
              {{ group.label }}
            </span>
            <ChevronDown v-if="group.open.value" class="h-4 w-4 shrink-0 text-flare-500" />
            <ChevronRight v-else class="h-4 w-4 shrink-0 text-slate-400" />
          </button>
          <div
            v-show="group.open.value"
            class="ml-1 space-y-0.5 border-l pl-2"
            :class="group.borderClass"
          >
            <RouterLink
              v-for="item in group.items"
              :key="item.path + (item.exact ? ':exact' : '')"
              :to="item.path"
              class="group"
              :class="linkClass(item)"
            >
              <component
                :is="item.icon"
                class="h-4 w-4 shrink-0"
                :class="navItemActive(item) ? 'text-flare-600' : 'text-slate-400'"
              />
              {{ item.label }}
            </RouterLink>
          </div>
        </div>
      </template>
      <template v-else>
        <template v-for="(group, groupIndex) in navGroups" :key="'compact-' + group.key">
          <div
            v-if="groupIndex > 0"
            class="my-2 h-px w-8 shrink-0 bg-forena-100"
            aria-hidden="true"
          />
          <RouterLink
            v-for="item in group.items"
            :key="'c-' + item.path + (item.exact ? ':exact' : '')"
            :to="item.path"
            :title="item.label"
            :class="linkClassCollapsed(item)"
          >
            <component
              :is="item.icon"
              class="h-4 w-4 shrink-0"
              :class="navItemActive(item) ? 'text-flare-600' : 'text-slate-400'"
            />
          </RouterLink>
        </template>
      </template>
    </nav>

    <div class="relative shrink-0 border-t border-forena-100/80 pt-2">
      <template v-if="sidebarExpanded">
        <div class="flex w-full items-center gap-1">
          <div
            class="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1.5"
            :title="`${auth.roleLabel} · ${auth.loginId || ''}`"
          >
            <div
              class="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-forena-500 via-flare-400 to-flare-500 shadow-sm ring-1 ring-white"
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1 leading-tight">
              <p class="truncate text-xs font-semibold text-forena-900">{{ auth.roleLabel }}</p>
              <p class="truncate text-[11px] text-forena-500">
                {{ auth.loginId || '—' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            :class="sidebarToolbarIconBtnClass()"
            :title="L.userMenuChangePwd"
            @click="goChangePassword"
          >
            <KeyRound class="h-4 w-4 shrink-0" />
          </button>
          <button
            type="button"
            :class="sidebarToolbarIconBtnClass('hover:!text-rose-700')"
            :title="L.userMenuLogout"
            @click="onLogout"
          >
            <LogOut class="h-4 w-4 shrink-0" />
          </button>
        </div>
      </template>
      <template v-else>
        <div class="flex w-full flex-col gap-1">
          <button
            type="button"
            :class="sidebarChromeBtnIdleCollapsed()"
            :title="L.userMenuChangePwd"
            @click="goChangePassword"
          >
            <KeyRound class="h-4 w-4 shrink-0" />
          </button>
          <button
            type="button"
            :class="[sidebarChromeBtnIdleCollapsed(), 'hover:!text-rose-700']"
            :title="L.userMenuLogout"
            @click="onLogout"
          >
            <LogOut class="h-4 w-4 shrink-0" />
          </button>
          <div class="flex justify-center pt-1">
            <div
              class="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-forena-500 via-flare-400 to-flare-500 shadow-sm ring-1 ring-white"
              :title="`${auth.roleLabel} · ${auth.loginId || ''}`"
            />
          </div>
        </div>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* 로그인 페이지 헤더와 동일 브랜드 — 사이드바 폭에 맞춘 크기 */
.sidebar-brand-logo {
  height: 38px;
  width: auto;
  max-width: 100%;
}

.sidebar-brand-logo--compact {
  height: 32px;
}

.sidebar-brand-title {
  font-size: 21px;
  font-weight: 800;
  color: #002e55;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.sidebar-brand-sub {
  margin-top: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  letter-spacing: -0.01em;
  line-height: 1.25;
}
</style>
