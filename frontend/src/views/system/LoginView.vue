<template>
  <div class="login-page" :style="{ backgroundImage: pageBackground }">
    <div class="login-page-overlay" aria-hidden="true" />

    <div class="login-container">
      <!-- ── 상단 헤더 (로고 + 시스템명) ── -->
      <header class="login-header">
        <img :src="leftLogoSrc" alt="DnDn" class="header-logo" />
        <div class="header-text">
          <span class="header-brand">DnDn</span>
          <span class="header-sub">현장 일정관리 시스템</span>
        </div>
      </header>

      <!-- ── 모드 전환 탭 ── -->
      <div class="login-tabs" role="tablist" aria-label="로그인 유형">
        <button
          type="button"
          role="tab"
          class="tab-button"
          :aria-selected="loginMode === 'site'"
          :class="{ active: loginMode === 'site' }"
          @click="setMode('site')"
        >
          <Building2 :size="16" />
          <span>현장 로그인</span>
        </button>
        <button
          type="button"
          role="tab"
          class="tab-button"
          :aria-selected="loginMode === 'admin'"
          :class="{ active: loginMode === 'admin' }"
          @click="setMode('admin')"
        >
          <ShieldCheck :size="16" />
          <span>시스템 관리자 / 본사 로그인</span>
        </button>
        <span class="tab-indicator" :class="{ right: loginMode === 'admin' }" aria-hidden="true" />
      </div>

      <!-- ── 좌·우 전환 영역 ── -->
      <div class="content-stage">
        <Transition :name="transitionName">
          <!-- ===== 현장 로그인 모드 (현장 선택 없음 — 본인 현장 자동 진입) ===== -->
          <div v-if="loginMode === 'site'" key="site" class="layout layout-site">
            <!-- 좌측: 로그인 폼 -->
            <section class="panel form-panel">
              <div class="panel-head">
                <h2>현장 계정으로 로그인</h2>
                <p>현장 계정은 배정된 현장으로 바로 진입합니다.</p>
              </div>

              <form class="login-form" @submit.prevent="handleLogin">
                <div class="field-group">
                  <label for="userIdSite">아이디</label>
                  <input
                    id="userIdSite"
                    v-model="form.userId"
                    type="text"
                    autocomplete="username"
                    placeholder="현장 계정 아이디"
                  />
                </div>

                <div class="field-group">
                  <label for="passwordSite">비밀번호</label>
                  <input
                    id="passwordSite"
                    v-model="form.password"
                    type="password"
                    autocomplete="current-password"
                    placeholder="비밀번호를 입력하세요"
                  />
                </div>

                <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
                <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

                <button type="submit" class="primary-action">
                  <LogIn :size="16" />
                  현장 대시보드 로그인
                </button>
              </form>
            </section>

            <!-- 우측: 안내 패널 (현장 자동 매칭) -->
            <section class="panel info-panel admin-info">
              <div class="admin-info-inner">
                <div class="panel-head light">
                  <span class="panel-kicker">현장 진입 안내</span>
                  <h2>본인 현장으로 바로 이동</h2>
                  <p>현장 계정은 별도 선택 없이 배정된 현장으로 자동 진입합니다.</p>
                </div>

                <div class="admin-feature-list">
                  <div class="admin-feature">
                    <div class="admin-feature-icon">
                      <MapPin :size="16" />
                    </div>
                    <div class="admin-feature-text">
                      <strong>현장 자동 매칭</strong>
                      <small>로그인 즉시 본인 현장 대시보드로 이동합니다.</small>
                    </div>
                  </div>

                  <div class="admin-feature">
                    <div class="admin-feature-icon">
                      <Layers :size="16" />
                    </div>
                    <div class="admin-feature-text">
                      <strong>일정 · 인력 운영</strong>
                      <small>공정표·작업 지시·인력 배치 등 현장 운영 메뉴 제공.</small>
                    </div>
                  </div>

                  <div class="admin-feature">
                    <div class="admin-feature-icon">
                      <UserCog :size="16" />
                    </div>
                    <div class="admin-feature-text">
                      <strong>역할 기반 화면</strong>
                      <small>계정 권한에 맞는 메뉴와 데이터만 노출됩니다.</small>
                    </div>
                  </div>
                </div>

                <p class="admin-hint">
                  <LockKeyhole :size="12" />
                  다른 현장으로의 진입은 본사 · 시스템 관리자 계정만 가능합니다.
                </p>
              </div>
            </section>
          </div>

          <!-- ===== 시스템 관리자 / 본사 로그인 모드 (현장 선택 필요) ===== -->
          <div v-else key="admin" class="layout layout-admin">
            <!-- 좌측: 진입할 현장 선택 -->
            <section class="panel info-panel site-info">
              <div class="panel-head light">
                <span class="panel-kicker">현장 선택</span>
                <h2>진입할 현장을 선택하세요</h2>
                <p>본사 · 시스템 관리자는 모든 현장의 일정·지표를 모니터링할 수 있습니다.</p>
              </div>

              <div class="site-grid-wrap">
                <div v-if="projectsLoading" class="site-grid-status">현장 목록을 불러오는 중…</div>
                <p v-else-if="projectsError" class="site-grid-status error">{{ projectsError }}</p>
                <p v-else-if="projects.length === 0" class="site-grid-status">
                  등록된 현장이 없습니다. 관리자에게 문의하세요.
                </p>
                <div v-else class="site-grid" :class="{ 'site-grid--dense': projects.length > 6 }">
                  <button
                    v-for="site in projects"
                    :key="site.id"
                    type="button"
                    class="site-card"
                    :class="{ active: selectedProjectId === site.id }"
                    @click="selectedProjectId = site.id"
                  >
                    <span class="site-card-dot" />
                    <span class="site-card-text">
                      <strong>{{ site.name }}</strong>
                      <small class="site-card-meta">
                        <span v-if="site.location" class="site-card-line">{{ site.location }}</span>
                        <span v-if="site.period" class="site-card-line">{{ site.period }}</span>
                        <span v-if="!site.location && !site.period" class="site-card-line muted">
                          프로젝트
                        </span>
                      </small>
                    </span>
                  </button>
                </div>
              </div>

              <div class="site-permission-note">
                <LockKeyhole :size="13" />
                로그인 후에도 사이드바 상단에서 다른 현장으로 전환할 수 있습니다.
              </div>
            </section>

            <!-- 우측: 로그인 폼 -->
            <section class="panel form-panel">
              <div class="panel-head">
                <h2>관리자 로그인</h2>
                <p>본사 / 시스템 관리자 계정으로 선택한 현장에 진입합니다.</p>
              </div>

              <form class="login-form" @submit.prevent="handleLogin">
                <div class="selected-site-pill" :class="{ empty: !adminSiteSelected }">
                  <MapPin :size="14" />
                  <template v-if="adminSiteSelected">
                    선택된 현장 · <strong>{{ selectedSite.name }}</strong>
                  </template>
                  <template v-else>좌측에서 진입할 현장을 먼저 선택해 주세요.</template>
                </div>

                <div class="field-group">
                  <label for="userIdAdmin">아이디</label>
                  <input
                    id="userIdAdmin"
                    v-model="form.userId"
                    type="text"
                    autocomplete="username"
                    placeholder="관리자 아이디"
                  />
                </div>

                <div class="field-group">
                  <label for="passwordAdmin">비밀번호</label>
                  <input
                    id="passwordAdmin"
                    v-model="form.password"
                    type="password"
                    autocomplete="current-password"
                    placeholder="비밀번호를 입력하세요"
                  />
                </div>

                <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
                <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

                <button
                  type="submit"
                  class="primary-action"
                  :class="{ disabled: !canSubmitAdminLogin }"
                  :disabled="!canSubmitAdminLogin"
                >
                  <LogIn :size="16" />
                  관리 콘솔 로그인
                </button>
              </form>
            </section>
          </div>
        </Transition>
      </div>

      <!-- ── 하단 안내 ── -->
      <footer class="login-footer">
        <template v-if="loginMode === 'site'">
          현장 권한 계정으로 로그인해주세요. (서버 인증 사용)
        </template>
        <template v-else>
          데모 계정 · admin / Admin1234! (시스템관리자) · hq / Hq1234567! (본사)
        </template>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, USER_ROLE } from '@/stores/authStore'
