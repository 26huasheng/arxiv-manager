import React from 'react'

interface ScoreBarProps {
  score: number // 0-100
  label?: string
  showLabel?: boolean
  height?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * ScoreBar - Visual score indicator with gradient colors
 */
export function ScoreBar({
  score,
  label,
  showLabel = true,
  height = 'sm',
  className = '',
}: ScoreBarProps) {
  // Clamp score between 0-100
  const normalizedScore = Math.max(0, Math.min(100, score))

  // Color based on score
  const getColor = (s: number) => {
    if (s >= 80) return 'bg-green-500'
    if (s >= 60) return 'bg-blue-500'
    if (s >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1 text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {label || 'Score'}
          </span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {normalizedScore}/100
          </span>
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${heights[height]}`}>
        <div
          className={`${heights[height]} ${getColor(normalizedScore)} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${normalizedScore}%` }}
        />
      </div>
    </div>
  )
}
