import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGanttStore = defineStore('gantt', () => {
  const tasks = ref([])
  const milestones = ref([])
  const projectInfo = ref(null)

  function setData(t, m, p) {
    tasks.value = t
    milestones.value = m
    projectInfo.value = p
  }

  return { tasks, milestones, projectInfo, setData }
})
