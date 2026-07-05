import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/** Spring {@code UserRole} 값과 동일 */
export const USER_ROLE = {
  ADMIN: 'ADMIN',
  HEADQUARTOR: 'HEADQUARTOR',
  /** 현장 관리자 — 백엔드 {@code UserRole} enum name 과 동일해야 함 */
  SITE_MANAGER: 'SITE_MANAGER',
  SITE_DIRECTOR: 'SITE_DIRECTOR',
  SECTION_LEADER: 'SECTION_LEADER',
  SECTION_SUPERVISOR: 'SECTION_SUPERVISOR',
}

/** @deprecated 레거시 로컬 데모 — 마이그레이션용 */
const LEGACY_SITE_MANAGER = 'site_manager'

/** 이전 버전 키 — 남아 있으면 무시하고 제거하여 자동 로그인 유발 방지 */
const LEGACY_AUTH_STORAGE_KEYS = ['dndnAuth']

/** 세션 형식 버전 bump 시 기존 자동 로그인 무력화 */
const AUTH_STORAGE_KEY = 'dndnAuth_v2'
const INITIAL_UPLOAD_DONE_PREFIX = 'dndnInitialUploadDone_v1'

function normalizeProjectId(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function initialUploadDoneKey({ loginId, projectId, siteCode }) {
  const scope = projectId != null ? `project:${projectId}` : `site:${siteCode || 'unknown'}`
  return `${INITIAL_UPLOAD_DONE_PREFIX}:${scope}:${loginId || 'unknown'}`
}

function hasInitialUploadDone(snapshot) {
  return localStorage.getItem(initialUploadDoneKey(snapshot)) === '1'
}

function rememberInitialUploadDone(snapshot) {
  localStorage.setItem(initialUploadDoneKey(snapshot), '1')
}

/**
 * 과거 형식 또는 신뢰할 수 없는 스냅샷 제거 + JWT 무효화
 */
function purgeLegacyAuthSnapshots() {
  for (const k of LEGACY_AUTH_STORAGE_KEYS) {
    if (localStorage.getItem(k) != null) {
      localStorage.removeItem(k)
      localStorage.removeItem('accessToken')
    }
  }
}

function readSavedAuth() {
  purgeLegacyAuthSnapshots()
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw)
    if (!o || typeof o !== 'object') {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
    /** v2부터 sessionKind 필수 (없으면 이전 배포 스냅샷 → 폐기) */
    if (o.sessionKind !== 'server' && o.sessionKind !== 'demo') {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      localStorage.removeItem('accessToken')
      return null
    }
    /** 서버 로그인 세션은 토큰이 있을 때만 유지 */
    if (o.sessionKind === 'server' && !localStorage.getItem('accessToken')) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
    if (!o.isAuthenticated) return null
    return o
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

function normalizeUserRole(raw) {
  if (!raw) return USER_ROLE.SITE_DIRECTOR
  if (raw === LEGACY_SITE_MANAGER) return USER_ROLE.SITE_DIRECTOR
  if (Object.values(USER_ROLE).includes(raw)) return raw
  return USER_ROLE.SITE_DIRECTOR
}

function saveAuth(snapshot) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(snapshot))
}

/**
 * @param {string} userRole {@link USER_ROLE}
 * @param {string} fullPath
 * @param {{ stayOnLogin?: boolean }} [opts]
 */
export function pathAllowedForRole(userRole, fullPath) {
  const path = fullPath.split('?')[0] || '/'
  if (path === '/' || path === '/login') return true

  if (path === '/account/password') return true

  const role = normalizeUserRole(userRole)

  if (role === USER_ROLE.ADMIN) {
    return path.startsWith('/site/') || path.startsWith('/hr/') || path.startsWith('/system/')
  }

  if (role === USER_ROLE.HEADQUARTOR) {
    return path === '/site/dashboard' || path === '/site/schedule'
  }

  if (
    role === USER_ROLE.SITE_DIRECTOR ||
    role === USER_ROLE.SECTION_LEADER ||
    role === USER_ROLE.SECTION_SUPERVISOR ||
    role === USER_ROLE.SITE_MANAGER
  ) {
    if (path.startsWith('/hr/accounts') || path.startsWith('/hr/sites')) return false
    if (path.startsWith('/system/')) return false
    if (path === '/site/upload') return isInitialUploadRole(role)
    return path.startsWith('/site/') || path.startsWith('/hr/')
  }

  return false
}

