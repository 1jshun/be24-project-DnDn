import api from './index.js'

const PATH = '/work-plan'
const WRITE_TIMEOUT_MS = 60000
const UPLOAD_TIMEOUT_MS = 300000

const normalizeStatus = (status) => {
  if (!status) return '진행 예정'
  if (status === '계획') return '진행 예정'
  if (status === '검토 중') return '진행 예정'
  if (status === '확정') return '진행 예정'
  return status
}

/**
 * 백엔드 WorkPlanDto.Res / workPlanRes → 프론트 plan 객체
 */
const toPlan = (dto) => {
  if (!dto) return null

  const normalizeStringList = (arr) => {
    if (!Array.isArray(arr)) return []
    return arr
      .map((it) => (typeof it === 'string' ? it : it?.description))
      .filter((s) => s != null && s !== '')
  }

  const weeklyInfo = dto.weeklyInfo || dto.weeklyPlan || dto.weekPlan || {}

  return {
    id: dto.idx,
    tradeProcessId: dto.tradeProcessId ?? dto.trade_process_id ?? dto.tradeProcess?.idx ?? null,

    tradeProcessName: dto.tradeProcessName ?? dto.trade_process_name ?? null,
    tradeProcessTradeName:
      dto.tradeProcessTradeName ??
      dto.trade_process_trade_name ??
      dto.tradeProcess?.tradeName ??
      null,
    parentWorkPlanId:
      dto.parentWorkPlanId ?? dto.parent_work_plan_id ?? dto.parentWorkPlan?.idx ?? null,

    parentWorkPlanName: dto.parentWorkPlanName ?? dto.parent_work_plan_name ?? null,
    name: dto.name,
    trade: dto.trade,
    location: dto.location,
    planType: dto.planType,
    status: normalizeStatus(dto.status),
    start: dto.startDate,
    end: dto.endDate,
    actualStart: dto.actualStart || null,
    effectiveEnd: dto.effectiveEnd || dto.endDate || null,
    actualPct:
      dto.actualPct ??
      dto.actualProgressPct ??
      dto.monthlyProgressPct ??
      dto.actualProgress ??
      null,
    progressPct: dto.progressPct ?? dto.progress ?? dto.actualProgressPct ?? null,
    processProgress: dto.processProgress ?? dto.actualProgressPct ?? null,
    requiredCount: dto.requiredCount ?? 0,
    workers: normalizeStringList(dto.workers),
    equipment: normalizeStringList(dto.equipment),
    workersDisplay: dto.workersDisplay ?? dto.workers_display ?? '',
    equipmentDisplay: dto.equipmentDisplay ?? dto.equipment_display ?? '',
    partner: dto.partner || dto.partnerName || dto.partnerCompany || weeklyInfo.partner || '',
    manager: dto.manager || dto.managerName || dto.managerNm || weeklyInfo.manager || '',
    contact: dto.contact || dto.contactPhone || dto.managerContact || weeklyInfo.contact || '',
    weekStart: dto.weekStart || dto.weekStartDate || dto.startOfWeek || weeklyInfo.weekStart || '',
    note: dto.note || '',
    extension: dto.extension
      ? {
          extendedEnd: dto.extension.extendedEnd,
          addedDays: dto.extension.addedDays,
          reason: dto.extension.reason,
          decidedAt: dto.extension.decidedAt,
        }
      : null,
  }
}

/**
 * 프론트 plan 객체 → 백엔드 Req
 */
const toReq = (plan) => ({
  // ── 1단계 추가 ────────────────────────────────────────────────────────────
  tradeProcessId: plan.tradeProcessId || null,
  // ──────────────────────────────────────────────────────────────────────────
  name: plan.name,
  trade: plan.trade,
  parentWorkPlanId: plan.parentWorkPlanId || null,
  location: plan.location,
  planType: plan.planType,
  status: normalizeStatus(plan.status),
  startDate: plan.start,
  endDate: plan.end,
  requiredCount: plan.requiredCount,
  partner: plan.partner,
  manager: plan.manager,
  contact: plan.contact,
  weekStart: plan.weekStart,
  note: plan.note,
  workers: Array.isArray(plan.workers) ? plan.workers : [],
  equipment: Array.isArray(plan.equipment) ? plan.equipment : [],
})

/**
 * 작업 계획 등록
 * POST /work-plan
 */
export const createWorkPlan = (plan) => {
  return api.post(PATH, toReq(plan), { timeout: WRITE_TIMEOUT_MS })
}

