/**
 * 백엔드 TradeProcessDto.Res[] → 프론트 간트 데이터 매핑
 *
 * src/utils/ganttParser.js 의 parseFromApi() 와 같은 task / milestone /
 * projectInfo 형태로 만들어 ScheduleChartView.vue 가 그대로 받아 쓸 수 있게 한다.
 *
 * 이 파일은 ganttParser.js 와 함께 src/utils/ 에 둔다.
 *
 * ───── 매핑 정책 ─────────────────────────────────────────────
 * 1. isMilestone=true 인 행은 task 배열에서 제외한다.
 *    → 좌측 공정 목록과 간트 막대에는 안 나타나고, 오직 마름모로만 표시.
 * 2. 마일스톤의 group 은 실제 공종으로 잡는다.
 *    - tradeName 이 "마일스톤", "주요 마일스톤" 등 일반 라벨이면
 *      동일 날짜 또는 가장 가까운 일반 task 의 group 을 찾아 매핑.
 *    - 그 외에는 tradeName 을 그대로 사용.
 * 3. 보할(weightPct)은 소수점 둘째자리까지 반올림해 표시한다.
 *    weightSum 도 마찬가지.
 * 4. id 는 DB PK(idx) 를 그대로 유지한다.
 *    (PUT /trade-process/{tpId} 에 필요)
 * 5. task 의 isCritical 은 일단 false 로 둔다.
 *    isMilestone 과 분리 — CP 계산 로직은 추후 별도 추가.
 */

const DEFAULT_CONFIDENCE = 100

// "마일스톤성 라벨" — 백엔드 tradeName 이 이런 값으로 오면 실제 공종이 아님으로 간주
const GENERIC_MILESTONE_LABELS = new Set([
  '마일스톤',
  '주요 마일스톤',
  '주요마일스톤',
  '핵심 마일스톤',
  '핵심마일스톤',
  '이벤트',
  '주요 일정',
  'milestone',
  'Milestone',
  'MILESTONE',
])

function toIsoDate(value) {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)
  return null
}

function calcDurDays(start, end) {
  if (!start || !end) return 0
  const ms = new Date(end) - new Date(start)
  if (Number.isNaN(ms)) return 0
  return Math.round(ms / 86400000) + 1
}

function round2(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0
  return Math.round(n * 100) / 100
}

function isGenericMilestoneLabel(name) {
  if (!name) return true // 비어있으면 일반 라벨로 간주
  return GENERIC_MILESTONE_LABELS.has(String(name).trim())
}

export function isMilestoneLikeTradeName(name) {
  if (!name) return false
  return isGenericMilestoneLabel(name)
}

export function isMilestoneScheduleRow(row) {
  return !!row?.isMilestone || isMilestoneLikeTradeName(row?.tradeName)
}

/**
 * 단일 TradeProcessDto.Res 한 건을 task 로 변환.
 * isMilestone=true 인 행은 호출 측에서 걸러내므로 여기선 그대로 변환.
 */
export function mapRowToTask(row) {
  const start = toIsoDate(row.plannedStart)
  const end = toIsoDate(row.plannedEnd)
  const group = row.tradeName ?? '미분류'
  const weight = round2(typeof row.weightPct === 'number' ? row.weightPct : 0)

  return {
    id: row.idx,
    checked: false,
    group,
    sub: group,
    name: row.processName ?? '(이름 없음)',
    start,
    end,
    baselineStart: start,
    baselineEnd: end,
    durDays: calcDurDays(start, end),
    prev: '',
    next: '',
    isCritical: false, // CP 계산 별도 로직 추가 시 갱신
    weight,
    confidence: DEFAULT_CONFIDENCE,
    reviewStatus: '미검토',
    location: '',
    responsible: row.partnerCompany ?? '',
    requiredCount: 0,
    equipment: [],
    memo: '',
    sourceDocId: row.masterScheduleId ?? null,
    _src: {
      idx: row.idx,
      masterScheduleId: row.masterScheduleId,
      tradeName: row.tradeName,
      processName: row.processName,
      partnerCompany: row.partnerCompany ?? null,
      plannedStart: start,
      plannedEnd: end,
      weightPct: typeof row.weightPct === 'number' ? row.weightPct : null,
      isMilestone: !!row.isMilestone,
    },
  }
}

function resolveMilestoneGroup(row, tasks) {
  const raw = row.tradeName
  const processName = row.processName ?? ''

  // 1. tradeName이 실제 공종이면 그대로 사용
  if (!isGenericMilestoneLabel(raw)) return raw

  // 2. "토공사 완료", "골조공사 완료" 같은 이름이면
  //    processName에서 공종명을 추출해서 해당 group에 붙임
  const completeMatch = processName.match(/^(.+?)\s*완료$/)
  if (completeMatch) {
    const groupName = completeMatch[1].trim()

    const exists = tasks.some((t) => t.group === groupName)
    if (exists) {
      return groupName
    }
  }

  if (!tasks.length) return '미분류'

  const target = toIsoDate(row.plannedEnd) ?? toIsoDate(row.plannedStart)
  if (!target) return tasks[0].group

  const targetMs = new Date(target).getTime()
  let bestGroup = tasks[0].group
  let bestDist = Infinity

  for (const t of tasks) {
    if (!t.start || !t.end) continue

    const sMs = new Date(t.start).getTime()
    const eMs = new Date(t.end).getTime()

    if (targetMs >= sMs && targetMs <= eMs) {
      return t.group
    }

    const dist = Math.min(Math.abs(targetMs - sMs), Math.abs(targetMs - eMs))
    if (dist < bestDist) {
      bestDist = dist
      bestGroup = t.group
    }
  }

  return bestGroup
}

