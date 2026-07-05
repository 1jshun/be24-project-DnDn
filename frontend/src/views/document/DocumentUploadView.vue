<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  Upload,
  Search,
  Download,
  Filter,
  FileText,
  FileSpreadsheet,
  File,
  X,
  ChevronDown,
  Eye,
  Trash2,
  Clock,
  Building2,
  Handshake,
  CalendarDays,
  Hash,
  AlertTriangle,
  CircleCheck,
  Loader2,
  Plus,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Pin,
  RefreshCw,
  ExternalLink,
} from 'lucide-vue-next'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import api from '@/api/index'
import { getProject } from '@/api/project.js'
import { useCurrentProject } from '@/composables/useCurrentProject.js'
import { useAuthStore } from '@/stores/authStore.js'

const router = useRouter()
const authStore = useAuthStore()
const { currentProjectId: routeProjectId } = useCurrentProject()
const currentProjectId = computed(() => authStore.projectId ?? routeProjectId.value)
const PLACEHOLDER_UPLOADER_NAMES = new Set(['site manager', '현장 관리자', '현장 담당자'])
const DEFAULT_PROJECT_INFO = {
  name: '',
  startDate: null,
  endDate: null,
}

function resolveUploaderName(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim()
    if (text && !PLACEHOLDER_UPLOADER_NAMES.has(text)) return text
  }
  return authStore.userName || authStore.loginId || ''
}

/* ───── 한국어 라벨 ───── */
const L = {
  kicker: '문서 관리',
  title: '업로드 문서 관리',
  desc: '관리자 및 협력사에서 업로드한 작업 문서를 일괄 조회·관리합니다. 문서 유형별 필터와 검색으로 빠르게 원하는 문서를 찾을 수 있습니다.',

  statTotal: '전체 문서',
  statHq: '본사 문서',
  statPartner: '협력사 문서',
  unit: '건',

  searchPh: '문서코드, 공종, 내용 검색',
  excel: '종합 공사일보 PDF 다운로드',
  upload: '문서 업로드',
  filterLabel: '유형 필터',
  resetFilter: '필터 초기화',

  tabAll: '전체',
  tabWorkInstruction: '작업지시서',
  tabDailyReport: '공사 일보',
  tabMasterSchedule: '마스터 공정표',
  tabSubSchedule: '보할 공정표',
  tabMilestone: '마일스톤 공정표',
  tabConstructionPlan: '업로드 문서',

  colDocCode: '문서 코드',
  colDocType: '문서 유형',
  colFileName: '파일명',
  colOrigin: '작성 주체',
  colUploadDate: '업로드 일자',
  colUploader: '업로드자',
  colStatus: '상태',
  colVersion: '버전',
  colSize: '파일 크기',
  colActions: '',

  originHq: '본사',
  originPartner: '협력사',

  statusApproved: '승인',
  statusRejected: '반려',
  statusDraft: '임시저장',

  empty: '조건에 맞는 문서가 없습니다.',

  drawerTitle: '문서 업로드',
  labelDocType: '문서 유형 *',
  labelOrigin: '작성 주체 *',
  labelPartnerName: '협력사명 *',
  labelPartnerSelect: '협력사를 선택하세요',
  labelVersion: '버전',
  labelMemo: '비고',
  labelFile: '파일 업로드 *',
  fileHint: 'PDF, Excel, Word, 한글 파일을 드래그하거나 클릭하여 업로드',
  fileFormats: '.pdf .xlsx .xls .docx .hwp .hwpx',
  submit: '업로드 완료',
  alertFields: '필수 정보를 모두 입력해주세요.',
  alertOk: '문서가 성공적으로 업로드되었습니다.',

  pageInfo: '총 {total}건 중 {start}-{end}건',
  rowsPerPage: '페이지당',
}

/* ───── 문서 유형 목록 ───── */
const docTypes = [
  L.tabConstructionPlan,
]

/* ── 문서 유형 → 기본 작성 주체 매핑 ── */
const defaultOriginMap = {
  [L.tabWorkInstruction]:  'hq',
  [L.tabDailyReport]:      'hq',
  [L.tabMasterSchedule]:   'hq',
  [L.tabMilestone]:        'hq',
  [L.tabSubSchedule]:      'hq',
  [L.tabConstructionPlan]: 'partner',
}

/* ── 협력사 목록 (실제로는 API에서 불러올 것) ── */
const partnerList = [
  '대한건설(주)',
  '스마트안전(주)',
  '한빛전기공사',
  '성우E&C',
  '명진토건(주)',
  '삼호중기',
  '태양산업개발',
]

/* ───── 문서 목록 (DB에서 로드) ───── */
const documents = ref([])
const documentPage = ref({
  currentPage: 0,
  totalPages: 1,
  totalElements: 0,
  size: 10,
  isFirst: true,
  isLast: true,
})
const pinnedDocuments = ref([])   // 고정 영역 데이터

/* ───── 작업지시서 / 공사 일보 (별도 API에서 로드) ───── */
const workOrderDocs = ref([])     // /work-order → '작업지시서' 탭
const reportDocs = ref([])        // /report/ → '공사 일보' 탭

/* ═══════════════════════════════════════════════════════════════
 * 백엔드 → 프론트 필드 매핑
 * ──────────────────────────────────────────────────────────────
 * 나중에 백엔드 JSON 형식이 바뀌면 이 함수만 수정하면 됩니다.
 * 프론트 필드에 매핑되지 않는 항목은 자동으로 빈 값 처리됩니다.
 * ═══════════════════════════════════════════════════════════════ */

/* ── docType enum → 프론트 라벨 매핑 (백엔드 DocType enum 기준) ── */
const DOC_TYPE_MAP = {
  'MASTER':      '마스터 공정표',
  'MILESTONE':   '마일스톤 공정표',
  'WEIGHT':      '보할 공정표',
  'TRADE_PLAN':  '업로드 문서',
}

function mapApiToFront(apiDoc) {
  // DTO 필드: fileName → 파일명 추출
  const fileName = apiDoc.fileName || ''
  const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : ''

  // DTO 필드: createAt → 업로드 일자 (YYYY-MM-DD 형식으로 변환)
  const createAt = apiDoc.createAt || ''
  const uploadDate = createAt ? createAt.substring(0, 10) : ''

  // DTO 필드: isPartner (true: 협력사, false: 본사) → origin 변환
  const isPartner = apiDoc.isPartner ?? false
  const origin = isPartner ? 'partner' : 'hq'

  // DTO 필드: affiliationName → partnerName (협력사일 때만)
  const affiliationName = apiDoc.affiliationName || ''
  const partnerName = isPartner ? affiliationName : null

  return {
    id:          apiDoc.idx        ?? Date.now(),
    docCode:     '',  // DTO에 없음 - 백엔드에서 추가 예정이면 여기 수정
    docType:     DOC_TYPE_MAP[apiDoc.docType] ?? apiDoc.docType ?? '',
    fileName:    fileName,
    fileExt:     ext,
    fileUrl:     apiDoc.fileUrl || apiDoc.file_url || '',  // DB의 file_url 컬럼
    origin:      origin,
    partnerName: partnerName,
    uploadDate:  uploadDate,
    uploader:    resolveUploaderName(apiDoc.uploader, apiDoc.name),  // DTO 필드: name → 업로드자
    version:     'v1.0',       // DTO에 없으므로 기본값
    fileSize:    '',           // DTO에 없으므로 비워둠
  }
}

/* ── 백엔드 응답 배열 → 프론트 배열 변환 ── */
function mapApiListToFront(apiList) {
  return (apiList || []).map(mapApiToFront)
}

const DOC_TYPE_LABEL_BY_CODE = {
  WORK_ORDER: L.tabWorkInstruction,
  DAILY_REPORT: L.tabDailyReport,
  TRADE_PLAN: L.tabConstructionPlan,
}

function mapUploadedToFront(apiDoc) {
  const docTypeCode = apiDoc.docTypeCode || apiDoc.sourceType || ''
  const sourceId = apiDoc.sourceId ?? apiDoc.idx
  const fileName = docTypeCode === 'DAILY_REPORT'
    ? `[${apiDoc.tradeName || ''}] ${apiDoc.docDate || ''} ${L.tabDailyReport}`.trim()
    : (apiDoc.fileName || '')
  const ext = apiDoc.fileExt || (fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '')

  return {
    id: docTypeCode === 'TRADE_PLAN' ? sourceId : (apiDoc.id || `${docTypeCode}-${sourceId}`),
    sourceType: apiDoc.sourceType || docTypeCode,
    sourceId,
    docCode: apiDoc.docCode || '',
    docType: DOC_TYPE_LABEL_BY_CODE[docTypeCode] || docTypeCode,
    docTypeCode,
    fileName,
    fileExt: ext,
    fileUrl: apiDoc.fileUrl || '',
    origin: apiDoc.origin || 'hq',
    partnerName: apiDoc.partnerName || null,
    uploadDate: apiDoc.uploadDate || '',
    docDate: apiDoc.docDate || apiDoc.uploadDate || '',
    uploader: resolveUploaderName(apiDoc.uploader),
    version: apiDoc.version || 'v1.0',
    fileSize: apiDoc.fileSize || '',
    status: apiDoc.statusCode || '',
    downloadable: apiDoc.downloadable !== false,
    tradeName: apiDoc.tradeName || '',
    _raw: apiDoc.raw || null,
  }
}

function mapUploadedListToFront(apiList) {
  return (apiList || []).map(mapUploadedToFront)
}

/* ═══════════════════════════════════════════════════════════════
 * 작업지시서 (WorkOrder) → 프론트 문서 객체
 * ──────────────────────────────────────────────────────────────
 * /work-order 응답을 documents 배열에서 사용하는 형식으로 변환
 * ═══════════════════════════════════════════════════════════════ */
