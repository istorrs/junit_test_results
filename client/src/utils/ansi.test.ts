import { describe, expect, it } from 'vitest'
import { renderAnsi } from './ansi'

describe('renderAnsi', () => {
  it.each(['\x1B[35mTRACE\x1B[0m', '␛[35mTRACE␛[0m', '\\x1b[35mTRACE\\x1b[0m'])(
    'renders ANSI color from %j',
    (input) => {
      const output = renderAnsi(input)

      expect(output).toContain('TRACE')
      expect(output).toContain('<span style="color:')
      expect(output).not.toContain('␛[')
      expect(output).not.toContain('\\x1b[')
      expect(output).not.toContain('\x1B[')
    }
  )

  it('escapes HTML embedded in terminal output', () => {
    const output = renderAnsi('\x1B[31m<img src=x onerror="alert(1)">\x1B[0m')

    expect(output).toContain('&lt;img')
    expect(output).not.toContain('<img')
  })
})
