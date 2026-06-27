import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, theme } from 'antd'
import viVN from 'antd/locale/vi_VN'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import App from './App'
import './index.css'

dayjs.locale('vi')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,      // 5 phút: data được coi là fresh
      gcTime: 30 * 60 * 1000,         // 30 phút: giữ trong cache sau khi unmount
      refetchOnWindowFocus: false,     // Không refetch khi chuyển tab
      refetchOnReconnect: false,       // Không refetch khi reconnect mạng
    },
  },
})

// Detect dark mode from localStorage or system preference
const getInitialTheme = (): 'light' | 'dark' => {
  const saved = localStorage.getItem('minutes-os-theme')
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function AppProviders() {
  const [currentTheme, setCurrentTheme] = React.useState<'light' | 'dark'>(getInitialTheme)

  React.useEffect(() => {
    const root = document.documentElement
    if (currentTheme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
    }
    localStorage.setItem('minutes-os-theme', currentTheme)
  }, [currentTheme])

  // Expose theme toggle globally for MainLayout
  React.useEffect(() => {
    (window as any).__toggleTheme = () => {
      setCurrentTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
    }
    return () => {
      delete (window as any).__toggleTheme
    }
  }, [])

  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563EB',
          colorSuccess: '#16A34A',
          colorWarning: '#D97706',
          colorError: '#DC2626',
          colorInfo: '#2563EB',
          borderRadius: 10,
          fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          colorBgLayout: currentTheme === 'dark' ? '#0B1220' : '#F6F8FC',
          colorBgContainer: currentTheme === 'dark' ? '#151B2E' : '#FFFFFF',
          colorBgElevated: currentTheme === 'dark' ? '#1A1F2E' : '#FFFFFF',
          colorText: currentTheme === 'dark' ? '#EDF2F7' : '#0B1220',
          colorTextSecondary: currentTheme === 'dark' ? '#8896AB' : '#667085',
          colorBorder: currentTheme === 'dark' ? '#2A3350' : '#E4E9F2',
          colorBorderSecondary: currentTheme === 'dark' ? '#1E2740' : '#F0F2F5',
          controlHeightLG: 52,
          controlHeight: 40,
          controlHeightSM: 32,
          boxShadow: '0 1px 3px rgba(11,18,32,0.06), 0 1px 2px rgba(11,18,32,0.04)',
        },
        components: {
          Layout: {
            siderBg: currentTheme === 'dark' ? '#0B1220' : '#FFFFFF',
            headerBg: currentTheme === 'dark' ? '#151B2E' : '#FFFFFF',
            bodyBg: currentTheme === 'dark' ? '#0B1220' : '#F6F8FC',
            headerHeight: 64,
          },
          Menu: {
            itemBg: 'transparent',
            horizontalItemSelectedColor: '#2563EB',
            itemColor: '#667085',
            itemHoverColor: '#2563EB',
            itemSelectedColor: '#2563EB',
            itemSelectedBg: 'rgba(37, 99, 235, 0.08)',
            itemHoverBg: 'rgba(37, 99, 235, 0.04)',
            itemBorderRadius: 10,
            itemMarginInline: 8,
            collapsedWidth: 72,
          },
          Card: {
            paddingLG: 20,
            paddingMD: 16,
            paddingSM: 12,
          },
          Table: {
            headerBg: '#F0F4FA',
            headerColor: '#667085',
            headerSortActiveBg: '#E4E9F2',
            headerSortHoverBg: '#E4E9F2',
            bodySortBg: '#F6F8FC',
            rowHoverBg: 'rgba(37, 99, 235, 0.04)',
            borderColor: '#F0F2F5',
            borderRadius: 16,
          },
          Modal: {
            contentBg: currentTheme === 'dark' ? '#151B2E' : '#FFFFFF',
            headerBg: currentTheme === 'dark' ? '#151B2E' : '#FFFFFF',
            borderRadiusLG: 24,
            paddingMD: 20,
          },
          Drawer: {
            borderRadiusLG: 20,
          },
          Tag: {
            borderRadiusSM: 6,
            lineHeight: 1.8,
          },
          Button: {
            borderRadius: 12,
            borderRadiusLG: 12,
            controlHeight: 40,
            controlHeightLG: 48,
            fontWeight: 600,
          },
          Input: {
            borderRadius: 12,
            borderRadiusLG: 12,
            controlHeight: 40,
            controlHeightLG: 48,
          },
          Select: {
            borderRadius: 12,
            borderRadiusLG: 12,
            controlHeight: 40,
            controlHeightLG: 48,
          },
          DatePicker: {
            borderRadius: 12,
            borderRadiusLG: 12,
            controlHeight: 40,
            controlHeightLG: 48,
          },
          Notification: {
            borderRadiusLG: 16,
          },
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProviders />
    </QueryClientProvider>
  </React.StrictMode>,
)