function mapWorkOrderToDoc(wo) {
  // createdAt: ISO 또는 배열 형태일 수 있어 안전하게 처리
  const toDateStr = (v) => {
    if (!v) return ''
    if (Array.isArray(v)) {
      const [y, m, d] = v
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
    return String(v).substring(0, 10)
  }

  const uploadDate = toDateStr(wo.createdAt) || toDateStr(wo.createAt) || toDateStr(wo.dueDate)
  const docDate = toDateStr(wo.dueDate) || uploadDate

  // 상태 코드 한글화
  const statusMap = {
    APPROVED: '승인',
    REJECTED: '반려',
    OPEN: '임시저장',
    DRAFT: '임시저장',
  }

  return {
    id:          `WO-${wo.idx}`,
    docCode:     `WO-${String(wo.idx).padStart(4, '0')}`,
    docType:     L.tabWorkInstruction,
    fileName:    wo.title || `[${wo.tradeType || '작업'}] 작업지시서`,
    fileExt:     '',           // 첨부 파일 없음 — 시스템 생성 문서
    fileUrl:     '',
    origin:      'hq',          // 작업지시서는 본사가 작성
    partnerName: null,
    uploadDate:  uploadDate,
    docDate:     docDate,        // 날짜 필터용 (마감일 기준)
    uploader:    resolveUploaderName(wo.uploader, wo.author, wo.writerName, wo.createdBy),
    version:     'v1.0',
    fileSize:    '',
    status:      statusMap[wo.statusCode] || '임시저장',
    // 원본 데이터 보존 (미리보기 등에서 활용)
    _raw:        wo,
  }
}

/* ═══════════════════════════════════════════════════════════════
 * 공사 일보 (Report) → 프론트 문서 객체
 * ──────────────────────────────────────────────────────────────
 * /report/ 응답을 documents 배열에서 사용하는 형식으로 변환
 * ═══════════════════════════════════════════════════════════════ */
function mapReportToDoc(rp) {
  const toDateStr = (v) => {
    if (!v) return ''
    if (Array.isArray(v)) {
      const [y, m, d] = v
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
    return String(v).substring(0, 10)
  }

  const reportDate = toDateStr(rp.reportDate)
  const uploadDate = toDateStr(rp.createdAt) || toDateStr(rp.createAt) || reportDate

  return {
    id:          `RP-${rp.idx}`,
    docCode:     `RP-${String(rp.idx).padStart(4, '0')}`,
    docType:     L.tabDailyReport,
    // ReportDto.Res의 필드명은 'process' (workPlan.trade.label)
    fileName:    `[${rp.process || rp.tradeType || '공정'}] ${reportDate} 공사 일보`,
    fileExt:     '',
    fileUrl:     '',
    origin:      'hq',
    partnerName: null,
    uploadDate:  uploadDate,
    docDate:     reportDate,     // 날짜 필터용 (작업일 기준)
    uploader:    resolveUploaderName(rp.uploader, rp.author, rp.writerName, rp.createdBy),
    version:     'v1.0',
    fileSize:    '',
    status:      '승인',
    _raw:        rp,
  }
}

/* ── API 호출 (마운트 시 + 수동 새로고침) ── */
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const MSA_API_BASE = `${API_BASE}/msa`
function authFetch(url, options = {}) {
  const token = localStorage.getItem('accessToken')
  const headers = new Headers(options.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(url, { ...options, headers })
}
const isLoading = ref(false)
const apiError = ref('')

async function fetchDocuments() {
  isLoading.value = true
  apiError.value = ''
  try {
    const params = new URLSearchParams({
      page: String(Math.max(0, currentPage.value - 1)),
      size: String(rowsPerPage.value),
      docType: activeDocTypeCode.value,
      sortField: sortField.value,
      sortDir: sortDir.value,
    })
    if (searchQuery.value.trim()) params.set('q', searchQuery.value.trim())
    if (dateFilterStart.value) params.set('startDate', dateFilterStart.value)
    if (dateFilterEnd.value) params.set('endDate', dateFilterEnd.value)
    if (partnerFilter.value) params.set('partnerName', partnerFilter.value)

    // 시공계획서(TRADE_PLAN)만 전체 가져오기
    // (공정표 3종은 고정 영역에서 별도 조회하므로 여기선 제외)
    const res = await authFetch(
      `${MSA_API_BASE}/document-management/${currentProjectId.value}/uploaded?${params.toString()}`
    )
    const json = await res.json()
    console.log('[DocumentUpload] page response', json)

    if (json.success && json.data) {
      const page = json.data
      documents.value = mapUploadedListToFront(page.content)
      documentPage.value = {
        currentPage: page.currentPage ?? 0,
        totalPages: Math.max(1, page.totalPages ?? 1),
        totalElements: page.totalElements ?? 0,
        size: page.size ?? rowsPerPage.value,
        isFirst: page.first ?? page.isFirst ?? false,
        isLast: page.last ?? page.isLast ?? false,
      }
    } else {
      documents.value = []
      documentPage.value = {
        currentPage: 0,
        totalPages: 1,
        totalElements: 0,
        size: rowsPerPage.value,
        isFirst: true,
        isLast: true,
      }
    }
  } catch (e) {
    apiError.value = '서버 연결 실패 — 데이터를 불러올 수 없습니다.'
    console.warn('[DocumentUpload] API fetch failed:', e)
    documents.value = []
    documentPage.value = {
      currentPage: 0,
      totalPages: 1,
      totalElements: 0,
      size: rowsPerPage.value,
      isFirst: true,
      isLast: true,
    }
  } finally {
    isLoading.value = false
  }
}

// 고정 영역(공정표 현황) 데이터 가져오기
async function fetchPinnedSchedules() {
  try {
    const res = await authFetch(
      `${API_BASE}/document-management/${currentProjectId.value}/pinned`
    )
    const json = await res.json()
    console.log('[고정 영역 응답]', json)

    if (json.success && json.data) {
      pinnedDocuments.value = mapApiListToFront(json.data)
    } else {
      pinnedDocuments.value = []
    }
  } catch (e) {
    console.warn('[Pinned] API fetch failed:', e)
    pinnedDocuments.value = []
  }
}

/* ── 작업지시서 목록 가져오기 (/work-order) ── */
async function fetchWorkOrders() {
  try {
    const res = await getWorkOrderList()
    // BaseResponse 인터셉터에서 data를 풀어주므로 res가 곧 배열
    const list = Array.isArray(res) ? res : (res?.data?.data || res?.data || [])
    workOrderDocs.value = list.map(mapWorkOrderToDoc)
  } catch (e) {
    console.warn('[WorkOrder] fetch failed:', e)
    workOrderDocs.value = []
  }
}

/* ── 공사 일보 목록 가져오기 (/report/?date=YYYY-MM-DD) ──
 * 백엔드 GET /report/는 date 파라미터를 필수로 요구함 (@RequestParam("date") LocalDate).
 * → 최근 N일치를 날짜별로 호출해서 합쳐 사용한다.
 * → 페이지 첫 진입 시 1회만 실행되며, 30일치 정도면 일반적인 일보 운영 범위 내.
 */
const REPORT_FETCH_DAYS = 60   // 조회 범위 (필요 시 조정)

async function fetchReports() {
  try {
    const today = new Date()
    const dates = []
    for (let i = 0; i < REPORT_FETCH_DAYS; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      dates.push(d.toISOString().slice(0, 10))
    }

    // 날짜별 병렬 호출 (BaseResponse 인터셉터가 data를 풀어줌 → 곧장 List<Res>)
    const results = await Promise.allSettled(
      dates.map((date) => api.get('/report/', { params: { date } }))
    )

    const merged = []
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        const list = Array.isArray(r.value)
          ? r.value
          : (r.value?.data?.data || r.value?.data || r.value?.content || [])
        if (Array.isArray(list)) merged.push(...list)
      }
    })

    // idx 기준 중복 제거 (혹시 모를 중복 응답 방어)
    const seen = new Set()
    const unique = merged.filter((rp) => {
      if (rp == null || rp.idx == null) return false
      if (seen.has(rp.idx)) return false
      seen.add(rp.idx)
      return true
    })

    reportDocs.value = unique.map(mapReportToDoc)
    console.log(`[Report] loaded ${reportDocs.value.length} reports (last ${REPORT_FETCH_DAYS} days)`)
  } catch (e) {
    console.warn('[Report] fetch failed:', e)
    reportDocs.value = []
  }
}

onMounted(() => {
  loadProjectInfo()
  fetchDocuments()
  fetchPinnedSchedules()
})

/* ───── 상태 관리 ───── */
const searchQuery = ref('')
const currentTab = ref(L.tabAll)
const showUploadDrawer = ref(false)
const isSubmitting = ref(false)
const selectedRows = ref(new Set())
const sortField = ref('uploadDate')
const sortDir = ref('desc')

const currentPage = ref(1)
const rowsPerPage = ref(10)


// 공정표 3종: 위쪽 고정 섹션에만 표시, 아래 테이블 탭에서는 제외
const SCHEDULE_TYPES = [L.tabMasterSchedule, L.tabSubSchedule, L.tabMilestone]
// 아래 테이블 탭: 공정표 3종 제외 (작업지시서·공사일보·업로드 문서)
const TABLE_DOC_TYPES = [L.tabWorkInstruction, L.tabDailyReport, L.tabConstructionPlan]
const tabs = [L.tabAll, ...TABLE_DOC_TYPES]

const DOC_TYPE_CODE_BY_TAB = {
  [L.tabAll]: 'ALL',
  [L.tabWorkInstruction]: 'WORK_ORDER',
  [L.tabDailyReport]: 'DAILY_REPORT',
  [L.tabConstructionPlan]: 'TRADE_PLAN',
}

const activeDocTypeCode = computed(() => DOC_TYPE_CODE_BY_TAB[currentTab.value] || 'ALL')

/* ───── 새 문서 업로드 폼 ───── */
const newDoc = ref({
  docType: '',
  origin: 'hq',
  partnerName: '',
  version: 'v1.0',
  memo: '',
  file: null,
  fileName: '',
})

/* ───── 통계 ───── */
/* ───── 아래 테이블 전용 ─────
 * documents: 서버에서 현재 페이지의 통합 문서 목록만 가져옴
 * → 필터/정렬/페이징은 백엔드에서 처리
 */
const tableDocuments = computed(() => {
  return documents.value
})

// 탭/검색/필터/정렬/페이지 변경 시 서버에서 현재 페이지만 재조회
const filteredDocuments = computed(() => {
  return [...tableDocuments.value]
})

const totalPages = computed(() => {
  return Math.max(1, documentPage.value.totalPages || 1)
})

const paginatedDocuments = computed(() => {
  return filteredDocuments.value
})

const totalElements = computed(() => documentPage.value.totalElements || 0)

const pageStart = computed(() =>
  totalElements.value === 0
    ? 0
    : (currentPage.value - 1) * rowsPerPage.value + 1
)
const pageEnd = computed(() =>
  Math.min(currentPage.value * rowsPerPage.value, totalElements.value)
)

const visiblePageItems = computed(() => {
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 9) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const pages = new Set([1, 2, total - 1, total])
  for (let page = current - 2; page <= current + 2; page += 1) {
    if (page >= 1 && page <= total) pages.add(page)
  }

  const sorted = [...pages].sort((a, b) => a - b)
  const items = []
  sorted.forEach((page, index) => {
    const prev = sorted[index - 1]
    if (index > 0 && page - prev > 1) {
      items.push(`ellipsis-${prev}-${page}`)
    }
    items.push(page)
  })

  return items
})

/* ───── 핸들러 ───── */
const toggleSort = (field) => {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'desc'
  }
  if (currentPage.value !== 1) {
    currentPage.value = 1
  }
}

const toggleSelectAll = () => {
  if (selectedRows.value.size === paginatedDocuments.value.length) {
    selectedRows.value.clear()
  } else {
    paginatedDocuments.value.forEach((d) => selectedRows.value.add(d.id))
  }
}

const toggleRow = (id) => {
  if (selectedRows.value.has(id)) {
    selectedRows.value.delete(id)
  } else {
    selectedRows.value.add(id)
  }
}

const handleFileChange = (e) => {
  const file = e.target.files?.[0]
  if (file) {
    newDoc.value.file = file
    newDoc.value.fileName = file.name
  }
}

const handleFileDrop = (e) => {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    newDoc.value.file = file
    newDoc.value.fileName = file.name
  }
}

const onDocTypeChange = () => {
  const dt = newDoc.value.docType
  if (dt && defaultOriginMap[dt]) {
    newDoc.value.origin = defaultOriginMap[dt]
    if (newDoc.value.origin === 'hq') {
      newDoc.value.partnerName = ''
    }
  }
}

/* ── 프론트 라벨 → 백엔드 enum 역매핑 ── */
const DOC_TYPE_REVERSE_MAP = {
  '마스터 공정표':       'MASTER',
  '마일스톤 공정표':     'MILESTONE',
  '보할 공정표':         'WEIGHT',
  '업로드 문서':   'TRADE_PLAN',
}

/* ───── 현재 프로젝트 ID (실제로는 라우터 파라미터나 store에서 가져올 것) ───── */
// currentProjectId is resolved from route query/params or the auth store.

const submitUpload = async () => {
  if (!newDoc.value.docType || !newDoc.value.file) {
    alert(L.alertFields)
    return
  }
  if (newDoc.value.origin === 'partner' && !newDoc.value.partnerName) {
    alert(L.alertFields)
    return
  }

  isSubmitting.value = true

  try {
    const formData = new FormData()

    // ★ 추가: projectId (백엔드 필수 파라미터)
    formData.append('projectId', currentProjectId.value)

    // file: 파일
    formData.append('file', newDoc.value.file)

    // docType: MASTER, MILESTONE, WEIGHT, TRADE_PLAN
    formData.append('docType', DOC_TYPE_REVERSE_MAP[newDoc.value.docType] || newDoc.value.docType)

    // isPartner: true(협력사) / false(본사)
    formData.append('isPartner', newDoc.value.origin === 'partner')

    // affiliationName: 본사 or 협력사명
    const affiliationName = newDoc.value.origin === 'hq' ? '본사' : newDoc.value.partnerName
    formData.append('affiliationName', affiliationName)

    // name: 작성자 이름 (추후 로그인 정보에서 가져올 것)
    formData.append('name', '김현장')

    // ※ docName 제거: 백엔드는 file.getOriginalFilename()으로 자동 추출

    const res = await authFetch(`${API_BASE}/document-management/upload`, {
      method: 'POST',
      body: formData,
      // ※ Content-Type 은 직접 설정하지 않습니다.
      //    FormData 사용 시 브라우저가 boundary 까지 포함해 자동으로 설정해줍니다.
    })

    const json = await res.json()

    if (!res.ok || !json.success) {
      // 백엔드의 친절한 에러 메시지 표시
      throw new Error(json.message || `업로드 실패: ${res.status}`)
    }

    console.log('[업로드 응답]', json)

    // 업로드 성공 후 1페이지로 이동 + 목록 새로고침
    currentPage.value = 1
    await fetchDocuments()
    await fetchPinnedSchedules()

    showUploadDrawer.value = false
    alert(L.alertOk)

    // 폼 초기화
    newDoc.value = {
      docType: '',
      origin: 'hq',
      partnerName: '',
      version: 'v1.0',
      memo: '',
      file: null,
      fileName: '',
    }
  } catch (e) {
    console.error('[업로드 오류]', e)
    alert(`업로드 중 오류가 발생했습니다.\n${e.message}`)
  } finally {
    isSubmitting.value = false
  }
}

