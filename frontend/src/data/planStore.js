// ──────────────────────────────────────────
// 공정 분석 ↔ 작업 계획 간 공유 상태 (경량 reactive store)
//   - AI 추천을 승인하면 일정 연장 정보가 여기에 쌓이고
//   - PlanView는 이 store를 읽어서 간트차트/달력에 초록 라인을 그린다
// ──────────────────────────────────────────
import { reactive } from 'vue'

/**
 * extensions: { [workPlanId]: { extendedEnd, addedDays, reason, decidedAt, action } }
 *   - workPlanId : workPlans 의 id
 *   - extendedEnd: 연장된 새 종료일 (YYYY-MM-DD)
 *   - addedDays  : 늘어난 일 수
 *   - reason     : AI 권고 요약
 *   - decidedAt  : 승인 시각 (HH:mm)
 *   - action     : 'extend' (일정 연장) | 'reinforce' (인력 보강) | 'both'
 */
export const planStore = reactive({
  extensions: {},
})

/**
 * 작업의 일정을 연장한다.
 * @param {number} workPlanId
 * @param {string} originalEnd - 원래 종료일 (YYYY-MM-DD)
 * @param {number} addedDays   - 추가할 일 수
 * @param {object} meta        - { reason, action }
 */
export function extendPlan(workPlanId, originalEnd, addedDays, meta = {}) {
  if (!workPlanId || !originalEnd || !addedDays) return
  const d = new Date(originalEnd)
  d.setDate(d.getDate() + addedDays)
  const extendedEnd = d.toISOString().slice(0, 10)
  planStore.extensions[workPlanId] = {
    extendedEnd,
    addedDays,
    reason: meta.reason ?? '',
    action: meta.action ?? 'extend',
    decidedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
  }
}

/** 연장 취소 (반려/되돌리기 시) */
export function clearExtension(workPlanId) {
  if (planStore.extensions[workPlanId]) {
    delete planStore.extensions[workPlanId]
  }
}

/** 특정 작업의 연장 정보 조회 */
export function getExtension(workPlanId) {
  return planStore.extensions[workPlanId] ?? null
}