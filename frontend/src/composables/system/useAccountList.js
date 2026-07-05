import { computed, reactive, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getAdminAccounts,
  postAdminAccount,
  putAdminAccount,
  getAdminAccountRequests,
  approveAccountRequest,
  rejectAccountRequest,
  checkEmailAvailability,
} from '@/api/auth.js'
import { getProjectList, getMilestoneTradeNames } from '@/api/project.js'
import { sanitizeAccountTradeOptions } from '@/utils/staffingAdapter'
import { userRoleLabel, USER_ROLE } from '@/stores/authStore'
import {
  ACCOUNT_LIST_TEXTS,
  ACCOUNT_ROLE_OPTIONS,
  ACCOUNT_STATUS_THEAD_CLASS,
} from '@/utils/system/accountListTexts'
import {
  parseProjectLabel,
  projectOptionLabel,
  rowRoleStr,
  classify,
  workerAffiliationKind,
  isSiteDirectorAccount,
  accountUpdatePayload,
} from '@/utils/system/accountHelpers'
import {
  formatEmailInput,
  formatLoginId,
  formatPhoneNumber,
  isValidEmail,
  isValidLoginId,
  isValidPhoneNumber,
  normalizeEmail,
} from '@/utils/inputFormat'


export function useAccountList() {
  const T = ACCOUNT_LIST_TEXTS
  const ROLE_OPTIONS = ACCOUNT_ROLE_OPTIONS

  /**
   * 계정·요청 행에서 현장(project) idx 추론 — API project 필드 우선, 없으면 siteCode와 프로젝트 목록의 [코드] 매칭.
   * @param {Record<string, unknown>|null|undefined} row
   * @returns {number|null}
   */
  function resolveEntityProjectIdx(row) {
    if (!row) return null
    const numKeys = ['projectIdx', 'projectId', 'siteProjectIdx', 'siteProjectId']
    for (const k of numKeys) {
      const n = Number(row[k])
      if (Number.isFinite(n)) return Math.trunc(n)
    }
    const proj = row.project
    if (proj && typeof proj === 'object') {
      for (const k of ['idx', 'projectIdx', 'id']) {
        const n = Number(/** @type {Record<string, unknown>} */ (proj)[k])
        if (Number.isFinite(n)) return Math.trunc(n)
      }
    }
    const code = String(row.siteCode ?? row.projectCode ?? '').trim()
    if (code && projectOptions.value.length) {
      const match = projectOptions.value.find((p) => parseProjectLabel(p.name).code === code)
      if (match) return match.idx
    }
    return null
  }

  /**
   * 상단에서 선택한 현장(라우트 projectIdx)에 속하는지 여부.
   * @param {Record<string, unknown>|null|undefined} row
   */
  function entityBelongsToSelectedSite(row) {
    const curIdx = projectIdxParam.value
    if (!Number.isFinite(curIdx)) return true
    const resolved = resolveEntityProjectIdx(row)
    if (resolved != null) return resolved === curIdx
    const code = currentSiteCode.value.trim()
    if (code) {
      const rowCode = String(row?.siteCode ?? row?.projectCode ?? '').trim()
      return rowCode === code
    }
    return false
  }

  /** @typedef {{ idx: number, loginId?: string, name?: string, role?: string, siteCode?: string|null, trade?: string|null, active?: boolean, phone?: string|null, email?: string|null }} Acc */

  const route = useRoute()
  const router = useRouter()

  const projectIdxParam = computed(() => {
    const n = Number(route.params.projectIdx)
    return Number.isFinite(n) ? Math.trunc(n) : NaN
  })

  const projectsReady = ref(false)


  const loading = ref(false)
  const loadingRequests = ref(false)
  /** @type {import('vue').Ref<Acc[]>} */
  const accounts = ref([])
  /** @type {import('vue').Ref<any[]>} */
  const accountRequests = ref([])

  /** @type {import('vue').Ref<Array<{ idx: number, name: string, location?: string }>>} */
  const projectOptions = ref([])
  const tradeOptions = ref(/** @type {string[]} */ ([]))
  const tradeLoading = ref(false)

  const workerAffiliationTab = ref(/** @type {'hq' | 'trade'} */ ('hq'))

  /** 공종별 아코디언 펼침 상태 (헤더 라벨 키) */
  const tradeAccordionOpen = reactive(/** @type {Record<string, boolean>} */ ({}))

  const toastMsg = ref('')
  const toastVariant = ref('info')

  function pushToast(msg, variant = 'info') {
    toastMsg.value = msg
    toastVariant.value = variant
    window.setTimeout(() => {
      toastMsg.value = ''
    }, 3800)
  }

  const currentProject = computed(() => {
    const idx = projectIdxParam.value
    if (!Number.isFinite(idx)) return null
    return projectOptions.value.find((p) => p.idx === idx) ?? null
  })

  const currentSiteCode = computed(() => {
    const p = currentProject.value
    if (!p) return ''
    const { code } = parseProjectLabel(p.name)
    return String(code || '').trim()
  })

  const currentSiteDisplay = computed(() => {
    const p = currentProject.value
    if (!p) return '—'
    const { code, title } = parseProjectLabel(p.name)
    if (code && title) return `[${code}] ${title}`
    return String(p.name || '').trim() || '—'
  })

  const sortedProjectOptions = computed(() => {
    const list = Array.isArray(projectOptions.value) ? projectOptions.value : []
    return [...list].sort((a, b) =>
      parseProjectLabel(a.name).title.localeCompare(parseProjectLabel(b.name).title, 'ko'),
    )
  })

  function ensureValidProjectRoute() {
    const idx = projectIdxParam.value
    if (!Number.isFinite(idx)) {
      router.replace({ name: 'hrAccounts' })
      return false
    }
    if (!projectOptions.value.some((p) => p.idx === idx)) {
      router.replace({ name: 'hrAccounts' })
      return false
    }
    return true
  }

  function goBackToSiteHub() {
    router.push({ name: 'hrAccounts' })
  }

  function onSiteSwitcherChange(ev) {
    const el = /** @type {HTMLSelectElement} */ (ev.target)
    const n = Number(el.value)
    if (!Number.isFinite(n)) return
    router.push({ name: 'hrAccountsSite', params: { projectIdx: String(n) } })
  }

  function normalizeAccountList(raw) {
    if (Array.isArray(raw)) return raw.slice()
    if (raw && typeof raw === 'object' && Array.isArray(raw.data)) return raw.data.slice()
    return []
  }

  const accountRows = computed(() =>
    Array.isArray(accounts.value) ? accounts.value : [],
  )

  const fieldAccounts = computed(() =>
    accountRows.value.filter((a) => classify(a) === 'field' && entityBelongsToSelectedSite(a)),
  )

  /** 현장 총 책임자만 상단 블록 (본사 직영·공종별 목록에서는 제외) */
  const directorFieldAccounts = computed(() =>
    fieldAccounts.value.filter((a) => isSiteDirectorAccount(a)),
  )

  const hqFieldAccounts = computed(() =>
    fieldAccounts.value.filter((a) => workerAffiliationKind(a) === 'hq' && !isSiteDirectorAccount(a)),
  )
  const tradeFieldAccounts = computed(() =>
    fieldAccounts.value.filter(
      (a) => workerAffiliationKind(a) === 'partner' && !isSiteDirectorAccount(a),
    ),
  )

  const tradeGroupedRows = computed(() => {
    const map = new Map()
    for (const acc of tradeFieldAccounts.value) {
      const raw = String(acc?.trade || '').trim()
      const label = raw || T.tradeUnassigned
      if (!map.has(label)) map.set(label, [])
      map.get(label).push(acc)
    }
    const pairs = [...map.entries()].map(([label, rows]) => [label, Array.isArray(rows) ? rows : []])
    pairs.sort((a, b) => {
      if (a[0] === T.tradeUnassigned) return 1
      if (b[0] === T.tradeUnassigned) return -1
      return String(a[0]).localeCompare(String(b[0]), 'ko')
    })
    return pairs
  })

  watch(
    tradeGroupedRows,
    (pairs) => {
      for (const [label] of pairs) {
        if (tradeAccordionOpen[label] === undefined) tradeAccordionOpen[label] = true
      }
      const keep = new Set(pairs.map(([l]) => l))
      for (const k of Object.keys(tradeAccordionOpen)) {
        if (!keep.has(k)) delete tradeAccordionOpen[k]
      }
    },
    { immediate: true },
  )

  function toggleTradeAccordion(label) {
    tradeAccordionOpen[label] = !tradeAccordionOpen[label]
  }

  watch(fieldAccounts, (rows) => {
    const hasHq = rows.some((a) => workerAffiliationKind(a) === 'hq' && !isSiteDirectorAccount(a))
    const hasTradeTab = rows.some(
      (a) => workerAffiliationKind(a) === 'partner' && !isSiteDirectorAccount(a),
    )
    if (!hasHq && hasTradeTab && workerAffiliationTab.value === 'hq') {
      workerAffiliationTab.value = 'trade'
    } else if (hasHq && !hasTradeTab && workerAffiliationTab.value === 'trade') {
      workerAffiliationTab.value = 'hq'
    }
  })

  const requestsTableTheadClass =
    'sticky top-0 z-[1] border-b border-violet-200/70 bg-violet-100/45 text-xs font-bold text-violet-950'

  /** 테이블 컬럼 헤더 — 분류 행과 구분되는 연보라 톤 */
  const accountStatusTheadClass = ACCOUNT_STATUS_THEAD_CLASS

  async function refreshCurrentTab() {
    await refreshList()
  }

  function statusLabel(raw) {
    const s = String(raw || '').toUpperCase()
    if (s === 'PENDING' || s === 'WAIT') return '대기'
    if (s === 'APPROVED') return '승인'
    if (s === 'REJECTED') return '거절'
    return raw || '—'
  }

  function isPendingRequest(row) {
    const s = String(row?.status || '').toUpperCase()
    return s === 'PENDING' || s === 'WAIT'
  }

  /** 요청 행 — 신규 계정 부여 권한 (AccountRequestDto.requestedRole) */
  function requestRowRequestedRoleStr(rq) {
    const r = rq?.requestedRole
    if (r && typeof r === 'object' && r !== null && 'name' in r)
      return String(/** @type {{ name?: string }} */ (r).name || '')
    return String(r || '')
  }

  /** 요청 행 — role 문자열 (요청자 권한 = Res.role) */
  function requestRowRoleStr(rq) {
    const r = rq?.role
    if (r && typeof r === 'object' && r !== null && 'name' in r)
      return String(/** @type {{ name?: string }} */ (r).name || '')
    return String(r || '')
  }

  /** 목록/상세 공통: 요청 한 줄 제목 */
  function requestRowTitle(rq) {
    const t = rq?.title ?? rq?.requestTitle ?? rq?.subject
    const ts = String(t || '').trim()
    if (ts) return ts
    const lid = String(rq?.requestedLoginId ?? rq?.loginId ?? '').trim()
    const nm = String(rq?.requestedName ?? '').trim()
    if (lid && nm) return `${nm} · ${lid}`
    if (lid) return lid
    if (nm) return nm
    return T.reqTypeCreate
  }

  /** 상세 보조 텍스트 (자유 입력 필드 + 백엔드 note 등) */
  function requestRowDetailText(rq) {
    const parts = []
    const d = rq?.detail ?? rq?.content ?? rq?.description ?? rq?.memo ?? rq?.body
    const ds = String(d || '').trim()
    if (ds) parts.push(ds)
    const note = String(rq?.note ?? '').trim()
    if (note && String(rq?.status || '').toUpperCase() === 'REJECTED')
      parts.push(`${T.lblDetailRejectNote}: ${note}`)
    if (!parts.length) {
      const rc = []
      const site = String(rq?.siteCode ?? '').trim()
      const tr = String(rq?.trade ?? '').trim()
      if (site) rc.push(`${T.lblDetailSiteCode} ${site}`)
      if (tr) rc.push(`${T.lblDetailTrade} ${tr}`)
      return rc.length ? rc.join(' · ') : '—'
    }
    return parts.join('\n\n')
  }

  /** 상세 모달 현장명 — API 필드 우선, 없으면 상단 선택 현장 */
  function requestSiteNameForDetail(rq) {
    if (!rq) return '—'
    const code = String(rq.siteCode ?? '').trim()
    if (code) return code
    const n = rq.projectName ?? rq.siteName ?? rq.siteDisplayName
    if (n != null && String(n).trim() !== '') return String(n).trim()
    return currentSiteDisplay.value
  }

  /** UI 확인용 요청 및 승인 탭 더미 (API 응답 앞에 표시) */
  const accountRequestsDummy = computed(() => {
    const code = currentSiteCode.value.trim()
    const curProjectIdx = Number.isFinite(projectIdxParam.value) ? projectIdxParam.value : undefined
    const when = new Date()
    when.setHours(when.getHours() - 2)
    const iso = when.toISOString()
    return [
      {
        idx: 'demo-acc-req-1',
        demo: true,
        status: 'PENDING',
        createdAt: iso,
        title: '협력체 계정 신규 요청',
        detail:
          '현장 협력사 소속 근로자 계정 발급을 요청드립니다.\n안전관리팀 검토 후 회신 부탁드립니다.',
        loginId: 'demo.kim.req',
        requestedLoginId: 'demo.kim.new',
        requestedName: '김신규',
        requestedRole: USER_ROLE.SITE_DIRECTOR,
        name: '김요청',
        role: USER_ROLE.SECTION_SUPERVISOR,
        siteCode: code || undefined,
        projectIdx: curProjectIdx,
        trade: '토목',
      },
      {
        idx: 'demo-acc-req-2',
        demo: true,
        status: 'PENDING',
        createdAt: iso,
        title: '공종별 권한 변경 요청',
        detail: '골조 공정 담당자 권한을 공종별 책임자로 상향 조정해 주시기 바랍니다.',
        loginId: 'demo.lee.req',
        requestedLoginId: 'demo.lee.new',
        requestedName: '이신규',
        requestedRole: USER_ROLE.SECTION_LEADER,
        name: '이협력',
        role: USER_ROLE.SECTION_LEADER,
        siteCode: code || undefined,
        projectIdx: curProjectIdx,
        trade: '골조',
      },
    ]
  })

  const accountRequestsWithDummy = computed(() => [
    ...accountRequestsDummy.value,
    ...accountRequests.value,
  ])

  const accountRequestsFiltered = computed(() => {
    const list = accountRequestsWithDummy.value
    if (!Number.isFinite(projectIdxParam.value)) return list
    return list.filter((r) => entityBelongsToSelectedSite(r))
  })

  function formatReqDate(row) {
    const d = row?.createdAt ?? row?.requestAt ?? row?.createdDate
    if (!d) return '—'
    try {
      return new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(d))
    } catch {
      return String(d)
    }
  }

  const modalOpen = ref(false)
  const modalMode = ref('create')

  const formCreate = reactive({
    loginId: '',
    password: '',
    name: '',
    phone: '',
    email: '',
    role: USER_ROLE.SITE_DIRECTOR,
    projectIdx: /** @type {number | null} */ (null),
    trade: '',
  })

  const editingIdx = ref(/** @type {number|null} */ (null))
  const formEdit = reactive({
    name: '',
    phone: '',
    email: '',
    role: USER_ROLE.SITE_DIRECTOR,
    /** @type {number|null} */
    projectIdx: null,
    trade: '',
  })

  const editTradeLoading = ref(false)
  /** @type {import('vue').Ref<string[]>} */
  const editTradeOptions = ref([])

  const editNeedsSite = computed(() =>
    [
      USER_ROLE.SITE_MANAGER,
      USER_ROLE.SITE_DIRECTOR,
      USER_ROLE.SECTION_LEADER,
      USER_ROLE.SECTION_SUPERVISOR,
    ].includes(formEdit.role),
  )

  const editNeedsTrade = computed(() =>
    [USER_ROLE.SECTION_LEADER, USER_ROLE.SECTION_SUPERVISOR].includes(formEdit.role),
  )

  function findProjectIdxForAccountRow(row) {
    const code = String(row?.siteCode || '').trim()
    if (code) {
      const match = projectOptions.value.find((p) => parseProjectLabel(p.name).code === code)
      if (match) return match.idx
    }
    const routeIdx = projectIdxParam.value
    return Number.isFinite(routeIdx) ? routeIdx : null
  }

  async function loadEditTradeOptions(projectId) {
    if (projectId == null) {
      editTradeOptions.value = []
      return
    }
    editTradeLoading.value = true
    try {
      const list = await getMilestoneTradeNames(projectId)
      editTradeOptions.value = sanitizeAccountTradeOptions(list)
    } catch {
      editTradeOptions.value = []
    } finally {
      editTradeLoading.value = false
    }
  }

  const needsSiteForRole = computed(() =>
    [
      USER_ROLE.SITE_MANAGER,
      USER_ROLE.SITE_DIRECTOR,
      USER_ROLE.SECTION_LEADER,
      USER_ROLE.SECTION_SUPERVISOR,
    ].includes(formCreate.role),
  )

  const needsTrade = computed(() =>
    [USER_ROLE.SECTION_LEADER, USER_ROLE.SECTION_SUPERVISOR].includes(formCreate.role),
  )

  const selectedProjectLabel = computed(() => {
    const idx = formCreate.projectIdx
    if (idx == null) return ''
    const p = projectOptions.value.find((x) => x.idx === idx)
    if (!p) return ''
    const { code, title } = parseProjectLabel(p.name)
    if (code && title) return `[${code}] ${title}`
    return p.name || ''
  })

  watch(
    () => formCreate.projectIdx,
    async (pid) => {
      formCreate.trade = ''
      tradeOptions.value = []
      if (pid == null) return
      tradeLoading.value = true
      try {
        const list = await getMilestoneTradeNames(pid)
        tradeOptions.value = sanitizeAccountTradeOptions(list)
      } catch {
        tradeOptions.value = []
      } finally {
        tradeLoading.value = false
      }
    },
  )

  watch(
    () => formCreate.role,
    (r) => {
      if (!needsTrade.value) formCreate.trade = ''
      if (!needsSiteForRole.value) {
        formCreate.projectIdx = null
        formCreate.trade = ''
        tradeOptions.value = []
      }
    },
  )

  watch(
    () => formEdit.role,
    (r) => {
      if (!modalOpen.value || modalMode.value !== 'edit') return
      const siteRoles = [
        USER_ROLE.SITE_MANAGER,
        USER_ROLE.SITE_DIRECTOR,
        USER_ROLE.SECTION_LEADER,
        USER_ROLE.SECTION_SUPERVISOR,
      ]
      if (!siteRoles.includes(r)) {
        formEdit.projectIdx = null
        formEdit.trade = ''
        editTradeOptions.value = []
        return
      }
      if (![USER_ROLE.SECTION_LEADER, USER_ROLE.SECTION_SUPERVISOR].includes(r)) {
        formEdit.trade = ''
      }
    },
  )

  watch(
    () => [modalOpen.value, modalMode.value, formEdit.projectIdx, formEdit.role],
    async ([mo, mm, pid, role]) => {
      if (!mo || mm !== 'edit') return
      if (![USER_ROLE.SECTION_LEADER, USER_ROLE.SECTION_SUPERVISOR].includes(role)) {
        editTradeOptions.value = []
        return
      }
      await loadEditTradeOptions(pid)
    },
  )

  async function loadProjects() {
    try {
      const list = await getProjectList()
      projectOptions.value = Array.isArray(list) ? list.slice() : []
    } catch {
      projectOptions.value = []
    } finally {
      projectsReady.value = true
    }
  }

  async function refreshList() {
    loading.value = true
    try {
      const list = await getAdminAccounts()
      accounts.value = normalizeAccountList(list)
    } catch (e) {
      pushToast(e?.message || '계정 목록을 불러오지 못했습니다.', 'danger')
    } finally {
      loading.value = false
    }
  }

  async function refreshRequests() {
    loadingRequests.value = true
    try {
      const list = await getAdminAccountRequests()
      accountRequests.value = normalizeAccountList(list)
    } catch (e) {
      pushToast(e?.message || '요청 목록을 불러오지 못했습니다.', 'danger')
      accountRequests.value = []
    } finally {
      loadingRequests.value = false
    }
  }

  onMounted(async () => {
    await loadProjects()
    if (!ensureValidProjectRoute()) return
    await refreshList()
  })

  watch(
    () => route.params.projectIdx,
    async () => {
      workerAffiliationTab.value = 'hq'
      if (!projectsReady.value) return
      if (!ensureValidProjectRoute()) return
      await refreshList()
    },
  )


  /** 'idle' | 'checking' | 'available' | 'taken' */
  const emailCheckState = ref('idle')
  let emailCheckTimer = null

  async function checkEmailAsync(email) {
    const normalized = normalizeEmail(email)
    if (!normalized || !isValidEmail(normalized)) {
      emailCheckState.value = 'idle'
      return
    }
    emailCheckState.value = 'checking'
    try {
      const available = await checkEmailAvailability(normalized)
      emailCheckState.value = available ? 'available' : 'taken'
    } catch {
      emailCheckState.value = 'idle'
    }
  }

  function onCreateEmailInput() {
    formCreate.email = formatEmailInput(formCreate.email)
    emailCheckState.value = 'idle'
    if (emailCheckTimer) clearTimeout(emailCheckTimer)
    emailCheckTimer = setTimeout(() => checkEmailAsync(formCreate.email), 500)
  }

  function openCreateModal() {
    modalMode.value = 'create'
    formCreate.loginId = ''
    formCreate.password = ''
    formCreate.name = ''
    formCreate.phone = ''
    formCreate.email = ''
    formCreate.role = USER_ROLE.SITE_DIRECTOR
    formCreate.projectIdx = Number.isFinite(projectIdxParam.value) ? projectIdxParam.value : null
    formCreate.trade = ''
    emailCheckState.value = 'idle'
    if (emailCheckTimer) clearTimeout(emailCheckTimer)
    modalOpen.value = true
  }

  /** @param {Acc} row */
  function openEditModal(row) {
    modalMode.value = 'edit'
    editingIdx.value = row.idx
    formEdit.name = row.name || ''
    formEdit.phone = row.phone || ''
    formEdit.email = row.email || ''
    formEdit.role = rowRoleStr(row) || USER_ROLE.SITE_DIRECTOR
    formEdit.projectIdx = findProjectIdxForAccountRow(row)
    formEdit.trade = row.trade || ''
    modalOpen.value = true
  }

  function closeModal() {
    modalOpen.value = false
    editingIdx.value = null
    emailCheckState.value = 'idle'
    if (emailCheckTimer) clearTimeout(emailCheckTimer)
  }

  function notifyPasswordResetEmailSent() {
    window.alert(T.pwdResetMailAlert)
  }

  function deriveSiteCodeFromForm() {
    if (!needsSiteForRole.value) return undefined
    const idx = formCreate.projectIdx
    if (idx == null) return undefined
    const p = projectOptions.value.find((x) => x.idx === idx)
    if (!p) return undefined
    const { code } = parseProjectLabel(p.name)
    return code || undefined
  }

  function deriveSiteCodeFromEditForm() {
    if (!editNeedsSite.value) return undefined
    const idx = formEdit.projectIdx
    if (idx == null) return undefined
    const p = projectOptions.value.find((x) => x.idx === idx)
    if (!p) return undefined
    const { code } = parseProjectLabel(p.name)
    return code || undefined
  }

  async function submitModal() {
    if (modalMode.value === 'create') {
      const loginId = formatLoginId(formCreate.loginId)
      const password = String(formCreate.password || '').trim()
      const name = String(formCreate.name || '').trim()
      const phone = formatPhoneNumber(formCreate.phone)
      const email = normalizeEmail(formCreate.email)
      formCreate.loginId = loginId
      formCreate.phone = phone
      formCreate.email = email
      if (!isValidLoginId(loginId)) {
        pushToast('로그인 ID는 영문/숫자/._- 조합 4~30자로 입력해 주세요.', 'warning')
        return
      }
      if (!password || password.length < 8) {
        pushToast('로그인 ID와 비밀번호(8자 이상)를 확인해 주세요.', 'warning')
        return
      }
      if (!name) {
        pushToast('이름을 입력해 주세요.', 'warning')
        return
      }
      if (!isValidPhoneNumber(phone)) {
        pushToast('휴대폰 번호는 010-1234-5678 형식으로 입력해 주세요.', 'warning')
        return
      }
      if (!isValidEmail(email)) {
        pushToast('이메일은 name@example.com 형식으로 입력해 주세요.', 'warning')
        return
      }
      if (needsSiteForRole.value && formCreate.projectIdx == null) {
        pushToast('현장을 선택해 주세요.', 'warning')
        return
      }
      if (needsTrade.value) {
        if (!String(formCreate.trade || '').trim()) {
          pushToast('공종을 선택해 주세요.', 'warning')
          return
        }
      }
      const siteCode = deriveSiteCodeFromForm()
      try {
        await postAdminAccount({
          loginId,
          password,
          name,
          phone: phone || undefined,
          email: email || undefined,
          role: formCreate.role,
          siteCode,
          trade: needsTrade.value ? String(formCreate.trade || '').trim() : undefined,
        })
        pushToast('계정이 생성되었습니다.')
        closeModal()
        await refreshList()
      } catch (e) {
        pushToast(e?.message || '계정 생성에 실패했습니다.', 'danger')
      }
      return
    }

    const idx = editingIdx.value
    if (idx == null) return

    const editName = String(formEdit.name || '').trim()
    const editPhone = formatPhoneNumber(formEdit.phone)
    const editEmail = normalizeEmail(formEdit.email)
    formEdit.phone = editPhone
    formEdit.email = editEmail

    if (!editName) {
      pushToast('이름을 입력해 주세요.', 'warning')
      return
    }
    if (!isValidPhoneNumber(editPhone)) {
      pushToast('휴대폰 번호는 010-1234-5678 형식으로 입력해 주세요.', 'warning')
      return
    }
    if (!isValidEmail(editEmail)) {
      pushToast('이메일은 name@example.com 형식으로 입력해 주세요.', 'warning')
      return
    }

    if (editNeedsSite.value && formEdit.projectIdx == null) {
      pushToast('현장을 선택해 주세요.', 'warning')
      return
    }
    if (editNeedsTrade.value) {
      if (!String(formEdit.trade || '').trim()) {
        pushToast('공종을 선택해 주세요.', 'warning')
        return
      }
    }
    const siteCodePut = editNeedsSite.value ? deriveSiteCodeFromEditForm() : undefined
    if (editNeedsSite.value && !siteCodePut) {
      pushToast(
        '선택한 현장에서 현장 코드를 확인할 수 없습니다. 현장 등록 형식을 [코드] 표시명 인지 확인해 주세요.',
        'warning',
      )
      return
    }
    const tradePut = editNeedsTrade.value
      ? String(formEdit.trade || '').trim() || undefined
      : undefined
    const prevRow = accounts.value.find((a) => a.idx === idx)

    /** 관리자·본사 등 현장 폼 미노출 시 기존 값 유지 */
    let siteCodeMerged
    if (editNeedsSite.value) {
      siteCodeMerged = siteCodePut
    } else if (prevRow?.siteCode != null && String(prevRow.siteCode).trim() !== '') {
      siteCodeMerged = String(prevRow.siteCode).trim()
    } else {
      siteCodeMerged = undefined
    }

    let tradeMerged
    if (editNeedsTrade.value) {
      tradeMerged = tradePut
    } else if (prevRow?.trade != null && String(prevRow.trade).trim() !== '') {
      tradeMerged = String(prevRow.trade).trim()
    } else {
      tradeMerged = undefined
    }

    try {
      await putAdminAccount(idx, {
        name: editName,
        phone: editPhone || undefined,
        email: editEmail || undefined,
        role: formEdit.role,
        siteCode: siteCodeMerged,
        trade: tradeMerged,
        active: Boolean(prevRow?.active),
      })
      pushToast('계정이 수정되었습니다.')
      closeModal()
      await refreshList()
    } catch (e) {
      pushToast(e?.message || '계정 수정에 실패했습니다.', 'danger')
    }
  }

  async function activateAccount(row) {
    if (!row || row.active) return
    const ok = window.confirm(`‘${row.name}’ 계정을 활성화할까요?`)
    if (!ok) return
    try {
      await putAdminAccount(row.idx, accountUpdatePayload(row, { active: true }))
      pushToast('활성화되었습니다.')
      await refreshList()
    } catch (e) {
      pushToast(e?.message || '활성화에 실패했습니다.', 'danger')
    }
  }

  async function deactivateAccount(row) {
    if (!row || !row.active) return
    const ok = window.confirm(`‘${row.name}’ 계정을 비활성화할까요?`)
    if (!ok) return
    try {
      await putAdminAccount(row.idx, accountUpdatePayload(row, { active: false }))
      pushToast('비활성화되었습니다.')
      await refreshList()
    } catch (e) {
      pushToast(e?.message || '비활성화에 실패했습니다.', 'danger')
    }
  }

  const approveOpen = ref(false)
  const approveTarget = ref(/** @type {any|null} */ (null))
  const approvePassword = ref('')

  const rejectOpen = ref(false)
  const rejectTarget = ref(/** @type {any|null} */ (null))
  const rejectNote = ref('')

  const requestDetailOpen = ref(false)
  const selectedRequest = ref(/** @type {any|null} */ (null))

  function openRequestDetail(rq) {
    selectedRequest.value = rq
    requestDetailOpen.value = true
  }

  function closeRequestDetail() {
    requestDetailOpen.value = false
    selectedRequest.value = null
  }

  function startApproveFromDetail() {
    const rq = selectedRequest.value
    if (!rq) return
    if (rq.demo) {
      pushToast(T.demoRequestHint, 'warning')
      return
    }
    openApprove(rq)
  }

  function startRejectFromDetail() {
    const rq = selectedRequest.value
    if (!rq) return
    if (rq.demo) {
      pushToast(T.demoRequestHint, 'warning')
      return
    }
    openReject(rq)
  }

  function openApprove(row) {
    approveTarget.value = row
    approvePassword.value = ''
    approveOpen.value = true
  }

  function closeApprove() {
    approveOpen.value = false
    approveTarget.value = null
  }

  async function submitApprove() {
    const row = approveTarget.value
    const pwd = String(approvePassword.value || '').trim()
    if (!row) return
    if (pwd.length > 0 && pwd.length < 8) {
      pushToast(
        '초기 비밀번호를 입력할 경우 8자 이상이어야 합니다. 비워 두면 서버에서 자동 생성합니다.',
        'warning',
      )
      return
    }
    const body = pwd.length >= 8 ? { initialPassword: pwd } : {}
    try {
      await approveAccountRequest(row.idx, body)
      pushToast(
        pwd.length >= 8
          ? '승인 처리되었습니다.'
          : '승인되었습니다. 초기 비밀번호는 서버에서 생성되었습니다.',
      )
      closeApprove()
      closeRequestDetail()
      pruneReqSelectionAfterChange([row])
      await refreshRequests()
      await refreshList()
    } catch (e) {
      pushToast(e?.message || '승인 처리에 실패했습니다.', 'danger')
    }
  }

  function openReject(row) {
    rejectTarget.value = row
    rejectNote.value = ''
    rejectOpen.value = true
  }

  function closeReject() {
    rejectOpen.value = false
    rejectTarget.value = null
  }

  async function submitReject() {
    const row = rejectTarget.value
    if (!row) return
    try {
      await rejectAccountRequest(row.idx, {
        note: String(rejectNote.value || '').trim() || undefined,
      })
      pushToast('거절 처리되었습니다.')
      closeReject()
      closeRequestDetail()
      pruneReqSelectionAfterChange([row])
      await refreshRequests()
    } catch (e) {
      pushToast(e?.message || '거절 처리에 실패했습니다.', 'danger')
    }
  }

  function reqRowKey(rq) {
    const k = rq?.idx ?? rq?.id ?? rq?.requestIdx ?? rq?.requestId
    return k == null || k === '' ? '' : String(k)
  }

  const selectedReqKeys = ref(/** @type {Set<string>} */ (new Set()))

  function pruneReqSelectionAfterChange(rows) {
    const drop = new Set(rows.map((r) => reqRowKey(r)).filter(Boolean))
    if (!drop.size) return
    const next = new Set(selectedReqKeys.value)
    for (const k of drop) next.delete(k)
    selectedReqKeys.value = next
  }

  function isReqSelected(rq) {
    return selectedReqKeys.value.has(reqRowKey(rq))
  }

  function toggleReqCheckbox(rq, ev) {
    const el = /** @type {HTMLInputElement} */ (ev?.target)
    const key = reqRowKey(rq)
    if (!key) return
    const next = new Set(selectedReqKeys.value)
    if (el?.checked) next.add(key)
    else next.delete(key)
    selectedReqKeys.value = next
  }

  const selectableReqKeysAll = computed(() =>
    accountRequestsFiltered.value.map((r) => reqRowKey(r)).filter(Boolean),
  )

  const allReqRowsSelected = computed(() => {
    const keys = selectableReqKeysAll.value
    if (!keys.length) return false
    const set = selectedReqKeys.value
    return keys.every((k) => set.has(k))
  })

  function toggleSelectAllRequests(ev) {
    const el = /** @type {HTMLInputElement} */ (ev?.target)
    if (el?.checked) {
      selectedReqKeys.value = new Set(selectableReqKeysAll.value)
    } else {
      selectedReqKeys.value = new Set()
    }
  }

  /** 일괄 완료·반려 버튼 활성화: 대기 상태이며 체크된 행 전부(예시 행 포함). 제출 시 예시 행만 골라진 경우는 API 호출 없이 안내 */
  const bulkApproveEligible = computed(() =>
    accountRequestsFiltered.value.filter(
      (r) => selectedReqKeys.value.has(reqRowKey(r)) && isPendingRequest(r) && reqRowKey(r),
    ),
  )

  const bulkRejectEligible = computed(() =>
    accountRequestsFiltered.value.filter(
      (r) => selectedReqKeys.value.has(reqRowKey(r)) && isPendingRequest(r) && reqRowKey(r),
    ),
  )

  watch(() => projectIdxParam.value, () => {
    selectedReqKeys.value = new Set()
  })

  const bulkApproveBusy = ref(false)

  const bulkRejectOpen = ref(false)
  const bulkRejectNoteInput = ref('')
  const bulkRejectBusy = ref(false)

  function closeBulkRejectModal() {
    bulkRejectOpen.value = false
  }

  async function runBulkApproveFromToolbar() {
    const list = bulkApproveEligible.value
    if (!list.length) {
      pushToast(T.bulkNoEligible, 'warning')
      return
    }
    const apiRows = list.filter((r) => !r.demo)
    const demoOnly = apiRows.length === 0 && list.some((r) => r.demo)
    if (demoOnly) {
      pushToast(T.demoRequestHint, 'warning')
      return
    }
    if (!window.confirm(`선택한 ${apiRows.length}건을 승인 처리할까요?`)) return
    bulkApproveBusy.value = true
    let ok = 0
    try {
      for (const row of apiRows) {
        const id = row.idx ?? row.id ?? row.requestIdx ?? row.requestId
        if (id == null || id === '') continue
        await approveAccountRequest(id, {})
        ok++
      }
      if (!ok) {
        pushToast('승인 API를 호출할 수 있는 요청이 없습니다.', 'warning')
        return
      }
      window.alert(`선택한 ${ok}건이 승인 처리되었습니다.`)
      selectedReqKeys.value = new Set()
      closeRequestDetail()
      await refreshRequests()
      await refreshList()
    } catch (e) {
      const err = /** @type {Error & { message?: string }} */ (e)?.message || ''
      pushToast(
        ok > 0
          ? `${err || '오류'} (이전까지 ${ok}/${apiRows.length}건 처리됨)`
          : err || '일괄 승인에 실패했습니다.',
        'danger',
      )
      if (ok) {
        pruneReqSelectionAfterChange(apiRows.slice(0, ok))
        await refreshRequests()
        await refreshList()
      }
    } finally {
      bulkApproveBusy.value = false
    }
  }

  function openBulkRejectRequests() {
    if (!bulkRejectEligible.value.length) {
      pushToast(T.bulkNoEligible, 'warning')
      return
    }
    bulkRejectNoteInput.value = ''
    bulkRejectOpen.value = true
  }

  async function submitBulkRejectRequests() {
    const list = bulkRejectEligible.value
    if (!list.length) return
    const apiRows = list.filter((r) => !r.demo)
    const demoOnly = apiRows.length === 0 && list.some((r) => r.demo)
    if (demoOnly) {
      pushToast(T.demoRequestHint, 'warning')
      return
    }
    bulkRejectBusy.value = true
    const note = String(bulkRejectNoteInput.value || '').trim() || undefined
    let ok = 0
    try {
      for (const row of apiRows) {
        const id = row.idx ?? row.id ?? row.requestIdx ?? row.requestId
        if (id == null || id === '') continue
        await rejectAccountRequest(id, { note })
        ok++
      }
      pushToast(ok ? `${ok}건 반려 처리되었습니다.` : '처리된 항목이 없습니다.')
      closeBulkRejectModal()
      bulkRejectNoteInput.value = ''
      selectedReqKeys.value = new Set()
      closeRequestDetail()
      await refreshRequests()
    } catch (e) {
      const err = /** @type {Error & { message?: string }} */ (e)?.message || ''
      pushToast(
        ok > 0
          ? `${err || '오류'} (이전까지 ${ok}/${apiRows.length}건 처리됨)`
          : err || '일괄 반려에 실패했습니다.',
        'danger',
      )
      if (ok) {
        pruneReqSelectionAfterChange(apiRows.slice(0, ok))
        await refreshRequests()
      }
    } finally {
      bulkRejectBusy.value = false
    }
  }

  watch(
    [modalOpen, approveOpen, rejectOpen, requestDetailOpen, bulkRejectOpen],
    ([mo, ao, ro, rd, br]) => {
      document.documentElement.style.overflow = mo || ao || ro || rd || br ? 'hidden' : ''
    },
  )
  return {
    T, ROLE_OPTIONS, projectIdxParam, projectsReady, loading, loadingRequests,
    accounts, accountRequests, projectOptions, tradeOptions, tradeLoading,
    workerAffiliationTab, tradeAccordionOpen, toastMsg, toastVariant,
    currentProject, currentSiteCode, currentSiteDisplay, sortedProjectOptions,
    directorFieldAccounts, hqFieldAccounts, tradeFieldAccounts, tradeGroupedRows,
    accountStatusTheadClass, fieldAccounts,
    modalOpen, modalMode, formCreate, formEdit, editingIdx, editTradeLoading, editTradeOptions,
    editNeedsSite, editNeedsTrade, needsSiteForRole, needsTrade, selectedProjectLabel,
    emailCheckState, approveOpen, approveTarget, approvePassword,
    rejectOpen, rejectTarget, rejectNote,
    requestDetailOpen, selectedRequest,
    bulkRejectOpen, bulkRejectNoteInput, bulkRejectBusy, bulkRejectEligible,
    bulkApproveEligible, bulkApproveBusy, selectedReqKeys,
    pushToast, goBackToSiteHub, onSiteSwitcherChange, openCreateModal, openEditModal,
    closeModal, submitModal, activateAccount, deactivateAccount,
    toggleTradeAccordion, openRequestDetail, closeRequestDetail,
    startApproveFromDetail, startRejectFromDetail, closeApprove, submitApprove,
    closeReject, submitReject, closeBulkRejectModal, submitBulkRejectRequests,
    runBulkApproveFromToolbar, openBulkRejectRequests,
    onCreateEmailInput, notifyPasswordResetEmailSent,
    statusLabel, isPendingRequest, requestRowTitle, requestRowDetailText,
    requestSiteNameForDetail, formatReqDate, requestRowRequestedRoleStr, requestRowRoleStr,
    rowRoleStr, userRoleLabel, projectOptionLabel,
    formatLoginId, formatPhoneNumber, formatEmailInput, normalizeEmail,
    isReqSelected, toggleReqCheckbox, allReqRowsSelected, toggleSelectAllRequests,
    reqRowKey, accountRequestsFiltered,
  }
}