/* ───── 파일 다운로드 ───── */
const downloadFile = async (id, fileName) => {
  try {
    // 1. 백엔드에서 Presigned URL 받기
    const res = await authFetch(`${API_BASE}/document-management/download/${id}`)
    const json = await res.json()

    if (!res.ok || !json.success) {
      throw new Error(json.message || `다운로드 실패: ${res.status}`)
    }

    const presignedUrl = json.result   // BaseResponse 의 result 필드

    // 2. Presigned URL 로 S3에서 직접 blob 다운로드
    const fileRes = await fetch(presignedUrl)
    if (!fileRes.ok) throw new Error(`S3 다운로드 실패: ${fileRes.status}`)

    const blob = await fileRes.blob()

    // 3. 임시 링크로 자동 클릭 (기존 로직 그대로)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || 'download'
    document.body.appendChild(a)
    a.click()

    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (e) {
    console.error('[다운로드 오류]', e)
    alert(`다운로드 중 오류가 발생했습니다.\n${e.message}`)
  }
}

/* ───── 날짜 필터 (작업지시서·공사일보 탭 전용) ───── */
const dateFilterStart = ref('')
const dateFilterEnd = ref('')

const DATE_FILTER_TABS = [L.tabWorkInstruction, L.tabDailyReport]
const showDateFilter = computed(() => DATE_FILTER_TABS.includes(currentTab.value))

/* ───── 협력사 필터 (공종별 시공계획서 탭 전용) ───── */
const partnerFilter = ref('')
const showPartnerFilter = computed(() => currentTab.value === L.tabConstructionPlan)

// ?/??/??/??/??? ?? ? ???? ?? ???? ???
let searchFetchTimer = null

const resetPageAndFetch = () => {
  selectedRows.value.clear()
  if (currentPage.value !== 1) {
    currentPage.value = 1
  } else {
    fetchDocuments()
  }
}

watch(currentTab, resetPageAndFetch)

watch(searchQuery, () => {
  selectedRows.value.clear()
  if (currentPage.value !== 1) {
    currentPage.value = 1
    return
  }
  window.clearTimeout(searchFetchTimer)
  searchFetchTimer = window.setTimeout(fetchDocuments, 250)
})

watch(
  [currentPage, rowsPerPage, sortField, sortDir, dateFilterStart, dateFilterEnd, partnerFilter],
  () => {
    selectedRows.value.clear()
    fetchDocuments()
  }
)

watch(currentProjectId, () => {
  selectedRows.value.clear()
  currentPage.value = 1
  loadProjectInfo()
  fetchDocuments()
  fetchPinnedSchedules()
})

const clearPartnerFilter = () => {
  partnerFilter.value = ''
  currentPage.value = 1
}

const applyQuickDate = (preset) => {
  const today = new Date()
  const fmt = (d) => d.toISOString().substring(0, 10)
  if (preset === 'today') {
    dateFilterStart.value = fmt(today)
    dateFilterEnd.value = fmt(today)
  } else if (preset === 'yesterday') {
    const y = new Date(today); y.setDate(today.getDate() - 1)
    dateFilterStart.value = fmt(y)
    dateFilterEnd.value = fmt(y)
  } else if (preset === 'thisWeek') {
    const mon = new Date(today); mon.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    dateFilterStart.value = fmt(mon)
    dateFilterEnd.value = fmt(today)
  } else if (preset === 'lastWeek') {
    const mon = new Date(today); mon.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 7)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    dateFilterStart.value = fmt(mon)
    dateFilterEnd.value = fmt(sun)
  } else if (preset === 'thisMonth') {
    dateFilterStart.value = fmt(new Date(today.getFullYear(), today.getMonth(), 1))
    dateFilterEnd.value = fmt(today)
  } else if (preset === 'lastMonth') {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const last  = new Date(today.getFullYear(), today.getMonth(), 0)
    dateFilterStart.value = fmt(first)
    dateFilterEnd.value = fmt(last)
  }
  currentPage.value = 1
}

const clearDateFilter = () => {
  dateFilterStart.value = ''
  dateFilterEnd.value = ''
  currentPage.value = 1
}

const activeDatePreset = computed(() => {
  const today = new Date()
  const fmt = (d) => d.toISOString().substring(0, 10)
  const s = dateFilterStart.value
  const e = dateFilterEnd.value
  if (!s && !e) return ''
  const todayStr = fmt(today)
  const yStr = fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1))
  if (s === todayStr && e === todayStr) return 'today'
  if (s === yStr && e === yStr) return 'yesterday'
  const mon = new Date(today); mon.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const monStr = fmt(mon)
  if (s === monStr && e === todayStr) return 'thisWeek'
  const lmon = new Date(today); lmon.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 7)
  const lsun = new Date(lmon); lsun.setDate(lmon.getDate() + 6)
  if (s === fmt(lmon) && e === fmt(lsun)) return 'lastWeek'
  if (s === fmt(new Date(today.getFullYear(), today.getMonth(), 1)) && e === todayStr) return 'thisMonth'
  const lf = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const ll = new Date(today.getFullYear(), today.getMonth(), 0)
  if (s === fmt(lf) && e === fmt(ll)) return 'lastMonth'
  return 'custom'
})
const PINNED_TYPES = [L.tabMasterSchedule]

const pinnedSchedules = computed(() =>
  PINNED_TYPES.map((type) => {
    const latest = pinnedDocuments.value
      .filter((d) => d.docType === type)
      .sort((a, b) => (b.docDate > a.docDate ? 1 : -1))[0] ?? null
    return { type, doc: latest }
  })
)




const pinnedStatusClass = (status) => {
  if (!status) return ''
  if (status === '승인')      return 'text-emerald-600 bg-emerald-50 ring-1 ring-emerald-200/80'
  if (status === '반려')      return 'text-rose-600 bg-rose-50 ring-1 ring-rose-200/80'
  return 'text-slate-500 bg-slate-50 ring-1 ring-slate-200/80'
}

const jumpToTab = (type) => {
  currentTab.value = type
  currentPage.value = 1
}

/* ───── 종합 공사일보 PDF 다운로드 ───── */
const showPdfModal = ref(false)
const pdfTargetDate = ref(new Date().toISOString().slice(0, 10))
const isGeneratingPdf = ref(false)
const pdfRef = ref(null)
const pdfReports = ref([])

/* ───── PDF 미리보기 관련 상태 ───── */
const showPdfPreview = ref(false)        // 미리보기 모달 표시 여부
const pdfPreviewUrl = ref('')            // iframe에 띄울 Blob URL
const pdfBlob = ref(null)                // 다운로드 시 사용할 Blob 객체
const pdfFileName = ref('')              // 저장할 파일명

// 공사 정보
const projectInfo = ref({
  ...DEFAULT_PROJECT_INFO,
})

function unwrapProjectPayload(response) {
  return response?.data?.data ?? response?.data ?? response ?? {}
}

function parseProjectPeriod(period) {
  if (!period || typeof period !== 'string') return {}
  const dates = period.match(/\d{4}-\d{2}-\d{2}/g) || period.match(/\d{4}\.\d{2}\.\d{2}/g) || []
  return {
    startDate: dates[0]?.replaceAll('.', '-') ?? null,
    endDate: dates[1]?.replaceAll('.', '-') ?? null,
  }
}

async function loadProjectInfo() {
  const projectId = currentProjectId.value
  if (!projectId) {
    projectInfo.value = { ...DEFAULT_PROJECT_INFO }
    return
  }

  try {
    const project = unwrapProjectPayload(await getProject(projectId))
    const period = parseProjectPeriod(project.period)
    projectInfo.value = {
      name: project.name || project.projectName || project.siteName || '',
      startDate: project.startDate ?? period.startDate ?? null,
      endDate: project.endDate ?? period.endDate ?? null,
    }
  } catch (error) {
    console.warn('[DocumentUpload] project info fetch failed:', error)
    projectInfo.value = { ...DEFAULT_PROJECT_INFO }
  }
}

// 진척률 평균/합계 계산
const pdfStats = computed(() => {
  const list = pdfReports.value
  const total = list.length
  const totalWorkers = list.reduce((s, r) => s + (r.workers || 0), 0)
  const totalEquip = list.reduce((s, r) => s + (r.equipmentCount || 0), 0)
  const avgProgress = total
    ? Math.round(list.reduce((s, r) => s + (r.processProgress || 0), 0) / total)
    : 0
  return { total, totalWorkers, totalEquip, avgProgress }
})

// 한국어 날짜 포맷
const fmtKor = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})`
}

// 점 구분자 날짜 포맷 (예: 2026. 02. 28)
const fmtDot = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`
}

// 버튼 클릭: PDF 다운로드 모달 열기
const downloadExcel = () => {
  pdfTargetDate.value = new Date().toISOString().slice(0, 10)
  pdfReports.value = []
  showPdfModal.value = true
}

// 데이터 불러오기 + PDF 생성 → 미리보기로 띄우기
const generatePdf = async () => {
  if (!pdfTargetDate.value) {
    alert('날짜를 선택해주세요.')
    return
  }
  isGeneratingPdf.value = true

  try {
    if (!projectInfo.value.name) {
      await loadProjectInfo()
    }

    // 1. 해당 날짜의 공사일보 조회
    const res = await api.get('/report/', { params: { date: pdfTargetDate.value } })
    const dbReports = Array.isArray(res) ? res : (res.data?.data || res.data || [])

    if (dbReports.length === 0) {
      alert('해당 날짜에 작성된 공사일보가 없습니다.')
      isGeneratingPdf.value = false
      return
    }

    const toDateString = (d) =>
      Array.isArray(d)
        ? `${d[0]}-${String(d[1]).padStart(2, '0')}-${String(d[2]).padStart(2, '0')}`
        : d

    pdfReports.value = dbReports.map((db) => ({
      id: db.idx,
      date: toDateString(db.reportDate),
      process: db.tradeType || db.process || '공정',
      workers: db.actualWorkerCount || 0,
      location: db.location || '',
      equipmentCount: 0,
      todayWork: db.todayWork || '',
      tomorrowPlan: db.tomorrowPlan || '',
      progress: db.todayProgress || 0,
      processProgress: db.actualProgress || 0,
      notes: db.issue || '',
    }))

    // 2. DOM 렌더링 대기
    await new Promise((r) => setTimeout(r, 300))

    if (!pdfRef.value) {
      alert('PDF 영역을 찾을 수 없습니다.')
      isGeneratingPdf.value = false
      return
    }

    // 3. html2canvas로 캡처
    const canvas = await html2canvas(pdfRef.value, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    })

    // 4. jsPDF로 PDF 생성 (A4, 페이지 자동 분할)
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const imgData = canvas.toDataURL('image/png')

    let heightLeft = imgHeight
    let position = 0
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pdfHeight
    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight
    }

    // 5. 바로 저장하지 않고 Blob으로 만들어 미리보기 띄우기
    //    (이전 미리보기 URL이 남아 있으면 메모리 해제)
    if (pdfPreviewUrl.value) {
      URL.revokeObjectURL(pdfPreviewUrl.value)
      pdfPreviewUrl.value = ''
    }

    const blob = pdf.output('blob')
    pdfBlob.value = blob
    pdfPreviewUrl.value = URL.createObjectURL(blob)
    pdfFileName.value = `공사일보_${pdfTargetDate.value}.pdf`

    // 선택 모달은 닫고 미리보기 모달 열기
    showPdfModal.value = false
    showPdfPreview.value = true
  } catch (e) {
    console.error('PDF 생성 실패:', e)
    alert('PDF 생성 중 오류가 발생했습니다.')
  } finally {
    isGeneratingPdf.value = false
  }
}

// 미리보기에서 실제 다운로드 실행
const downloadPdfFromPreview = async () => {
  if (!pdfPreviewUrl.value) return
  try {
    const res = await fetch(pdfPreviewUrl.value)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = pdfFileName.value || 'document.pdf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('다운로드 실패:', e)
  }
}