export function isInitialUploadRole(userRole) {
  const role = normalizeUserRole(userRole)
  return role === USER_ROLE.SITE_DIRECTOR || role === USER_ROLE.SITE_MANAGER
}

export function userRoleLabel(userRole) {
  const role = normalizeUserRole(userRole)
  const labels = {
    [USER_ROLE.ADMIN]: '시스템 관리자',
    [USER_ROLE.HEADQUARTOR]: '본사',
    [USER_ROLE.SITE_MANAGER]: '현장 관리자',
    [USER_ROLE.SITE_DIRECTOR]: '현장 총 책임자',
    [USER_ROLE.SECTION_LEADER]: '공종별 책임자',
    [USER_ROLE.SECTION_SUPERVISOR]: '공종별 현장 관리자',
  }
  return labels[role] || role
}

export const useAuthStore = defineStore('auth', () => {
  const saved = readSavedAuth()

  /** @type {import('vue').Ref<string>} */
  const userRole = ref(normalizeUserRole(saved?.userRole ?? saved?.role))

  /** API 로그인 시 부여되는 JWT에 대응 */
  /** @type {import('vue').Ref<string>} */
  const loginId = ref(saved?.loginId || '')

  /** @type {import('vue').Ref<string>} */
  const userName = ref(saved?.userName || '')

  /** @type {import('vue').Ref<number|string|null>} */
  const userIdx = ref(saved?.userIdx ?? null)

  /** @type {import('vue').Ref<number|null>} */
  const projectId = ref(normalizeProjectId(saved?.projectId))

  /** @type {import('vue').Ref<string>} */
  const siteCode = ref(saved?.siteCode || '')

  /** @type {import('vue').Ref<string>} */
  const trade = ref(saved?.trade || '')

  /** @type {import('vue').Ref<boolean>} */
  const projectActive = ref(saved?.projectActive !== false)

  const isAuthenticated = ref(Boolean(saved?.isAuthenticated))

  /** 본사·대시보드만 보기(구 viewer 데모) */
  const stayOnLogin = ref(Boolean(saved?.stayOnLogin))

  /** 최초 문서 업로드 분기 등 */
  const isUpload = ref(saved?.isUpload ?? true)

  const roleLabel = computed(() => userRoleLabel(userRole.value))

  const isAdminRole = computed(() => userRole.value === USER_ROLE.ADMIN)
  const initialUploadRequired = computed(
    () => isUpload.value && isInitialUploadRole(userRole.value),
  )

  function persistAuth() {
    const sessionKind = localStorage.getItem('accessToken') ? 'server' : 'demo'
    saveAuth({
      sessionKind,
      userRole: userRole.value,
      loginId: loginId.value,
      userName: userName.value,
      userIdx: userIdx.value,
      projectId: projectId.value,
      siteCode: siteCode.value,
      trade: trade.value,
      projectActive: projectActive.value,
      isAuthenticated: isAuthenticated.value,
      stayOnLogin: stayOnLogin.value,
      isUpload: isUpload.value,
    })
  }

  /**
   * @param {object} loginRes — AuthDto.LoginRes (loginId 미포함 가능)
   * @param {{ stayOnLogin?: boolean, loginId?: string }} [options]
   */
  function applyLoginSuccess(loginRes, options = {}) {
    const token = loginRes?.accessToken
    if (token) {
      localStorage.setItem('accessToken', token)
    }
    let roleRaw = loginRes?.role
    if (roleRaw && typeof roleRaw === 'object' && roleRaw !== null && 'name' in roleRaw) {
      roleRaw = /** @type {{ name?: string }} */ (roleRaw).name
    }
    userRole.value = normalizeUserRole(String(roleRaw ?? ''))
    const lid =
      typeof options.loginId === 'string'
        ? options.loginId.trim()
        : typeof loginRes?.loginId === 'string'
          ? loginRes.loginId.trim()
          : loginId.value
    if (lid) loginId.value = lid
    userName.value = loginRes?.name ?? ''
    userIdx.value = loginRes?.userIdx ?? null
    projectId.value = normalizeProjectId(loginRes?.projectId)
    siteCode.value = String(loginRes?.siteCode ?? '').trim()
    trade.value = String(loginRes?.trade ?? '').trim()
    stayOnLogin.value = Boolean(options.stayOnLogin)
    if (Object.prototype.hasOwnProperty.call(options, 'isUpload')) {
      isUpload.value = Boolean(options.isUpload)
    } else if (Object.prototype.hasOwnProperty.call(loginRes ?? {}, 'needsInitialUpload')) {
      isUpload.value = Boolean(loginRes.needsInitialUpload)
    } else if (Object.prototype.hasOwnProperty.call(loginRes ?? {}, 'isUpload')) {
      isUpload.value = Boolean(loginRes.isUpload)
    } else {
      isUpload.value =
        isInitialUploadRole(userRole.value) &&
        !hasInitialUploadDone({
          loginId: loginId.value,
          projectId: projectId.value,
          siteCode: siteCode.value,
        })
    }
    isAuthenticated.value = true
    persistAuth()
  }

  function markInitialUploadComplete() {
    isUpload.value = false
    rememberInitialUploadDone({
      loginId: loginId.value,
      projectId: projectId.value,
      siteCode: siteCode.value,
    })
    persistAuth()
  }

  function setProjectId(value) {
    projectId.value = normalizeProjectId(value)
    persistAuth()
  }

  function setProjectIdAndSiteCode(pid, sc) {
    projectId.value = normalizeProjectId(pid)
    siteCode.value = String(sc ?? '').trim()
    persistAuth()
  }

  function setProjectActive(value) {
    projectActive.value = value !== false
    persistAuth()
  }

  /**
   * 로컬 데모 (API 없을 때)
   * @returns {boolean}
   */
  function loginDemo(userId, password) {
    const id = (userId || '').trim()
    const pw = (password || '').trim()
    if (id === 'admin' && (pw === 'Admin1234!' || pw === 'admin')) {
      localStorage.removeItem('accessToken')
      userRole.value = USER_ROLE.ADMIN
      loginId.value = 'admin'
      userName.value = '데모 관리자'
      userIdx.value = null
      projectId.value = null
      siteCode.value = ''
      trade.value = ''
      stayOnLogin.value = false
      isUpload.value = false
      isAuthenticated.value = true
      persistAuth()
      return true
    }
    if (id === 'hq' && pw === 'Hq1234567!') {
      localStorage.removeItem('accessToken')
      userRole.value = USER_ROLE.HEADQUARTOR
      loginId.value = 'hq'
      userName.value = '데모 본사'
      userIdx.value = null
      stayOnLogin.value = false
      isUpload.value = false
      isAuthenticated.value = true
      persistAuth()
      return true
    }
    if (id === 'gn-a-dir' && pw === 'Dummy1234!') {
      localStorage.removeItem('accessToken')
      userRole.value = USER_ROLE.SITE_DIRECTOR
      loginId.value = 'gn-a-dir'
      userName.value = '데모 현장 총책임'
      userIdx.value = null
      stayOnLogin.value = false
      isUpload.value = true
      isAuthenticated.value = true
      persistAuth()
      return true
    }
    if (id === 'viewer' && pw === 'viewer') {
      localStorage.removeItem('accessToken')
      userRole.value = USER_ROLE.HEADQUARTOR
      loginId.value = 'viewer'
      userName.value = '데모 본사'
      userIdx.value = null
      projectId.value = null
      siteCode.value = ''
      trade.value = ''
      stayOnLogin.value = true
      isUpload.value = false
      isAuthenticated.value = true
      persistAuth()
      return true
    }
    return false
  }

  function logout() {
    isAuthenticated.value = false
    stayOnLogin.value = false
    isUpload.value = true
    userRole.value = USER_ROLE.SITE_DIRECTOR
    loginId.value = ''
    userName.value = ''
    userIdx.value = null
    projectId.value = null
    siteCode.value = ''
    trade.value = ''
    projectActive.value = true
    localStorage.removeItem('accessToken')
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  return {
    userRole,
    loginId,
    userName,
    userIdx,
    projectId,
    siteCode,
    trade,
    projectActive,
    roleLabel,
    isAdminRole,
    isAuthenticated,
    stayOnLogin,
    isUpload,
    initialUploadRequired,
    applyLoginSuccess,
    markInitialUploadComplete,
    setProjectId,
    setProjectIdAndSiteCode,
    setProjectActive,
    loginDemo,
    logout,
    persistAuth,
  }
})
