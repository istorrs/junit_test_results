import { describe, expect, it } from 'vitest'
import {
  normalizeResultStatus,
  statusColorVariable,
  statusBackgroundVariable,
} from './statusColors'

describe('Allure result status palette', () => {
  it.each([
    ['Passed', 'passed'],
    ['Failed', 'failed'],
    ['Broken', 'error'],
    ['Errors', 'error'],
    ['Skipped', 'skipped'],
    ['Unknown', 'unknown'],
    ['unexpected', 'unknown'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeResultStatus(input)).toBe(expected)
    expect(statusColorVariable(input)).toBe(`--status-${expected}`)
    expect(statusBackgroundVariable(input)).toBe(`--status-${expected}-bg`)
  })
})