// 미리보기 모달 닫기 (Blob URL 정리)
const closePdfPreview = () => {
  showPdfPreview.value = false
  pdfPreviewUrl.value = ''  // ★ revokeObjectURL 제거
  pdfBlob.value = null
  pdfPageLink.value = ''
}

/* ───── 한 건 문서 미리보기 (작업지시서 / 공사일보) ───── */
const pdfPageLink = ref('')                 // 원본 페이지 링크
const singlePdfRef = ref(null)              // 작업지시서 1건 렌더링 영역
const singleReportPdfRef = ref(null)        // 공사일보 1건 렌더링 영역
const singleWorkOrder = ref(null)           // 미리보기 중인 작업지시서 데이터
const singleReport = ref(null)              // 미리보기 중인 공사일보 데이터
const isGeneratingSinglePdf = ref(false)
const previewingDocId = ref(null)           // 현재 PDF 생성 중인 doc.id (행별 스피너용)

// 표 행 클릭 → 미리보기
async function previewDoc(doc) {
  if (isGeneratingSinglePdf.value) return   // 중복 클릭 방지
  previewingDocId.value = doc.id
  console.log('[previewDoc]', { id: doc.id, docType: doc.docType, hasRaw: !!doc._raw })

  if (doc.docType === L.tabWorkInstruction) {
    if (!doc._raw) { previewingDocId.value = null; return }
    await previewWorkOrder(doc)
  } else if (doc.docType === L.tabDailyReport) {
    if (!doc._raw) { previewingDocId.value = null; return }
    await previewReport(doc)
  } else if (doc.id != null) {
    // 시공계획서 등 파일 기반 문서 → download API로 blob 받아서 미리보기
    await previewFileDoc(doc)
  }

  previewingDocId.value = null
}

// 파일 기반 문서 (시공계획서 등) 미리보기
async function previewFileDoc(doc) {
  const docId = doc.id
  if (typeof docId === 'string' && /^(WO|RP)-/.test(docId)) {
    console.warn('[previewFileDoc] 작업지시서/공사일보는 이 함수로 처리할 수 없습니다:', docId)
    return
  }

  if (doc.fileUrl && doc.fileUrl.startsWith('dummy')) {
    alert('이 문서는 아직 파일이 등록되지 않아 미리보기가 불가합니다.')
    return
  }

  isGeneratingSinglePdf.value = true
  try {
    console.log('[previewFileDoc] download URL:', `${API_BASE}/document-management/download/${docId}`)

    // ★ 변경: Presigned URL 받아서 S3에서 blob 가져오기
    const res = await authFetch(`${API_BASE}/document-management/preview/${docId}`)
    const json = await res.json()

    console.log('[preview 응답]', json)

    if (!res.ok || !json.success) {
      throw new Error(json.message || `파일 로드 실패: ${res.status}`)
    }

    const fileName = doc.fileName || 'document'
    const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : ''
    const isPdf = ext === 'pdf'

    if (isPdf) {
      // ★ blob 변환 없이 presigned URL 직접 iframe에 넣기
      pdfPreviewUrl.value = json.data
      pdfBlob.value = null
      pdfFileName.value = fileName
      pdfPageLink.value = ''
      showPdfPreview.value = true
    } else {
      // PDF 아닌 파일은 그냥 새 탭으로 열기
      window.open(json.result, '_blank')
    }
  } catch (e) {
    console.error('[파일 미리보기 오류]', e)
    alert(`파일 미리보기 중 오류가 발생했습니다.\n${e.message}`)
  } finally {
    isGeneratingSinglePdf.value = false
  }
}

// 다운로드 버튼 클릭 핸들러 — 미리보기를 먼저 띄우고 모달에서 다운로드
async function handleDownload(doc) {
  if (!doc.downloadable) {
    await previewDoc(doc)
    return
  }
  try {
    // 1. presigned URL 받기 (download = attachment)
    const res = await authFetch(`${API_BASE}/document-management/download/${doc.id}`)
    const json = await res.json()

    if (!res.ok || !json.success) {
      throw new Error(json.message || `다운로드 실패: ${res.status}`)
    }

    // 2. blob으로 받아서 바로 다운로드
    const fileRes = await fetch(json.data)
    if (!fileRes.ok) throw new Error(`S3 다운로드 실패: ${fileRes.status}`)

    const blob = await fileRes.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = doc.fileName || 'download'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

  } catch (e) {
    console.error('[다운로드 오류]', e)
    alert(`다운로드 중 오류가 발생했습니다.\n${e.message}`)
  }
}

// 작업지시서 1건 PDF 미리보기
async function previewWorkOrder(doc) {
  const raw = doc._raw
  if (!raw) return

  isGeneratingSinglePdf.value = true

  if (!projectInfo.value.name) {
    await loadProjectInfo()
  }

  // 작업지시서 페이지에서의 파싱 로직 재현
  let locationStr = raw.title
    ? raw.title
      .replace(`[${raw.tradeType}] `, '')
      .replace(' 작업지시서', '')
    : ''
  let detail = raw.instructionContent || ''
  let time = ''
  let safetyText = ''
  if (detail.includes('[작업시간]')) {
    const parts = detail.split('[작업시간]')
    detail = parts[0].trim()
    const subParts = parts[1].split('[안전사항]')
    time = subParts[0] ? subParts[0].trim() : ''
    if (subParts.length > 1) safetyText = subParts[1].trim()
  }

  const toDateStr = (v) => {
    if (!v) return ''
    if (Array.isArray(v)) {
      const [y, m, d] = v
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
    return String(v).substring(0, 10)
  }

  singleWorkOrder.value = {
    title:        raw.title || `[${raw.tradeType || '작업'}] 작업지시서`,
    process:      raw.tradeType || '공종',
    dueDate:      toDateStr(raw.dueDate) || '',
    location:     locationStr,
    partner:      '한울중기',
    workDetail:   raw.workDetail || detail,
    workTime:     raw.workTime || time,
    safety:       raw.safetyContent || safetyText,
    workerCount:  raw.workerCount || 0,
    statusCode:   raw.statusCode || 'OPEN',
    equipments:   (raw.equipments || []).map(eq => ({
      name: eq.equipmentName || eq.name || '',
      count: eq.equipmentCount || eq.count || 0,
    })),
  }

  pdfPageLink.value = '/site/work-instructions'

  await nextTick()
  await new Promise(r => setTimeout(r, 300))

  await captureAndPreview(singlePdfRef.value, `작업지시서_${singleWorkOrder.value.process}_${singleWorkOrder.value.dueDate}.pdf`)
  isGeneratingSinglePdf.value = false
}

// 공사일보 1건 PDF 미리보기
async function previewReport(doc) {
  const raw = doc._raw
  if (!raw) return

  isGeneratingSinglePdf.value = true

  if (!projectInfo.value.name) {
    await loadProjectInfo()
  }

  const toDateStr = (v) => {
    if (!v) return ''
    if (Array.isArray(v)) {
      const [y, m, d] = v
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
    return String(v).substring(0, 10)
  }

  const reportDate = toDateStr(raw.reportDate)

  // 종합 공사일보 PDF 렌더링과 동일한 데이터 형태
  singleReport.value = {
    id:              raw.idx,
    date:            reportDate,
    process:         raw.tradeType || raw.process || '공정',
    workers:         raw.actualWorkerCount || 0,
    location:        raw.location || '',
    equipmentCount:  0,
    todayWork:       raw.todayWork || '',
    tomorrowPlan:    raw.tomorrowPlan || '',
    progress:        raw.todayProgress || 0,
    processProgress: raw.actualProgress || 0,
    notes:           raw.issue || '',
  }

  pdfPageLink.value = '/site/daily-log'

  await nextTick()
  await new Promise(r => setTimeout(r, 300))

  await captureAndPreview(singleReportPdfRef.value, `공사일보_${singleReport.value.process}_${reportDate}.pdf`)
  isGeneratingSinglePdf.value = false
}

// 공통: DOM → canvas → PDF Blob → 미리보기 모달
async function captureAndPreview(el, fileName) {
  if (!el) {
    alert('PDF 영역을 찾을 수 없습니다.')
    return
  }

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    })

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const imgData = canvas.toDataURL('image/png')

    let heightLeft = imgHeight
    let position = 0
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pdfHeight
    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight
    }

    if (pdfPreviewUrl.value) {
      URL.revokeObjectURL(pdfPreviewUrl.value)
    }

    const blob = pdf.output('blob')
    pdfBlob.value = blob
    pdfPreviewUrl.value = URL.createObjectURL(blob)
    pdfFileName.value = fileName
    showPdfPreview.value = true
  } catch (e) {
    console.error('PDF 생성 실패:', e)
    alert('PDF 생성 중 오류가 발생했습니다.')
  }
}

// 원본 페이지로 이동
function goToOriginalPage() {
  if (pdfPageLink.value) {
    router.push(pdfPageLink.value)
  }
}

/* ───── 유틸 ───── */
const fileIcon = (ext) => {
  if (ext === 'pdf') return FileText
  if (['xlsx', 'xls', 'csv'].includes(ext)) return FileSpreadsheet
  return File
}

const fileIconColor = (ext) => {
  if (ext === 'pdf') return 'text-rose-500 bg-rose-50'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'text-emerald-600 bg-emerald-50'
  if (['docx', 'doc'].includes(ext)) return 'text-blue-600 bg-blue-50'
  if (['hwp', 'hwpx'].includes(ext)) return 'text-sky-600 bg-sky-50'
  return 'text-slate-500 bg-slate-50'
}

const statusBadge = (status) => {
  if (status === '승인')
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80'
  if (status === '반려')
    return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80'
  return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80'
}

