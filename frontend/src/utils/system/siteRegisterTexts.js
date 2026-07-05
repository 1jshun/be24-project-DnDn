import { USER_ROLE } from '@/stores/authStore'

export const SITE_REGISTER_TEXTS = {
  kicker: '시스템 관리',
  title: '계정 및 권한 관리',
  sectionAccountHub: '본사 계정 현황',
  grpSystem: '시스템 관리자',
  grpHQ: '본사',
  sectionSites: '현장 목록',
  reload: '목록 새로고침',
  reloadBusy: '불러오는 중…',
  registerSite: '신규 현장 등록',
  colProjectStatus: '상태',
  modalEditSite: '현장 정보 수정',
  colCode: '현장 코드',
  colSiteDisplayName: '현장 명',
  colHubAccountName: '계정 명',
  colDirectorName: '현장 총 책임자',
  colDirectorPhone: '총 책임자 휴대폰',
  colAddress: '현장 주소',
  empty: '등록된 현장이 없습니다.',
  saveRegister: '등록',
  saveAccount: '저장',
  modalTitle: '신규 현장 등록',
  fieldCode: '현장 코드',
  fieldName: '현장 명',
  fieldAddress: '현장 주소',
  fieldStart: '시작일',
  fieldEnd: '종료일',
  cancel: '취소',
  codePh: '예: GN-A',
  namePh: '현장 표시명',
  addrPh: '도로명 또는 지번 주소',
  colLoginId: '로그인 ID',
  colPhone: '휴대폰',
  colEmail: '이메일',
  colRole: '권한',
  colTrade: '공종',
  colStatus: '상태',
  colActions: '관리',
  active: '사용 중',
  inactive: '비활성',
  edit: '수정',
  activate: '활성',
  del: '비활성',
  modalEdit: '계정 수정',
  loginIdRo: '로그인 ID는 수정할 수 없습니다.',
  rolePickHint: '권한 선택',
  phone: '휴대폰 번호',
  email: '이메일',
  lblAccountName: '계정명',
  pwdEditSectionTitle: '비밀번호 수정',
  pwdResetMail: '비밀번호 초기화',
  pwdResetMailAlert:
    '등록된 이메일로 비밀번호 재설정 메일을 발송했습니다.\n메일함을 확인해 주세요.',
}

export const ROLE_OPTIONS_HUB = [
  { value: USER_ROLE.ADMIN, label: '시스템 관리자' },
  { value: USER_ROLE.HEADQUARTOR, label: '본사' },
]

export const SITE_REGISTER_ACCOUNT_STATUS_THEAD_CLASS =
  'border-b border-violet-200/70 bg-violet-100/45 text-xs font-bold text-violet-950'

/** @param {Record<string, unknown>} p */
export function projectSiteStatusLabel(p) {
  return p.active === false ? '운영 종료' : '운영 중'
}