import { postAuthLogin } from '@/api/auth'
import { getProjectList } from '@/api/project'
import {
  Building2,
  ShieldCheck,
  MapPin,
  LockKeyhole,
  LogIn,
  Layers,
  UserCog,
} from 'lucide-vue-next'
import bgImage from '@/assets/hanwha-bg.png'
import leftLogoSrc from '@/assets/dndn-logo.png'

const router = useRouter()
const authStore = useAuthStore()

/** 현장 탭 기본 입력값 */
const DEMO_SITE_USER_ID = 'gn-a-dir'
const DEMO_SITE_PASSWORD = 'Dummy1234!'

/** 관리자 탭 기본 입력값 (데모 · 빠른 접속) */
const DEMO_ADMIN_USER_ID = 'admin'
const DEMO_ADMIN_PASSWORD = 'Admin1234!'

const form = reactive({
  userId: DEMO_SITE_USER_ID,
  password: DEMO_SITE_PASSWORD,
})
const errorMessage = ref('')
const successMessage = ref('')

const loginMode = ref('site')
const transitionName = ref('slide-left')

/** @type {import('vue').Ref<Array<{ id: number, name: string, location: string, period: string }>>} */
const projects = ref([])
const projectsLoading = ref(false)
const projectsError = ref('')
/** DB project idx */
const selectedProjectId = ref(/** @type {number | null} */ (null))

