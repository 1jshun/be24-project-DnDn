import { ref, onMounted, onUnmounted } from 'vue'

const CHANNEL_NAME = 'forena-staffing-board-v1'

/**
 * 인력 배치 보드 상태를 브라우저 탭 간 동기화합니다. (WebSocket/SSE 대체 데모: BroadcastChannel)
 * @param {string} tabId - 송신 시 제외할 탭 식별자
 * @param {(payload: object) => void} onApply - 원격 페이로드 적용 (직렬화된 plain 객체)
 */
export function useStaffingBoardSync(tabId, onApply) {
  const syncStatus = ref('idle')
  let channel = null
  let applyingRemote = false

  onMounted(() => {
    if (typeof BroadcastChannel === 'undefined') {
      syncStatus.value = 'unsupported'
      return
    }
    try {
      channel = new BroadcastChannel(CHANNEL_NAME)
      syncStatus.value = 'connected'
      channel.onmessage = (ev) => {
        const data = ev?.data
        if (!data || data.tabId === tabId || data.v !== 1 || !data.payload) return
        applyingRemote = true
        try {
          onApply(data.payload)
        } finally {
          applyingRemote = false
        }
      }
    } catch {
      syncStatus.value = 'unsupported'
    }
  })

  onUnmounted(() => {
    try {
      channel?.close()
    } catch {
      /* ignore */
    }
    channel = null
    syncStatus.value = 'idle'
  })

  /** @param {object} payload */
  function publish(payload) {
    if (!channel || applyingRemote) return
    try {
      channel.postMessage({ v: 1, tabId, payload })
    } catch {
      /* ignore */
    }
  }

  return { syncStatus, publish }
}
