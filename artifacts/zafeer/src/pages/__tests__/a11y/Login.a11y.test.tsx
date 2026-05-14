import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import axe from 'axe-core'
import Login from '../../Login'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: vi.fn(),
    user: null,
    loading: false,
    error: null,
  }),
}))

vi.mock('@/hooks/useUiPreferences', () => ({
  useThemeMode: () => ({ isDark: false, toggleTheme: vi.fn() }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

describe('Login page — accessibility', () => {
  it('has no critical axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    // color-contrast rule requires canvas (not available in jsdom) — disabled
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
    const critical = results.violations.filter(v => v.impact === 'critical')
    expect(critical).toHaveLength(0)
  })
})