/**
 * @param {Record<string, unknown>} raw
 * @returns {{ id: number, name: string, location: string, period: string } | null}
 */
function mapProjectRow(raw) {
  const idx = raw.idx ?? raw.id ?? raw.projectIdx ?? raw.projectId
  const numIdx = Number(idx)
  if (!Number.isFinite(numIdx)) return null
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : `현장 #${numIdx}`
  const location = typeof raw.location === 'string' ? raw.location.trim() : ''
  let period = typeof raw.period === 'string' ? raw.period.trim() : ''
  if (!period && (raw.startDate != null || raw.endDate != null)) {
    const s =
      raw.startDate != null && String(raw.startDate).trim()
        ? String(raw.startDate).trim().slice(0, 10)
        : ''
    const e =
      raw.endDate != null && String(raw.endDate).trim()
        ? String(raw.endDate).trim().slice(0, 10)
        : ''
    if (s && e) period = `${s} ~ ${e}`
    else period = s || e
  }
  return { id: numIdx, name, location, period }
}

async function loadProjects() {
  projectsLoading.value = true
  projectsError.value = ''
  try {
    const list = await getProjectList()
    const rows = Array.isArray(list) ? list.map(mapProjectRow).filter(Boolean) : []
    projects.value = rows
    if (rows.length === 0) {
      selectedProjectId.value = null
      return
    }
    const cur = selectedProjectId.value
    if (cur != null && rows.some((r) => r.id === cur)) return
    selectedProjectId.value = rows[0].id
  } catch (e) {
    projects.value = []
    selectedProjectId.value = null
    projectsError.value =
      e instanceof Error ? e.message : '현장 목록을 불러오지 못했습니다. 네트워크를 확인해 주세요.'
  } finally {
    projectsLoading.value = false
  }
}

const selectedSite = computed(() => {
  const id = selectedProjectId.value
  if (id == null) return { name: '', id: null }
  return projects.value.find((p) => p.id === id) ?? { name: '', id }
})

/** 관리자 탭 — 현장 선택 여부 (현장 탭은 자동 매칭이라 검사 불필요) */
const adminSiteSelected = computed(
  () =>
    selectedProjectId.value != null && projects.value.some((p) => p.id === selectedProjectId.value),
)

