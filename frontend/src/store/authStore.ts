import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '../types'

const AUTH_STORAGE_KEY = 'auth-storage'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
  setUser: (user: User) => void
}

const initialAuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
}

export function clearAuthStorage() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialAuthState,
      login: (token, user) => {
        localStorage.setItem('token', token)
        set({ token, user, isAuthenticated: true })
      },
      logout: () => {
        set({ ...initialAuthState })
        clearAuthStorage()
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)

export function resetAuthState() {
  useAuthStore.setState({ ...initialAuthState })
  clearAuthStorage()
}
