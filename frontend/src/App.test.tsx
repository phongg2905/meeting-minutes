import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { resetAuthState } from './store/authStore'

vi.mock('./pages/public/PublicMeetingPrintPage', () => ({
  default: () => <div>Public Print Page</div>,
}))

afterEach(() => {
  resetAuthState()
})

describe('App routing', () => {
  it('allows accessing the public print route without authentication', async () => {
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/public/meetings/1/print']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Public Print Page')).toBeInTheDocument()
  })
})
