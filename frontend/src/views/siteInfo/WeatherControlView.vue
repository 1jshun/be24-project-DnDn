<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useCurrentProject } from '@/composables/useCurrentProject.js'
import WeatherControlHeader from '@/components/weather/WeatherControlHeader.vue'
import WeatherSummaryCards from '@/components/weather/WeatherSummaryCards.vue'
import WeatherLiveChecklist from '@/components/weather/WeatherLiveChecklist.vue'
import WeatherRiskPanel from '@/components/weather/WeatherRiskPanel.vue'
import WeatherThreeDayForecast from '@/components/weather/WeatherThreeDayForecast.vue'
import WeatherForecastTabs from '@/components/weather/WeatherForecastTabs.vue'
import {
  fetchWeatherAiAnalysis,
  fetchWeatherDashboard,
  fetchWeatherWorkOrderEquipments,
} from '@/api/weatherControl.js'
import {
  buildEquipmentRisksFromWorkOrders,
  buildPlanRisksFromWorkOrders,
  calculateRainPercent,
  generateLiveRiskActions,
  getFineDustTone,
  getFineDustValue,
  getMonthlyForecast,
  getRainBarClass,
  getRainNoteDetailed,
  getWeatherAlertLabels,
  getRiskLevel,
  getSourceLabel,
  getThreeDayForecast,
  getTodayDateText,
  getWeeklyForecast,
  getWindTone,
  isEquipmentRisk,
  mergeRiskItems,
  toLiveRiskAction,
  toWeatherRiskItem,
} from '@/utils/weatherControlMapper.js'

const { currentProjectId } = useCurrentProject()

const reportDate = ref(getTodayDateText())
const loading = ref(false)
const dashboard = ref(null)
const forecastTab = ref('week')
const selectedMonthWeekId = ref(null)
const workOrderEquipments = ref([])
const aiAnalysisResult = ref(null)

const today = computed(() => dashboard.value?.today ?? null)
const week = computed(() => dashboard.value?.week ?? null)
const rain = computed(() => dashboard.value?.rain ?? null)
const airQuality = computed(() => dashboard.value?.airQuality ?? null)
const analysis = computed(() => dashboard.value?.analysis ?? null)
const forecastDays = computed(() => dashboard.value?.forecastDays ?? [])
const locationLabel = computed(() => dashboard.value?.locationLabel || '현장')
const todayDateText = computed(() => getTodayDateText())
const isFutureReportDate = computed(() => reportDate.value > todayDateText.value)
const hasWorkOrders = computed(() => workOrderEquipments.value.length > 0)

const sourceLabel = computed(() => getSourceLabel(analysis.value?.sourceType))
const weatherAlertLabels = computed(() => getWeatherAlertLabels(dashboard.value, analysis.value))
const rainPercent = computed(() => calculateRainPercent(analysis.value, rain.value))
const rainBarClass = computed(() => getRainBarClass(rainPercent.value))
const rainNoteDetailed = computed(() => getRainNoteDetailed(rainPercent.value, weatherAlertLabels.value))
const fineDustValue = computed(() => getFineDustValue(analysis.value, airQuality.value))
const fineDustTone = computed(() => getFineDustTone(fineDustValue.value, airQuality.value))
const windTone = computed(() => getWindTone(analysis.value, weatherAlertLabels.value))
const riskLevel = computed(() => getRiskLevel(analysis.value))

const aiRiskItems = computed(() =>
  Array.isArray(aiAnalysisResult.value?.risks) ? aiAnalysisResult.value.risks : [],
)
const aiActionItems = computed(() =>
  Array.isArray(aiAnalysisResult.value?.actions) ? aiAnalysisResult.value.actions : [],
)
const aiEquipmentRisks = computed(() =>
  aiRiskItems.value.filter((risk) => isEquipmentRisk(risk)).map(toWeatherRiskItem),
)
const aiPlanRisks = computed(() =>
  aiRiskItems.value.filter((risk) => !isEquipmentRisk(risk)).map(toWeatherRiskItem),
)
const aiLiveRiskActions = computed(() => aiActionItems.value.map(toLiveRiskAction))

const equipmentRisks = computed(() => {
  if (isFutureReportDate.value || !hasWorkOrders.value) return []

  return mergeRiskItems(
    buildEquipmentRisksFromWorkOrders(analysis.value, workOrderEquipments.value),
    aiEquipmentRisks.value,
  ).slice(0, 5)
})