const statusIcon = (status) => {
  if (status === '승인') return CircleCheck
  if (status === '반려') return AlertTriangle
  return File
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

const docTypeBadgeClass = (type) => {
  const map = {
    '작업지시서':        'bg-forena-50 text-forena-700 ring-forena-200/70',
    '공사 일보':         'bg-flare-50 text-flare-600 ring-flare-200/70',
    '마스터 공정표':     'bg-violet-50 text-violet-700 ring-violet-200/70',
    '마일스톤 공정표':   'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200/70',
    '보할 공정표':       'bg-indigo-50 text-indigo-700 ring-indigo-200/70',
    '업로드 문서': 'bg-amber-50 text-amber-700 ring-amber-200/70',
  }
  return map[type] || 'bg-slate-50 text-slate-600 ring-slate-200/70'
}
</script>

<template>
  <div class="space-y-6 pb-10">
    <!-- ═══ 헤더 ═══ -->
    <div class="flex shrink-0 flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-widest text-flare-600">{{ L.kicker }}</p>
        <h1 class="text-xl font-bold text-forena-900">{{ L.title }}</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-forena-200 bg-white px-3 py-1.5 text-xs font-semibold text-forena-700 hover:bg-forena-50"
          @click="downloadExcel"
        >
          <Download class="h-3.5 w-3.5 text-forena-400" />
          {{ L.excel }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-flare-200 bg-flare-50 px-3 py-1.5 text-xs font-semibold text-forena-800 hover:bg-flare-100"
          @click="showUploadDrawer = true"
        >
          <Plus class="h-3.5 w-3.5 text-flare-600" />
          {{ L.upload }}
        </button>
      </div>
    </div>

    <!-- ═══ 통계 카드 ═══ -->
    <div v-if="false" class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 ">
      <!-- 전체 -->
      <article
        class="relative flex h-[110px] flex-col justify-between overflow-hidden rounded-2xl border border-white/90 bg-white/90 p-5 shadow-card backdrop-blur-sm"
      >
        <div
          class="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-forena-500 to-flare-400 opacity-90"
        />
        <div class="flex items-start justify-between">
          <h3 class="text-sm font-semibold text-forena-800">{{ L.statTotal }}</h3>
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-forena-50 text-forena-600">
            <FileText class="h-4 w-4" />
          </span>
        </div>
        <div class="flex items-baseline gap-1">
          <span class="text-3xl font-light tabular-nums text-forena-900">{{ summary.total }}</span>
          <span class="text-sm font-medium text-slate-400">{{ L.unit }}</span>
        </div>
      </article>

      <!-- 본사 -->
      <article
        class="relative flex h-[110px] flex-col justify-between overflow-hidden rounded-2xl border border-white/90 bg-white/90 p-5 shadow-card backdrop-blur-sm"
      >
        <div
          class="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-forena-500 to-forena-300"
        />
        <div class="flex items-start justify-between">
          <h3 class="text-sm font-semibold text-forena-800">{{ L.statHq }}</h3>
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-flare-50 text-flare-600">
            <Building2 class="h-4 w-4" />
          </span>
        </div>
        <div class="flex items-baseline gap-1">
          <span class="text-3xl font-light tabular-nums text-forena-900">{{ summary.hq }}</span>
          <span class="text-sm font-medium text-slate-400">{{ L.unit }}</span>
        </div>
      </article>

      <!-- 협력사 -->
      <article
        class="relative flex h-[110px] flex-col justify-between overflow-hidden rounded-2xl border border-white/90 bg-white/90 p-5 shadow-card backdrop-blur-sm"
      >
        <div
          class="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-flare-400 to-emerald-400"
        />
        <div class="flex items-start justify-between">
          <h3 class="text-sm font-semibold text-forena-800">{{ L.statPartner }}</h3>
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Handshake class="h-4 w-4" />
          </span>
        </div>
        <div class="flex items-baseline gap-1">
          <span class="text-3xl font-light tabular-nums text-forena-900">{{ summary.partner }}</span>
          <span class="text-sm font-medium text-slate-400">{{ L.unit }}</span>
        </div>
      </article>
    </div>

    <!-- ═══ 고정 공정표 섹션 ═══ -->
    <div class="relative overflow-hidden rounded-2xl border border-white/90 bg-white/90 shadow-card backdrop-blur-sm">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-forena-500 to-flare-400 opacity-90" />
      <!-- 섹션 헤더 -->
      <div class="flex items-center gap-2 border-b border-forena-50 px-6 py-3.5">
        <Pin class="h-3.5 w-3.5 text-forena-400" />
        <span class="text-xs font-bold text-forena-700">공정표 현황</span>
        <span class="text-[11px] text-slate-400">— 최신 마스터 공정표</span>
      </div>
      <!-- 리스트 헤더 -->
      <div class="grid grid-cols-[200px_minmax(200px,1fr)_160px_140px_140px] border-b border-forena-100 bg-forena-50/60 px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-forena-500">
        <span class="text-left">문서 유형</span>
        <span class="text-left">파일명</span>
        <span class="text-center">문서 코드</span>
        <span class="text-center">업로드 일자</span>
        <span class="text-center">액션</span>
      </div>

      <!-- 리스트 행 -->
      <div
        v-for="item in pinnedSchedules"
        :key="item.type"
        class="group grid grid-cols-[200px_minmax(200px,1fr)_160px_140px_140px] items-center border-b border-forena-50 px-6 py-3.5 last:border-b-0 transition hover:bg-flare-50/40"
      >
        <!-- 문서 유형 -->
        <div class="flex items-center gap-2 text-left">
          <span class="flex h-6 w-6 shrink-0 items-center text-center justify-center rounded-lg bg-forena-50 text-forena-500">
            <FileText class="h-3.5 w-3.5" />
          </span>
          <span class="text-xs font-bold text-forena-800">{{ item.type }}</span>
        </div>

        <!-- 파일명 (없을 때) -->
        <div v-if="!item.doc" class="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <span class="italic">등록된 문서 없음</span>
        </div>

        <!-- 파일명 (있을 때) -->
        <div v-else class="flex min-w-0 items-center  gap-2 pr-4">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" :class="fileIconColor(item.doc.fileExt)">
            <component :is="fileIcon(item.doc.fileExt)" class="h-3 w-3" />
          </span>
          <div class="min-w-0">
            <p class="truncate text-xs font-semibold text-forena-900">{{ item.doc.fileName }}</p>
            <p class="text-[10px] text-slate-400">{{ item.doc.fileSize }}</p>
          </div>
        </div>

        <!-- 문서 코드 -->
        <span class="text-center font-mono text-[11px] font-semibold text-forena-600">{{ item.doc?.docCode ?? '—' }}</span>

        <!-- 업로드 일자 -->
        <span class="text-center text-xs text-slate-500">{{ item.doc ? formatDate(item.doc.uploadDate) : '—' }}</span>

        <!-- 액션 -->
        <div class="flex items-center justify-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button type="button"
                  class="rounded-lg p-1.5 text-slate-400 transition hover:bg-forena-50 hover:text-forena-700"
                  title="목록 보기" @click="jumpToTab(item.type)">
            <Eye class="h-5 w-5" />
          </button>
          <button v-if="item.doc" type="button"
                  class="rounded-lg p-1.5 text-slate-400 transition hover:bg-flare-50 hover:text-forena-700" title="다운로드"
                  @click="downloadFile(item.doc.id, item.doc.fileName)">
            <Download class="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ 테이블 카드 ═══ -->
    <div
      class="relative overflow-hidden rounded-2xl border border-white/90 bg-white/90 shadow-card backdrop-blur-sm"
    >
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-forena-500 text-center to-flare-400 opacity-90"
      />

      <!-- 검색 + 필터 바 -->
      <div class="flex flex-col gap-3 border-b border-forena-50 px-6 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full max-w-sm">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="L.searchPh"
            class="w-full rounded-xl border border-forena-200/80 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-flare-400 focus:ring-2 focus:ring-flare-400/20"
          />
        </div>
        <div v-if="selectedRows.size > 0" class="flex items-center gap-2 text-xs text-forena-600">
          <span class="font-bold">{{ selectedRows.size }}건 선택</span>
          <button
            type="button"
            class="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100"
          >
            <Trash2 class="h-3 w-3" />
            삭제
          </button>
          <button
            type="button"
            class="flex items-center gap-1 rounded-lg border border-forena-200 bg-forena-50 px-3 py-1.5 text-[11px] font-bold text-forena-700 transition hover:bg-forena-100"
          >
            <Download class="h-3 w-3" />
            다운로드
          </button>
        </div>
      </div>

      <!-- 탭 -->
      <div class="scrollbar-hide flex items-center gap-1 overflow-x-auto border-b border-forena-50 px-6 py-2">
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          class="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition"
          :class="
            currentTab === tab
              ? 'bg-forena-500 text-white shadow-sm'
              : 'text-slate-500 hover:bg-forena-50 hover:text-forena-700'
          "
          @click="currentTab = tab; currentPage = 1; clearDateFilter(); clearPartnerFilter()"
        >
          {{ tab }}
        </button>
        <button
          v-if="currentTab !== L.tabAll"
          type="button"
          class="ml-1 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
          @click="currentTab = L.tabAll"
        >
          <RotateCcw class="h-3 w-3" />
          {{ L.resetFilter }}
        </button>
      </div>

      <!-- 날짜 빠른 선택 (작업지시서·공사일보 탭 전용) -->
      <div
        v-if="showDateFilter"
        class="flex flex-wrap items-center gap-2 border-b border-forena-50 bg-forena-50/40 px-6 py-3"
      >
        <CalendarDays class="h-3.5 w-3.5 shrink-0 text-forena-400" />
        <span class="text-[11px] font-bold text-forena-500 shrink-0">날짜 필터</span>
        <!-- 빠른 선택 프리셋 -->
        <div class="flex flex-wrap gap-1">
          <button
            v-for="preset in [
                { key: 'today', label: '오늘' },
                { key: 'yesterday', label: '어제' },
                { key: 'thisWeek', label: '이번 주' },
                { key: 'lastWeek', label: '지난 주' },
                { key: 'thisMonth', label: '이번 달' },
                { key: 'lastMonth', label: '지난 달' },
              ]"
            :key="preset.key"
            type="button"
            class="rounded-md px-2.5 py-1 text-[11px] font-bold transition"
            :class="
                activeDatePreset === preset.key
                  ? 'bg-forena-500 text-white shadow-sm'
                  : 'border border-forena-200 bg-white text-slate-600 hover:border-forena-300 hover:bg-forena-50'
              "
            @click="applyQuickDate(preset.key)"
          >{{ preset.label }}</button>
        </div>
        <!-- 직접 입력 -->
        <div class="ml-1 flex items-center gap-1.5">
          <input
            v-model="dateFilterStart"
            type="date"
            class="rounded-md border border-forena-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-flare-400 focus:ring-2 focus:ring-flare-400/20"
            @change="currentPage = 1"
          />
          <span class="text-[11px] text-slate-400">~</span>
          <input
            v-model="dateFilterEnd"
            type="date"
            class="rounded-md border border-forena-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-flare-400 focus:ring-2 focus:ring-flare-400/20"
            @change="currentPage = 1"
          />
        </div>
        <!-- 초기화 -->
        <button
          v-if="dateFilterStart || dateFilterEnd"
          type="button"
          class="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-slate-50"
          @click="clearDateFilter"
        >
          <X class="h-3 w-3" />
          초기화
        </button>
      </div>

      <!-- 협력사 필터 (공종별 시공계획서 탭 전용) -->
      <div
        v-if="showPartnerFilter"
        class="flex flex-wrap items-center gap-2 border-b border-forena-50 bg-forena-50/40 px-6 py-3"
      >
        <Handshake class="h-3.5 w-3.5 shrink-0 text-forena-400" />
        <span class="text-[11px] font-bold text-forena-500 shrink-0">협력사 필터</span>
        <select
          v-model="partnerFilter"
          class="rounded-lg border border-forena-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 outline-none focus:border-flare-400 focus:ring-2 focus:ring-flare-400/20"
          @change="currentPage = 1"
        >
          <option value="">전체</option>
          <option v-for="pn in partnerList" :key="pn" :value="pn">{{ pn }}</option>
        </select>
        <button
          v-if="partnerFilter"
          type="button"
          class="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-slate-50"
          @click="clearPartnerFilter"
        >
          <X class="h-3 w-3" />
          초기화
        </button>
      </div>

      <!-- 테이블 -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[960px] text-left text-sm whitespace-nowrap">
          <thead class="border-b border-forena-100 bg-forena-50/60 text-[11px] font-bold uppercase tracking-wider text-forena-500">
          <tr>
            <th class="w-10 px-4 py-3.5 items-center text-center">
              <input
                type="checkbox"
                class="h-3.5 w-3.5 rounded border-forena-300 text-forena-600 accent-forena-600"
                :checked="selectedRows.size === paginatedDocuments.length && paginatedDocuments.length > 0"
                @change="toggleSelectAll"
              />
            </th>
            <th
              class="cursor-pointer px-4 py-3.5 font-semibold select-none text-center"
              @click="toggleSort('docCode')"
            >
                <span class="flex items-center justify-center gap-1">
                  {{ L.colDocCode }}
                  <ArrowUpDown class="h-3 w-3 text-slate-400" />
                </span>
            </th>
            <th class="px-4 py-3.5 font-semibold text-center">{{ L.colDocType }}</th>
            <th class="px-4 py-3.5 font-semibold text-left">{{ L.colFileName }}</th>
            <th class="px-4 py-3.5 font-semibold text-left">{{ L.colOrigin }}</th>
            <th
              class="cursor-pointer px-4 py-3.5 font-semibold select-none text-center"
              @click="toggleSort('uploadDate')"
            >
                <span class="flex items-center justify-center gap-1">
                  {{ L.colUploadDate }}
                  <ArrowUpDown class="h-3 w-3 text-slate-400" />
                </span>
            </th>
            <th class="px-4 py-3.5 font-semibold text-center">{{ L.colUploader }}</th>
            <th class="w-20 px-4 py-3.5 text-center font-semibold">{{ L.colActions }}</th>
          </tr>
          </thead>
          <tbody class="text-forena-800">
          <tr v-if="filteredDocuments.length === 0">
            <td colspan="10" class="px-6 py-14 text-center text-sm text-slate-400">
              {{ L.empty }}
            </td>
          </tr>
          <tr
            v-else
            v-for="doc in paginatedDocuments"
            :key="doc.id"
            class="group cursor-pointer border-b border-forena-50 transition hover:bg-flare-50/40"
            :class="{
                'bg-forena-50/30': selectedRows.has(doc.id),
                'animate-pulse bg-flare-50/60': previewingDocId === doc.id,
              }"
            @click="previewDoc(doc)"
          >
            <!-- 체크 -->
            <td class="px-4 py-3.5 text-center" @click.stop>
              <input
                type="checkbox"
                class="h-3.5 w-3.5 rounded border-forena-300 text-forena-600 accent-forena-600"
                :checked="selectedRows.has(doc.id)"
                @change="toggleRow(doc.id)"
              />
            </td>

            <!-- 문서 코드 -->
            <td class="px-4 py-3.5 text-center">
              <span class="font-mono text-xs font-semibold text-forena-700">{{ doc.docCode }}</span>
            </td>

            <!-- 문서 유형 -->
            <td class="px-4 py-3.5 text-center">
                <span
                  class="inline-flex rounded-lg px-2 py-0.5 text-[11px] font-bold ring-1"
                  :class="docTypeBadgeClass(doc.docType)"
                >
                  {{ doc.docType }}
                </span>
            </td>

            <!-- 파일명 -->
            <td class="px-4 py-3.5">
              <div class="flex items-center gap-2">
                  <span
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    :class="fileIconColor(doc.fileExt)"
                  >
                    <component :is="fileIcon(doc.fileExt)" class="h-3.5 w-3.5" />
                  </span>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-forena-900">{{ doc.fileName }}</p>
                  <p class="text-[10px] text-slate-400">{{ doc.fileSize }}</p>
                </div>
              </div>
            </td>

            <!-- 작성 주체 -->
            <td class="px-4 py-3.5">
              <div class="flex items-center gap-1.5">
                <template v-if="doc.origin === 'hq'">
                    <span class="flex h-5 w-5 items-center justify-center rounded bg-forena-100 text-forena-600">
                      <Building2 class="h-3 w-3" />
                    </span>
                  <span class="text-xs font-semibold text-forena-800">{{ L.originHq }}</span>
                </template>
                <template v-else>
                    <span class="flex h-5 w-5 items-center justify-center rounded bg-flare-100 text-flare-600">
                      <Handshake class="h-3 w-3" />
                    </span>
                  <span class="text-xs font-semibold text-flare-700">{{ doc.partnerName }}</span>
                </template>
              </div>
            </td>

            <!-- 업로드 일자 -->
            <td class="px-4 py-3.5 text-center text-xs text-slate-500">
              {{ formatDate(doc.uploadDate) }}
            </td>

            <!-- 업로드자 -->
            <td class="px-4 py-3.5 text-center text-xs text-slate-600">{{ doc.uploader }}</td>

            <!-- 액션 (다운로드만) -->
            <td class="px-4 py-3.5 text-center" @click.stop>
              <div class="flex items-center justify-center gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  class="rounded-lg p-1.5 text-slate-400 transition hover:bg-flare-50 hover:text-forena-700"
                  title="다운로드"
                  @click="handleDownload(doc)"
                >
                  <Download class="h-5 w-5" />
                </button>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- 페이지네이션 -->
      <div class="relative flex flex-col items-center justify-center gap-3 border-t border-forena-50 px-6 py-2 sm:min-h-[44px]">
        <p class="shrink-0 whitespace-nowrap text-xs text-slate-500 sm:absolute sm:left-6 sm:top-1/2 sm:-translate-y-1/2">
          {{
            L.pageInfo
              .replace('{total}', totalElements)
              .replace('{start}', pageStart)
              .replace('{end}', pageEnd)
          }}
        </p>
        <div class="flex max-w-full flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            class="rounded-lg border border-forena-200 p-1 text-forena-600 transition hover:bg-forena-50 disabled:opacity-40"
            :disabled="currentPage <= 1"
            @click="currentPage--"
          >
            <ChevronLeft class="h-3.5 w-3.5" />
          </button>
          <template v-for="p in visiblePageItems" :key="p">
            <span
              v-if="typeof p === 'string'"
              class="flex h-6 min-w-6 items-center justify-center px-1 text-xs font-bold text-slate-300"
            >
              ...
            </span>
            <button
              v-else
              type="button"
              class="h-6 w-6 rounded-lg text-xs font-bold transition"
              :class="
                p === currentPage
                  ? 'bg-forena-500 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-forena-50 hover:text-forena-800'
              "
              @click="currentPage = p"
            >
              {{ p }}
            </button>
          </template>
          <button
            type="button"
            class="rounded-lg border border-forena-200 p-1 text-forena-600 transition hover:bg-forena-50 disabled:opacity-40"
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
          >
            <ChevronRight class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ 종합 공사일보 PDF 모달 ═══ -->
    <Teleport to="body">
      <div
        v-if="showPdfModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-forena-900/30 backdrop-blur-[2px] p-4"
        @click.self="showPdfModal = false"
      >
        <div class="flex w-full max-w-md flex-col rounded-2xl border border-forena-100 bg-white shadow-2xl">

          <!-- 헤더 -->
          <div class="flex items-center justify-between border-b border-forena-100 bg-forena-50/50 px-5 py-4">
            <div class="flex items-center gap-2.5">
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-flare-50">
                <FileText class="h-4 w-4 text-flare-600" />
              </div>
              <div>
                <h2 class="text-base font-bold text-forena-900">종합 공사일보 PDF 다운로드</h2>
                <p class="text-[11px] text-forena-500">조회할 일자를 선택하세요</p>
              </div>
            </div>
            <button
              type="button"
              class="rounded-lg border border-forena-200 bg-white p-1.5 text-forena-400 transition hover:text-forena-700"
              @click="showPdfModal = false"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- 본문 -->
          <div class="space-y-4 p-6">
            <div>
              <label class="mb-1.5 block text-xs font-bold text-forena-700">
                <CalendarDays class="mr-1 inline h-3.5 w-3.5 text-flare-600" />
                조회 일자
              </label>
              <input
                type="date"
                v-model="pdfTargetDate"
                class="w-full rounded-lg border border-forena-200 bg-white px-3 py-2 text-sm font-semibold text-forena-800 outline-none focus:border-flare-400"
              />
              <p class="mt-1.5 text-[11px] text-forena-500">
                선택된 일자: <span class="font-semibold text-forena-700">{{ fmtKor(pdfTargetDate) }}</span>
              </p>
            </div>

            <div class="rounded-lg border border-flare-100 bg-flare-50/40 p-3 text-[11px] text-forena-600">
              <p class="font-bold text-flare-700">📋 안내</p>
              <p class="mt-1 leading-relaxed">선택한 일자에 작성된 모든 공정의 공사일보가 1개의 PDF 파일로 합쳐서 미리보기로 표시됩니다. 미리보기 화면에서 다운로드할 수 있습니다.</p>
            </div>
          </div>

          <!-- 푸터 -->
          <div class="flex items-center justify-end gap-2 border-t border-forena-100 bg-forena-50/40 px-5 py-3">
            <button
              type="button"
              class="rounded-lg border border-forena-200 bg-white px-4 py-2 text-xs font-semibold text-forena-700 hover:bg-forena-50 disabled:opacity-50"
              @click="showPdfModal = false"
              :disabled="isGeneratingPdf"
            >
              취소
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg bg-flare-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-flare-600 disabled:opacity-50"
              @click="generatePdf"
              :disabled="isGeneratingPdf"
            >
              <Loader2 v-if="isGeneratingPdf" class="h-3.5 w-3.5 animate-spin" />
              <Eye v-else class="h-3.5 w-3.5" />
              {{ isGeneratingPdf ? 'PDF 생성 중...' : '미리보기' }}
            </button>
          </div>
        </div>

        <!-- 화면 밖 PDF 렌더링 영역 -->
        <div
          style="position: fixed; left: -9999px; top: 0; width: 794px; background: white;"
          aria-hidden="true"
        >
          <div
            ref="pdfRef"
            v-if="pdfReports.length > 0"
            style="font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; padding: 30px 36px; background: white; color: #000; font-size: 11px; min-height: 1093px; display: flex; flex-direction: column; box-sizing: border-box;"
          >
            <!-- ═══ 상단 헤더 (제목 + 결재란) ═══ -->
            <div style="position:relative; height:90px; margin-bottom:10px;">
              <!-- 제목 (가운데) -->
              <h1 style="text-align:center; font-size:26px; font-weight:800; letter-spacing:12px; margin:0; padding-top:30px; color:#000;">
                공 사 일 보
              </h1>
              <!-- 결재란 (우측 상단 절대위치) -->
              <table style="position:absolute; top:0; right:0; border:1.5px solid #000; border-collapse:collapse;">
                <tr>
                  <td rowspan="2" style="border:1px solid #000; background:#f0f0f0; font-weight:700; width:22px; padding:16px 4px; text-align:center; font-size:10px; line-height:1.4;">
                    결<br><br>재
                  </td>
                  <td style="border:1px solid #000; background:#f0f0f0; font-weight:700; width:50px; height:18px; padding:4px 0; text-align:center; font-size:10px;">담당</td>
                  <td style="border:1px solid #000; background:#f0f0f0; font-weight:700; width:50px; height:18px; padding:4px 0; text-align:center; font-size:10px;">검토</td>
                  <td style="border:1px solid #000; background:#f0f0f0; font-weight:700; width:50px; height:18px; padding:4px 0; text-align:center; font-size:10px;">승인</td>
                </tr>
                <tr>
                  <td style="border:1px solid #000; width:50px; height:50px;"></td>
                  <td style="border:1px solid #000; width:50px; height:50px;"></td>
                  <td style="border:1px solid #000; width:50px; height:50px;"></td>
                </tr>
              </table>
            </div>

            <!-- ═══ 공사 정보 헤더 ═══ -->
            <div style="display:table; width:100%; margin-bottom:14px; font-size:11px; clear:both;">
              <div style="display:table-cell;">
                <span style="font-weight:700; padding-right:6px;">■ 공사명 :</span>
                <span style="font-weight:600;">{{ projectInfo.name }}</span>
              </div>
              <div style="display:table-cell; text-align:right; white-space:nowrap;">
                <span style="font-weight:700; padding-right:6px;">■ 일자 :</span>
                <span style="font-weight:600;">{{ fmtKor(pdfTargetDate) }}</span>
              </div>
            </div>

            <!-- ═══ 공사 개요 ═══ -->
            <table style="width:100%; border-collapse:collapse; border:1.5px solid #000;">
              <tr>
                <th colspan="8" style="border:1px solid #555; background:#d9d9d9; font-weight:700; text-align:center; font-size:12px; letter-spacing:6px; padding:7px;">
                  공 사 개 요
                </th>
              </tr>
              <tr>
                <td rowspan="2" style="border:1px solid #555; background:#f0f0f0; font-weight:700; text-align:center; width:80px; padding:6px 8px;">공사기간</td>
                <td colspan="3" style="border:1px solid #555; padding:6px 8px; text-align:center;">착공 : {{ fmtDot(projectInfo.startDate) }}</td>
                <td style="border:1px solid #555; background:#f0f0f0; font-weight:700; text-align:center; padding:6px 8px;">평균 진척률</td>
                <td style="border:1px solid #555; padding:6px 8px; text-align:center; font-weight:700;">{{ pdfStats.avgProgress }}%</td>
                <td style="border:1px solid #555; background:#f0f0f0; font-weight:700; text-align:center; padding:6px 8px;">총 인력</td>
                <td style="border:1px solid #555; padding:6px 8px; text-align:center; font-weight:700;">{{ pdfStats.totalWorkers }} 명</td>
              </tr>
              <tr>
                <td colspan="3" style="border:1px solid #555; padding:6px 8px; text-align:center;">준공 : {{ fmtDot(projectInfo.endDate) }}</td>
                <td style="border:1px solid #555; background:#f0f0f0; font-weight:700; text-align:center; padding:6px 8px;">진행 공정</td>
                <td style="border:1px solid #555; padding:6px 8px; text-align:center; font-weight:700;">{{ pdfStats.total }} 건</td>
                <td style="border:1px solid #555; background:#f0f0f0; font-weight:700; text-align:center; padding:6px 8px;">총 장비</td>
                <td style="border:1px solid #555; padding:6px 8px; text-align:center; font-weight:700;">{{ pdfStats.totalEquip }} 대</td>
              </tr>
            </table>

            <!-- ═══ 공정별 상세 ═══ -->
            <table v-for="(r, idx) in pdfReports" :key="r.id" style="width:100%; border-collapse:collapse; border:1.5px solid #000; margin-top:14px;">
              <!-- 공정 헤더 (검정 띠) -->
              <tr>
                <th colspan="6" style="background:#2a2a2a; color:white; text-align:left; font-weight:700; font-size:12px; letter-spacing:2px; padding:7px 12px; border:1px solid #2a2a2a;">
                  [{{ idx + 1 }}] {{ r.process }} 공사 / 위치 : {{ r.location || '위치 미지정' }}
                </th>
              </tr>

              <!-- 인력/장비/진척률 -->
              <tr>
                <th style="border:1px solid #555; background:#e8e8e8; font-weight:700; text-align:center; padding:6px 8px; width:14%;">공종</th>
                <th style="border:1px solid #555; background:#e8e8e8; font-weight:700; text-align:center; padding:6px 8px; width:24%;">작업 위치</th>
                <th style="border:1px solid #555; background:#e8e8e8; font-weight:700; text-align:center; padding:6px 8px; width:14%;">금일 인력</th>
                <th style="border:1px solid #555; background:#e8e8e8; font-weight:700; text-align:center; padding:6px 8px; width:14%;">투입 장비</th>
                <th style="border:1px solid #555; background:#e8e8e8; font-weight:700; text-align:center; padding:6px 8px; width:17%;">금일 진척률</th>
                <th style="border:1px solid #555; background:#e8e8e8; font-weight:700; text-align:center; padding:6px 8px; width:17%;">전체 진척률</th>
              </tr>
              <tr>
                <td style="border:1px solid #555; padding:6px 8px; text-align:center;">{{ r.process }}</td>
                <td style="border:1px solid #555; padding:6px 8px; text-align:center;">{{ r.location || '-' }}</td>
                <td style="border:1px solid #555; padding:6px 8px; text-align:center; font-weight:700;">{{ r.workers }} 명</td>
                <td style="border:1px solid #555; padding:6px 8px; text-align:center;">{{ r.equipmentCount }} 대</td>
                <td style="border:1px solid #555; padding:6px 8px; text-align:center; font-weight:700; font-size:13px;">{{ r.progress }}%</td>
                <td style="border:1px solid #555; padding:6px 8px; text-align:center; font-weight:700; font-size:13px;">{{ r.processProgress }}%</td>
              </tr>

              <!-- 금일 작업 헤더 -->
              <tr>
                <th colspan="6" style="border:1px solid #555; background:#d9d9d9; font-weight:700; text-align:center; font-size:12px; letter-spacing:8px; padding:7px;">
                  금 일 작 업 내 용
                </th>
              </tr>
              <!-- 금일 작업 내용 -->
              <tr>
                <td colspan="6" style="border:1px solid #555; padding:10px 12px; vertical-align:top; line-height:1.7; white-space:pre-wrap; height:80px; min-width:1px;">{{ r.todayWork || '-' }}</td>
              </tr>

              <!-- 특이사항 -->
              <tr>
                <td style="border:1px solid #555; background:#f0f0f0; font-weight:700; text-align:center; padding:6px 8px;">특이사항</td>
                <td colspan="5" style="border:1px solid #555; background:#fffaf0; padding:8px 12px; vertical-align:top; line-height:1.6; white-space:pre-wrap;">{{ r.notes || '특이사항 없음' }}</td>
              </tr>
            </table>

            <!-- 푸터 (문서 하단에 고정) -->
            <div style="margin-top:auto; padding-top:18px; border-top:1px solid #999; font-size:10px; color:#666; text-align:right;">
              출력일시 : {{ new Date().toLocaleString('ko-KR') }}
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══ 작업지시서 1건 PDF 렌더링 (화면 밖) ═══ -->
    <Teleport to="body">
      <div style="position: fixed; left: -9999px; top: 0; width: 794px; background: white;" aria-hidden="true">
        <div
          ref="singlePdfRef"
          v-if="singleWorkOrder"
          style="font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; padding: 30px 36px; background: white; color: #000; font-size: 11px; min-height: 1093px; display: flex; flex-direction: column; box-sizing: border-box;"
        >
          <!-- 상단: 제목 + 결재란 -->
          <div style="position:relative; height:100px; margin-bottom:10px;">
            <h1 style="text-align:center; font-size:26px; font-weight:800; letter-spacing:12px; margin:0; padding-top:30px; color:#000;">
              작 업 지 시 서
            </h1>
            <table style="position:absolute; top:0; right:0; border:1.5px solid #000; border-collapse:collapse;">
              <tr>
                <td rowspan="2" style="border:1px solid #000; background:#f0f0f0; font-weight:700; width:22px; padding:16px 4px; text-align:center; font-size:10px; line-height:1.4;">결<br><br>재</td>
                <td style="border:1px solid #000; background:#f0f0f0; font-weight:700; width:50px; height:18px; padding:4px 0; text-align:center; font-size:10px;">작성</td>
                <td style="border:1px solid #000; background:#f0f0f0; font-weight:700; width:50px; height:18px; padding:4px 0; text-align:center; font-size:10px;">검토</td>
                <td style="border:1px solid #000; background:#f0f0f0; font-weight:700; width:50px; height:18px; padding:4px 0; text-align:center; font-size:10px;">승인</td>
              </tr>
              <tr>
                <td style="border:1px solid #000; width:50px; height:50px;"></td>
                <td style="border:1px solid #000; width:50px; height:50px;"></td>
                <td style="border:1px solid #000; width:50px; height:50px;"></td>
              </tr>
            </table>
          </div>

          <!-- 기본 정보 테이블 -->
          <table style="width:100%; border-collapse:collapse; border:1.5px solid #000;">
            <tr>
              <td style="border:1px solid #555; background:#f0f0f0; font-weight:700; text-align:center; width:120px; padding:8px 10px;">현 장 명</td>
              <td style="border:1px solid #555; padding:8px 10px;">{{ projectInfo.name }}</td>
              <td style="border:1px solid #555; background:#f0f0f0; font-weight:700; text-align:center; width:120px; padding:8px 10px;">협력회사명</td>
              <td style="border:1px solid #555; padding:8px 10px;">{{ singleWorkOrder.partner }}</td>
            </tr>
            <tr>
              <td style="border:1px solid #555; background:#f0f0f0; font-weight:700; text-align:center; padding:8px 10px;">공 종</td>
              <td style="border:1px solid #555; padding:8px 10px;">{{ singleWorkOrder.process }}</td>
              <td style="border:1px solid #555; background:#f0f0f0; font-weight:700; text-align:center; padding:8px 10px;">처리기한</td>
              <td style="border:1px solid #555; padding:8px 10px;">{{ singleWorkOrder.dueDate || '즉시' }}</td>
            </tr>
            <tr>
              <td style="border:1px solid #555; background:#f0f0f0; font-weight:700; text-align:center; padding:8px 10px;">제 목</td>
              <td colspan="3" style="border:1px solid #555; padding:8px 10px; font-weight:600;">{{ singleWorkOrder.title }}</td>
            </tr>
          </table>

          <!-- 지시사항 -->
          <table style="width:100%; border-collapse:collapse; border:1.5px solid #000; margin-top:14px;">
            <tr>
              <th style="border:1px solid #555; background:#d9d9d9; font-weight:700; text-align:center; font-size:12px; letter-spacing:6px; padding:7px;">
                지 시 사 항
              </th>
            </tr>
            <tr>
              <td style="border:1px solid #555; padding:14px 14px; vertical-align:top; line-height:1.8; white-space:pre-wrap; min-height:180px;">{{ singleWorkOrder.workDetail || '-' }}</td>
            </tr>
          </table>

          <!-- 작업 상세 (시간/인력/안전/장비) -->
          <table style="width:100%; border-collapse:collapse; border:1.5px solid #000; margin-top:14px;">
            <tr>
              <td style="border:1px solid #555; background:#f0f0f0; font-weight:700; text-align:center; width:120px; padding:8px 10px;">작업 시간</td>
              <td style="border:1px solid #555; padding:8px 10px;">{{ singleWorkOrder.workTime || '-' }}</td>
              <td style="border:1px solid #555; background:#f0f0f0; font-weight:700; text-align:center; width:120px; padding:8px 10px;">투입 인력</td>
              <td style="border:1px solid #555; padding:8px 10px;">{{ singleWorkOrder.workerCount }} 명</td>
            </tr>
            <tr>
              <td style="border:1px solid #555; background:#f0f0f0; font-weight:700; text-align:center; padding:8px 10px;">작업 위치</td>
              <td colspan="3" style="border:1px solid #555; padding:8px 10px;">{{ singleWorkOrder.location || '-' }}</td>
            </tr>
            <tr>
              <td style="border:1px solid #555; background:#f0f0f0; font-weight:700; text-align:center; padding:8px 10px;">안전사항</td>
              <td colspan="3" style="border:1px solid #555; padding:8px 10px; vertical-align:top; line-height:1.7; white-space:pre-wrap;">{{ singleWorkOrder.safety || '-' }}</td>
            </tr>
          </table>

          <!-- 장비 현황 -->
          <table v-if="singleWorkOrder.equipments.length > 0" style="width:100%; border-collapse:collapse; border:1.5px solid #000; margin-top:14px;">
            <tr>
              <th colspan="3" style="border:1px solid #555; background:#d9d9d9; font-weight:700; text-align:center; font-size:12px; letter-spacing:6px; padding:7px;">
                투 입 장 비
              </th>
            </tr>
            <tr>
              <th style="border:1px solid #555; background:#e8e8e8; font-weight:700; text-align:center; padding:6px 8px; width:10%;">No.</th>
              <th style="border:1px solid #555; background:#e8e8e8; font-weight:700; text-align:center; padding:6px 8px;">장비명</th>
              <th style="border:1px solid #555; background:#e8e8e8; font-weight:700; text-align:center; padding:6px 8px; width:20%;">수량</th>
            </tr>
            <tr v-for="(eq, eqIdx) in singleWorkOrder.equipments" :key="eqIdx">
              <td style="border:1px solid #555; padding:6px 8px; text-align:center;">{{ eqIdx + 1 }}</td>
              <td style="border:1px solid #555; padding:6px 8px; text-align:center;">{{ eq.name }}</td>
              <td style="border:1px solid #555; padding:6px 8px; text-align:center;">{{ eq.count }} 대</td>
            </tr>
          </table>

          <!-- 서명란 -->
          <div style="margin-top:auto; padding-top:24px;">
            <p style="text-align:center; font-size:11px; margin-bottom:20px;">상기의 내용과 같이 지시합니다.</p>
            <div style="display:flex; justify-content:flex-end; gap:40px; font-size:11px;">
              <span>주식회사 ○○건설</span>
              <span>현장대리인 : ________________ (인)</span>
            </div>
          </div>

          <!-- 푸터 -->
          <div style="margin-top:18px; padding-top:12px; border-top:1px solid #999; font-size:10px; color:#666; text-align:right;">
            출력일시 : {{ new Date().toLocaleString('ko-KR') }}
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══ 공사일보 1건 PDF 렌더링 (화면 밖) ═══ -->
    <Teleport to="body">
      <div style="position: fixed; left: -9999px; top: 0; width: 794px; background: white;" aria-hidden="true">
        <div
          ref="singleReportPdfRef"
          v-if="singleReport"
          style="font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; padding: 30px 36px; background: white; color: #000; font-size: 11px; min-height: 1093px; display: flex; flex-direction: column; box-sizing: border-box;"
        >
          <!-- 상단 헤더 (제목 + 결재란) -->
          <div style="position:relative; height:90px; margin-bottom:10px;">
            <h1 style="text-align:center; font-size:26px; font-weight:800; letter-spacing:12px; margin:0; padding-top:30px; color:#000;">
              공 사 일 보
            </h1>
            <table style="position:absolute; top:0; right:0; border:1.5px solid #000; border-collapse:collapse;">
              <tr>
                <td rowspan="2" style="border:1px solid #000; background:#f0f0f0; font-weight:700; width:22px; padding:16px 4px; text-align:center; font-size:10px; line-height:1.4;">결<br><br>재</td>
                <td style="border:1px solid #000; background:#f0f0f0; font-weight:700; width:50px; height:18px; padding:4px 0; text-align:center; font-size:10px;">담당</td>
                <td style="border:1px solid #000; background:#f0f0f0; font-weight:700; width:50px; height:18px; padding:4px 0; text-align:center; font-size:10px;">검토</td>
                <td style="border:1px solid #000; background:#f0f0f0; font-weight:700; width:50px; height:18px; padding:4px 0; text-align:center; font-size:10px;">승인</td>
              </tr>
              <tr>
                <td style="border:1px solid #000; width:50px; height:50px;"></td>
                <td style="border:1px solid #000; width:50px; height:50px;"></td>
                <td style="border:1px solid #000; width:50px; height:50px;"></td>
              </tr>
            </table>
          </div>

          <!-- 공사 정보 헤더 -->
          <div style="display:table; width:100%; margin-bottom:14px; font-size:11px; clear:both;">
            <div style="display:table-cell;">
              <span style="font-weight:700; padding-right:6px;">■ 공사명 :</span>
              <span style="font-weight:600;">{{ projectInfo.name }}</span>
            </div>
            <div style="display:table-cell; text-align:right; white-space:nowrap;">
              <span style="font-weight:700; padding-right:6px;">■ 일자 :</span>
              <span style="font-weight:600;">{{ singleReport.date }}</span>
            </div>
          </div>

          <!-- 공정 상세 -->
          <table style="width:100%; border-collapse:collapse; border:1.5px solid #000;">
            <tr>
              <th colspan="6" style="background:#2a2a2a; color:white; text-align:left; font-weight:700; font-size:12px; letter-spacing:2px; padding:7px 12px; border:1px solid #2a2a2a;">
                {{ singleReport.process }} 공사 / 위치 : {{ singleReport.location || '위치 미지정' }}
              </th>
            </tr>
            <tr>
              <th style="border:1px solid #555; background:#e8e8e8; font-weight:700; text-align:center; padding:6px 8px; width:14%;">공종</th>
              <th style="border:1px solid #555; background:#e8e8e8; font-weight:700; text-align:center; padding:6px 8px; width:24%;">작업 위치</th>
              <th style="border:1px solid #555; background:#e8e8e8; font-weight:700; text-align:center; padding:6px 8px; width:14%;">금일 인력</th>
              <th style="border:1px solid #555; background:#e8e8e8; font-weight:700; text-align:center; padding:6px 8px; width:14%;">투입 장비</th>
              <th style="border:1px solid #555; background:#e8e8e8; font-weight:700; text-align:center; padding:6px 8px; width:17%;">금일 진척률</th>
              <th style="border:1px solid #555; background:#e8e8e8; font-weight:700; text-align:center; padding:6px 8px; width:17%;">전체 진척률</th>
            </tr>
            <tr>
              <td style="border:1px solid #555; padding:6px 8px; text-align:center;">{{ singleReport.process }}</td>
              <td style="border:1px solid #555; padding:6px 8px; text-align:center;">{{ singleReport.location || '-' }}</td>
              <td style="border:1px solid #555; padding:6px 8px; text-align:center; font-weight:700;">{{ singleReport.workers }} 명</td>
              <td style="border:1px solid #555; padding:6px 8px; text-align:center;">{{ singleReport.equipmentCount }} 대</td>
              <td style="border:1px solid #555; padding:6px 8px; text-align:center; font-weight:700; font-size:13px;">{{ singleReport.progress }}%</td>
              <td style="border:1px solid #555; padding:6px 8px; text-align:center; font-weight:700; font-size:13px;">{{ singleReport.processProgress }}%</td>
            </tr>
            <tr>
              <th colspan="6" style="border:1px solid #555; background:#d9d9d9; font-weight:700; text-align:center; font-size:12px; letter-spacing:8px; padding:7px;">
                금 일 작 업 내 용
              </th>
            </tr>
            <tr>
              <td colspan="6" style="border:1px solid #555; padding:10px 12px; vertical-align:top; line-height:1.7; white-space:pre-wrap; height:120px; min-width:1px;">{{ singleReport.todayWork || '-' }}</td>
            </tr>
            <tr>
              <td style="border:1px solid #555; background:#f0f0f0; font-weight:700; text-align:center; padding:6px 8px;">특이사항</td>
              <td colspan="5" style="border:1px solid #555; background:#fffaf0; padding:8px 12px; vertical-align:top; line-height:1.6; white-space:pre-wrap;">{{ singleReport.notes || '특이사항 없음' }}</td>
            </tr>
          </table>

          <!-- 푸터 -->
          <div style="margin-top:auto; padding-top:18px; border-top:1px solid #999; font-size:10px; color:#666; text-align:right;">
            출력일시 : {{ new Date().toLocaleString('ko-KR') }}
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══ PDF 생성 중 로딩 오버레이 ═══ -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isGeneratingSinglePdf"
          class="fixed inset-0 z-50 flex items-center justify-center bg-forena-900/30 backdrop-blur-[2px]"
        >
          <div class="flex flex-col items-center gap-3 rounded-2xl border border-forena-100 bg-white px-10 py-8 shadow-xl">
            <Loader2 class="h-8 w-8 animate-spin text-flare-500" />
            <p class="text-sm font-semibold text-forena-800">PDF 생성 중...</p>
            <p class="text-[11px] text-forena-400">잠시만 기다려주세요</p>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ═══ PDF 미리보기 모달 ═══ -->
    <Teleport to="body">
      <div
        v-if="showPdfPreview"
        class="fixed inset-0 z-50 flex items-center justify-center bg-forena-900/40 backdrop-blur-[2px] p-4"
        @click.self="closePdfPreview"
      >
        <div class="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-forena-100 bg-white shadow-2xl">

          <!-- 헤더 -->
          <div class="flex items-center justify-between border-b border-forena-100 bg-forena-50/50 px-5 py-3">
            <div class="flex items-center gap-2.5">
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-flare-50">
                <Eye class="h-4 w-4 text-flare-600" />
              </div>
              <div>
                <h2 class="text-base font-bold text-forena-900">PDF 미리보기</h2>
                <p class="text-[11px] text-forena-500">{{ pdfFileName }}</p>
              </div>
            </div>
            <button
              type="button"
              class="rounded-lg border border-forena-200 bg-white p-1.5 text-forena-400 transition hover:text-forena-700"
              @click="closePdfPreview"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- 본문: PDF iframe -->
          <div class="flex-1 overflow-hidden bg-forena-50">
            <iframe
              v-if="pdfPreviewUrl"
              :src="pdfPreviewUrl"
              class="h-full w-full border-0"
              title="PDF 미리보기"
            />
          </div>

          <!-- 푸터 -->
          <div class="flex items-center justify-between border-t border-forena-100 bg-forena-50/40 px-5 py-3">
            <!-- 왼쪽: 원본 페이지 링크 (작업지시서/공사일보일 때만 표시) -->
            <button
              v-if="pdfPageLink"
              type="button"
              class="inline-flex items-center gap-1 text-xs text-forena-500 transition hover:text-forena-700"
              @click="goToOriginalPage"
            >
              <ExternalLink class="h-3.5 w-3.5" />
              원본 페이지에서 보기
            </button>
            <span v-else></span>

            <!-- 오른쪽: 닫기 + 다운로드 -->
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-lg border border-forena-200 bg-white px-4 py-2 text-xs font-semibold text-forena-700 hover:bg-forena-50"
                @click="closePdfPreview"
              >
                닫기
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg bg-flare-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-flare-600"
                @click="downloadPdfFromPreview"
              >
                <Download class="h-3.5 w-3.5" />
                다운로드
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══ 업로드 Drawer ═══ -->
    <Teleport to="body">
      <div
        v-if="showUploadDrawer"
        class="fixed inset-0 z-50 flex justify-end bg-forena-900/20 backdrop-blur-[2px]"
        @click.self="showUploadDrawer = false"
      >
        <aside
          class="flex h-full w-full max-w-md flex-col border-l border-forena-100 bg-white shadow-2xl animate-[drawerIn_0.25s_ease-out]"
          @click.stop
        >
          <div class="flex items-center justify-between border-b border-forena-100 bg-forena-50/50 px-5 py-4">
            <h2 class="text-lg font-bold text-forena-900">{{ L.drawerTitle }}</h2>
            <button
              type="button"
              class="rounded-lg border border-forena-200 bg-white p-2 text-forena-400 transition hover:text-forena-700"
              @click="showUploadDrawer = false"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="scrollbar-hide flex-1 space-y-5 overflow-y-auto p-6 text-sm">
            <!-- 파일 드롭존 -->
            <div
              class="relative rounded-xl border-2 border-dashed border-forena-200 p-6 text-center transition hover:border-flare-400/60"
              @dragover.prevent
              @drop="handleFileDrop"
            >
              <input
                type="file"
                class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                accept=".pdf,.xlsx,.xls,.docx,.hwp,.hwpx"
                @change="handleFileChange"
              />
              <template v-if="!newDoc.fileName">
                <Upload class="mx-auto mb-2 h-8 w-8 text-flare-600" />
                <p class="font-bold text-forena-900">{{ L.labelFile }}</p>
                <p class="mt-1 text-[11px] text-slate-500">{{ L.fileHint }}</p>
                <p class="mt-1 text-[10px] font-medium text-slate-400">{{ L.fileFormats }}</p>
              </template>
              <template v-else>
                <div class="flex items-center justify-center gap-2">
                  <span
                    class="flex h-8 w-8 items-center justify-center rounded-lg"
                    :class="fileIconColor(newDoc.fileName.split('.').pop())"
                  >
                    <component :is="fileIcon(newDoc.fileName.split('.').pop())" class="h-4 w-4" />
                  </span>
                  <div class="text-left">
                    <p class="text-sm font-semibold text-forena-900">{{ newDoc.fileName }}</p>
                    <p class="text-[10px] text-slate-400">파일 선택 완료 — 다시 클릭하여 변경</p>
                  </div>
                </div>
              </template>
            </div>

            <!-- 문서 유형 -->
            <div>
              <label class="mb-1.5 block text-[11px] font-bold text-forena-500">{{ L.labelDocType }}</label>
              <select
                v-model="newDoc.docType"
                class="w-full rounded-xl border border-forena-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-flare-400 focus:ring-2 focus:ring-flare-400/20"
                @change="onDocTypeChange"
              >
                <option value="" disabled>문서 유형을 선택하세요</option>
                <option v-for="dt in docTypes" :key="dt" :value="dt">{{ dt }}</option>
              </select>
            </div>

            <!-- 작성 주체 -->
            <div>
              <label class="mb-1.5 block text-[11px] font-bold text-forena-500">{{ L.labelOrigin }}</label>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold transition"
                  :class="
                    newDoc.origin === 'hq'
                      ? 'border-forena-500 bg-forena-500 text-white shadow-sm'
                      : 'border-forena-200 text-slate-600 hover:border-forena-300 hover:bg-forena-50'
                  "
                  @click="newDoc.origin = 'hq'; newDoc.partnerName = ''"
                >
                  <div class="flex items-center justify-center gap-1.5">
                    <Building2 class="h-3.5 w-3.5" />
                    {{ L.originHq }}
                  </div>
                </button>
                <button
                  type="button"
                  class="flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold transition"
                  :class="
                    newDoc.origin === 'partner'
                      ? 'border-flare-500 bg-flare-500 text-white shadow-sm'
                      : 'border-forena-200 text-slate-600 hover:border-flare-300 hover:bg-flare-50'
                  "
                  @click="newDoc.origin = 'partner'"
                >
                  <div class="flex items-center justify-center gap-1.5">
                    <Handshake class="h-3.5 w-3.5" />
                    {{ L.originPartner }}
                  </div>
                </button>
              </div>
            </div>

            <!-- 협력사 선택 -->
            <div v-if="newDoc.origin === 'partner'">
              <label class="mb-1.5 block text-[11px] font-bold text-forena-500">{{ L.labelPartnerName }}</label>
              <select
                v-model="newDoc.partnerName"
                class="w-full rounded-xl border border-forena-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-flare-400 focus:ring-2 focus:ring-flare-400/20"
              >
                <option value="" disabled>{{ L.labelPartnerSelect }}</option>
                <option v-for="pn in partnerList" :key="pn" :value="pn">{{ pn }}</option>
              </select>
            </div>

            <!-- 버전 + 비고 -->
            <div>
              <div>
                <label class="mb-1.5 block text-[11px] font-bold text-forena-500">{{ L.labelMemo }}</label>
                <input
                  v-model="newDoc.memo"
                  type="text"
                  placeholder="비고 입력"
                  class="w-full rounded-xl border border-forena-200 px-3 py-2.5 text-sm outline-none focus:border-flare-400 focus:ring-2 focus:ring-flare-400/20"
                />
              </div>
            </div>

            <!-- 제출 -->
            <button
              type="button"
              :disabled="isSubmitting"
              class="w-full rounded-xl bg-gradient-to-r from-forena-700 to-forena-900 py-3 text-sm font-bold text-white shadow-md transition hover:from-forena-800 hover:to-forena-950 disabled:opacity-60"
              @click="submitUpload"
            >
              <span v-if="!isSubmitting">{{ L.submit }}</span>
              <Loader2 v-else class="mx-auto h-4 w-4 animate-spin" />
            </button>
          </div>
        </aside>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@keyframes drawerIn {
  from {
    transform: translateX(100%);
    opacity: 0.96;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
