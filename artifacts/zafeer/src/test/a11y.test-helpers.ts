import { axe } from 'vitest-axe'
import { expect } from 'vitest'

interface AxeViolation {
  id: string
  description: string
}

function buildViolationMessage(violations: AxeViolation[]): string {
  if (violations.length === 0) return ''
  return `Found ${violations.length} accessibility violations:\n${violations
    .map((v) => `- ${v.id}: ${v.description}`)
    .join('\n')}`
}

export async function runAxe(container: HTMLElement) {
  const results = await axe(container)
  const violations = (results.violations as AxeViolation[]) || []

  if (violations.length > 0) {
    throw new Error(buildViolationMessage(violations))
  }
  expect(violations).toHaveLength(0)

  return results
}

export async function runAxeWithRules(
  container: HTMLElement,
  options?: { rules?: Record<string, { enabled: boolean }> }
) {
  const results = await axe(container, {
    rules: options?.rules || {
      'color-contrast': { enabled: true },
      'focus-visible': { enabled: true },
      'aria-required-attr': { enabled: true },
      'aria-valid-attr': { enabled: true },
      'button-name': { enabled: true },
      label: { enabled: true },
      'image-alt': { enabled: true },
    },
  })

  const violations = (results.violations as AxeViolation[]) || []

  if (violations.length > 0) {
    throw new Error(buildViolationMessage(violations))
  }
  expect(violations).toHaveLength(0)

  return results
}
