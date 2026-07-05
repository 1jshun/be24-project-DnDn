import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore, pathAllowedForRole } from '../stores/authStore'
import { fetchMasterSchedules } from '../api/masterSchedule'

const meta = (title) => ({ title })

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },

    {
      path: '/login',
      name: 'login',
      component: () => import('../views/system/LoginView.vue'),
      meta: meta('로그인'),
    },
    {
      path: '/account/password',
      name: 'accountPassword',
      component: () => import('../views/system/AccountPasswordView.vue'),
      meta: meta('비밀번호 변경'),
    },
    {
      path: '/site/upload',
      name: 'siteUpload',
      component: () => import('../views/document/FirstDocumentUpload.vue'),
      meta: meta('최초 공정표 문서 등록'),
    },
    { path: '/site/onboarding', redirect: '/site/workers/manage' },
    {
      path: '/site/workers/manage',
      name: 'siteWorkerManagement',
      component: () => import('../views/deployment/WorkerManagementView.vue'),
      meta: meta('근무자 관리'),
    },
    {
      path: '/site/workers/manage/:id',
      name: 'siteWorkerProfile',
      component: () => import('../views/deployment/WorkerProfileDetailView.vue'),
      meta: meta('작업자 상세 프로필'),
    },
    {
      path: '/site/onboarding/workers/:id',
      redirect: (to) => ({ path: `/site/workers/manage/${to.params.id}` }),
    },
    {
      path: '/site/workers/:id',
      redirect: (to) => ({ path: `/site/workers/manage/${to.params.id}` }),
    },
    {
      path: '/site/access-attendance',
      redirect: '/site/workers/manage',
    },
    {
      path: '/site/work-instructions',
      name: 'siteWorkInstructions',
      component: () => import('../views/schedule/WorkInstructionView.vue'),
      meta: meta('작업 지시'),
    },
    {
      path: '/site/staffing',
      name: 'siteStaffing',
      component: () => import('../views/deployment/StaffingBoardView.vue'),
      meta: meta('인력 배치'),
    },
    { path: '/site/man-days', redirect: '/site/dashboard' },
    { path: '/site/settlement', redirect: '/site/dashboard' },
    {
      path: '/site/daily-log',
      name: 'siteDailyLog',
      component: () => import('../views/schedule/DailyWorkReportView.vue'),
      meta: meta('작업 일보'),
    },
    {
      path: '/site/schedule',
      name: 'siteSchedule',
      component: () => import('../views/schedule/ScheduleChartView.vue'),
      meta: meta('공정 지표보고'),
    },
    {
      path: '/site/process-analysis',
      name: 'siteProcessAnalysis',
      component: () => import('../views/schedule/AnalysisView.vue'),
      meta: meta('공정 분석'),
    },
    {
      path: '/site/gate',
      name: 'HeavyEquipmentGate',
      component: () => import('../views/siteInfo/HeavyEquipmentGateView.vue'),
      meta: meta('중장비 입출차'),
    },
    {
      path: '/site/work-plan',
      name: 'siteWorkPlan',
      component: () => import('../views/schedule/WorkPlanView.vue'),
      meta: meta('작업 계획'),
    },
    {
      path: '/site/weather',
      name: 'siteWeather',
      component: () => import('../views/siteInfo/WeatherControlView.vue'),
      meta: meta('기상 관제'),
    },
    {
      path: '/site/dashboard',
      name: 'siteDashboard',
      component: () => import('../views/schedule/EsgDashboardView.vue'),
      meta: meta('ESG 통합 대시보드'),
    },
    {
      path: '/site/documents/upload',
      name: 'siteDocumentUpload',
      component: () => import('../views/document/DocumentUploadView.vue'),
      meta: meta('업로드 문서'),
    },
    { path: '/site/documents/ai-history', redirect: '/site/documents/upload' },
    { path: '/site/alerts', redirect: '/site/dashboard' },

    {
      path: '/hr/sites/:id?',
      redirect: '/hr/accounts',
    },
    { path: '/hr/partners', redirect: '/hr/accounts' },
    { path: '/hr/partners/:id', redirect: '/hr/accounts' },
    { path: '/hr/attendance/list', redirect: '/site/workers/manage' },
    { path: '/hr/attendance/closing', redirect: '/site/dashboard' },
    { path: '/hr/payroll/calculation', redirect: '/site/dashboard' },
    { path: '/hr/payroll/ledger', redirect: '/site/dashboard' },
    { path: '/hr/payroll/statement', redirect: '/site/dashboard' },
    { path: '/hr/payroll/standard', redirect: '/site/dashboard' },
    {
      path: '/hr/accounts',
      name: 'hrAccounts',
      component: () => import('../views/system/SiteRegisterView.vue'),
      meta: meta('계정 및 권한 관리'),
    },
    {
      path: '/hr/accounts/sites/:projectIdx',
      name: 'hrAccountsSite',
      component: () => import('../views/system/AccountListView.vue'),
      meta: meta('계정 및 권한 관리'),
    },
    { path: '/system/admins', redirect: '/hr/accounts' },

    { path: '/SiteManagement', redirect: '/site/dashboard' },
    { path: '/SiteManagement/:id', redirect: '/site/dashboard' },
    { path: '/PartnerManagement', redirect: '/hr/accounts' },
    {
      path: '/PartnerManagement/:id',
      redirect: '/hr/accounts',
    },
    { path: '/Attendance/List', redirect: '/site/workers/manage' },
    { path: '/Attendance/Closing', redirect: '/site/dashboard' },
    { path: '/Payroll/Calculation', redirect: '/site/dashboard' },
    { path: '/Payroll/Ledger', redirect: '/site/dashboard' },
    { path: '/Payroll/Statement', redirect: '/site/dashboard' },
    { path: '/Payroll/Standard', redirect: '/site/dashboard' },
    { path: '/Account/List', redirect: '/hr/accounts' },
    { path: '/Invoices', redirect: '/site/dashboard' },
  ],
})

