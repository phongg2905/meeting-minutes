import axios from 'axios'
import { resetAuthState } from '../store/authStore'

const baseURL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL,
  timeout: 15000,
})

export const publicApi = axios.create({
  baseURL,
  timeout: 15000,
})

// Cho phép React set navigate function để tránh window.location.replace (full page reload)
let _customNavigate: ((path: string) => void) | null = null

export function setNavigateFn(navigate: (path: string) => void) {
  _customNavigate = navigate
}

export function handleUnauthorizedResponse() {
  resetAuthState()
  if (_customNavigate) {
    _customNavigate('/login')
  } else {
    window.location.replace('/login')
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      handleUnauthorizedResponse()
    }
    return Promise.reject(error)
  }
)

export default api
