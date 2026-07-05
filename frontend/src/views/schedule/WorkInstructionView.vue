<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import api from '@/api/index'
import WorkInstructionEditorModal from '@/components/schedule/workInstruction/WorkInstructionEditorModal.vue'
import WorkInstructionTaskSelectorModal from '@/components/schedule/workInstruction/WorkInstructionTaskSelectorModal.vue'
import WorkInstructionViewerModal from '@/components/schedule/workInstruction/WorkInstructionViewerModal.vue'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Send,
  Eye,
  Pencil,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  UserCog,
  DoorOpen,
  Search,
} from 'lucide-vue-next'

import {
  createWorkOrder,
  getWorkOrderSlice,
  updateWorkOrder,
  approveWorkOrder,
} from '@/api/workOrder'
import { isMilestoneScheduleRow } from '@/utils/scheduleMapper.js'
import {
  DEFAULT_SAFETY_TEXT,
  DEFAULT_TRADE_OPTIONS,
  ENUM_TO_KOR_MAP,
  ROLES,
  buildInstructionFields,
  equipmentList,
  fileBadge,
  fmtKor,
  fmtSize,
  getTradeNameFromPlan,
  makeId,
  normalizeTradeName,
  parseInstructionContent,
  resolveWorkPlanWorkTime,
  sortTrades,
  todayStr,
  toDateString,
  unwrapApiData,
} from '@/utils/schedule/workInstruction.js'
import { useAuthStore } from '@/stores/authStore'
import { tradeMatches, useAuthScope } from '@/utils/authScope'
import { useCurrentProject } from '@/composables/useCurrentProject.js'

const currentRole = ref(ROLES.WORKER)
const tradeOptions = ref([...DEFAULT_TRADE_OPTIONS])
const myProcess = ref(DEFAULT_TRADE_OPTIONS[0])
const { currentProjectId } = useCurrentProject()
const auth = useAuthStore()
const { isTradeScope, assignedTrade, currentRoleMode } = useAuthScope(auth)
const canSwitchRole = computed(() => auth.isAdminRole)

function ensureSelectedTrade() {
  if (isTradeScope.value && assignedTrade.value) {
    myProcess.value = assignedTrade.value
    filterProcess.value = assignedTrade.value
    return
  }

  const options = availableTrades.value
  if (!options.length) {
    myProcess.value = ''
    if (filterProcess.value !== 'all') filterProcess.value = 'all'
    return
  }

  if (!myProcess.value || !options.includes(myProcess.value)) {
    myProcess.value = options[0]
  }
  if (currentRole.value === ROLES.WORKER) filterProcess.value = myProcess.value
  else if (filterProcess.value !== 'all' && !options.includes(filterProcess.value))
    filterProcess.value = 'all'
}

const GATES = ref([])
const GATE_CAPACITY = 6

async function fetchGates() {
  if (!currentProjectId.value) {
    GATES.value = []
    syncEditingGateDefaults()
    return
  }

  try {
    const response = await api.get('/gate', { params: { projectId: currentProjectId.value } })
    const payload = response?.data?.data ?? response?.data ?? response ?? []
    const data = Array.isArray(payload) ? payload : []

    GATES.value = data.map((g) => ({
      gateIdx: g.gateIdx || g.idx,
      gateName: g.gateName || g.name || `${g.idx || ''}번 게이트`,
      currentCount: g.currentCount || g.vehicles || 0,
      status: (g.currentCount || 0) >= GATE_CAPACITY ? '혼잡' : '원활',
    }))
    syncEditingGateDefaults()
  } catch (error) {
    console.error('게이트 목록 조회 실패:', error)
    GATES.value = []
    syncEditingGateDefaults()
  }
}

function getDefaultGateIdx() {
  return GATES.value[0]?.gateIdx ?? null
}

