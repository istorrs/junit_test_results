export type ResultStatus = 'passed' | 'failed' | 'error' | 'skipped' | 'unknown'

/** Allure's Broken result is represented as Error by this dashboard's API. */
export function normalizeResultStatus(status: string): ResultStatus {
  const normalized = status.toLowerCase()
  if (normalized === 'broken' || normalized === 'errors') return 'error'
  if (
    normalized === 'passed' ||
    normalized === 'failed' ||
    normalized === 'error' ||
    normalized === 'skipped'
  ) {
    return normalized
  }
  return 'unknown'
}

export function statusColorVariable(status: string): string {
  return `--status-${normalizeResultStatus(status)}`
}

export function statusBackgroundVariable(status: string): string {
  return `${statusColorVariable(status)}-bg`
}

/** ECharts uses canvas colors, so resolve the shared CSS token at render time. */
export function resolvedStatusColor(status: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(statusColorVariable(status))
    .trim()
}
