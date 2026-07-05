import { USER_ROLE } from '@/stores/authStore'

export function parseProjectLabel(name) {
  const s = String(name || '').trim()
  const m = /^\s*\[(?<code>[^\]]+)\]\s*(?<rest>.+)$/.exec(s)
  if (m?.groups) {
    const title = m.groups.rest.trim()
    return { code: m.groups.code.trim(), title, displayName: title }
  }
  return { code: '', title: s, displayName: s }
}

export function projectOptionLabel(p) {
  const { code, title } = parseProjectLabel(p.name)
  if (code && title) return `[${code}] ${title}`
  return String(p.name || '').trim() || `#${p.idx}`
}

export function rowRoleStr(acc) {
  const r = acc?.role
  if (r && typeof r === 'object' && r !== null && 'name' in r) {
    return String(r.name || '')
  }
  return String(r || '')
}

export function classify(acc) {
  const rs = rowRoleStr(acc)
  if (rs === 'ADMIN') return 'system'
  if (rs === 'HEADQUARTOR') return 'hq'
  return 'field'
}

export function workerAffiliationKind(acc) {
  const raw = acc?.affiliationType ?? acc?.affiliation ?? acc?.workerType ?? acc?.orgType
  if (raw != null && String(raw).trim() !== '') {
    const s = String(raw).toUpperCase()
    if (
      s.includes('PARTNER') ||
      s.includes('VENDOR') ||
      s.includes('협력') ||
      s === 'SUBCONTRACTOR'
    ) {
      return 'partner'
    }
    if (s.includes('HQ') || s.includes('직영') || s === 'INTERNAL' || s === 'DIRECT') {
      return 'hq'
    }
  }
  const r = rowRoleStr(acc)
  if (r === USER_ROLE.SECTION_LEADER || r === USER_ROLE.SECTION_SUPERVISOR) return 'partner'
  return 'hq'
}

export function isSiteDirectorAccount(acc) {
  return rowRoleStr(acc) === USER_ROLE.SITE_DIRECTOR
}

export function statusLabel(raw) {
  const s = String(raw ?? '').toUpperCase()
  if (s === 'PENDING') return '대기'
  if (s === 'APPROVED') return '승인'
  if (s === 'REJECTED') return '거절'
  return raw || '—'
}

export function isPendingRequest(row) {
  return String(row?.status ?? '').toUpperCase() === 'PENDING'
}

export function requestRowRequestedRoleStr(rq) {
  return String(rq?.requestedRole ?? rq?.role ?? '').trim()
}

export function requestRowRoleStr(rq) {
  return String(rq?.requesterRole ?? rq?.role ?? '').trim()
}

export function requestRowTitle(rq) {
  const t = String(rq?.title ?? rq?.requestTitle ?? '').trim()
  if (t) return t
  const loginId = rq?.requestedLoginId ?? rq?.loginId
  if (loginId) return `계정 생성 요청 (${loginId})`
  return '계정·권한 요청'
}

export function requestRowDetailText(rq) {
  const parts = []
  const note = String(rq?.note ?? rq?.body ?? rq?.summary ?? '').trim()
  if (note) parts.push(note)
  const rejectNote = String(rq?.rejectNote ?? rq?.rejectionReason ?? '').trim()
  if (rejectNote) parts.push(`거절 사유: ${rejectNote}`)
  return parts.join('\n') || '—'
}

export function formatReqDate(row) {
  const d = row?.requestedAt ?? row?.createdAt ?? row?.requestDate
  if (!d) return '—'
  try {
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return String(d)
    return dt.toLocaleString('ko-KR')
  } catch {
    return String(d)
  }
}

export function reqRowKey(rq) {
  if (rq?.demo && rq?.demoKey) return `demo:${rq.demoKey}`
  const id = rq?.idx ?? rq?.id
  return id != null ? `req:${id}` : ''
}

export function accountUpdatePayload(row, overrides = {}) {
  const r = rowRoleStr(row)
  return {
    name: String(row?.name || '').trim(),
    phone:
      row?.phone != null && String(row.phone).trim() !== '' ? String(row.phone).trim() : undefined,
    email:
      row?.email != null && String(row.email).trim() !== '' ? String(row.email).trim() : undefined,
    role: r,
    siteCode: String(row?.siteCode || '').trim() || undefined,
    trade: String(row?.trade || '').trim() || undefined,
    active: Boolean(row?.active),
    ...overrides,
  }
}
