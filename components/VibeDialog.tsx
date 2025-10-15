'use client'

import React, { useState } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'

interface VibeDialogProps {
  paperId: string
  paperTitle: string
  isOpen: boolean
  onClose: () => void
}

type ToneType = 'popular' | 'weekly' | 'social' | 'poster'

interface ToneOption {
  id: ToneType
  label: string
  description: string
  emoji: string
}

const toneOptions: ToneOption[] = [
  {
    id: 'popular',
    label: '科普风格',
    description: '通俗易懂，适合向大众介绍',
    emoji: '📚',
  },
  {
    id: 'weekly',
    label: '周报风格',
    description: '简洁专业，适合团队分享',
    emoji: '📊',
  },
  {
    id: 'social',
    label: '社媒风格',
    description: '轻松活泼，适合社交媒体',
    emoji: '💬',
  },
  {
    id: 'poster',
    label: '海报风格',
    description: '精炼醒目，适合海报展示',
    emoji: '🎨',
  },
]

/**
 * VibeDialog - Dialog for generating different tone summaries
 * Steps: 1) Ensure summary exists, 2) Rewrite in selected tone
 */
export function VibeDialog({ paperId, paperTitle, isOpen, onClose }: VibeDialogProps) {
  const [selectedTone, setSelectedTone] = useState<ToneType | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleGenerate = async (tone: ToneType) => {
    setSelectedTone(tone)
    setLoading(true)
    setError('')
    setResult('')

    try {
      // Step 1: Ensure summary exists
      const summaryRes = await fetch('/api/llm/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId }),
      })

      if (!summaryRes.ok) {
        throw new Error('Failed to generate summary')
      }

      // Step 2: Rewrite in selected tone
      const rewriteRes = await fetch('/api/llm/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId, tone }),
      })

      if (!rewriteRes.ok) {
        throw new Error('Failed to rewrite summary')
      }

      const data = await rewriteRes.json()
      setResult(data.rewrittenText || '生成成功！')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result)
    alert('已复制到剪贴板')
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Sparkles className="text-purple-500" size={24} />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                氛围写作
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                {paperTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {!result && !loading && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                选择一种风格，AI 将为您改写论文摘要：
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {toneOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleGenerate(option.id)}
                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-md text-left"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{option.emoji}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {option.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-purple-500 mb-4" size={48} />
              <p className="text-gray-600 dark:text-gray-400">
                正在生成{selectedTone && toneOptions.find(t => t.id === selectedTone)?.label}...
              </p>
            </div>
          )}

          {result && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {toneOptions.find(t => t.id === selectedTone)?.emoji}{' '}
                  {toneOptions.find(t => t.id === selectedTone)?.label}
                </h3>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                >
                  复制
                </button>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {result}
                </p>
              </div>
              <button
                onClick={() => {
                  setResult('')
                  setSelectedTone(null)
                }}
                className="mt-4 w-full py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                重新选择风格
              </button>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => {
                  setError('')
                  setSelectedTone(null)
                }}
                className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
              >
                重试
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
