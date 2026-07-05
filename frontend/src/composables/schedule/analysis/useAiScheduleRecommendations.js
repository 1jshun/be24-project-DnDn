import { reactive, onBeforeUnmount } from 'vue'
import {
  createAiScheduleRecommendation,
  fetchAiScheduleRecommendation,
} from '@/api/aischedulerecommendation.js'
import {
  buildDetailScheduleEditProposals,
  buildDetailedAiRecommendationText,
  buildOperationalRecommendationText,
  findFallbackProposal,
  normalizeAiDetailProposal,
  pickNumber,
  pickText,
  readAiResultParts,
  unwrapAiApiData,
} from '@/utils/schedule/analysis/aiRecommendationHelpers.js'
import { refreshProposalManHours } from '@/utils/schedule/analysis/redistributionPlanner.js'

export function useAiScheduleRecommendations({
  delayTasks,
  currentProjectId,
  selectedTask,
  buildTaskRedistributionPlan,
}) {
  const aiRecs = reactive({})
  const aiRecommendationPollers = new Map()

  onBeforeUnmount(() => {
    aiRecommendationPollers.forEach((timer) => clearInterval(timer))
    aiRecommendationPollers.clear()
  })

  function ensureAiRecommendation(task) {
    if (!task?.id) return
    if (aiRecs[task.id]) return

    const redistribution = task.redistribution || buildTaskRedistributionPlan(task)
    const detailEditProposals = buildDetailScheduleEditProposals(redistribution)
    const diffText = task.diff < 0 ? `${Math.abs(task.diff)}%p 부족` : `${task.diff}%p 초과`
    const shouldExtend = redistribution.level.includes('일정 변경')

    const catchUpText =
      redistribution.catchUpScheduleCount > 0
        ? `가까운 하위 세부일정 ${redistribution.catchUpScheduleCount}건에 미달분 ${redistribution.delayedProgress}%p를 집중 반영하고, ${redistribution.normalReturnDate ? `${redistribution.normalReturnDate}부터 ` : ''}정상 일정 복귀를 목표로 합니다.`
        : '현재 계획 대비 미달분이 크지 않아 남은 세부일정은 기존 목표 중심으로 관리합니다.'

    aiRecs[task.id] = {
      source: 'RULE_FALLBACK',
      aiStatus: 'READY',
      aiError: '',
      recommendationId: null,
      summary:
        `${task.name} 월간 세부계획은 현재 계획 대비 ${diffText} 상태입니다. ` +
        `종료일(${task.originalEnd || task.plannedEnd || '-'})은 우선 유지하고, 전체 남은 기간에 균등 분산하기보다 ${catchUpText}`,
      recommendation: buildDetailedAiRecommendationText(task, redistribution, detailEditProposals),
      workerSuggestion:
        redistribution.recommendedWorkers > 0
          ? `집중 만회 일정에 한해 최대 ${redistribution.recommendedWorkers}명 추가와 작업시간 조정을 검토하세요.`
          : `추가 인력보다 작업시간 조정 또는 목표 진척률 관리가 우선입니다.`,
      affectedTasks: shouldExtend
        ? ['납기 내 만회 부담 큼', '후속 공정 영향 검토 필요']
        : ['종료일 유지', '가까운 하위 세부일정 집중 만회'],
      redistribution,
      detailEditProposals,
      editedAddDays: redistribution.extensionDays || 0,
      editedWorkers: redistribution.recommendedWorkers || 0,
      expectedEffect: shouldExtend
        ? '우선 집중 만회 계획을 적용하되, 납기 내 완료가 어렵다면 일정 변경 요청을 검토합니다.'
        : '종료일 변경 없이 가까운 하위 세부일정에 미달분을 집중 반영한 뒤 정상 일정 복귀를 우선합니다.',
    }
  }

  // ─── 일정 변경 요청 ──────────────────────────────────────────────────────
  function setAiRecommendationError(taskId, message) {
    if (!taskId || !aiRecs[taskId]) return
    aiRecs[taskId].aiStatus = 'FAILED'
    aiRecs[taskId].aiError = message || 'AI 추천 생성에 실패했습니다.'
  }

  function stopAiRecommendationPolling(taskId) {
    const timer = aiRecommendationPollers.get(taskId)
    if (!timer) return
    clearInterval(timer)
    aiRecommendationPollers.delete(taskId)
  }

  function applyAiRecommendationRecordToTask(taskId, rawRecord) {
    const task = delayTasks.value.find((item) => item.id === taskId)
    if (!task) return

    ensureAiRecommendation(task)

    const record = unwrapAiApiData(rawRecord) || {}
    const previous = aiRecs[task.id] || {}
    const { resultObject, body, changeSummary, detailChanges } = readAiResultParts(record)
    const fallbackProposals = previous.detailEditProposals || []
    const allowedWorkPlanIds = new Set(
      fallbackProposals.map((proposal) => Number(proposal.workPlanId || 0)).filter(Boolean),
    )
    const aiProposals = detailChanges.length
      ? detailChanges
          .map((change, index) =>
            normalizeAiDetailProposal(
              task,
              change,
              findFallbackProposal(fallbackProposals, change, index),
            ),
          )
          .filter((proposal) => {
            const workPlanId = Number(proposal.workPlanId || 0)
            if (!workPlanId || !allowedWorkPlanIds.has(workPlanId)) return false
            return Number(proposal.originalRequiredCount || 0) > 0
          })
          .slice(0, Math.max(1, fallbackProposals.length))
      : []
    const aiProposalById = new Map(
      aiProposals.map((proposal) => [Number(proposal.workPlanId || 0), proposal]),
    )
    const normalizedProposals = fallbackProposals.length
      ? fallbackProposals.map((fallback) => {
          const aiProposal = aiProposalById.get(Number(fallback.workPlanId || 0))
          if (!aiProposal) return fallback

          const originalRequiredCount = Number(fallback.originalRequiredCount || 0)
          const maxRecommendedCount =
            originalRequiredCount + Math.max(2, Math.ceil(originalRequiredCount * 0.3))
          const aiRecommendedCount = pickNumber(
            aiProposal.recommendedRequiredCount,
            pickNumber(fallback.recommendedRequiredCount, originalRequiredCount),
          )
          const aiRecommendedName = pickText(aiProposal.recommendedName, fallback.recommendedName)
          const recommendedName =
            aiRecommendedName.includes(fallback.originalName) ||
            aiRecommendedName === fallback.originalName
              ? aiRecommendedName
              : fallback.recommendedName

          const merged = {
            ...fallback,
            recommendedName,
            recommendedRequiredCount: Math.max(
              originalRequiredCount,
              Math.min(maxRecommendedCount, aiRecommendedCount),
            ),
            recommendedWorkTime: pickText(
              aiProposal.recommendedWorkTime,
              fallback.recommendedWorkTime,
            ),
            recommendedNote: pickText(aiProposal.recommendedNote, fallback.recommendedNote),
            manHourAdjustmentReason: pickText(
              aiProposal.manHourAdjustmentReason,
              fallback.manHourAdjustmentReason,
            ),
            isEditing: false,
            isUserEdited: false,
          }
          refreshProposalManHours(merged)
          return merged
        })
      : aiProposals
    const maxAddedWorkers = normalizedProposals.reduce(
      (max, proposal) =>
        Math.max(
          max,
          Number(proposal.recommendedRequiredCount || 0) -
            Number(proposal.originalRequiredCount || 0),
        ),
      0,
    )

    aiRecs[task.id] = {
      ...previous,
      source: 'AI',
      aiStatus: 'SUCCESS',
      aiError: '',
      recommendationId:
        record.idx ?? record.id ?? record.recommendationId ?? previous.recommendationId,
      summary: pickText(body.summary, body.summaryText, changeSummary.summary, previous.summary),
      recommendation: pickText(
        buildOperationalRecommendationText(task, previous.redistribution, normalizedProposals),
        previous.recommendation,
      ),
      workerSuggestion: pickText(
        body.workerSuggestion,
        changeSummary.workerSuggestion,
        previous.workerSuggestion,
      ),
      affectedTasks: Array.isArray(body.affectedTasks)
        ? body.affectedTasks
        : previous.affectedTasks || [],
      redistribution: previous.redistribution,
      detailEditProposals: normalizedProposals,
      editedAddDays: pickNumber(changeSummary.addDays, pickNumber(previous.editedAddDays, 0)),
      editedWorkers: pickNumber(
        body.editedWorkers ?? changeSummary.recommendedWorkers,
        pickNumber(previous.editedWorkers, maxAddedWorkers),
      ),
      expectedEffect: pickText(
        body.expectedEffect,
        changeSummary.expectedEffect,
        previous.expectedEffect,
      ),
    }
  }

  function startAiRecommendationPolling(taskId, recommendationId) {
    stopAiRecommendationPolling(taskId)

    let attempts = 0
    const timer = setInterval(async () => {
      attempts += 1
      try {
        const record = unwrapAiApiData(await fetchAiScheduleRecommendation(recommendationId))
        const status = String(record?.status || '').toUpperCase()

        if (status === 'SUCCESS') {
          stopAiRecommendationPolling(taskId)
          applyAiRecommendationRecordToTask(taskId, record)
          return
        }

        if (status === 'FAILED') {
          stopAiRecommendationPolling(taskId)
          setAiRecommendationError(taskId, record?.errorMessage || 'AI 추천 생성에 실패했습니다.')
          return
        }

        if (attempts >= 60) {
          stopAiRecommendationPolling(taskId)
          setAiRecommendationError(
            taskId,
            'AI 추천 생성이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.',
          )
        }
      } catch (err) {
        if (attempts >= 60) {
          stopAiRecommendationPolling(taskId)
          setAiRecommendationError(taskId, err?.message || 'AI 추천 상태 조회에 실패했습니다.')
        }
      }
    }, 2500)

    aiRecommendationPollers.set(taskId, timer)
  }

  async function requestAiRecommendationForSelectedTask() {
    const task = selectedTask.value
    if (!task?.id) return

    ensureAiRecommendation(task)
    const rec = aiRecs[task.id]
    const monthlyWorkPlanId = Number(task.monthlyWorkPlanId || task.workPlanId || task.id || 0)

    if (!monthlyWorkPlanId) {
      setAiRecommendationError(task.id, '월간 세부계획 ID가 없어 AI 추천을 요청할 수 없습니다.')
      return
    }

    try {
      stopAiRecommendationPolling(task.id)
      rec.source = 'AI'
      rec.aiStatus = 'PENDING'
      rec.aiError = ''

      const created = unwrapAiApiData(
        await createAiScheduleRecommendation({
          projectId: currentProjectId.value,
          monthlyWorkPlanId,
        }),
      )
      const recommendationId = Number(created?.idx ?? created?.id ?? created?.recommendationId ?? 0)
      rec.recommendationId = recommendationId || null

      const status = String(created?.status || '').toUpperCase()
      if (status === 'SUCCESS') {
        applyAiRecommendationRecordToTask(task.id, created)
        return
      }

      if (status === 'FAILED') {
        setAiRecommendationError(task.id, created?.errorMessage || 'AI 추천 생성에 실패했습니다.')
        return
      }

      if (!recommendationId) {
        throw new Error('AI 추천 요청 ID를 받지 못했습니다.')
      }

      startAiRecommendationPolling(task.id, recommendationId)
    } catch (err) {
      console.error('AI schedule recommendation failed:', err)
      setAiRecommendationError(task.id, err?.message || 'AI 추천 생성에 실패했습니다.')
    }
  }

  return {
    aiRecs,
    ensureAiRecommendation,
    requestAiRecommendationForSelectedTask,
  }
}
