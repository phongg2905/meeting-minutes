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

export function handleUnauthorizedResponse(redirect: (path: string) => void = (path) => window.location.replace(path)) {
  resetAuthState()
  redirect('/login')
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
