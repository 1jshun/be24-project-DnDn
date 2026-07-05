import { computed, ref } from 'vue'
import { tradeMatches } from '@/utils/authScope.js'

export function useAiRequestCreation({
  selectedTask,
  selectedRec,
  currentTradeItem,
  requestForm,
  submitRequest,
}) {
  const aiQuickConfirm = ref({ show: false })

  // 빠른 확인 모달에서 보여줄 변경 요약 (추천 수정안 카드와 동일한 데이터 소스)
  const aiQuickSummary = computed(() => {
    const rec = selectedRec.value
    const task = selectedTask.value
    if (!rec || !task) return null

    const proposals = rec.detailEditProposals || []
    const proposalCount = proposals.length

    // 종료일 변경
    const oldEnd = task.originalEnd || task.plannedEnd
    let newEnd = oldEnd
    if (oldEnd && rec.editedAddDays) {
      const d = new Date(oldEnd)
      d.setDate(d.getDate() + rec.editedAddDays)
      newEnd = d.toISOString().slice(0, 10)
    }

    // 작업시간이 변경되는 세부일정만 필터
    const workTimeChanges = proposals.filter(
      (p) =>
        p.originalWorkTime && p.recommendedWorkTime && p.originalWorkTime !== p.recommendedWorkTime,
    )
    // 인력이 변경되는 세부일정만 필터
    const workerChanges = proposals.filter(
      (p) => p.recommendedRequiredCount !== p.originalRequiredCount,
    )
    const totalAdditionalWorkers = workerChanges.reduce(
      (sum, p) =>
        sum +
        Math.max(0, Number(p.recommendedRequiredCount || 0) - Number(p.originalRequiredCount || 0)),
      0,
    )

    // 대표 변경(첫 proposal) 정보
    const sample = proposals[0] || null

    // 추가 공수(인시) 합계
    const totalAdditionalManHours = proposals.reduce(
      (sum, p) => sum + Number(p.additionalManHours || 0),
      0,
    )

    return {
      proposalCount,
      proposals,
      oldEnd,
      newEnd,
      addDays: rec.editedAddDays || 0,
      workTimeChanges,
      workerChanges,
      totalAdditionalWorkers,
      sample,
      totalAdditionalManHours: Math.round(totalAdditionalManHours * 10) / 10,
    }
  })

  // AI 추천에 기반한 변경 사유 텍스트 생성 (작업시간 포함)
  function buildAiReasonText() {
    const summary = aiQuickSummary.value
    if (!summary) return ''
    const parts = [`AI 추천 반영 — ${summary.proposalCount}건 세부일정 재분배`]

    if (summary.workerChanges.length) {
      const sample = summary.workerChanges[0]
      if (summary.workerChanges.length === 1) {
        parts.push(
          `${sample.date} 인력 ${sample.originalRequiredCount}명 → ${sample.recommendedRequiredCount}명`,
        )
      } else {
        parts.push(
          `인력 조정 ${summary.workerChanges.length}건 (예: ${sample.originalRequiredCount}명 → ${sample.recommendedRequiredCount}명)`,
        )
      }
    }

    if (summary.workTimeChanges.length) {
      const sample = summary.workTimeChanges[0]
      if (summary.workTimeChanges.length === 1) {
        parts.push(`작업시간 ${sample.originalWorkTime} → ${sample.recommendedWorkTime}`)
      } else {
        parts.push(
          `작업시간 조정 ${summary.workTimeChanges.length}건 (예: ${sample.originalWorkTime} → ${sample.recommendedWorkTime})`,
        )
      }
    }

    if (summary.addDays > 0) {
      parts.push(`종료일 ${summary.addDays}일 연장 검토`)
    }

    return parts.join(' · ')
  }

  function buildAiApprovalData() {
    const summary = aiQuickSummary.value
    const rec = selectedRec.value
    const task = selectedTask.value
    if (!summary || !rec || !task) return { changeSummary: null, detailChanges: [] }

    const proposals = rec.detailEditProposals || []
    const detailChanges = proposals.map((p) => ({
      workPlanId: p.workPlanId,
      date: p.date,
      location: p.location || '',
      originalName: p.originalName,
      recommendedName: p.recommendedName,
      originalRequiredCount: Number(p.originalRequiredCount || 0),
      recommendedRequiredCount: Number(p.recommendedRequiredCount || 0),
      originalWorkTime: p.originalWorkTime || '',
      recommendedWorkTime: p.recommendedWorkTime || '',
      originalWorkHours: Number(p.originalWorkHours || 0),
      recommendedWorkHours: Number(p.recommendedWorkHours || 0),
      originalManHours: Number(p.originalManHours || 0),
      recommendedManHours: Number(p.recommendedManHours || 0),
      additionalManHours: Number(p.additionalManHours || 0),
      normalTargetPct: p.normalTargetPct,
      targetPct: p.targetPct,
      catchUpPct: p.catchUpPct,
      carryOver: !!p.carryOver,
      originalNote: p.originalNote || '',
      recommendedNote: p.recommendedNote || '',
      manHourAdjustmentReason: p.manHourAdjustmentReason || '',
      trade: p.trade || '',
      partner: p.partner || '',
      manager: p.manager || '',
      contact: p.contact || '',
      parentWorkPlanId: p.parentWorkPlanId || null,
      tradeProcessId: p.tradeProcessId || null,
    }))

    return {
      changeSummary: {
        source: 'AI_RECOMMENDATION',
        targetTaskId: task.id,
        targetTaskName: task.name,
        process: task.process,
        location: task.location || '',
        plannedPct: Number(task.plannedPct || 0),
        actualPct: Number(task.actualPct || 0),
        diffPct: Number(task.diff || 0),
        risk: task.risk || '',
        cause: task.cause || '',
        proposalCount: summary.proposalCount,
        oldEnd: summary.oldEnd,
        newEnd: summary.newEnd,
        addDays: summary.addDays,
        workerChangeCount: summary.workerChanges.length,
        workTimeChangeCount: summary.workTimeChanges.length,
        totalAdditionalManHours: summary.totalAdditionalManHours,
        redistributionLevel: rec.redistribution?.level || '',
        normalReturnDate: rec.redistribution?.normalReturnDate || '',
        expectedEffect: rec.expectedEffect || '',
        basis: rec.recommendation || rec.redistribution?.action || '',
      },
      detailChanges,
    }
  }

  // "재분배 요청 등록" 클릭 시 폼을 바로 열지 않고 빠른 확인 모달을 띄움
  function createRequestFromAi() {
    if (!selectedTask.value || !selectedRec.value) return
    if (currentTradeItem.value && !tradeMatches(selectedTask.value.process, currentTradeItem.value.name)) {
      return
    }
    aiQuickConfirm.value.show = true
  }

  // AI 추천을 폼에 반영 (모달 / 즉시등록 양쪽에서 공통 사용)
  function fillRequestFormFromAi() {
    const baseEnd = selectedTask.value.originalEnd || selectedTask.value.plannedEnd
    const newEndDate = new Date(baseEnd)
    newEndDate.setDate(newEndDate.getDate() + (selectedRec.value.editedAddDays || 0))
    const approvalData = buildAiApprovalData()
    Object.assign(requestForm, {
      taskId: selectedTask.value.id,
      process: selectedTask.value.process,
      task: selectedTask.value.name,
      oldStart: selectedTask.value.plannedStart || '',
      oldEnd: baseEnd,
      newStart: selectedTask.value.plannedStart || '',
      newEnd: newEndDate.toISOString().slice(0, 10),
      reason: buildAiReasonText(),
      changeSummary: approvalData.changeSummary,
      detailChanges: approvalData.detailChanges,
      aiApplied: true,
      attachments: [],
    })
  }

  // 빠른 확인 모달 — "그대로 요청 보내기"
  async function quickSubmitFromAi() {
    if (!selectedTask.value || !selectedRec.value) return
    fillRequestFormFromAi()
    // 폼을 거치지 않고 즉시 요청 등록
    await submitRequest()
    aiQuickConfirm.value.show = false
    // submitRequest가 변경 관리 탭으로 이동시키고 폼은 닫힌 상태가 됨
  }

  // ─── 유틸 ───────────────────────────────────────────────────────────────

  return {
    aiQuickConfirm,
    aiQuickSummary,
    createRequestFromAi,
    quickSubmitFromAi,
  }
}
