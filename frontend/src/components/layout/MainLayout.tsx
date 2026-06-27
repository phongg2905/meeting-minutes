import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Layout } from 'antd'
import AppSidebar from './AppSidebar'
import AppHeader from './AppHeader'

const { Content } = Layout

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('minutes-os-theme')
    if (saved === 'dark' || saved === 'light') return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const handleToggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    const globalToggle = (window as any).__toggleTheme
    if (globalToggle) globalToggle()
  }

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
    }
    localStorage.setItem('minutes-os-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const sidebarWidth = collapsed ? 88 : 280

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <Layout
        style={{
          marginLeft: 0,
          transition: 'margin-left var(--transition-base)',
          background: 'var(--color-bg)',
          minHeight: '100vh',
        }}
        className="main-content-area"
      >
        <AppHeader
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed(!collapsed)}
          onMobileMenuOpen={() => setMobileOpen(true)}
          onToggleTheme={handleToggleTheme}
          isDark={isDark}
        />

        <Content
          style={{
            padding: '24px',
            minHeight: 'calc(100vh - 64px)',
            maxWidth: 1400,
            margin: '0 auto',
            width: '100%',
          }}
        >
          <div className="fade-in">
            <Outlet />
          </div>
        </Content>
      </Layout>

      <style>{`
        @media (min-width: 1024px) {
          .main-content-area {
            margin-left: ${sidebarWidth}px !important;
          }
        }
        @media (max-width: 1023px) {
          .main-content-area {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </Layout>
  )
}
