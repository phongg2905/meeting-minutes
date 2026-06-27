import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleUnauthorizedResponse, setNavigateFn } from './api'
import { resetAuthState, useAuthStore } from '../store/authStore'

describe('auth reset on unauthorized response', () => {
  beforeEach(() => {
    resetAuthState()
    vi.restoreAllMocks()
  })

  it('clears token, persisted auth storage, and zustand state', () => {
    const redirectSpy = vi.fn()
    setNavigateFn(redirectSpy)

    useAuthStore.getState().login('expired-token', {
      user_id: 1,
      role_id: 3,
      full_name: 'Guest User',
      email: 'guest@school.edu.vn',
      status: 'active',
      created_at: '2026-06-03T00:00:00.000Z',
      role: { role_id: 3, role_name: 'NgÆ°á»i dÃ¹ng' },
    })

    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(localStorage.getItem('token')).toBe('expired-token')

    handleUnauthorizedResponse()

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().token).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('auth-storage')).toBeNull()
    expect(redirectSpy).toHaveBeenCalledWith('/login')
  })
})
