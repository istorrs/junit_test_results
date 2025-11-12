export type TestStatus = 'passed' | 'failed' | 'error' | 'skipped' | string

export function formatDate(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) {
      return 'Invalid Date'
    }
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Invalid Date'
  }
}

export function formatDuration(ms: number): string {
  if (ms < 0) return '0ms'
  if (ms === 0) return '0ms'

  if (ms < 1000) {
    return `${ms}ms`
  }

  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`
  }

  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0) parts.push(`${seconds}s`)

  return parts.join(' ')
}

export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

export function getStatusColor(status: TestStatus): string {
  switch (status.toLowerCase()) {
    case 'passed':
      return 'green'
    case 'failed':
      return 'red'
    case 'error':
      return 'orange'
    case 'skipped':
      return 'gray'
    default:
      return 'gray'
  }
}

export function getStatusIcon(status: TestStatus): string {
  switch (status.toLowerCase()) {
    case 'passed':
      return '✓'
    case 'failed':
      return '✗'
    case 'error':
      return '⚠'
    case 'skipped':
      return '⊘'
    default:
      return '?'
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  if (i === 0) {
    return `${bytes} ${units[i]}`
  }

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength) + '...'
}