/** 관리자 탭 — 로그인 버튼 활성 조건: 목록 로딩 끝났고 현장 선택됨 */
const canSubmitAdminLogin = computed(
  () => !projectsLoading.value && projects.value.length > 0 && adminSiteSelected.value,
)

const pageBackground = computed(() => `url(${bgImage})`)

const postLoginPath = () => (authStore.initialUploadRequired ? '/site/upload' : '/site/dashboard')

/** 로그인 직후 라우터 query — useCurrentProject 가 읽는 projectId 단일 키만 전달 */
function loginRouteQuery() {
  const query = {}
  const pid = authStore.projectId
  if (pid != null && pid !== '') {
    query.projectId = String(pid)
  }
  return query
}

const SITE_ROLES = [
  USER_ROLE.SITE_MANAGER,
  USER_ROLE.SITE_DIRECTOR,
  USER_ROLE.SECTION_LEADER,
  USER_ROLE.SECTION_SUPERVISOR,
]
const ADMIN_ROLES = [USER_ROLE.ADMIN, USER_ROLE.HEADQUARTOR]

/** 백엔드 LoginMode enum 과 매칭 */
const backendLoginMode = () => (loginMode.value === 'admin' ? 'ADMIN' : 'SITE')

/**
 * 데모(로컬) 로그인 시 권한 검증.
 * 백엔드를 못 탔을 때만 동작 — 따라서 정상 운영에서는 백엔드 검증이 1차이다.
 */
const isDemoRoleAllowed = (role) =>
  loginMode.value === 'admin' ? ADMIN_ROLES.includes(role) : SITE_ROLES.includes(role)

const setMode = (mode) => {
  if (mode === loginMode.value) return
  transitionName.value = mode === 'admin' ? 'slide-right' : 'slide-left'
  loginMode.value = mode
  errorMessage.value = ''
  successMessage.value = ''
  if (mode === 'admin') {
    form.userId = DEMO_ADMIN_USER_ID
    form.password = DEMO_ADMIN_PASSWORD
  } else {
    form.userId = DEMO_SITE_USER_ID
    form.password = DEMO_SITE_PASSWORD
  }
}

onMounted(async () => {
  await loadProjects()
})

const handleLogin = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  const loginIdInput = form.userId.trim()
  const passwordInput = form.password.trim()

  if (!loginIdInput || !passwordInput) {
    errorMessage.value = '아이디와 비밀번호를 모두 입력해주세요.'
    return
  }

  // 관리자 탭에서는 진입할 현장을 반드시 골라야 한다 (현장 탭은 자동 매칭).
  if (loginMode.value === 'admin' && !adminSiteSelected.value) {
    errorMessage.value = '진입할 현장을 먼저 선택해주세요.'
    return
  }

  let didLogin = false
  try {
    // 서버 인증 — 자격 증명 + 탭(loginMode) ↔ 권한 일치 여부를 백엔드에서 검증한다.
    // 현장 선택은 백엔드 검증 대상이 아니므로 전송하지 않는다.
    const res = await postAuthLogin({
      loginId: loginIdInput,
      password: passwordInput,
      loginMode: backendLoginMode(),
    })
    authStore.applyLoginSuccess(res, {
      stayOnLogin: false,
      loginId: loginIdInput,
    })
    didLogin = true
  } catch (err) {
    // 서버가 응답을 돌려줬다면(자격 오류 / 권한 미일치 등) 그 메시지를 그대로 표시하고 종료.
    // 데모(로컬) 폴백은 네트워크 오류처럼 응답 자체가 없는 경우에만 사용한다.
    if (err?.responseAvailable) {
      if (err?.responseCode === 3014) {
        errorMessage.value = '비활성화된 계정입니다.'
        return
      }
      if (err?.responseCode === 3010) {
        errorMessage.value = '아이디나 비밀번호를 확인하세요.'
        return
      }
      errorMessage.value = err?.message || '로그인에 실패했습니다.'
      return
    }
    if (authStore.loginDemo(loginIdInput, passwordInput)) {
      if (!isDemoRoleAllowed(authStore.userRole)) {
        authStore.logout()
        errorMessage.value =
          loginMode.value === 'admin'
            ? '관리자 로그인은 본사 또는 시스템 관리자 계정만 사용할 수 있습니다.'
            : '현장 로그인은 현장 권한 계정만 사용할 수 있습니다.'
        return
      }
      didLogin = true
    }
  }

  if (!didLogin) {
    errorMessage.value = '아이디나 비밀번호를 확인하세요.'
    return
  }

  // 관리자 탭에서 고른 현장으로 진입 — 현장 탭은 서버 응답의 projectId(본인 배정 현장)를 그대로 사용.
  if (loginMode.value === 'admin' && selectedProjectId.value != null) {
    authStore.setProjectId(selectedProjectId.value)
  }

  if (authStore.stayOnLogin) {
    successMessage.value = '로그인되었습니다. 현재 화면을 유지합니다.'
    return
  }

  router.push({
    path: postLoginPath(),
    query: loginRouteQuery(),
  })
}
</script>

