import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

function isBaseResponse(body) {
  return body && typeof body === 'object' && ('success' in body || 'isSuccess' in body)
}

function baseResponseSucceeded(body) {
  return body.success === true || body.isSuccess === true
}

function baseResponseFailed(body) {
  return body.success === false || body.isSuccess === false
}

api.interceptors.response.use(
  (response) => {
    const body = response.data

    // 백엔드 BaseResponse: { code, data, message, success | isSuccess }
    if (isBaseResponse(body)) {
      if (baseResponseFailed(body)) {
        return Promise.reject(new Error(body.message || '요청이 실패했습니다.'))
      }
      if (baseResponseSucceeded(body)) {
        if (body.data !== undefined) return body.data
        if (body.result !== undefined) return body.result
      }
    }

    return body
  },
  (error) => {
    const status = error.response?.status ?? null
    const responseAvailable = Boolean(error.response)

    let message
    if (status === 401 || status === 403) {
      message = '권한이 없습니다. 데모 계정이 아니라 실제 서버 계정으로 다시 로그인해 주세요.'
    } else {
      message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        '서버와의 통신 중 오류가 발생했습니다.'
    }

    const wrapped = new Error(message)
    /** HTTP status code (있을 때만, 네트워크 오류면 null). */
    wrapped.status = status
    /** 서버가 응답을 돌려줬는지 여부. false 이면 네트워크/타임아웃 추정. */
    wrapped.responseAvailable = responseAvailable
    /** 백엔드 BaseResponse 의 code (3201, 3202 등) — 가능하면 보존. */
    wrapped.responseCode = error.response?.data?.code ?? null
    return Promise.reject(wrapped)
  },
)

export default api
