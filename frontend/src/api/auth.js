import api from './index.js'

const AUTH = '/auth'
const ADMIN_ACCOUNTS = '/admin/accounts'

/**
 * 로그인 — AuthController POST /auth/login
 * @param {{
 *   loginId: string,
 *   password: string,
 *   loginMode?: 'SITE'|'ADMIN',
 * }} body
 *  - {@code loginMode} 가 있으면 백엔드에서 탭(현장/관리자) ↔ 계정 권한 일치를 검증한다.
 *  - 현장 계정은 본인 배정 현장으로 자동 진입하며, 본사·관리자는 어떤 현장이든 접근 가능하다.
 *    선택한 현장은 프론트 라우팅 쿼리에서만 사용한다.
 * @returns {Promise<{ accessToken: string, userIdx: number, projectId?: number|null, name: string, role: string, siteCode?: string|null, trade?: string|null }>}
 */
export async function postAuthLogin(body) {
  return await api.post(`${AUTH}/login`, body)
}

/**
 * 로그인 사용자 본인 비밀번호 변경 — PUT /auth/password (Bearer 필수)
 * 백엔드 DTO 필드명이 다르면 이 모듈만 맞춰 주세요.
 * @param {{ currentPassword: string, newPassword: string }} body
 */
export async function putAuthPassword(body) {
  return await api.put(`${AUTH}/password`, body)
}

/**
 * 계정 생성 요청 제출 — AccountRequestController POST /account-requests (인증 필요)
 * @param {{
 *   requestedName: string,
 *   requestedLoginId: string,
 *   requestedRole: string,
 *   siteCode?: string,
 *   trade?: string,
 * }} body
 */
export async function postAccountRequest(body) {
  return await api.post('/account-requests', body)
}

/** @returns {Promise<unknown[]>} */
export async function getAdminAccounts() {
  return await api.get(ADMIN_ACCOUNTS)
}

/** @param {number|string} idx */
export async function getAdminAccount(idx) {
  return await api.get(`${ADMIN_ACCOUNTS}/${idx}`)
}

/** @param {Record<string, unknown>} body */
export async function postAdminAccount(body) {
  return await api.post(ADMIN_ACCOUNTS, body)
}

/** @param {number|string} idx @param {Record<string, unknown>} body */
export async function putAdminAccount(idx, body) {
  return await api.put(`${ADMIN_ACCOUNTS}/${idx}`, body)
}

/** @param {number|string} idx */
export async function deleteAdminAccount(idx) {
  return await api.delete(`${ADMIN_ACCOUNTS}/${idx}`)
}

/**
 * [ADMIN] 요청 목록 — GET /admin/account-requests?status=
 * @param {string} [status] PENDING | APPROVED | REJECTED
 */
export async function getAdminAccountRequests(status) {
  const params = {}
  if (status) params.status = status
  return await api.get('/admin/account-requests', { params })
}

/**
 * [ADMIN] 요청 승인 — PUT /admin/account-requests/{idx}/approve
 * body 생략 또는 빈 객체 시 서버가 임시 비밀번호 자동 생성. initialPassword는 8자 이상일 때만 전송 권장.
 * @param {number|string} idx
 * @param {{ initialPassword?: string }} [body]
 */
export async function approveAccountRequest(idx, body = {}) {
  return await api.put(`/admin/account-requests/${idx}/approve`, body)
}

/** @param {number|string} idx @param {{ note?: string }} [body] */
export async function rejectAccountRequest(idx, body) {
  return await api.put(`/admin/account-requests/${idx}/reject`, body ?? {})
}

/**
 * 이메일 사용 가능 여부 확인 — true 면 사용 가능, false 면 중복.
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export async function checkEmailAvailability(email) {
  return await api.get(`${ADMIN_ACCOUNTS}/check-email`, { params: { email } })
}