<style scoped>
*,
*::before,
*::after {
  box-sizing: border-box;
}
button,
input {
  font: inherit;
}

/* ── Page background ── */
.login-page {
  position: relative;
  min-height: 100vh;
  padding: 28px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.login-page-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      135deg,
      rgba(0, 20, 40, 0.62) 0%,
      rgba(0, 30, 58, 0.46) 48%,
      rgba(0, 20, 40, 0.34) 100%
    ),
    radial-gradient(ellipse 70% 60% at 8% 18%, rgba(20, 184, 166, 0.12) 0%, transparent 54%);
  pointer-events: none;
}

/* ── 메인 컨테이너 ── */
.login-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1080px;
  padding: 28px 32px 22px;
  border-radius: 28px;
  background: rgba(248, 250, 253, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 30px 70px rgba(0, 20, 40, 0.32),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  backdrop-filter: blur(18px);
}

/* ── 헤더 ── */
.login-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(0, 46, 85, 0.07);
}
.header-logo {
  height: 42px;
  width: auto;
  object-fit: contain;
}
.header-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.05;
}
.header-brand {
  font-size: 26px;
  font-weight: 800;
  color: #002e55;
  letter-spacing: -0.02em;
}
.header-sub {
  font-size: 14px;
  color: #475569;
  font-weight: 600;
  margin-top: 4px;
  letter-spacing: -0.01em;
}

/* ── 탭 ── */
.login-tabs {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 18px auto 20px;
  padding: 6px;
  background: #eef2f7;
  border-radius: 14px;
  max-width: 720px;
}
.tab-button {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 42px;
  border: none;
  background: transparent;
  border-radius: 10px;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.25s ease;
}
.tab-button.active {
  color: #fff;
}
.tab-indicator {
  position: absolute;
  z-index: 0;
  top: 6px;
  bottom: 6px;
  left: 6px;
  width: calc(50% - 6px);
  border-radius: 10px;
  background: linear-gradient(135deg, #002e55, #001c3a);
  box-shadow: 0 8px 22px rgba(0, 46, 85, 0.32);
  transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}
.tab-indicator.right {
  transform: translateX(100%);
}

/* ── 콘텐츠 영역: 두 탭 동일 높이 유지 (데스크톱) ── */
.content-stage {
  position: relative;
  height: 580px;
  min-height: 580px;
  overflow: hidden;
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 18px;
  align-items: stretch;
  height: 100%;
  box-sizing: border-box;
}

/* ── 패널 공통 ── */
.panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px 22px 20px;
  border-radius: 18px;
  border: 1px solid rgba(0, 46, 85, 0.08);
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
}
.panel-head {
  flex-shrink: 0;
}
.panel-head h2 {
  margin: 0;
  font-size: 19px;
  color: #0f172a;
  letter-spacing: -0.01em;
}
.panel-head p {
  margin: 5px 0 0;
  font-size: 12.5px;
  color: #64748b;
}
.panel-kicker {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}
.panel-head.light h2 {
  color: #fff;
}
.panel-head.light p {
  color: rgba(255, 255, 255, 0.78);
}

