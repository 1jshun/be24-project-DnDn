import { computed, ref, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { getAffiliationKind } from '@/utils/workerUi'
import { useStaffingBoardSync } from '@/composables/useStaffingBoardSync'
import {
  postStaffingAutoRecommend,
  postStaffingReset,
  postStaffingSave,
  getStaffingBoard,
  patchZoneSub,
  deleteZoneSubWorker,
  postZoneSubAssign,
  getStaffingWorkerPool,
} from '@/api/staffing'
import {
  mapAssignedWorkerRes,
  normalizeSaveSummaryRes,
  tradeNeedsFromZoneSubRes,
  buildZoneUpdateBody,
  tradeMatchesStaffing,
} from '@/utils/staffingAdapter'
import {
  STAFFING_BOARD_TEXTS,
  STAFFING_TRADE_OPTIONS,
  staffingTradeLabel,
} from '@/utils/deployment/staffingBoardTexts'
import {
  cloneWorker,
  workerTagOk,
  staffingTradeCell,
  shouldWarnTradeMismatch,
  groupZonesByTrade,
  rosterDateToday,
} from '@/utils/deployment/staffingBoardUi'

let idSeq = 100

export function useStaffingBoard() {
  const T = STAFFING_BOARD_TEXTS

  const TRADE_OPTIONS = STAFFING_TRADE_OPTIONS.map((opt) => ({
    key: opt.key,
    label: () => staffingTradeLabel(T, opt.key),
  }))

  const tradeCell = (w) => staffingTradeCell(T, w)

  const router = useRouter()
  const authStore = useAuthStore()
  const staffingSiteCode = computed(() => authStore.siteCode)

  const isTradeScoped = computed(() => {
    const r = authStore.userRole
    return r === 'SECTION_LEADER' || r === 'SECTION_SUPERVISOR'
  })

  const userTrade = computed(() => String(authStore.trade || '').trim())

  function zoneAllowedForUserTrade(zoneTradeName) {
    if (!isTradeScoped.value || !userTrade.value) return true
    return tradeMatchesStaffing(zoneTradeName, userTrade.value)
  }

  /** 공종 스코프 계정은 본인 공종 구역만 UI에 표시 */
  const displayedZoneGroups = computed(() => {
    if (!isTradeScoped.value || !userTrade.value) return zoneGroups.value
    return zoneGroups.value
      .map((g) => ({
        ...g,
        subZones: (g.subZones ?? []).filter((sz) => zoneAllowedForUserTrade(sz.tradeName)),
      }))
      .filter((g) => (g.subZones?.length ?? 0) > 0)
  })

  const rosterDate = ref(rosterDateToday())
  const zoneGroups = ref([])
  const waiting = ref([])
  const toasts = ref([])
  let toastSeq = 0

  function pushToast(message, variant = 'warning') {
    const id = ++toastSeq
    toasts.value = [...toasts.value, { id, message, variant }]
    window.setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, 4200)
  }

  function flattenSubZones(sourceGroups = displayedZoneGroups.value) {
    const out = []
    for (const g of sourceGroups) {
      for (const sz of g.subZones ?? []) {
        out.push({ group: g, subZone: sz })
      }
    }
    return out
  }

  function findSubZone(subZoneId) {
    for (const g of zoneGroups.value) {
      const sz = g.subZones.find((s) => s.id === subZoneId)
      if (sz) return { group: g, subZone: sz }
    }
    return null
  }

  const assignTargetSubZoneId = ref('')
  const selectedWaitingIds = ref([])

  function toggleSelectWaiting(id) {
    const i = selectedWaitingIds.value.indexOf(id)
    if (i >= 0) selectedWaitingIds.value = selectedWaitingIds.value.filter((x) => x !== id)
    else selectedWaitingIds.value = [...selectedWaitingIds.value, id]
  }

  const assignOptions = computed(() => {
    const opts = []
    for (const g of displayedZoneGroups.value) {
      for (const sz of g.subZones ?? []) {
        opts.push({
          value: sz.id,
          label: `${g.title} · ${sz.title}`,
        })
      }
    }
    return opts
  })

  watch(assignOptions, (opts) => {
    if (
      assignTargetSubZoneId.value &&
      !opts.some((o) => o.value === assignTargetSubZoneId.value)
    ) {
      assignTargetSubZoneId.value = ''
    }
  })

  const boardKindBreakdown = computed(() => {
    let direct = 0
    let partner = 0
    let agency = 0
    const countW = (w) => {
      const k = getAffiliationKind(w.affiliation)
      if (k === 'direct') direct++
      else if (k === 'agency') agency++
      else partner++
    }
    for (const w of waiting.value) countW(w)
    for (const { subZone } of flattenSubZones()) {
      for (const w of subZone.workers) countW(w)
    }
    return { direct, partner, agency, total: direct + partner + agency }
  })

  function packState() {
    return {
      waiting: JSON.parse(JSON.stringify(waiting.value)),
      zoneGroups: JSON.parse(
        JSON.stringify(
          zoneGroups.value.map((g) => ({
            ...g,
            subZones: g.subZones.map((sz) => ({
              ...sz,
              workers: sz.workers.map(cloneWorker),
            })),
          })),
        ),
      ),
      idSeq,
      v: 2,
    }
  }

  function applyRemoteState(payload) {
    if (!payload) return
    if (payload.v === 2 && Array.isArray(payload.zoneGroups) && Array.isArray(payload.waiting)) {
      waiting.value = payload.waiting.map(cloneWorker)
      zoneGroups.value = payload.zoneGroups.map((g) => ({
        ...g,
        subZones: (g.subZones || []).map((sz) => ({
          ...sz,
          expanded: sz.expanded !== false,
          workers: (sz.workers || []).map(cloneWorker),
        })),
      }))
      if (typeof payload.idSeq === 'number' && payload.idSeq > idSeq) idSeq = payload.idSeq
      return
    }
    if (Array.isArray(payload.zones) && Array.isArray(payload.waiting)) {
      waiting.value = payload.waiting.map(cloneWorker)
      zoneGroups.value = payload.zones.map((z, i) => ({
        id: `g-mig-${i}`,
        title: z.title || '구역',
        expanded: true,
        subZones: [
          {
            id: z.id,
            title: z.subtitle || '상세',
            expanded: true,
            required: z.required,
            tradeNeeds: z.tradeNeeds || [],
            workers: (z.workers || []).map(cloneWorker),
          },
        ],
      }))
      if (typeof payload.idSeq === 'number' && payload.idSeq > idSeq) idSeq = payload.idSeq
    }
  }

  const tabId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`

  const { publish } = useStaffingBoardSync(tabId, applyRemoteState)

  function syncPublish() {
    publish(packState())
  }

  const showOnlyUnassignedInPool = ref(false)
  const poolAffiliationFilter = ref('')
  const workerPoolSearch = ref('')

  async function reloadWaitingPool() {
    let affiliationKind
    if (poolAffiliationFilter.value === 'direct') affiliationKind = 'DIRECT'
    else if (poolAffiliationFilter.value === 'partner') affiliationKind = 'PARTNER'
    const keyword = workerPoolSearch.value.trim()
    const data = await getStaffingWorkerPool({
      siteCode: staffingSiteCode.value || undefined,
      rosterDate: rosterDate.value,
      affiliationKind,
      keyword: keyword || undefined,
      unassignedOnly: showOnlyUnassignedInPool.value,
    })
    const rows = data?.rows ?? []
    waiting.value = rows.filter((r) => !r.assigned).map((r) => mapAssignedWorkerRes(r))
  }

  function mapBoardSubZone(sz) {
    return {
      id: String(sz.idx),
      title: sz.title ?? '',
      location: sz.location ?? '',
      tradeName: sz.tradeName ?? '',
      workTime: sz.workTime ?? '',
      workDate: sz.workDate ?? rosterDate.value,
      workPlanId: sz.workPlanId ?? null,
      expanded: true,
      required: sz.required ?? 0,
      tradeNeeds: tradeNeedsFromZoneSubRes(sz.tradeNeeds),
      workers: (sz.workers ?? []).map((row) => mapAssignedWorkerRes(row)),
    }
  }

  async function reloadBoard() {
    try {
      const [board] = await Promise.all([
        getStaffingBoard({
          rosterDate: rosterDate.value,
          siteCode: staffingSiteCode.value || undefined,
        }),
        reloadWaitingPool(),
      ])
      zoneGroups.value = (board?.zoneMains ?? []).map((zm) => ({
        id: String(zm.idx),
        title: zm.title,
        expanded: true,
        subZones: (zm.subZones ?? []).map(mapBoardSubZone),
      }))
      syncPublish()
    } catch (e) {
      pushToast(e?.message || '인력 배치 정보를 불러오지 못했습니다.', 'danger')
    }
  }

  let poolReloadTimer = null

  onMounted(() => {
    reloadBoard()
  })

  function openWorkerProfile(w) {
    const id = w.profileId ?? w.id
    router.push({ name: 'siteWorkerProfile', params: { id: String(id) } })
  }

  async function removeFromSubZone(subZoneId, workerId) {
    const found = findSubZone(subZoneId)
    if (!found) return
    const w = found.subZone.workers.find((x) => x.id === workerId)
    const workerIdx = w?.workerIdx ?? Number(workerId)
    if (workerIdx == null || Number.isNaN(workerIdx)) return
    try {
      await deleteZoneSubWorker(subZoneId, workerIdx, rosterDate.value)
      await reloadBoard()
    } catch (e) {
      pushToast(e?.message || '구역에서 제거하지 못했습니다.', 'danger')
    }
  }

  const resetConfirmOpen = ref(false)

  const resetConfirmRows = computed(() => {
    const rows = []
    for (const g of displayedZoneGroups.value) {
      for (const sz of g.subZones ?? []) {
        if (sz.workers.length > 0) {
          rows.push({
            label: `${g.title} · ${sz.title}`,
            count: sz.workers.length,
          })
        }
      }
    }
    return rows
  })

  const resetConfirmTotal = computed(() =>
    resetConfirmRows.value.reduce((s, r) => s + r.count, 0),
  )

  function openResetConfirm() {
    resetConfirmOpen.value = true
  }

  function closeResetConfirm() {
    resetConfirmOpen.value = false
  }

  async function executeReset() {
    closeResetConfirm()
    try {
      await postStaffingReset(rosterDate.value, staffingSiteCode.value || undefined)
      await reloadBoard()
      pushToast('인력 배치가 초기화되었습니다.', 'info')
    } catch (e) {
      pushToast(e?.message || '초기화에 실패했습니다.', 'danger')
    }
  }

  const saveConfirmOpen = ref(false)

  function openSaveConfirm() {
    saveConfirmOpen.value = true
  }

  function closeSaveConfirm() {
    saveConfirmOpen.value = false
  }

  const assignOverflowOpen = ref(false)
  const assignOverflowMeta = ref(null)

  function closeAssignOverflow() {
    assignOverflowOpen.value = false
    assignOverflowMeta.value = null
  }

  const poolTradeOptions = computed(() => {
    const tradeSet = new Set()
    const addWorker = (w) => {
      if (!workerTagOk(w)) return
      if (getAffiliationKind(w.affiliation) === 'direct') return
      const trade = tradeCell(w)
      if (trade && trade !== '—') tradeSet.add(trade)
    }
    for (const w of waiting.value) addWorker(w)
    for (const g of displayedZoneGroups.value) {
      for (const sz of g.subZones ?? []) {
        for (const w of sz.workers) addWorker(w)
      }
    }
    const trades = [...tradeSet].sort((a, b) => a.localeCompare(b, 'ko'))
    return [
      { value: '', label: '전체' },
      { value: '본사', label: '본사' },
      ...trades.map((t) => ({ value: t, label: t })),
    ]
  })

  const staffingTableRows = computed(() => {
    const rows = []
    for (const w of waiting.value) {
      if (!workerTagOk(w)) continue
      rows.push({
        worker: w,
        placement: '미투입',
        waitingId: w.id,
        selectable: true,
      })
    }
    if (!showOnlyUnassignedInPool.value) {
      for (const g of displayedZoneGroups.value) {
        for (const sz of g.subZones ?? []) {
          for (const w of sz.workers) {
            if (!workerTagOk(w)) continue
            rows.push({
              worker: w,
              placement: `${g.title} · ${sz.title}`,
              waitingId: null,
              selectable: false,
            })
          }
        }
      }
    }

    let out = rows
    const cat = poolAffiliationFilter.value
    if (cat === '본사') {
      out = out.filter((r) => getAffiliationKind(r.worker.affiliation) === 'direct')
    } else if (cat) {
      out = out.filter((r) => tradeCell(r.worker) === cat)
    }
    const q = workerPoolSearch.value.trim().toLowerCase()
    if (q) {
      out = out.filter((r) => {
        const name = String(r.worker.name ?? '').toLowerCase()
        const hay = [tradeCell(r.worker)].join(' ').toLowerCase()
        return name.includes(q) || hay.includes(q)
      })
    }
    return out
  })

  function poolRowGroupLabel(row) {
    const w = row.worker
    if (getAffiliationKind(w.affiliation) === 'direct') return '본사'
    const trade = tradeCell(w)
    return trade && trade !== '—' ? trade : '기타'
  }

  const staffingTableGrouped = computed(() => {
    const rows = staffingTableRows.value
    const map = new Map()
    for (const row of rows) {
      const label = poolRowGroupLabel(row)
      if (!map.has(label)) map.set(label, [])
      map.get(label).push(row)
    }
    const labels = [...map.keys()].sort((a, b) => {
      if (a === '본사') return -1
      if (b === '본사') return 1
      return a.localeCompare(b, 'ko')
    })
    return labels.map((label) => ({ label, rows: map.get(label) }))
  })

  const POOL_PAGE_SIZE = 20
  const poolCurrentPage = ref(0)

  const poolTotalPages = computed(() => {
    const total = staffingTableGrouped.value.reduce((s, g) => s + g.rows.length, 0)
    return total === 0 ? 0 : Math.ceil(total / POOL_PAGE_SIZE)
  })

  const poolPagedGroups = computed(() => {
    const start = poolCurrentPage.value * POOL_PAGE_SIZE
    const end = start + POOL_PAGE_SIZE
    let idx = 0
    const result = []
    for (const group of staffingTableGrouped.value) {
      const gStart = idx
      const gEnd = idx + group.rows.length
      idx = gEnd
      if (gEnd <= start || gStart >= end) continue
      const sliceFrom = Math.max(0, start - gStart)
      const sliceTo = Math.min(group.rows.length, end - gStart)
      result.push({ label: group.label, rows: group.rows.slice(sliceFrom, sliceTo) })
    }
    return result
  })

  function poolGoToPage(pg) {
    const tp = poolTotalPages.value
    if (tp === 0) return
    poolCurrentPage.value = Math.max(0, Math.min(pg, tp - 1))
  }

  const poolGroupExpanded = ref({})

  function poolGroupIsOpen(label) {
    return poolGroupExpanded.value[label] !== false
  }

  function togglePoolGroupExpanded(label) {
    const open = poolGroupExpanded.value[label] !== false
    poolGroupExpanded.value = { ...poolGroupExpanded.value, [label]: !open }
  }

  function poolGroupSelectableIds(groupRows) {
    return groupRows.filter((r) => r.selectable && r.waitingId).map((r) => r.waitingId)
  }

  function poolGroupAllChecked(groupRows) {
    const ids = poolGroupSelectableIds(groupRows)
    return ids.length > 0 && ids.every((id) => selectedWaitingIds.value.includes(id))
  }

  function togglePoolGroupSelectAll(groupRows) {
    const ids = poolGroupSelectableIds(groupRows)
    if (!ids.length) return
    if (poolGroupAllChecked(groupRows)) {
      selectedWaitingIds.value = selectedWaitingIds.value.filter((id) => !ids.includes(id))
    } else {
      selectedWaitingIds.value = [...new Set([...selectedWaitingIds.value, ...ids])]
    }
  }

  watch([poolAffiliationFilter, workerPoolSearch, showOnlyUnassignedInPool], () => {
    poolCurrentPage.value = 0
    selectedWaitingIds.value = []
    clearTimeout(poolReloadTimer)
    poolReloadTimer = setTimeout(() => {
      reloadWaitingPool().catch((e) =>
        pushToast(e?.message || '작업자 현황을 불러오지 못했습니다.', 'danger'),
      )
    }, 320)
  })

  const poolSelectableWaitingIds = computed(() =>
    staffingTableRows.value.filter((r) => r.selectable && r.waitingId).map((r) => r.waitingId),
  )

  const poolHeaderAllChecked = computed(() => {
    const ids = poolSelectableWaitingIds.value
    return ids.length > 0 && ids.every((id) => selectedWaitingIds.value.includes(id))
  })

  const poolHeaderSomeChecked = computed(() => {
    const ids = poolSelectableWaitingIds.value
    return ids.some((id) => selectedWaitingIds.value.includes(id)) && !poolHeaderAllChecked.value
  })

  const poolHeaderCheckboxRef = ref(null)

  watch([poolHeaderAllChecked, poolHeaderSomeChecked, selectedWaitingIds, staffingTableRows], () => {
    nextTick(() => {
      const el = poolHeaderCheckboxRef.value
      if (el && 'indeterminate' in el) {
        el.indeterminate = poolHeaderSomeChecked.value
      }
    })
  })

  function togglePoolHeaderSelectAll() {
    const ids = poolSelectableWaitingIds.value
    if (!ids.length) return
    if (poolHeaderAllChecked.value) {
      selectedWaitingIds.value = selectedWaitingIds.value.filter((id) => !ids.includes(id))
    } else {
      selectedWaitingIds.value = [...new Set([...selectedWaitingIds.value, ...ids])]
    }
  }

  async function assignSelectedWorkers() {
    const targetId = assignTargetSubZoneId.value
    if (!targetId || selectedWaitingIds.value.length === 0) {
      pushToast(T.assignNeedSelection, 'warning')
      return
    }
    const found = findSubZone(targetId)
    if (!found) return
    if (!zoneAllowedForUserTrade(found.subZone.tradeName)) {
      pushToast('본인 공종 구역에만 인력을 투입할 수 있습니다.', 'warning')
      return
    }

    const subZone = found.subZone
    const selectedAssignable = selectedWaitingIds.value.filter((wid) => {
      const w = waiting.value.find((x) => x.id === wid)
      return !!(w && workerTagOk(w))
    }).length

    const remaining = Math.max(0, subZone.required - subZone.workers.length)
    if (selectedAssignable > remaining) {
      assignOverflowMeta.value = { selected: selectedAssignable, remaining }
      assignOverflowOpen.value = true
      return
    }

    const ids = [...selectedWaitingIds.value]
    const workerIndices = []
    for (const wid of ids) {
      const w = waiting.value.find((x) => x.id === wid)
      if (!w || !workerTagOk(w)) continue
      if (shouldWarnTradeMismatch(found.subZone, w)) {
        pushToast(T.tradeWarn, 'warning')
      }
      const idx = w.workerIdx ?? Number(wid)
      if (idx != null && !Number.isNaN(Number(idx))) workerIndices.push(Number(idx))
    }
    const unique = [...new Set(workerIndices)]
    if (!unique.length) return

    try {
      await postZoneSubAssign(Number(subZone.id), unique, rosterDate.value)
      selectedWaitingIds.value = []
      await reloadBoard()
      window.alert(T.assignDone)
    } catch (e) {
      const msg = String(e?.message || '')
      if (msg.includes('초과')) {
        assignOverflowMeta.value = { selected: unique.length, remaining }
        assignOverflowOpen.value = true
      } else {
        pushToast(msg || '투입에 실패했습니다.', 'danger')
      }
    }
  }

  async function autoRecommend() {
    try {
      const raw = await postStaffingAutoRecommend(rosterDate.value, staffingSiteCode.value || undefined)
      const { assignedCount, unassignedCount } = normalizeSaveSummaryRes(raw)
      await reloadBoard()
      pushToast(
        `본사 직영 미배치 인력 기준 신규 배치 ${assignedCount}명, 잔여 미배치 ${unassignedCount}명입니다.`,
        'success',
      )
    } catch (e) {
      pushToast(e?.message || '자동 추천 배치에 실패했습니다.', 'danger')
    }
  }

  async function executeFinalizeSave() {
    closeSaveConfirm()
    try {
      const raw = await postStaffingSave(rosterDate.value, staffingSiteCode.value || undefined)
      const { assignedCount } = normalizeSaveSummaryRes(raw)
      await reloadBoard()
      pushToast(
        assignedCount > 0
          ? `배치 저장 완료. 근태 카드 구역 반영 ${assignedCount}건입니다.`
          : '배치 저장 완료. 반영할 배치가 없습니다.',
        'success',
      )
    } catch (e) {
      pushToast(e?.message || '최종 배치 저장에 실패했습니다.', 'danger')
    }
  }

  const zoneEditOpen = ref(false)
  const zoneEditDraft = ref(null)

  function openZoneEdit(group, sz) {
    zoneEditDraft.value = {
      groupId: group.id,
      subZoneId: sz.id,
      title: sz.title,
      tradeRows: (sz.tradeNeeds || []).map((tn) => ({
        trade: tn.trade,
        need: Math.max(0, Number(tn.need) || 0),
      })),
    }
    if (!zoneEditDraft.value.tradeRows.length) {
      zoneEditDraft.value.tradeRows = [{ trade: 'labor', need: 1 }]
    }
    zoneEditOpen.value = true
  }

  function closeZoneEdit() {
    zoneEditOpen.value = false
    zoneEditDraft.value = null
  }

  function addZoneEditRow() {
    if (!zoneEditDraft.value) return
    zoneEditDraft.value.tradeRows.push({ trade: 'labor', need: 1 })
  }

  function removeZoneEditRow(index) {
    if (!zoneEditDraft.value || zoneEditDraft.value.tradeRows.length <= 1) return
    zoneEditDraft.value.tradeRows.splice(index, 1)
  }

  async function saveZoneEdit() {
    const draft = zoneEditDraft.value
    if (!draft) return
    const g = zoneGroups.value.find((x) => x.id === draft.groupId)
    if (!g) return
    const sz = g.subZones.find((x) => x.id === draft.subZoneId)
    if (!sz) return
    const title = draft.title.trim()
    if (!title) {
      pushToast(T.zoneTitleRequired, 'warning')
      return
    }
    const merged = {}
    for (const row of draft.tradeRows) {
      const need = Math.max(0, Math.floor(Number(row.need) || 0))
      if (!row.trade || need <= 0) continue
      merged[row.trade] = (merged[row.trade] || 0) + need
    }
    const tradeRows = Object.entries(merged).map(([trade, need]) => ({ trade, need }))
    try {
      await patchZoneSub(Number(sz.id), buildZoneUpdateBody(title, tradeRows))
      closeZoneEdit()
      await reloadBoard()
    } catch (e) {
      pushToast(e?.message || '구역 저장에 실패했습니다.', 'danger')
    }
  }

  function onToggleUnassignedFilter() {
    showOnlyUnassignedInPool.value = !showOnlyUnassignedInPool.value
  }

  const tradeGroupExpanded = ref({})

  function isTradeGroupExpanded(tradeName) {
    return tradeGroupExpanded.value[tradeName] !== false
  }

  function toggleTradeGroup(tradeName) {
    const open = tradeGroupExpanded.value[tradeName] !== false
    tradeGroupExpanded.value = { ...tradeGroupExpanded.value, [tradeName]: !open }
  }

  const zonesByTrade = computed(() => groupZonesByTrade(displayedZoneGroups.value))

  return {
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
  }
}