function firstRouteValue(value) {
  return Array.isArray(value) ? value[0] : value
}

function numericProjectId(value) {
  const n = Number(firstRouteValue(value))
  return Number.isFinite(n) && n > 0 ? n : null
}

function projectIdFromRoute(to, auth) {
  return (
    numericProjectId(auth.projectId) ??
    numericProjectId(to.params.projectId) ??
    numericProjectId(to.params.projectIdx) ??
    numericProjectId(to.query.projectId) ??
    numericProjectId(to.query.projectIdx) ??
    numericProjectId(to.query.siteId)
  )
}

function routeWithProject(path, to, projectId) {
  const query = { ...to.query }
  if (projectId) query.projectId = String(projectId)
  return { path, query }
}

async function hasRegisteredSchedule(projectId) {
  if (!projectId) return false
  const schedules = await fetchMasterSchedules({ projectId })
  return Array.isArray(schedules) && schedules.length > 0
}

async function clearInitialUploadIfRegistered(auth, to) {
  const projectId = projectIdFromRoute(to, auth)
  if (!projectId) return { registered: false, projectId: null }

  try {
    if (await hasRegisteredSchedule(projectId)) {
      if (numericProjectId(auth.projectId) !== projectId) {
        auth.setProjectId(projectId)
      }
      auth.markInitialUploadComplete()
      return { registered: true, projectId }
    }
  } catch {
    // 조회 실패 시 기존 라우팅 판단을 유지한다.
  }

  return { registered: false, projectId }
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const uploadRoute = () => {
    return routeWithProject('/site/upload', to, projectIdFromRoute(to, auth))
  }
  const dashboardRoute = (projectId = projectIdFromRoute(to, auth)) =>
    routeWithProject('/site/dashboard', to, projectId)
  const shouldCheckInitialUpload = () =>
    auth.initialUploadRequired && pathAllowedForRole(auth.userRole, '/site/upload')

  if (to.path === '/login') {
    if (auth.isAuthenticated) {
      if (auth.stayOnLogin) return true
      if (shouldCheckInitialUpload()) {
        const checked = await clearInitialUploadIfRegistered(auth, to)
        return checked.registered ? dashboardRoute(checked.projectId) : uploadRoute()
      }
      return dashboardRoute()
    }
    return true
  }

  if (!auth.isAuthenticated) {
    return { path: '/login' }
  }

  if (shouldCheckInitialUpload()) {
    const checked = await clearInitialUploadIfRegistered(auth, to)
    if (checked.registered) {
      if (to.path === '/site/upload') return dashboardRoute(checked.projectId)
    } else if (to.path !== '/site/upload' && to.path !== '/account/password') {
      return uploadRoute()
    }
  }

  if (!pathAllowedForRole(auth.userRole, to.path)) {
    return shouldCheckInitialUpload()
      ? uploadRoute()
      : dashboardRoute()
  }
  return true
})

export default router
