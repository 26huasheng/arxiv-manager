'use client'

import { useMemo } from 'react'

export type TimePreset = '24h' | '3d' | '7d'

export interface TimeRangeValue {
  preset: TimePreset
}

interface TimeRangePickerProps {
  value: TimeRangeValue
  onChange: (value: TimeRangeValue) => void
  className?: string
}

const PRESET_LABELS: Record<TimePreset, string> = {
  '24h': '过去24小时',
  '3d': '过去3天',
  '7d': '过去7天',
}

/**
 * TimeRangePicker - 受控时间范围选择组件
 * UI/UX Pack v3.1 - 仅支持 24h/3d/7d，默认显示
 */
export default function TimeRangePicker({
  value,
  onChange,
  className = '',
}: TimeRangePickerProps) {
  const handlePresetChange = (preset: TimePreset) => {
    onChange({ preset })
  }

  // 显示标签
  const displayLabel = useMemo(() => {
    return PRESET_LABELS[value.preset]
  }, [value])

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">时间：</label>
      <select
        value={value.preset}
        onChange={(e) => handlePresetChange(e.target.value as TimePreset)}
        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        {(Object.keys(PRESET_LABELS) as TimePreset[]).map((preset) => (
          <option key={preset} value={preset}>
            {PRESET_LABELS[preset]}
          </option>
        ))}
      </select>
      <span className="text-xs text-gray-500 dark:text-gray-400">({displayLabel})</span>
    </div>
  )
}