export const createWorkPlans = (plans) => {
  return api.post(`${PATH}/bulk`, plans.map(toReq), { timeout: WRITE_TIMEOUT_MS })
}

const toUploadExtractRow = (dto, index) => ({
  id: dto.id ?? `${dto.tradeProcessId ?? 'unmatched'}-${index}`,
  tradeProcessId: dto.tradeProcessId ?? dto.trade_process_id ?? null,
  tradeProcessName: dto.tradeProcessName ?? dto.trade_process_name ?? '',
  tradeProcessTradeName: dto.tradeProcessTradeName ?? dto.trade_process_trade_name ?? '',
  name: dto.name ?? dto.tradeProcessName ?? '',
  trade: dto.trade ?? '',
  location: dto.location ?? '',
  planType: dto.planType ?? '',
  start: dto.startDate ?? dto.start ?? '',
  end: dto.endDate ?? dto.end ?? '',
  note: dto.note ?? '',
  issue: dto.issue ?? null,
})

export const extractWorkPlanUpload = async ({ projectId, planType, trade, year, month, file }) => {
  const formData = new FormData()
  formData.append('projectId', projectId)
  formData.append('planType', planType)
  if (trade) formData.append('trade', trade)
  if (year != null && year !== '') formData.append('year', year)
  if (month != null && month !== '') formData.append('month', month)
  formData.append('file', file)

  const rows = await api.post(`${PATH}/upload`, formData, {
    timeout: UPLOAD_TIMEOUT_MS,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return Array.isArray(rows) ? rows.map(toUploadExtractRow) : []
}

/**
 * 작업 계획 단일 조회
 * GET /work-plan/{planId}
 */
export const fetchWorkPlan = async (planId) => {
  const dto = await api.get(`${PATH}/${planId}`)
  return toPlan(dto)
}

/**
 * 작업 계획 목록 조회
 * GET /work-plan?planType=&trade=&status=
 *
 * @param {Object} params
 * @param {string} params.planType - "연간" | "월간" | "주간" (기본 "월간")
 * @param {string} [params.trade]  - 공종 라벨
 * @param {string} [params.status] - 상태 라벨
 */
export const fetchWorkPlanList = async (params = {}) => {
  const dtos = await api.get(PATH, { params })
  return Array.isArray(dtos) ? dtos.map(toPlan) : []
}

/**
 * 작업 계획 정보 수정
 * PUT /work-plan/{planId}
 */
export const updateWorkPlan = (planId, plan) => {
  return api.put(`${PATH}/${planId}`, toReq(plan))
}

/**
 * 일정 연장 등록/수정
 * PUT /work-plan/{planId}/extension
 *
 * @param {Object} payload
 * @param {string} payload.extendedEnd - 연장 종료일 (yyyy-MM-dd)
 * @param {number} [payload.addedDays] - 연장 일수 (없으면 서버가 자동 계산)
 * @param {string} [payload.reason]    - 연장 사유
 */
export const extendWorkPlan = (planId, payload) => {
  return api.put(`${PATH}/${planId}/extension`, payload)
}

/**
 * 주간 계획서 일괄 제출
 * POST /work-plan/weekly
 *
 * @param {Object} payload
 * @param {string} payload.partner   - 협력사명
 * @param {string} payload.manager   - 담당자명
 * @param {string} [payload.contact] - 연락처
 * @param {string} payload.weekStart - 주 시작일 (yyyy-MM-dd)
 * @param {Array}  payload.items     - [{date, processName, zone, workers, equipment, note?}]
 */
export const submitWeeklyWorkPlan = (payload) => {
  return api.post(`${PATH}/weekly`, payload, { timeout: WRITE_TIMEOUT_MS })
}

/**
 * 작업 착수 처리 (실제 시작일 기록)
 * PUT /work-plan/{planId}/start
 */
export const startWorkPlan = (planId) => {
  return api.put(`${PATH}/${planId}/start`)
}

/**
 * 작업 계획 삭제
 * DELETE /work-plan/{planId}
 */
export const deleteWorkPlan = (planId) => {
  return api.delete(`${PATH}/${planId}`)
}

export const fetchWorkPlansByProject = async (projectId, options = {}) => {
  const params = {}
  if (options.includeAllTrades) params.includeAllTrades = true
  const dtos = await api.get(`${PATH}/project/${projectId}`, { params })
  return Array.isArray(dtos) ? dtos.map(toPlan) : []
}