/**
 * 마일스톤 행을 마일스톤 객체로 변환.
 * group 은 resolveMilestoneGroup 으로 실제 공종에 매핑.
 */
function rowToMilestone(row, autoId, tasks) {
  return {
    id: autoId,
    name: row.processName ?? '(이름 없음)',
    date: toIsoDate(row.plannedEnd) ?? toIsoDate(row.plannedStart),
    group: resolveMilestoneGroup(row, tasks),
    relatedTask: row.processName ?? '',
    status: '예정',
    impact: '고',
  }
}

/**
 * 분석 결과 묶음을 받아 간트차트용 데이터로 통합 매핑.
 *
 * @param {Object} buckets  ex) { master: rows[], milestone: rows[], trade: rows[], bohal: rows[] }
 *                          rows[] 는 TradeProcessDto.Res 배열이거나 falsy.
 * @returns {{ tasks: Array, milestones: Array, projectInfo: Object }}
 */
export function buildGanttData(buckets) {
  const allRows = []
  for (const key of Object.keys(buckets || {})) {
    const list = buckets[key]
    if (Array.isArray(list)) allRows.push(...list)
  }

  // idx 기준 중복 제거
  const seen = new Set()
  const unique = []
  for (const r of allRows) {
    if (r?.idx == null || seen.has(r.idx)) continue
    seen.add(r.idx)
    unique.push(r)
  }

  // 일반 공정과 마일스톤 분리
  const milestoneRows = unique.filter(isMilestoneScheduleRow)
  const taskRows = unique.filter((r) => !isMilestoneScheduleRow(r))

  const tasks = taskRows.map(mapRowToTask)

  // 마일스톤은 일반 task 가 다 만들어진 뒤 → group 매핑이 task 기반이라
  const milestones = milestoneRows.map((r, i) => rowToMilestone(r, i + 1, tasks))

  // projectInfo
  let startDate = null
  let endDate = null
  if (tasks.length > 0) {
    const validStart = tasks.filter((t) => t.start).sort((a, b) => a.start.localeCompare(b.start))
    const validEnd = tasks.filter((t) => t.end).sort((a, b) => b.end.localeCompare(a.end))
    startDate = validStart[0]?.start ?? null
    endDate = validEnd[0]?.end ?? null
  }
  // 마일스톤 날짜도 프로젝트 기간에 포함되도록 보정
  for (const m of milestones) {
    if (!m.date) continue
    if (!startDate || m.date < startDate) startDate = m.date
    if (!endDate || m.date > endDate) endDate = m.date
  }

  const projectInfo = {
    projectName: '공정표',
    startDate,
    endDate,
    status: '검토 중',
    plannedProgress: 0,
    actualProgress: 0,
    totalTasks: tasks.length,
    cpTasks: tasks.filter((t) => t.isCritical).length,
    weightSum: round2(tasks.reduce((s, t) => s + (Number(t.weight) || 0), 0)),
    lastModified: new Date().toISOString().slice(0, 10),
    finalApprover: '',
  }

  return { tasks, milestones, projectInfo }
}

/**
 * 편집된 task 와 원본(_src) 비교 — 변경된 행만 PUT 대상.
 */
export function isTaskDirty(task) {
  if (!task?._src) return false
  const s = task._src
  return (
    (task.name ?? '') !== (s.processName ?? '') ||
    (task.group ?? '') !== (s.tradeName ?? '') ||
    (task.start ?? '') !== (s.plannedStart ?? '') ||
    (task.end ?? '') !== (s.plannedEnd ?? '') ||
    (Number(task.weight) || 0) !== (Number(s.weightPct) || 0) ||
    !!task.isCritical !== !!s.isMilestone
  )
}

/**
 * task → 백엔드 TradeProcessDto.Req 변환 (PUT body)
 * 주의: 일반 task 는 isMilestone=false 로 보냄 (마일스톤은 task 에 없음)
 */
export function taskToReqBody(task) {
  const s = task._src ?? {}
  return {
    masterScheduleId: s.masterScheduleId ?? null,
    tradeName: task.group ?? null,
    processName: task.name ?? null,
    partnerCompany: s.partnerCompany ?? task.responsible ?? null,
    plannedStart: task.start ?? null,
    plannedEnd: task.end ?? null,
    weightPct: typeof task.weight === 'number' ? task.weight : null,
    isMilestone: !!s.isMilestone, // 원본 유지 (마일스톤 행은 task 로 안 들어오므로 보통 false)
  }
}
