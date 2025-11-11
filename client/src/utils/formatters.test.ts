import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDuration,
  formatPercentage,
  formatNumber,
  getStatusColor,
  getStatusIcon,
  formatFileSize,
  truncateText,
} from './formatters'

describe('Date Formatting', () => {
  it('should format date to readable string', () => {
    const date = new Date('2025-01-15T10:30:00Z')
    const result = formatDate(date)
    expect(result).toMatch(/Jan 15, 2025/)
  })

  it('should handle date string input', () => {
    const result = formatDate('2025-01-15T10:30:00Z')
    expect(result).toMatch(/Jan 15, 2025/)
  })

  it('should handle invalid date', () => {
    const result = formatDate('invalid-date')
    expect(result).toBe('Invalid Date')
  })
})

describe('Duration Formatting', () => {
  it('should format milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms')
  })

  it('should format seconds', () => {
    expect(formatDuration(2500)).toBe('2.50s')
  })

  it('should format minutes', () => {
    expect(formatDuration(125000)).toBe('2m 5s')
  })

  it('should format hours', () => {
    expect(formatDuration(3665000)).toBe('1h 1m 5s')
  })

  it('should handle zero duration', () => {
    expect(formatDuration(0)).toBe('0ms')
  })

  it('should handle negative duration', () => {
    expect(formatDuration(-1000)).toBe('0ms')
  })
})

describe('Percentage Formatting', () => {
  it('should format percentage with 2 decimals by default', () => {
    expect(formatPercentage(85.6789)).toBe('85.68%')
  })

  it('should format percentage with custom decimals', () => {
    expect(formatPercentage(85.6789, 1)).toBe('85.7%')
  })

  it('should handle 0%', () => {
    expect(formatPercentage(0)).toBe('0.00%')
  })

  it('should handle 100%', () => {
    expect(formatPercentage(100)).toBe('100.00%')
  })

  it('should handle values over 100%', () => {
    expect(formatPercentage(120.5)).toBe('120.50%')
  })
})

describe('Number Formatting', () => {
  it('should format small numbers without separators', () => {
    expect(formatNumber(999)).toBe('999')
  })

  it('should format thousands with separator', () => {
    expect(formatNumber(1234)).toBe('1,234')
  })

  it('should format millions with separator', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('should handle zero', () => {
    expect(formatNumber(0)).toBe('0')
  })
})

describe('Status Color', () => {
  it('should return green for passed status', () => {
    expect(getStatusColor('passed')).toBe('green')
  })

  it('should return red for failed status', () => {
    expect(getStatusColor('failed')).toBe('red')
  })

  it('should return orange for error status', () => {
    expect(getStatusColor('error')).toBe('orange')
  })

  it('should return gray for skipped status', () => {
    expect(getStatusColor('skipped')).toBe('gray')
  })

  it('should return gray for unknown status', () => {
    expect(getStatusColor('unknown')).toBe('gray')
  })
})

describe('Status Icon', () => {
  it('should return check icon for passed status', () => {
    expect(getStatusIcon('passed')).toBe('✓')
  })

  it('should return x icon for failed status', () => {
    expect(getStatusIcon('failed')).toBe('✗')
  })

  it('should return warning icon for error status', () => {
    expect(getStatusIcon('error')).toBe('⚠')
  })

  it('should return skip icon for skipped status', () => {
    expect(getStatusIcon('skipped')).toBe('⊘')
  })

  it('should return question mark for unknown status', () => {
    expect(getStatusIcon('unknown')).toBe('?')
  })
})

describe('File Size Formatting', () => {
  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('should format kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.00 KB')
  })

  it('should format megabytes', () => {
    expect(formatFileSize(5242880)).toBe('5.00 MB')
  })

  it('should format gigabytes', () => {
    expect(formatFileSize(1073741824)).toBe('1.00 GB')
  })

  it('should handle zero', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })
})

describe('Text Truncation', () => {
  it('should not truncate short text', () => {
    const text = 'Short text'
    expect(truncateText(text, 20)).toBe('Short text')
  })

  it('should truncate long text with ellipsis', () => {
    const text = 'This is a very long text that should be truncated'
    expect(truncateText(text, 20)).toBe('This is a very long ...')
  })

  it('should handle exact length', () => {
    const text = 'Exactly twenty chars'
    expect(truncateText(text, 20)).toBe('Exactly twenty chars')
  })

  it('should handle empty string', () => {
    expect(truncateText('', 10)).toBe('')
  })

  it('should use default length of 50', () => {
    const text = 'a'.repeat(60)
    const result = truncateText(text)
    expect(result.length).toBe(53) // 50 + '...'
    expect(result.endsWith('...')).toBe(true)
  })
})
