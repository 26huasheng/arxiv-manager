'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, BookMarked, Sparkles, Download } from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

// Configure dayjs
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

interface HeaderProps {
  onSearch?: (query: string) => void
  onRefresh?: () => void
}

/**
 * Header - Main navigation header with search, refresh, rebuild, and collections link
 */
export function Header({ onSearch, onRefresh }: HeaderProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null)
  const [paperCount, setPaperCount] = useState<number>(0)
  const [rebuilding, setRebuilding] = useState(false)

  // Load metadata on mount
  useEffect(() => {
    loadMeta()
  }, [])

  const loadMeta = async () => {
    try {
      const res = await fetch('/api/papers')
      const data = await res.json()

      if (data.meta) {
        setLastFetchTime(data.meta.lastFetchedAt)
        setPaperCount(data.meta.count || 0)
      }
    } catch (error) {
      console.error('Failed to load metadata:', error)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch && query.trim()) {
      onSearch(query.trim())
    }
  }

  const handleRebuild = async () => {
    if (rebuilding) return

    setRebuilding(true)
    const toastId = toast.loading('正在抓取最新论文...')

    try {
      const res = await fetch('/api/admin/rebuild-7d', {
        method: 'POST',
      })

      const data = await res.json()

      if (!data.ok) {
        throw new Error(data.message || 'Rebuild failed')
      }

      // Show statistics
      const stats = data.stats
      toast.success(
        `刷新成功！\n获取: ${stats.totalFetched} 篇\n保留: ${stats.totalKept} 篇 (7天内)`,
        { id: toastId, duration: 5000 }
      )

      // Reload metadata
      await loadMeta()

      // Trigger refresh
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Rebuild error:', error)
      toast.error(
        error instanceof Error ? error.message : '刷新失败，请重试',
        { id: toastId }
      )
    } finally {
      setRebuilding(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          {/* Brand */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <Sparkles className="text-purple-500" size={28} />
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              arXiv Manager
            </h1>
          </button>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索论文标题、摘要、作者..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Last Fetch Time */}
            {lastFetchTime && (
              <div className="hidden lg:flex flex-col items-end px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-gray-500 dark:text-gray-400">
                  上次抓取: {dayjs(lastFetchTime).fromNow()}
                </span>
                <span className="text-gray-600 dark:text-gray-300 font-medium">
                  {paperCount} 篇论文
                </span>
              </div>
            )}

            {/* Rebuild Button */}
            <button
              onClick={handleRebuild}
              disabled={rebuilding}
              title="刷新数据（抓取近7天论文）"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <Download size={16} className={rebuilding ? 'animate-spin' : ''} />
              <span className="hidden md:inline">{rebuilding ? '抓取中...' : '刷新数据'}</span>
            </button>

            {/* Refresh Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="刷新论文列表"
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <RefreshCw size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            )}

            {/* Collections Button */}
            <button
              onClick={() => router.push('/collections')}
              title="我的收藏夹"
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all"
            >
              <BookMarked size={20} className="text-gray-700 dark:text-gray-300" />
              <span className="hidden sm:inline font-medium text-gray-700 dark:text-gray-300">收藏夹</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