/* ── 폼 패널 ── */
.form-panel {
  background: #ffffff;
  box-shadow:
    0 1px 2px rgba(0, 46, 85, 0.05),
    0 12px 28px rgba(0, 46, 85, 0.08);
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
}
.selected-site-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  padding: 6px 11px;
  border-radius: 999px;
  background: rgba(20, 184, 166, 0.1);
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid rgba(20, 184, 166, 0.22);
  margin-bottom: 11px;
}
.selected-site-pill.empty {
  background: rgba(148, 163, 184, 0.12);
  color: #64748b;
  border-color: rgba(148, 163, 184, 0.28);
}
.selected-site-pill strong {
  font-weight: 800;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.field-group label {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}
.field-group input {
  height: 42px;
  padding: 0 13px;
  border: 1px solid #d1d9e6;
  border-radius: 11px;
  background: #fff;
  color: #0f172a;
  outline: none;
  font-size: 14px;
  transition:
    border-color 0.18s,
    box-shadow 0.18s;
}
.field-group input::placeholder {
  color: #a0aec0;
}
.field-group input:focus {
  border-color: #002e55;
  box-shadow: 0 0 0 3px rgba(0, 46, 85, 0.1);
}

.error-message {
  margin: 0 0 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 12px;
  font-weight: 600;
}
.success-message {
  margin: 0 0 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #047857;
  font-size: 12px;
  font-weight: 700;
}

.primary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: auto;
  height: 46px;
  border: none;
  border-radius: 13px;
  background: linear-gradient(135deg, #002e55, #001c3a);
  color: #fff;
  font-size: 14.5px;
  font-weight: 800;
  cursor: pointer;
  letter-spacing: 0.02em;
  box-shadow: 0 12px 28px rgba(0, 46, 85, 0.28);
  transition:
    transform 0.16s,
    box-shadow 0.16s,
    opacity 0.16s;
}
.primary-action:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 16px 34px rgba(0, 46, 85, 0.36);
}
.primary-action:disabled,
.primary-action.disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

/* ── 우측: 현장 선택 ── */
.site-info {
  background: linear-gradient(155deg, #002e55 0%, #001c3a 60%, #00142c 100%);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 18px 38px rgba(0, 20, 40, 0.28);
  position: relative;
  overflow: clip;
}
.site-info::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 50% at 100% 0%, rgba(45, 212, 191, 0.18) 0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 0% 100%, rgba(20, 184, 166, 0.12) 0%, transparent 50%);
  pointer-events: none;
}
.site-info > * {
  position: relative;
  z-index: 1;
}
.site-grid-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  /* hover·선택 그림자가 잘리지 않도록 내부 스크롤 영역에 여백을 둔다 */
  padding: 2px 0;
}
.site-grid-status {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 14px 12px;
  border-radius: 13px;
  background: rgba(0, 0, 0, 0.14);
  color: rgba(255, 255, 255, 0.76);
  font-size: 13px;
  font-weight: 600;
}
.site-grid-status.error {
  color: #fecaca;
  border: 1px solid rgba(254, 202, 202, 0.28);
}
.site-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: minmax(min-content, auto);
  gap: 10px;
  flex: 1;
  align-content: start;
  min-height: 0;
  /* hover·선택 상태 그림자/이동이 위·아래에서 잘리지 않도록 여백 */
  padding: 8px 4px 10px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable;
}
.site-grid.site-grid--dense {
  grid-template-columns: 1fr;
  gap: 8px;
}
.site-card {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 11px 12px;
  min-height: 0;
  height: auto;
  border-radius: 13px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.82);
  text-align: left;
  cursor: pointer;
  transition:
    background 0.18s,
    border-color 0.18s,
    transform 0.18s;
}
.site-card:hover {
  transform: translateY(-1px);
  border-color: rgba(45, 212, 191, 0.42);
}
.site-card.active {
  background: rgba(20, 184, 166, 0.18);
  border-color: rgba(45, 212, 191, 0.7);
  color: #fff;
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.14);
}
.site-card-dot {
  width: 9px;
  height: 9px;
  margin-top: 4px;
  border-radius: 999px;
  background: #94a3b8;
  flex-shrink: 0;
}
.site-card.active .site-card-dot {
  background: #2dd4bf;
  box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.18);
}
.site-card-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.site-card-text strong {
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
  word-break: keep-all;
}
.site-card-text small.site-card-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 5px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 11.5px;
}
.site-card-line {
  display: block;
  line-height: 1.38;
  word-break: keep-all;
  overflow-wrap: anywhere;
}
.site-card-line.muted {
  color: rgba(255, 255, 255, 0.45);
  font-style: italic;
}
.site-permission-note {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 11px;
  border-radius: 11px;
  background: rgba(0, 0, 0, 0.22);
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

/* ── 좌측: 관리자 모드 장식 패널 ── */
.admin-info {
  background: linear-gradient(155deg, #0f2b4d 0%, #0a1f3d 55%, #061730 100%);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 18px 38px rgba(0, 20, 40, 0.28);
  position: relative;
  overflow: hidden;
}
.admin-info::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 0% 0%, rgba(45, 212, 191, 0.18) 0%, transparent 55%),
    radial-gradient(ellipse 70% 60% at 100% 100%, rgba(99, 102, 241, 0.15) 0%, transparent 55%);
  pointer-events: none;
}
.admin-info-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}
.admin-feature-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.admin-feature {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 13px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}
.admin-feature-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #14b8a6, #0d9488);
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 6px 14px rgba(13, 148, 136, 0.32);
}
.admin-feature-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.admin-feature-text strong {
  font-size: 13.5px;
  font-weight: 700;
  color: #fff;
}
.admin-feature-text small {
  margin-top: 3px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 11.5px;
}
.admin-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 8px 11px;
  border-radius: 11px;
  background: rgba(0, 0, 0, 0.22);
  color: rgba(255, 255, 255, 0.78);
  font-size: 11.5px;
  font-weight: 600;
  flex-shrink: 0;
}

