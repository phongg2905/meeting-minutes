import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppSidebar from './AppSidebar'
import { useAuthStore } from '../../store/authStore'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

describe('AppSidebar layout widths', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        })
    })

    afterEach(() => {
        useAuthStore.setState({ user: null, token: null, isAuthenticated: false })
    })

    const renderSidebar = (collapsed: boolean, initialEntry = '/') =>
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={[initialEntry]}>
                    <AppSidebar collapsed={collapsed} onToggle={() => undefined} />
                </MemoryRouter>
            </QueryClientProvider>,
        )

    it('uses the expanded sidebar width when not collapsed', () => {
        const { container } = renderSidebar(false)
        const sidebar = container.querySelector('.sidebar-desktop:not(.sidebar-spacer)')

        expect(sidebar).not.toBeNull()
        expect(sidebar?.getAttribute('style')).toContain('width: 280px')
    })

    it('uses the collapsed sidebar width when collapsed', () => {
        const { container } = renderSidebar(true)
        const sidebar = container.querySelector('.sidebar-desktop:not(.sidebar-spacer)')

        expect(sidebar).not.toBeNull()
        expect(sidebar?.getAttribute('style')).toContain('width: 88px')
    })

    it('highlights only the active child entry for nested routes', () => {
        useAuthStore.setState({
            user: {
                id: 2,
                full_name: 'Manager',
                role_id: 2,
                role: { id: 2, role_name: 'Manager' },
            } as any,
            token: 'token',
            isAuthenticated: true,
        })

        renderSidebar(false, '/meetings/create')

        const createButton = screen.getByRole('button', { name: /tạo mới/i })
        const listButton = screen.getByRole('button', { name: /danh sách/i })

        expect(createButton).toHaveStyle({ background: 'var(--color-primary-light)' })
        expect(listButton).not.toHaveStyle({ background: 'var(--color-primary-light)' })
    })

    it('SidebarBadge: không render badge khi count bằng 0', () => {
        useAuthStore.setState({
            user: { user_id: 1, full_name: 'Admin', role_id: 1, role: { role_id: 1, role_name: 'Admin' }, email: 'admin@test.com', status: 'active', created_at: '' } as any,
            token: 'token',
            isAuthenticated: true,
        })
        const { container } = renderSidebar(false)
        // Khi count = 0, không có badge nào hiển thị
        const badges = container.querySelectorAll('[aria-label*="thông báo"]')
        expect(badges.length).toBe(0)
    })

    it('user không có quyền admin không thấy badge quản trị', () => {
        useAuthStore.setState({
            user: { user_id: 3, full_name: 'Student', role_id: 3, role: { role_id: 3, role_name: 'Student' }, email: 'student@test.com', status: 'active', created_at: '' } as any,
            token: 'token',
            isAuthenticated: true,
        })
        renderSidebar(false)
        // Student không thấy menu Quản trị
        expect(screen.queryByText('Quản trị')).toBeNull()
        expect(screen.queryByText('Người dùng')).toBeNull()
    })
})
