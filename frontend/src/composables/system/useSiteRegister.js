import { computed, reactive, ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAdminAccounts, putAdminAccount } from '@/api/auth.js'
import {
  getProjectList,
  createProject,
  updateProject,
  deactivateProject,
  activateProject,
} from '@/api/project.js'
import { USER_ROLE, userRoleLabel } from '@/stores/authStore'
import {
  parseProjectLabel,
  rowRoleStr,
  classify,
  accountUpdatePayload,
} from '@/utils/system/accountHelpers'
import {
  SITE_REGISTER_TEXTS,
  ROLE_OPTIONS_HUB,
  SITE_REGISTER_ACCOUNT_STATUS_THEAD_CLASS,
  projectSiteStatusLabel,
} from '@/utils/system/siteRegisterTexts'
import {
  formatEmailInput,
  formatPhoneNumber,
  formatSiteCode,
  isValidEmail,
  isValidPhoneNumber,
  isValidSiteCode,
  normalizeEmail,
} from '@/utils/inputFormat'

export function useSiteRegister() {
  const T = SITE_REGISTER_TEXTS
  const router = useRouter()

  /** @typedef {{ idx: number, loginId?: string, name?: string, role?: string, siteCode?: string|null, trade?: string|null, active?: boolean, phone?: string|null, email?: string|null }} Acc */

  const loading = ref(false)
  /** @type {import('vue').Ref<Array<Record<string, unknown> & { idx: number, name: string, location?: string }>>} */
  const projects = ref([])
  /** @type {import('vue').Ref<Acc[]>} */
  const accounts = ref([])

  const expanded = reactive({
    system: true,
    hq: true,
  })

  const toastMsg = ref('')
  const toastVariant = ref('info')

  function pushToast(msg, variant = 'info') {
    toastMsg.value = msg
    toastVariant.value = variant
    window.setTimeout(() => {
      toastMsg.value = ''
    }, 3800)
  }

  function normalizeAccountList(raw) {
    if (Array.isArray(raw)) return raw.slice()
    if (raw && typeof raw === 'object' && Array.isArray(raw.data)) return raw.data.slice()
    return []
  }

  const groupedHub = computed(() => {
    const list = Array.isArray(accounts.value) ? accounts.value : []
    return {
      system: list.filter((a) => classify(a) === 'system'),
      hq: list.filter((a) => classify(a) === 'hq'),
    }
  })

  const hubSections = computed(() => [
    {
      key: /** @type {'system'} */ ('system'),
      label: T.grpSystem,
      rows: groupedHub.value.system ?? [],
    },
    {
      key: /** @type {'hq'} */ ('hq'),
      label: T.grpHQ,
      rows: groupedHub.value.hq ?? [],
    },
  ])

  const accountStatusTheadClass = SITE_REGISTER_ACCOUNT_STATUS_THEAD_CLASS

  /** role 객체/문자열 */
  function rowRoleMatches(acc, roleStr) {
    const r = acc?.role
    const name =
      r && typeof r === 'object' && r !== null && 'name' in r
        ? String(/** @type {{ name?: string }} */ (r).name || '')
        : String(r || '')
    return name === roleStr
  }

  function directorFromAccounts(siteCodeRaw) {
    const siteCode = String(siteCodeRaw || '').trim()
    if (!siteCode) return null
    const candidates = accounts.value.filter(
      (a) =>
        rowRoleMatches(a, USER_ROLE.SITE_DIRECTOR) &&
        String(a?.siteCode || '').trim() === siteCode &&
        a?.active !== false,
    )
    if (!candidates.length) return null
    candidates.sort((x, y) => String(x?.name || '').localeCompare(String(y?.name || ''), 'ko'))
    return candidates[0]
  }

  function pickDirectorFields(p, accRow) {
    const n = p.siteDirectorName ?? p.directorName ?? p.managerName ?? accRow?.name
    const ph = p.siteDirectorPhone ?? p.directorPhone ?? p.managerPhone ?? accRow?.phone
    return {
      directorName: String(n || '').trim() || '—',
      directorPhone: String(ph || '').trim() || '—',
    }
  }

  async function refreshList() {
    loading.value = true
    try {
      const [list, accs] = await Promise.all([
        getProjectList(),
        getAdminAccounts().catch((e) => {
          pushToast(e?.message || '계정 목록을 불러오지 못했습니다.', 'danger')
          return []
        }),
      ])
      projects.value = Array.isArray(list) ? list.slice() : []
      accounts.value = normalizeAccountList(accs)
    } catch (e) {
      window.alert(e?.message || '목록을 불러오지 못했습니다.')
    } finally {
      loading.value = false
    }
  }

  const rows = computed(() =>
    projects.value.map((p) => {
      const { code, displayName } = parseProjectLabel(p.name)
      const accRow = directorFromAccounts(code)
      const { directorName, directorPhone } = pickDirectorFields(p, accRow)
      /** @type {Record<string, unknown>} */
      const pr = /** @type {Record<string, unknown>} */ (p)
      return {
        idx: p.idx,
        code: code || '—',
        displayName: displayName || '—',
        directorName,
        directorPhone,
        address: p.location?.trim() ? p.location : '—',
        statusLabel: projectSiteStatusLabel(pr),
        active: p.active !== false,
      }
    }),
  )

  onMounted(() => {
    refreshList()
  })

  function openSiteAccounts(idx) {
    router.push({ name: 'hrAccountsSite', params: { projectIdx: String(idx) } })
  }

  function accordionToggle(key) {
    expanded[key] = !expanded[key]
  }

  const siteModalOpen = ref(false)
  const form = reactive({
    siteCode: '',
    siteName: '',
    address: '',
    startDate: '',
    endDate: '',
  })

  function openSiteModal() {
    form.siteCode = ''
    form.siteName = ''
    form.address = ''
    form.startDate = ''
    form.endDate = ''
    siteModalOpen.value = true
  }

  function closeSiteModal() {
    siteModalOpen.value = false
  }

  function isoDate(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  async function submitRegister() {
    const code = formatSiteCode(form.siteCode)
    const name = String(form.siteName || '').trim()
    const address = String(form.address || '').trim()
    form.siteCode = code
    if (!code || !name || !address) {
      window.alert('현장 코드, 현장 명, 주소를 모두 입력해 주세요.')
      return
    }
    if (!isValidSiteCode(code)) {
      window.alert('현장 코드는 XX-X 형식의 영문 대문자만 사용할 수 있습니다. (예: GN-A)')
      return
    }
    const duplicate = rows.value.some(
      (row) => row.code !== '—' && String(row.code).trim().toUpperCase() === code,
    )
    if (duplicate) {
      window.alert('이미 사용 중인 현장 코드입니다.')
      return
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      window.alert('종료일은 시작일보다 이후여야 합니다.')
      return
    }
    const combinedName = `[${code}] ${name}`
    const defaultStart = new Date()
    const defaultEnd = new Date(defaultStart)
    defaultEnd.setFullYear(defaultEnd.getFullYear() + 1)
    try {
      await createProject({
        name: combinedName,
        location: address,
        startDate: form.startDate || isoDate(defaultStart),
        endDate: form.endDate || isoDate(defaultEnd),
      })
      closeSiteModal()
      await refreshList()
    } catch (e) {
      window.alert(e?.message || '현장 등록에 실패했습니다.')
    }
  }

  const siteEditOpen = ref(false)
  const editSiteForm = reactive({
    idx: 0,
    siteCode: '',
    siteName: '',
    address: '',
    startDate: '',
    endDate: '',
  })

  /** @param {{ idx: number }} row */
  function openEditSite(row) {
    const p = projects.value.find((x) => x.idx === row.idx)
    if (!p) return
    const { code, displayName } = parseProjectLabel(String(p.name || ''))
    editSiteForm.idx = p.idx
    editSiteForm.siteCode = formatSiteCode(code)
    editSiteForm.siteName = displayName || ''
    editSiteForm.address = String(p.location ?? '').trim()
    const sd = p.startDate
    const ed = p.endDate
    editSiteForm.startDate = sd ? String(sd).slice(0, 10) : ''
    editSiteForm.endDate = ed ? String(ed).slice(0, 10) : ''
    siteEditOpen.value = true
  }

  function closeSiteEdit() {
    siteEditOpen.value = false
  }

  async function submitSiteEdit() {
    const code = formatSiteCode(editSiteForm.siteCode)
    const nm = String(editSiteForm.siteName || '').trim()
    const addr = String(editSiteForm.address || '').trim()
    editSiteForm.siteCode = code
    if (!code || !nm || !addr) {
      pushToast('현장 코드, 명, 주소를 확인해 주세요.', 'warning')
      return
    }
    if (!isValidSiteCode(code)) {
      pushToast('현장 코드는 XX-X 형식의 영문 대문자만 사용할 수 있습니다. (예: GN-A)', 'warning')
      return
    }
    const duplicate = rows.value.some(
      (row) =>
        row.idx !== editSiteForm.idx &&
        row.code !== '—' &&
        String(row.code).trim().toUpperCase() === code,
    )
    if (duplicate) {
      pushToast('이미 사용 중인 현장 코드입니다.', 'warning')
      return
    }
    if (
      editSiteForm.startDate &&
      editSiteForm.endDate &&
      editSiteForm.endDate < editSiteForm.startDate
    ) {
      pushToast('종료일은 시작일보다 이후여야 합니다.', 'warning')
      return
    }
    try {
      await updateProject(editSiteForm.idx, {
        name: `[${code}] ${nm}`,
        location: addr,
        startDate: editSiteForm.startDate || null,
        endDate: editSiteForm.endDate || null,
      })
      pushToast('현장 정보가 수정되었습니다.')
      closeSiteEdit()
      await refreshList()
    } catch (e) {
      pushToast(/** @type {Error} */ (e).message || '현장 수정에 실패했습니다.', 'danger')
    }
  }

  async function deactivateSite(row) {
    if (!row.active) return
    const ok = window.confirm(
      `'${row.displayName}' 현장을 운영 종료 처리할까요?\n이후 배치 인력 동기화 대상에서 제외됩니다.`,
    )
    if (!ok) return
    try {
      await deactivateProject(row.idx)
      pushToast('현장이 운영 종료 처리되었습니다.')
      await refreshList()
    } catch (e) {
      pushToast(e?.message || '운영 종료 처리에 실패했습니다.', 'danger')
    }
  }

  async function activateSite(row) {
    if (row.active) return
    const ok = window.confirm(`'${row.displayName}' 현장을 운영 중으로 재개할까요?`)
    if (!ok) return
    try {
      await activateProject(row.idx)
      pushToast('현장이 운영 중으로 변경되었습니다.')
      await refreshList()
    } catch (e) {
      pushToast(e?.message || '운영 재개 처리에 실패했습니다.', 'danger')
    }
  }

  const modalOpen = ref(false)
  const editingIdx = ref(/** @type {number|null} */ (null))

  const formEdit = reactive({
    name: '',
    phone: '',
    email: '',
    role: USER_ROLE.ADMIN,
  })

  /** @param {Acc} row */
  function openEditModal(row) {
    editingIdx.value = row.idx
    formEdit.name = row.name || ''
    formEdit.phone = row.phone || ''
    formEdit.email = row.email || ''
    const rs = rowRoleStr(row) || USER_ROLE.ADMIN
    formEdit.role = ROLE_OPTIONS_HUB.some((o) => o.value === rs) ? rs : USER_ROLE.ADMIN
    modalOpen.value = true
  }

  function closeAccountModal() {
    modalOpen.value = false
    editingIdx.value = null
  }

  function notifyPasswordResetEmailSent() {
    window.alert(T.pwdResetMailAlert)
  }

  async function submitAccountModal() {
    const idx = editingIdx.value
    if (idx == null) return

    const name = String(formEdit.name || '').trim()
    const phone = formatPhoneNumber(formEdit.phone)
    const email = normalizeEmail(formEdit.email)
    formEdit.phone = phone
    formEdit.email = email

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

    const prevRow = accounts.value.find((a) => a.idx === idx)
    const siteCodeMerged =
      prevRow?.siteCode != null && String(prevRow.siteCode).trim() !== ''
        ? String(prevRow.siteCode).trim()
        : undefined
    const tradeMerged =
      prevRow?.trade != null && String(prevRow.trade).trim() !== ''
        ? String(prevRow.trade).trim()
        : undefined

    try {
      await putAdminAccount(idx, {
        name,
        phone: phone || undefined,
        email: email || undefined,
        role: formEdit.role,
        siteCode: siteCodeMerged,
        trade: tradeMerged,
        active: Boolean(prevRow?.active),
      })
      pushToast('계정이 수정되었습니다.')
      closeAccountModal()
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

  watch([modalOpen, siteModalOpen, siteEditOpen], ([mo, smo, seo]) => {
    document.documentElement.style.overflow = mo || smo || seo ? 'hidden' : ''
  })

  return {
    T,
    ROLE_OPTIONS_HUB,
    loading,
    projects,
    accounts,
    expanded,
    toastMsg,
    toastVariant,
    hubSections,
    accountStatusTheadClass,
    rows,
    siteModalOpen,
    form,
    siteEditOpen,
    editSiteForm,
    modalOpen,
    formEdit,
    pushToast,
    refreshList,
    openSiteAccounts,
    accordionToggle,
    openSiteModal,
    closeSiteModal,
    submitRegister,
    openEditSite,
    closeSiteEdit,
    submitSiteEdit,
    deactivateSite,
    activateSite,
    openEditModal,
    closeAccountModal,
    notifyPasswordResetEmailSent,
    submitAccountModal,
    activateAccount,
    deactivateAccount,
    formatSiteCode,
    formatPhoneNumber,
    formatEmailInput,
    normalizeEmail,
    rowRoleStr,
    userRoleLabel,
  }
}