/* ── 푸터 ── */
.login-footer {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid rgba(0, 46, 85, 0.07);
  text-align: center;
  font-size: 12px;
  color: #64748b;
  letter-spacing: -0.01em;
}

/* ── 전환 애니메이션 ── */
.slide-right-enter-active,
.slide-right-leave-active,
.slide-left-enter-active,
.slide-left-leave-active {
  transition:
    opacity 0.18s ease-out,
    transform 0.24s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
  inset: 0;
  width: 100%;
}
.slide-right-enter-active,
.slide-left-enter-active {
  z-index: 2;
}
.slide-right-leave-active,
.slide-left-leave-active {
  z-index: 1;
}
.slide-right-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}
.slide-left-enter-from {
  opacity: 0;
  transform: translateX(-24px);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

/* ── 반응형 ── */
@media (max-width: 1024px) {
  .login-container {
    padding: 28px 26px 22px;
  }
  .layout {
    grid-template-columns: 1fr;
    height: auto;
    min-height: auto;
  }
  .panel {
    min-height: auto;
    height: auto;
  }
  .content-stage {
    height: auto;
    min-height: 480px;
  }
  .site-grid-wrap {
    min-height: 140px;
    overflow: visible;
  }
  .site-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    overflow-y: visible;
    flex: none;
  }
  .admin-feature-list {
    overflow-y: visible;
    flex: none;
    min-height: auto;
  }
}

@media (max-width: 720px) {
  .login-page {
    padding: 18px 12px;
  }
  .login-container {
    padding: 22px 18px 18px;
    border-radius: 22px;
  }
  .header-logo {
    height: 36px;
  }
  .header-brand {
    font-size: 22px;
  }
  .header-sub {
    font-size: 13px;
  }
  .login-tabs {
    margin-top: 18px;
    margin-bottom: 20px;
  }
  .tab-button {
    height: 42px;
    font-size: 12.5px;
    gap: 6px;
  }
  .tab-button span {
    white-space: nowrap;
  }
  .panel {
    padding: 22px 20px 20px;
  }
  .site-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
