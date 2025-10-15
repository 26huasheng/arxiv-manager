/**
 * Time range parsing utilities for paper filtering
 * Feature Pack v2.7 - 前后端共享逻辑
 */

export interface ParsedRange {
  from: Date
  to: Date
  preset?: string
  reason: 'days' | 'explicit' | 'default'
}

/**
 * Parse time range from URLSearchParams or query object
 * Supports:
 * - ?days=7 → last 7 days
 * - ?from=2025-10-01&to=2025-10-14 → explicit range
 * - (no params) → default 7 days
 */
export function parseRangeFromQuery(
  searchParams: URLSearchParams | { get: (key: string) => string | null }
): ParsedRange {
  const now = new Date()

  // Priority 1: Explicit from/to
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')

  if (fromStr && toStr) {
    try {
      const from = new Date(fromStr)
      const to = new Date(toStr)

      // Validate dates
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        throw new Error('Invalid date format')
      }

      if (from > to) {
        throw new Error('from must be before to')
      }

      // Set to end of 'to' day
      to.setHours(23, 59, 59, 999)

      return {
        from,
        to,
        preset: 'custom',
        reason: 'explicit',
      }
    } catch (error) {
      console.warn('[TimeRange] Invalid from/to, fallback to default:', error)
      // Fallback to default
    }
  }

  // Priority 2: Days offset
  const daysStr = searchParams.get('days')
  if (daysStr) {
    const daysNum = parseInt(daysStr, 10)
    if (!isNaN(daysNum) && daysNum > 0 && daysNum <= 365) {
      const from = new Date(now.getTime() - daysNum * 24 * 60 * 60 * 1000)
      return {
        from,
        to: now,
        preset: `${daysNum}d`,
        reason: 'days',
      }
    }
  }

  // Priority 3: Default (7 days)
  const defaultDays = 7
  const from = new Date(now.getTime() - defaultDays * 24 * 60 * 60 * 1000)

  return {
    from,
    to: now,
    preset: '7d',
    reason: 'default',
  }
}

/**
 * Convert preset to days number
 */
export function presetToDays(preset: string): number | null {
  const match = preset.match(/^(\d+)d$/)
  if (match) {
    return parseInt(match[1], 10)
  }

  // Named presets
  const map: Record<string, number> = {
    '24h': 1,
    '3d': 3,
    '7d': 7,
    '14d': 14,
    '30d': 30,
  }

  return map[preset] ?? null
}

/**
 * Format preset label for display
 */
export function formatPresetLabel(value: {
  preset: string
  from?: string
  to?: string
}): string {
  if (value.preset === 'custom' && value.from && value.to) {
    // 简短格式：10/01–10/14
    const formatShort = (iso: string) => {
      const d = new Date(iso)
      return `${d.getMonth() + 1}/${d.getDate().toString().padStart(2, '0')}`
    }
    return `${formatShort(value.from)}–${formatShort(value.to)}`
  }

  const labels: Record<string, string> = {
    '24h': '过去24小时',
    '3d': '过去3天',
    '7d': '过去7天',
    '14d': '过去14天',
    '30d': '过去30天',
    custom: '自定义范围',
  }

  return labels[value.preset] || value.preset
}

/**
 * Check if a paper is within time range
 * Uses recentAt = max(updatedAt, publishedAt)
 */
export function isPaperInRange(
  paper: {
    updatedAt?: string
    publishedAt?: string
    updated?: string
    published?: string
  },
  range: { from: Date; to: Date }
): boolean {
  // Try multiple field names for compatibility
  const updatedStr = paper.updatedAt || paper.updated
  const publishedStr = paper.publishedAt || paper.published

  if (!updatedStr && !publishedStr) {
    // No date info, exclude from time-filtered results
    return false
  }

  const dates = [updatedStr, publishedStr].filter(Boolean).map((d) => new Date(d!))
  const recentAt = new Date(Math.max(...dates.map((d) => d.getTime())))

  return recentAt >= range.from && recentAt <= range.to
}
