import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import axe from 'axe-core'
import NotFound from '../../not-found'

describe('404 page — accessibility', () => {
  it('has no critical axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    )
    // color-contrast rule requires canvas (not available in jsdom) — disabled
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
    const critical = results.violations.filter(v => v.impact === 'critical')
    expect(critical).toHaveLength(0)
  })
})
