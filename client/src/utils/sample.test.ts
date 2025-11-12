import { describe, it, expect } from 'vitest'

describe('Sample Test', () => {
  it('should verify testing infrastructure works', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle basic assertions', () => {
    const message = 'Hello Vue 3 with TDD'
    expect(message).toContain('TDD')
    expect(message).toBeTruthy()
  })
})