const planRisks = computed(() => {
  if (isFutureReportDate.value || !hasWorkOrders.value) return []

  return mergeRiskItems(
    buildPlanRisksFromWorkOrders(analysis.value, workOrderEquipments.value),
    aiPlanRisks.value,
  ).slice(0, 5)
})

const liveRiskActions = computed(() => {
  if (isFutureReportDate.value) return []

  return generateLiveRiskActions(
    analysis.value,
    dashboard.value,
    aiLiveRiskActions.value,
    hasWorkOrders.value,
  )
})
const liveRiskCount = computed(() => liveRiskActions.value.length)

const threeDayForecast = computed(() => getThreeDayForecast(forecastDays.value, reportDate.value))
const weeklyForecast = computed(() => getWeeklyForecast(forecastDays.value, reportDate.value))
const monthlyForecast = computed(() => getMonthlyForecast(forecastDays.value, reportDate.value))

async function loadDashboard() {
  loading.value = true

  try {
    dashboard.value = await fetchWeatherDashboard(reportDate.value)
  } catch (error) {
    console.error(error)
    dashboard.value = null
  } finally {
    loading.value = false
  }
}

async function loadWorkOrders() {
  if (isFutureReportDate.value) {
    workOrderEquipments.value = []
    return
  }

  try {
    workOrderEquipments.value = await fetchWeatherWorkOrderEquipments(reportDate.value, currentProjectId.value)
  } catch (error) {
    console.error('작업지시 장비 조회 실패:', error)
    workOrderEquipments.value = []
  }
}

async function loadWeatherAiAnalysis() {
  if (isFutureReportDate.value) {
    aiAnalysisResult.value = null
    return
  }

  try {
    aiAnalysisResult.value = await fetchWeatherAiAnalysis(reportDate.value, currentProjectId.value)
  } catch (error) {
    console.error('기상 AI 분석 실패:', error)
    aiAnalysisResult.value = null
  }
}

function loadPageData() {
  loadDashboard()
  loadWorkOrders()
  loadWeatherAiAnalysis()
}

function updateReportDate(value) {
  reportDate.value = value
}

function updateForecastTab(value) {
  forecastTab.value = value
}

function selectMonthWeek(weekId) {
  selectedMonthWeekId.value = selectedMonthWeekId.value === weekId ? null : weekId
}

onMounted(() => {
  loadPageData()
})

watch(reportDate, () => {
  loadPageData()
})

watch(currentProjectId, () => {
  loadPageData()
})

watch(monthlyForecast, (weeks) => {
  if (!weeks.length) {
    selectedMonthWeekId.value = null
    return
  }

  if (selectedMonthWeekId.value && !weeks.some((week) => week.id === selectedMonthWeekId.value)) {
    selectedMonthWeekId.value = null
  }
})
</script>

<template>
  <div class="flex min-h-full flex-col gap-4 pb-8">
    <WeatherControlHeader
      :report-date="reportDate"
      :source-label="sourceLabel"
      @update:report-date="updateReportDate"
    />

    <div class="grid shrink-0 gap-4 min-[1440px]:grid-cols-[520px_minmax(0,1fr)] min-[1440px]:items-stretch">
      <div class="flex h-full flex-col gap-4">
        <WeatherSummaryCards
          :today="today"
          :week="week"
          :analysis="analysis"
          :risk-level="riskLevel"
          :rain-percent="rainPercent"
          :rain-bar-class="rainBarClass"
          :rain-note-detailed="rainNoteDetailed"
          :wind-tone="windTone"
          :fine-dust-value="fineDustValue"
          :fine-dust-tone="fineDustTone"
        />

        <WeatherLiveChecklist
          :loading="loading"
          :actions="liveRiskActions"
          :action-count="liveRiskCount"
          :is-future-report-date="isFutureReportDate"
        />
      </div>

      <WeatherRiskPanel
        :plan-risks="planRisks"
        :equipment-risks="equipmentRisks"
        :is-future-report-date="isFutureReportDate"
      />
    </div>

    <WeatherThreeDayForecast class="shrink-0" :days="threeDayForecast" :location-label="locationLabel" />

    <WeatherForecastTabs
      class="shrink-0"
      :forecast-tab="forecastTab"
      :selected-month-week-id="selectedMonthWeekId"
      :weekly-forecast="weeklyForecast"
      :monthly-forecast="monthlyForecast"
      :location-label="locationLabel"
      @update:forecast-tab="updateForecastTab"
      @select-month-week="selectMonthWeek"
    />
  </div>
</template>