function normalizeGateSelection(value) {
  if (value == null || value === '') return null
  const parsed = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function syncEditingGateDefaults() {
  if (!editing.value) return

  const defaultGateIdx = getDefaultGateIdx()
  const gateIds = new Set(GATES.value.map((gate) => Number(gate.gateIdx)))

  const normalizeExistingGate = (value) => {
    const normalized = normalizeGateSelection(value)
    if (normalized == null) return defaultGateIdx
    return gateIds.has(normalized) ? normalized : defaultGateIdx
  }

  if (editing.value.equipmentInput) {
    editing.value.equipmentInput.gateIn = normalizeExistingGate(editing.value.equipmentInput.gateIn)
    editing.value.equipmentInput.gateOut = normalizeExistingGate(editing.value.equipmentInput.gateOut)
  }

  if (Array.isArray(editing.value.equipment)) {
    editing.value.equipment = editing.value.equipment.map((equipment) => ({
      ...equipment,
      gateIn: normalizeExistingGate(equipment.gateIn),
      gateOut: normalizeExistingGate(equipment.gateOut),
    }))
  }
}

function getGateLabel(g) {
  return `${g.gateName} (${g.status})`
}

let workOrderFetchTimer = null

onMounted(() => {
  fetchGates()
  fetchTradeOptions()
  fetchWorkOrders()
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  if (workOrderFetchTimer) clearTimeout(workOrderFetchTimer)
})

const filterDate = ref(todayStr())
const filterProcess = ref('all')
const filterPartner = ref('')
const filterStatus = ref('')
const searchKeyword = ref('')

const dateInputRef = ref(null)

watch([filterDate, filterProcess, filterStatus, searchKeyword, currentRole, myProcess], () => {
  if (workOrderFetchTimer) clearTimeout(workOrderFetchTimer)
  workOrderFetchTimer = setTimeout(() => {
    fetchWorkOrders()
  }, 250)
})

function openDatePicker() {
  // 브라우저가 showPicker 기능을 지원하는 경우 달력 창을 강제로 엽니다.
  if (dateInputRef.value && typeof dateInputRef.value.showPicker === 'function') {
    dateInputRef.value.showPicker()
  }
}

//새롭게 추가할 날짜 이동 로직
function prevDay() {
  const d = new Date(filterDate.value)
  d.setDate(d.getDate() - 1)
  filterDate.value = d.toISOString().split('T')[0]
}

function nextDay() {
  const d = new Date(filterDate.value)
  d.setDate(d.getDate() + 1)
  filterDate.value = d.toISOString().split('T')[0]
}

function goToday() {
  filterDate.value = todayStr()
}

const isToday = computed(() => filterDate.value === todayStr())

watch(
  [currentRoleMode, assignedTrade],
  () => {
    currentRole.value = currentRoleMode.value
    if (isTradeScope.value && assignedTrade.value) {
      myProcess.value = assignedTrade.value
      filterProcess.value = assignedTrade.value
    } else if (currentRole.value === ROLES.MANAGER) {
      filterProcess.value = 'all'
    }
  },
  { immediate: true },
)

const STATUS_LIST = ['승인 대기', '승인 완료', '반려']
const STATUS_META = {
  '승인 대기': { cls: 'bg-sky-50 text-sky-700 ring-sky-200', icon: Send },
  '승인 완료': { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
  반려: { cls: 'bg-rose-50 text-rose-700 ring-rose-200', icon: AlertTriangle },
}
function statusMeta(s) {
  return STATUS_META[s] || STATUS_META['승인 대기']
}

const canReviewViewing = computed(
  () =>
    currentRole.value === ROLES.MANAGER &&
    !!viewing.value &&
    viewing.value.status === '승인 대기',
)

const WORK_ORDER_SLICE_SIZE = 10
const workOrders = ref([])
const workOrderHasNext = ref(false)
const workOrderNextCursor = ref(null)
const isLoadingWorkOrders = ref(false)

const availableTrades = computed(() => {
  // 1. 공정 담당자: 본인에게 할당된 공종만 반환
  if (currentRole.value === ROLES.WORKER) {
    if (isTradeScope.value && assignedTrade.value) return [assignedTrade.value]
    return myProcess.value ? [myProcess.value] : []
  }
  // 2. 현장 총 책임자: 마스터 공정표에 있는 모든 공종 반환
  return sortTrades(tradeOptions.value)
})

const visibleTabs = computed(() => {
  if (currentRole.value === ROLES.WORKER) {
    return myProcess.value ? [{ key: myProcess.value, label: `${myProcess.value} 공종` }] : []
  }
  return [
    { key: 'all', label: '전체' },
    ...availableTrades.value.map((p) => ({ key: p, label: p })),
  ]
})

function onRoleChange(role) {
  if (!canSwitchRole.value) return
  currentRole.value = role
  if (role === ROLES.WORKER) filterProcess.value = myProcess.value
  else filterProcess.value = 'all'
}

function onMyProcessChange() {
  if (currentRole.value === ROLES.WORKER) filterProcess.value = myProcess.value
}

const filteredOrders = computed(() => {
  let r = workOrders.value
  if (currentRole.value === ROLES.WORKER) r = r.filter((o) => tradeMatches(o.process, myProcess.value))
  else if (filterProcess.value !== 'all') r = r.filter((o) => o.process === filterProcess.value)
  if (filterDate.value) r = r.filter((o) => o.date === filterDate.value)
  if (filterPartner.value) r = r.filter((o) => o.partner.includes(filterPartner.value))
  if (filterStatus.value) r = r.filter((o) => o.status === filterStatus.value)
  if (searchKeyword.value.trim()) {
    const k = searchKeyword.value.trim().toLowerCase()
    r = r.filter(
      (o) =>
        o.location.toLowerCase().includes(k) ||
        o.workDetail.toLowerCase().includes(k) ||
        o.id.toLowerCase().includes(k),
    )
  }
  return r
})

const partners = computed(() => Array.from(new Set(workOrders.value.map((o) => o.partner))))
const missingProcesses = computed(() => {
  if (currentRole.value !== ROLES.MANAGER) return []
  const existing = new Set(
    workOrders.value.filter((o) => o.date === filterDate.value).map((o) => o.process),
  )
  return availableTrades.value.filter((p) => !existing.has(p))
})

const gateAssignment = computed(() => {
  const map = {}
  GATES.value.forEach((g) => (map[g.gateIdx] = { in: 0, out: 0 }))
  workOrders.value
    .filter((o) => o.date === filterDate.value)
    .forEach((o) => {
      o.equipment.forEach((eq) => {
        if (eq.gateIn && map[eq.gateIn]) map[eq.gateIn].in += eq.count || 0
        if (eq.gateOut && map[eq.gateOut]) map[eq.gateOut].out += eq.count || 0
      })
    })
  return GATES.value.map((g) => {
    const a = map[g.gateIdx] || { in: 0, out: 0 }
    const total = a.in + a.out
    const ratio = total / GATE_CAPACITY
    let level = 'low'
    if (ratio >= 1) level = 'high'
    else if (ratio >= 0.66) level = 'mid'
    return {
      ...g,
      in: a.in,
      out: a.out,
      total,
      ratio: Math.min(ratio, 1.5),
      level,
      name: g.gateName,
      desc: '',
    }
  })
})

const showEditor = ref(false)
const editing = ref(null)
const isNew = ref(false)
const draftSourcePlan = ref(null)
const draftAutoFilled = ref({})

const showTaskSelector = ref(false)
const availableTasks = ref([])

function canEdit(order) {
  if (currentRole.value === ROLES.MANAGER) return false
  if (order.process !== myProcess.value) return false
  if (order.status === '승인 완료') return false
  return true
}

function blankOrder() {
  return {
    id: makeId(),
    date: filterDate.value,
    process:
      currentRole.value === ROLES.WORKER
        ? myProcess.value
        : filterProcess.value !== 'all'
          ? filterProcess.value
          : availableTrades.value[0] || '',
    partner: '',
    location: '',
    workTime: '',
    workers: 0,
    equipment: [],
    equipmentInput: { name: '', count: 1, gateIn: getDefaultGateIdx(), gateOut: getDefaultGateIdx() },
    workDetail: '',
    safety: '',
    notes: '',
    files: [],
    photos: [],
    author: currentRole.value === ROLES.WORKER ? `나(${myProcess.value} 담당)` : '관리자',
    createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    status: '승인 대기',
    history: [],
  }
}

function cloneOrder(o) {
  return {
    ...o,
    equipment: o.equipment.map((e) => ({ ...e })),
    equipmentInput: { name: '', count: 1, gateIn: getDefaultGateIdx(), gateOut: getDefaultGateIdx() },
    files: o.files.map((f) => ({ ...f })),
    photos: (o.photos || []).map((p) => ({ ...p })),
    history: [...(o.history || [])],
  }
}

async function fetchInstructionSourcePlans(planType, targetDate) {
  const response = await api.get('/work-plan', {
    params: {
      projectId: currentProjectId.value,
      planType,
      startDate: targetDate,
      endDate: targetDate,
    },
  })
  return unwrapApiData(response)
}

function findInstructionTasks(plans, targetDate, targetProcess) {
  return plans.filter((p) => {
    const planTrade = getTradeNameFromPlan(p)
    const planStart = toDateString(p.startDate || p.start)
    const planEnd = toDateString(p.effectiveEnd || p.endDate || p.end)
    const matchTrade = tradeMatches(planTrade, targetProcess)
    const matchDate = targetDate >= planStart && targetDate <= planEnd
    return matchTrade && matchDate
  })
}

async function openCreate() {
  const targetDate = filterDate.value
  const targetProcess = currentRole.value === ROLES.WORKER ? myProcess.value : filterProcess.value

  try {
    const weeklyPlans = await fetchInstructionSourcePlans('주간', targetDate)
    availableTasks.value = findInstructionTasks(weeklyPlans, targetDate, targetProcess)

    if (availableTasks.value.length === 0) {
      alert(
        `${targetDate} 일자에 등록된 [${targetProcess}] 일일 작업이 없습니다. 월간 세부계획에서 일일 계획을 먼저 작성해주세요.`,
      )
      return
    }

    if (availableTasks.value.length === 1) {
      selectTaskForOrder(availableTasks.value[0])
    } else {
      showTaskSelector.value = true
    }
  } catch (e) {
    console.error('작업 목록 조회 실패:', e)
  }
}

async function selectTaskForOrder(task) {
  showTaskSelector.value = false
  isNew.value = true
  editing.value = blankOrder()

  editing.value.workPlanId = task.idx || task.id
  editing.value.location = task.location || ''
  editing.value.workers = task.requiredCount || 0
  editing.value.workTime = resolveWorkPlanWorkTime(task)
  editing.value.workDetail = task.name + (task.note ? '\n' + task.note : '')
  editing.value.safety = DEFAULT_SAFETY_TEXT

  draftAutoFilled.value = {
    location: true,
    workTime: true,
    workers: true,
    workDetail: true,
    safety: true,
    equipment: true,
  }

  try {
    const eqRes = await api.get(`/work-order/draft-equipments/${editing.value.workPlanId}`)
    const equipments = eqRes.data?.data || eqRes.data || []

    editing.value.equipment = equipments.map((eq, i) => ({
      id: `eq_${Date.now()}_${i}`,
      name: ENUM_TO_KOR_MAP[eq.equipmentName] || eq.equipmentName || '굴삭기',
      count: eq.equipmentCount || 1,
      gateIn: getDefaultGateIdx(),
      gateOut: getDefaultGateIdx(),
    }))
  } catch (e) {
    console.warn('특정 작업 장비 조회 실패', e)
  }

  draftSourcePlan.value = { plan: task.name }
  showEditor.value = true
}

function openEdit(order) {
  isNew.value = false
  editing.value = cloneOrder(order)
  draftSourcePlan.value = null
  draftAutoFilled.value = {}
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
  editing.value = null
  draftSourcePlan.value = null
  draftAutoFilled.value = {}
}

async function regenerateDraft() {
  if (!confirm('초기 세부 작업 내용으로 덮어쓰여집니다. 계속할까요?')) return
  const currentPlanId = editing.value.workPlanId
  if (currentPlanId) {
    const plan = availableTasks.value.find((p) => p.idx === currentPlanId || p.id === currentPlanId)
    if (plan) selectTaskForOrder(plan)
  }
}

function clearDraftHighlight(field) {
  if (draftAutoFilled.value[field]) draftAutoFilled.value[field] = false
}

function addEquipment() {
  const inp = editing.value.equipmentInput
  if (!inp.name.trim() || inp.count < 1) return
  editing.value.equipment.push({
    id: `eq_${Date.now()}`,
    name: inp.name.trim(),
    count: inp.count,
    gateIn: normalizeGateSelection(inp.gateIn),
    gateOut: normalizeGateSelection(inp.gateOut),
  })
  editing.value.equipmentInput = { name: '', count: 1, gateIn: getDefaultGateIdx(), gateOut: getDefaultGateIdx() }
}

function removeEquipment(idx) {
  editing.value.equipment.splice(idx, 1)
}

function onPhotoChange(e) {
  Array.from(e.target.files || []).forEach((f) => {
    if (!f.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) =>
      editing.value.photos.push({
        id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        size: f.size,
        dataUrl: ev.target.result,
      })
    reader.readAsDataURL(f)
  })
  e.target.value = ''
}

function onFileChangeInput(e) {
  Array.from(e.target.files || []).forEach((f) =>
    editing.value.files.push({
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      size: f.size,
      type: f.type,
    }),
  )
  e.target.value = ''
}

function removePhoto(idx) {
  editing.value.photos.splice(idx, 1)
}
function removeFile(idx) {
  editing.value.files.splice(idx, 1)
}

async function submitOrder() {
  const r = editing.value
  if (!r.partner.trim() || !r.location.trim() || !r.workTime.trim() || !r.workDetail.trim()) {
    alert('필수 항목을 입력해주세요.')
    return
  }

  const equipmentList = r.equipment.map((eq) => {
    const safeGateIdx = normalizeGateSelection(eq.gateIn)
    return {
      gateIdx: safeGateIdx,
      equipmentName: eq.name,
      equipmentCount: eq.count,
    }
  })

  const requestPayload = {
    siteIdx: currentProjectId.value,
    partnerCompanyIdx: 1,
    workPlanId: r.workPlanId,
    tradeType: r.process,
    title: `[${r.process}] ${r.location} 작업지시서`,
    instructionContent: `${r.workDetail}\n\n[작업시간] ${r.workTime}\n[안전사항] ${r.safety}`,
    dueDate: r.date,
    workerCount: r.workers,
    equipments: equipmentList,
  }

  Object.assign(requestPayload, buildInstructionFields(r))

  try {
    if (isNew.value) {
      requestPayload.statusCode = 'OPEN'
      await createWorkOrder(requestPayload)
      alert('작업 지시서가 성공적으로 전송되었습니다.')
    } else {
      const rawId = r.id.replace('WO-', '')
      requestPayload.statusCode = 'OPEN'
      await updateWorkOrder(rawId, requestPayload)
      alert('작업 지시서가 성공적으로 수정되었습니다.')
    }
    closeEditor()
    await fetchWorkOrders()
  } catch (error) {
    console.error('API 에러:', error)
    alert('저장 실패: 서버 오류가 발생했습니다.')
  }
}

const viewing = ref(null)
function openViewer(o) {
  viewing.value = o
}
function closeViewer() {
  viewing.value = null
}
function editViewing() {
  if (!viewing.value) return
  const order = viewing.value
  closeViewer()
  openEdit(order)
}
async function approve() {
  if (!confirm('이 작업 지시서를 승인하시겠습니까?')) return
  await updateOrderStatus('승인 완료', 'APPROVED')
}
async function reject() {
  if (!confirm('이 작업 지시서를 반려하시겠습니까?')) return
  await updateOrderStatus('반려', 'REJECTED')
}

async function updateOrderStatus(newStatus, statusCodeStr) {
  const order = viewing.value
  if (!order) return

  const rawId = order.id.replace('WO-', '')

  try {
    if (statusCodeStr === 'APPROVED') {
      await approveWorkOrder(rawId)
    } else {
      const requestPayload = {
        siteIdx: currentProjectId.value,
        partnerCompanyIdx: 1,
        tradeType: order.process,
        title: `[${order.process}] ${order.location} 작업지시서`,
        instructionContent: `${order.workDetail}\n\n[작업시간] ${order.workTime}\n[안전사항] ${order.safety}`,
        dueDate: order.date,
        workerCount: order.workers || 0,
        statusCode: statusCodeStr,
        equipments: order.equipment.map((eq) => {
          const safeGateIdx = normalizeGateSelection(eq.gateIn)
          return {
            gateIdx: safeGateIdx,
            equipmentName: eq.name,
            equipmentCount: eq.count || 1,
          }
        }),
      }
      Object.assign(requestPayload, buildInstructionFields(order))
      await updateWorkOrder(rawId, requestPayload)
    }

    const idx = workOrders.value.findIndex((o) => o.id === order.id)
    if (idx >= 0) {
      workOrders.value[idx].status = newStatus
      workOrders.value[idx].history.push({
        at: new Date().toISOString().slice(0, 16).replace('T', ' '),
        who: '현장소장',
        what: newStatus,
      })
    }
    alert(`성공적으로 ${newStatus} 처리되었습니다.`)
    closeViewer()
  } catch (e) {
    console.error('상태 업데이트 API 오류:', e)
    alert('상태 변경에 실패했습니다. 서버 오류를 확인해주세요.')
  }
}

function gateName(id) {
  if (id == null || id === '') return '게이트 미배정'
  return GATES.value.find((g) => g.gateIdx === id)?.gateName || id
}
function onKeydown(e) {
  if (e.key !== 'Escape') return
  if (showTaskSelector.value) showTaskSelector.value = false
  else if (showEditor.value) closeEditor()
  else if (viewing.value) closeViewer()
}

async function fetchTradeOptions() {
  if (!localStorage.getItem('accessToken')) {
    ensureSelectedTrade()
    return
  }
  if (!auth.projectId && !auth.isAdminRole) {
    ensureSelectedTrade()
    return
  }

  try {
    const response = await api.get('/trade-process', {
      params: { projectId: currentProjectId.value },
    })
    const data = unwrapApiData(response) || []
    
    // 마스터 공정표 데이터에서 실제 공종명만 추출한다. 마일스톤 행은 작업지시서 공종 탭에서 제외.
    const trades = data
      .filter((p) => !isMilestoneScheduleRow(p))
      .map((p) => p.tradeName || p.name)
      .filter(name => name && name !== '기타')
    
    // 중복 제거 후 저장
    tradeOptions.value = Array.from(new Set(trades))
  } catch (e) {
    console.warn('마스터 공정표 기준 공종 목록 조회 실패:', e)
    tradeOptions.value = []
  }
  ensureSelectedTrade()
}

function statusCodeFromLabel(status) {
  if (!status) return null
  if (status.includes('완료')) return 'APPROVED'
  if (status.includes('반려')) return 'REJECTED'
  return 'OPEN'
}

function workOrderSliceParams(append = false) {
  const params = {
    projectId: currentProjectId.value || undefined,
    size: WORK_ORDER_SLICE_SIZE,
    targetDate: filterDate.value || undefined,
    statusCode: statusCodeFromLabel(filterStatus.value) || undefined,
    keyword: searchKeyword.value.trim() || undefined,
  }

  if (currentRole.value === ROLES.WORKER && myProcess.value) {
    params.tradeType = myProcess.value
  } else if (filterProcess.value !== 'all') {
    params.tradeType = filterProcess.value
  }

  if (append && workOrderNextCursor.value) {
    params.cursorDueDate = workOrderNextCursor.value.dueDate
    params.cursorId = workOrderNextCursor.value.id
  }

  return params
}

async function loadMoreWorkOrders() {
  await fetchWorkOrders({ append: true })
}

async function fetchWorkOrders({ append = false } = {}) {
  if (isLoadingWorkOrders.value) return
  isLoadingWorkOrders.value = true

  try {
    const response = await getWorkOrderSlice(workOrderSliceParams(append))
    const payload = response?.data?.data ?? response?.data ?? response ?? {}
    const serverData = Array.isArray(payload) ? payload : payload?.items || []
    if (!Array.isArray(serverData)) return

    const mappedOrders = serverData.map((dto) => {
      const processLabel = getTradeNameFromPlan(dto) || normalizeTradeName(dto.tradeType)
      let locationStr = dto.title
        ? dto.title
            .replace(`[${dto.tradeType}] `, '')
            .replace(`[${processLabel}] `, '')
            .replace(' 작업지시서', '')
        : ''
      let detail = dto.instructionContent || ''
      let time = ''
      let safetyText = ''
      if (detail.includes('[작업시간]')) {
        const parts = detail.split('[작업시간]')
        detail = parts[0].trim()
        const subParts = parts[1].split('[안전사항]')
        time = subParts[0] ? subParts[0].trim() : ''
        if (subParts.length > 1) safetyText = subParts[1].trim()
      }
      const parsedContent = parseInstructionContent(dto.instructionContent || '')
      detail = dto.workDetail || parsedContent.workDetail
      time = dto.workTime || parsedContent.workTime || time
      safetyText = dto.safetyContent || parsedContent.safety || safetyText

      return {
        id: `WO-${dto.idx}`,
        date: dto.dueDate,
        process: processLabel,
        partner: '한울중기',
        location: locationStr,
        workTime: time,
        workers: dto.workerCount || 0,
        workDetail: detail,
        safety: safetyText,
        notes: '',
        status:
          dto.statusCode === 'APPROVED'
            ? '승인 완료'
            : dto.statusCode === 'REJECTED'
              ? '반려'
              : dto.statusCode === 'OPEN'
                ? '승인 대기'
                : '승인 대기',
        author: '작성자',
        createdAt: '-',
        files: [],
        photos: [],
        history: [],
        equipment: (dto.equipments || []).map((eq) => ({
          id: `eq_${eq.idx}`,
          name: ENUM_TO_KOR_MAP[eq.equipmentName] || eq.equipmentName,
          count: eq.equipmentCount,
          gateIn: eq.gateIdx ?? getDefaultGateIdx(),
          gateOut: eq.gateIdx ?? getDefaultGateIdx(),
        })),
      }
    })
    workOrders.value = append ? [...workOrders.value, ...mappedOrders] : mappedOrders
    workOrderHasNext.value = !Array.isArray(payload) && !!payload?.hasNext
    workOrderNextCursor.value =
      !Array.isArray(payload) && payload?.nextCursorDueDate && payload?.nextCursorId
        ? { dueDate: payload.nextCursorDueDate, id: payload.nextCursorId }
        : null
    ensureSelectedTrade()
  } catch (e) {
    console.error('데이터 불러오기 실패:', e)
  } finally {
    isLoadingWorkOrders.value = false
  }
}

watch(currentProjectId, () => {
  fetchGates()
  fetchTradeOptions()
  fetchWorkOrders()
})

</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 pb-6">
    <div class="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-widest text-flare-600">현장 운영</p>
        <h1 class="text-xl font-bold text-forena-900">작업 지시서</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex overflow-hidden rounded-lg border border-forena-200 bg-white">
          <button
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition"
            :class="
              currentRole === ROLES.WORKER
                ? 'bg-forena-800 text-white'
                : 'text-forena-600 hover:bg-forena-50'
            "
            :disabled="!canSwitchRole"
            @click="onRoleChange(ROLES.WORKER)"
          >
            <UserCog class="h-3.5 w-3.5" /> 공정 담당자
          </button>
          <button
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition"
            :class="
              currentRole === ROLES.MANAGER
                ? 'bg-forena-800 text-white'
                : 'text-forena-600 hover:bg-forena-50'
            "
            :disabled="!canSwitchRole"
            @click="onRoleChange(ROLES.MANAGER)"
          >
            <ShieldCheck class="h-3.5 w-3.5" /> 현장 총 관리자
          </button>
        </div>
        <select
          v-if="currentRole === ROLES.WORKER"
          v-model="myProcess"
          @change="onMyProcessChange"
          :disabled="isTradeScope || !availableTrades.length"
          class="rounded-lg border border-forena-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-forena-700 outline-none focus:border-flare-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option v-if="!availableTrades.length" value="">공종 없음</option>
          <option v-for="p in availableTrades" :key="p" :value="p">{{ p }} 공종</option>
        </select>
        <button
          v-if="currentRole === ROLES.WORKER"
          @click="openCreate"
          class="inline-flex items-center gap-1.5 rounded-lg bg-flare-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-flare-600"
        >
          <Plus class="h-3.5 w-3.5" /> 작업 지시서 작성
        </button>
      </div>
    </div>

    <div
      v-if="currentRole === ROLES.WORKER"
      class="flex shrink-0 items-start gap-2.5 rounded-xl border border-flare-200 bg-flare-50/60 px-4 py-3"
    >
      <UserCog class="mt-0.5 h-4 w-4 shrink-0 text-flare-600" />
      <p class="text-xs text-forena-800">
        현재 계정은
        <span class="font-bold text-flare-700">{{ myProcess || '공종 미선택' }} 담당자</span>입니다.
        선택된 공종의 작업 지시서만 조회 · 작성 · 수정할 수 있습니다.
      </p>
    </div>
    <div
      v-else
      class="flex shrink-0 items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3"
    >
      <ShieldCheck class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <p class="text-xs text-forena-800">
        현재 계정은 <span class="font-bold text-emerald-700">현장 총 관리자</span>입니다. 전체 공정
        작업 지시서를 조회하고 승인/반려할 수 있습니다.
        <span v-if="missingProcesses.length" class="ml-1 font-bold text-rose-600"
          >· 미작성 공종: {{ missingProcesses.join(', ') }}</span
        >
      </p>
    </div>

    <div
      class="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-forena-100 bg-white px-4 py-3"
    >
      <div class="flex items-center gap-1.5">
  <CalendarDays class="h-4 w-4 text-flare-600" />
  <span class="text-[11px] font-bold uppercase tracking-wide text-forena-500">조회 일자</span>
</div>

<div class="flex items-center gap-1">
  <button
    @click="prevDay"
    class="flex h-7 w-7 items-center justify-center rounded-md border border-forena-200 bg-white text-forena-600 hover:bg-forena-50 transition"
  >
    <ChevronLeft class="h-3.5 w-3.5" />
  </button>
  
  <div class="relative flex items-center">
    <button
      @click="openDatePicker"
      class="rounded-md border border-forena-200 bg-white px-3 py-1.5 text-xs font-bold tabular-nums text-forena-800 hover:bg-forena-50 transition min-w-[140px]"
    >
      {{ filterDate.split('-')[0] }}. {{ fmtKor(filterDate) }}
    </button>
    
    <input
      type="date"
      ref="dateInputRef"
      v-model="filterDate"
      class="absolute left-1/2 top-1/2 -z-10 h-0 w-0 opacity-0 cursor-pointer"
    />
  </div>
  
  <button
    @click="nextDay"
    class="flex h-7 w-7 items-center justify-center rounded-md border border-forena-200 bg-white text-forena-600 hover:bg-forena-50 transition"
  >
    <ChevronRight class="h-3.5 w-3.5" />
  </button>
  
  </div>
      <span class="ml-2 mr-2 text-xs font-semibold text-forena-400 tabular-nums">
        오늘: {{ filterDate.split('-')[0] }}. {{ fmtKor(todayStr()) }}
      </span>

      <div class="flex items-center gap-1.5">
        <span class="text-[11px] font-bold text-forena-400">공종</span>
        <select
          v-model="filterProcess"
          :disabled="currentRole === ROLES.WORKER"
          class="rounded-md border border-forena-200 bg-white px-2 py-1 text-xs text-forena-800 outline-none focus:border-flare-400 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option v-if="currentRole === ROLES.MANAGER" value="all">전체</option>
          <option v-for="p in availableTrades" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-[11px] font-bold text-forena-400">상태</span>
        <select
          v-model="filterStatus"
          class="rounded-md border border-forena-200 bg-white px-2 py-1 text-xs text-forena-800 outline-none focus:border-flare-400"
        >
          <option value="">전체</option>
          <option v-for="s in STATUS_LIST" :key="s">{{ s }}</option>
        </select>
      </div>
      <div class="flex items-center gap-1 rounded-md border border-forena-200 bg-white px-2">
        <Search class="h-3.5 w-3.5 text-forena-400" />
        <input
          v-model="searchKeyword"
          placeholder="위치/지시서 번호/내용"
          class="w-44 bg-transparent py-1 text-xs text-forena-800 outline-none placeholder:text-forena-300"
        />
      </div>
      <span class="ml-auto text-[11px] text-forena-500">
        현재 표시
        <span class="font-bold text-forena-800 tabular-nums">{{ filteredOrders.length }}</span>
        건
        <span v-if="workOrderHasNext" class="ml-1 font-semibold text-flare-600">· 더 있음</span>
      </span>
    </div>

    <div
      v-if="currentRole === ROLES.MANAGER"
      class="shrink-0 rounded-xl border border-forena-100 bg-white p-4"
    >
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <DoorOpen class="h-4 w-4 text-flare-600" />
          <p class="text-sm font-bold text-forena-900">중장비 게이트 배정 현황</p>
          <span class="text-[11px] text-forena-400">{{ fmtKor(filterDate) }} 기준</span>
        </div>
        <span class="text-[10px] text-forena-400">게이트 수용 기준 {{ GATE_CAPACITY }}대</span>
      </div>
      <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div
          v-for="g in gateAssignment"
          :key="g.id"
          class="rounded-xl border p-3"
          :class="
            g.level === 'high'
              ? 'border-rose-200 bg-rose-50/40'
              : g.level === 'mid'
                ? 'border-amber-200 bg-amber-50/40'
                : 'border-forena-100 bg-forena-50/30'
          "
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-bold text-forena-900">{{ g.name }}</p>
              <p class="text-[10px] text-forena-500">{{ g.desc }}</p>
            </div>
            <span
              v-if="g.level === 'high'"
              class="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700"
            >
              <AlertTriangle class="h-3 w-3" /> 과밀
            </span>
            <span
              v-else-if="g.level === 'mid'"
              class="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
              >혼잡</span
            >
            <span
              v-else
              class="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"
              >원활</span
            >
          </div>
          <div class="mt-2 flex items-center gap-3 text-[11px] text-forena-700">
            <span class="inline-flex items-center gap-1"
              ><ChevronRight class="h-3 w-3 text-emerald-500" />입차
              <b class="tabular-nums">{{ g.in }}</b
              >대</span
            >
            <span class="inline-flex items-center gap-1"
              ><ChevronLeft class="h-3 w-3 text-rose-500" />출차
              <b class="tabular-nums">{{ g.out }}</b
              >대</span
            >
          </div>
          <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-forena-100">
            <div
              class="h-full rounded-full transition-all"
              :class="
                g.level === 'high'
                  ? 'bg-rose-500'
                  : g.level === 'mid'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              "
              :style="{ width: Math.min(g.ratio * 100, 100) + '%' }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-forena-100">
      <button
        v-for="t in visibleTabs"
        :key="t.key"
        @click="filterProcess = t.key"
        class="shrink-0 border-b-2 px-4 py-2 text-xs font-bold transition"
        :class="
          filterProcess === t.key
            ? 'border-flare-500 text-flare-700'
            : 'border-transparent text-forena-500 hover:text-forena-700'
        "
      >
        {{ t.label }}
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <div
        v-if="!filteredOrders.length"
        class="flex flex-col items-center justify-center gap-2 py-16 text-center"
      >
        <FileText class="h-8 w-8 text-slate-300" />
        <p class="text-sm text-slate-400">조회된 작업 지시서가 없습니다.</p>
        <button
          v-if="currentRole === ROLES.WORKER"
          @click="openCreate"
          class="mt-1 inline-flex items-center gap-1 rounded-md bg-flare-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-flare-600"
        >
          <Plus class="h-3 w-3" /> 새 작업 지시서 작성
        </button>
      </div>

      <div v-else class="overflow-hidden rounded-xl border border-forena-100 bg-white">
        <table class="w-full text-xs">
          <thead class="bg-forena-50/60 text-forena-500">
            <tr>
              <th class="px-3 py-2.5 text-left font-bold">상태</th>
              <th class="px-3 py-2.5 text-left font-bold">지시서 번호</th>
              <th class="px-3 py-2.5 text-left font-bold">공정 / 협력사</th>
              <th class="px-3 py-2.5 text-left font-bold">작업 위치</th>
              <th class="px-3 py-2.5 text-left font-bold tabular-nums">작업 시간</th>
              <th class="px-3 py-2.5 text-center font-bold">인원</th>
              <th class="px-3 py-2.5 text-left font-bold">중장비 / 게이트</th>
              <th class="px-3 py-2.5 text-left font-bold">작성자</th>
              <th class="px-3 py-2.5 text-right font-bold">동작</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-forena-100">
            <tr
              v-for="o in filteredOrders"
              :key="o.id"
              class="cursor-pointer hover:bg-forena-50/40"
              @click="openViewer(o)"
            >
              <td class="px-3 py-3">
                <span
                  class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1"
                  :class="statusMeta(o.status).cls"
                >
                  <component :is="statusMeta(o.status).icon" class="h-3 w-3" /> {{ o.status }}
                </span>
              </td>
              <td class="px-3 py-3 font-mono text-[11px] text-forena-700">{{ o.id }}</td>
              <td class="px-3 py-3">
                <p class="font-bold text-forena-900">{{ o.process }}</p>
                <p class="text-[10px] text-forena-500">{{ o.partner }}</p>
              </td>
              <td class="px-3 py-3">
                <p class="flex items-center gap-1 text-forena-800">
                  <MapPin class="h-3 w-3 text-flare-600" />{{ o.location }}
                </p>
              </td>
              <td class="px-3 py-3 tabular-nums text-forena-700">{{ o.workTime }}</td>
              <td class="px-3 py-3 text-center font-bold tabular-nums text-forena-900">
                {{ o.workers }}
              </td>
              <td class="px-3 py-3">
                <div v-if="o.equipment.length" class="space-y-0.5">
                  <p v-for="eq in o.equipment" :key="eq.id" class="text-[11px] text-forena-700">
                    <span class="font-semibold">{{ eq.name }} {{ eq.count }}대</span>
                    <span class="ml-1 text-forena-400"
                      >({{ gateName(eq.gateIn) }} → {{ gateName(eq.gateOut) }})</span
                    >
                  </p>
                </div>
                <span v-else class="text-[11px] text-slate-400">—</span>
              </td>
              <td class="px-3 py-3 text-forena-700">{{ o.author }}</td>
              <td class="px-3 py-3 text-right" @click.stop>
                <button
                  @click="openViewer(o)"
                  class="rounded-md border border-forena-200 bg-white p-1.5 text-forena-600 hover:bg-forena-50"
                  title="상세 보기"
                >
                  <Eye class="h-3.5 w-3.5" />
                </button>
                <button
                  v-if="canEdit(o)"
                  @click="openEdit(o)"
                  class="ml-1 rounded-md border border-flare-200 bg-flare-50 p-1.5 text-flare-700 hover:bg-flare-100"
                  title="수정"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div
          v-if="workOrderHasNext || isLoadingWorkOrders"
          class="flex items-center justify-center border-t border-forena-100 px-4 py-3"
        >
          <button
            type="button"
            :disabled="isLoadingWorkOrders"
            @click="loadMoreWorkOrders"
            class="rounded-md border border-forena-200 bg-white px-4 py-1.5 text-xs font-bold text-forena-700 hover:bg-forena-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ isLoadingWorkOrders ? '불러오는 중...' : '10개 더 보기' }}
          </button>
        </div>
      </div>
    </div>

    <WorkInstructionTaskSelectorModal
      :show="showTaskSelector"
      :tasks="availableTasks"
      :filter-date="filterDate"
      @close="showTaskSelector = false"
      @select="selectTaskForOrder"
    />

    <WorkInstructionEditorModal
      :show="showEditor"
      :editing="editing"
      :is-new="isNew"
      :draft-source-plan="draftSourcePlan"
      :draft-auto-filled="draftAutoFilled"
      :available-trades="availableTrades"
      :equipment-list="equipmentList"
      :gates="GATES"
      :gate-assignment="gateAssignment"
      :get-gate-label="getGateLabel"
      :format-date="fmtKor"
      :file-badge="fileBadge"
      :format-size="fmtSize"
      @close="closeEditor"
      @regenerate-draft="regenerateDraft"
      @clear-draft-highlight="clearDraftHighlight"
      @add-equipment="addEquipment"
      @remove-equipment="removeEquipment"
      @photo-change="onPhotoChange"
      @remove-photo="removePhoto"
      @file-change="onFileChangeInput"
      @remove-file="removeFile"
      @submit="submitOrder"
    />

    <WorkInstructionViewerModal
      :viewing="viewing"
      :can-edit="viewing ? canEdit(viewing) : false"
      :can-review="canReviewViewing"
      :status-meta="statusMeta"
      :gate-name="gateName"
      :format-size="fmtSize"
      @close="closeViewer"
      @edit="editViewing"
      @approve="approve"
      @reject="reject"
    />
  </div>
</template>
