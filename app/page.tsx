'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Heart, Star, Sparkles, ExternalLink } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Header } from '@/components/Header'
import { IconButton } from '@/components/IconButton'
import { Tag } from '@/components/Tag'
import { VibeDialog } from '@/components/VibeDialog'
import TimeRangePicker, { TimeRangeValue, TimePreset } from '@/src/components/TimeRangePicker'
import { Paper, PaperInteraction, Collection } from '@/src/types/paper'
import { apiFetch } from '@/src/lib/httpClient'

/**
 * HomePage Content - Main paper listing page with optimistic updates
 */
function HomePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [papers, setPapers] = useState<Paper[]>([])
  const [filteredPapers, setFilteredPapers] = useState<Paper[]>([])
  const [interactions, setInteractions] = useState<Record<string, PaperInteraction>>({})
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [vibeDialogOpen, setVibeDialogOpen] = useState(false)
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false)
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null)
  const [newCollectionName, setNewCollectionName] = useState('')

  // Time range state (UI/UX Pack v3.1 - 仅支持 24h/3d/7d)
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(() => {
    const days = searchParams.get('days')

    if (days) {
      const presetMap: Record<string, TimePreset> = {
        '1': '24h',
        '3': '3d',
        '7': '7d',
      }
      return { preset: presetMap[days] || '7d' }
    }

    return { preset: '7d' }
  })

  // Load initial data
  useEffect(() => {
    loadData()
  }, [searchParams])

  const loadData = async () => {
    try {
      setLoading(true)
      // Build URL with time params (Build Compat Pack v3.0.4 - using apiFetch)
      const params = new URLSearchParams(searchParams.toString())
      const papersUrl = `/api/papers?${params.toString()}`

      const [papersRes, interactionsRes, collectionsRes] = await Promise.all([
        apiFetch(papersUrl),
        apiFetch('/api/papers/interactions'),
        apiFetch('/api/collections'),
      ])

      const papersData = await papersRes.json()
      const interactionsData = await interactionsRes.json()
      const collectionsData = await collectionsRes.json()

      setPapers(papersData.papers || [])
      setFilteredPapers(papersData.papers || [])
      setInteractions(interactionsData.interactions || {})
      setCollections(collectionsData.collections || [])
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  // Handle time range change (UI/UX Pack v3.1 - 仅支持 days 参数)
  const handleTimeRangeChange = (newRange: TimeRangeValue) => {
    setTimeRange(newRange)

    // Update URL params
    const params = new URLSearchParams(searchParams.toString())

    // Remove old time params
    params.delete('days')
    params.delete('from')
    params.delete('to')

    // Convert preset to days
    const daysMap: Record<string, number> = {
      '24h': 1,
      '3d': 3,
      '7d': 7,
    }
    const days = daysMap[newRange.preset] || 7
    params.set('days', days.toString())

    // Update URL without reload
    router.push(`?${params.toString()}`, { scroll: false })
  }

  // Search handler - Simple string matching
  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredPapers(papers)
      return
    }

    const lowerQuery = query.toLowerCase()

    // Search in title, abstract, and authors
    const results = papers.filter(paper =>
      paper.title.toLowerCase().includes(lowerQuery) ||
      paper.abstract.toLowerCase().includes(lowerQuery) ||
      paper.authors.some(author => author.toLowerCase().includes(lowerQuery))
    )

    setFilteredPapers(results)
    toast.success(`找到 ${results.length} 篇相关论文`)
  }

  // Like handler with optimistic update
  const handleLike = async (paperId: string, currentLiked: boolean) => {
    const newLiked = !currentLiked

    // Optimistic update
    setInteractions(prev => ({
      ...prev,
      [paperId]: { ...prev[paperId], paperId, liked: newLiked },
    }))

    try {
      const res = await fetch(`/api/papers/${paperId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: newLiked }),
      })

      if (!res.ok) throw new Error('Failed to update')

      toast.success(newLiked ? '已喜欢 ❤️' : '取消喜欢')
    } catch (error) {
      // Rollback on error
      setInteractions(prev => ({
        ...prev,
        [paperId]: { ...prev[paperId], paperId, liked: currentLiked },
      }))
      toast.error('操作失败，请重试')
    }
  }

  // Open collection dialog
  const handleSaveClick = (paper: Paper) => {
    setSelectedPaper(paper)
    setCollectionDialogOpen(true)
  }

  // Add to collection
  const handleAddToCollection = async (collectionId: string) => {
    if (!selectedPaper) return

    try {
      const res = await fetch(`/api/collections/${collectionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId: selectedPaper.id }),
      })

      if (!res.ok) throw new Error('Failed to add')

      toast.success('已添加到收藏夹 ⭐')
      setCollectionDialogOpen(false)
      setSelectedPaper(null)
    } catch (error) {
      toast.error('添加失败')
    }
  }

  // Create new collection
  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast.error('请输入收藏夹名称')
      return
    }

    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollectionName }),
      })

      if (!res.ok) throw new Error('Failed to create')

      const data = await res.json()
      setCollections(prev => [...prev, data.collection])

      // Add paper to new collection
      if (selectedPaper) {
        await handleAddToCollection(data.collection.id)
      }

      setNewCollectionName('')
      toast.success('收藏夹已创建 ✨')
    } catch (error) {
      toast.error('创建失败')
    }
  }

  // Open vibe dialog
  const handleVibeClick = (paper: Paper) => {
    setSelectedPaper(paper)
    setVibeDialogOpen(true)
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <Header onSearch={handleSearch} onRefresh={loadData} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Time Range Filter (Feature Pack v2.7 - 默认可见) */}
        <div className="mb-6 flex justify-between items-start">
          <TimeRangePicker
            value={timeRange}
            onChange={handleTimeRangeChange}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              共 <span className="font-semibold text-gray-900 dark:text-white">{filteredPapers.length}</span> 篇论文
            </div>

            {/* Paper Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPapers.map(paper => {
                const interaction = interactions[paper.id]
                const liked = interaction?.liked || false

                return (
                  <article
                    key={paper.id}
                    className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-xl transition-all duration-180 overflow-hidden border border-gray-100 dark:border-gray-700"
                  >
                    {/* Card Header */}
                    <div className="p-5">
                      {/* Title */}
                      <h2
                        onClick={() => router.push(`/papers/${paper.id}`)}
                        className="text-lg font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                      >
                        {paper.title}
                      </h2>

                      {/* Abstract */}
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                        {paper.abstract}
                      </p>

                      {/* Categories */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {paper.categories.slice(0, 3).map(cat => (
                          <Tag key={cat} variant="primary" size="sm">
                            {cat}
                          </Tag>
                        ))}
                        {paper.categories.length > 3 && (
                          <Tag variant="secondary" size="sm">
                            +{paper.categories.length - 3}
                          </Tag>
                        )}
                      </div>

                      {/* Authors */}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-3 line-clamp-1">
                        {paper.authors.slice(0, 3).join(', ')}
                        {paper.authors.length > 3 && ` 等 ${paper.authors.length} 人`}
                      </p>

                      {/* Date */}
                      <p className="text-xs text-gray-400 dark:text-gray-600 mb-4">
                        {formatDate(paper.publishedAt)}
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {/* Like */}
                        <IconButton
                          icon={Heart}
                          onClick={() => handleLike(paper.id, liked)}
                          active={liked}
                          activeColor="text-red-500 bg-red-50 dark:bg-red-900/20"
                          label="喜欢"
                          size="sm"
                        />

                        {/* Save */}
                        <IconButton
                          icon={Star}
                          onClick={() => handleSaveClick(paper)}
                          activeColor="text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                          label="收藏"
                          size="sm"
                        />

                        {/* Vibe */}
                        <IconButton
                          icon={Sparkles}
                          onClick={() => handleVibeClick(paper)}
                          activeColor="text-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          label="氛围写作"
                          size="sm"
                        />
                      </div>

                      {/* External Link */}
                      <a
                        href={paper.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                        title="在 arXiv 查看"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>

            {filteredPapers.length === 0 && (
              <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                <p className="text-lg mb-2">暂无论文</p>
                <p className="text-sm">尝试运行 <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">npm run rebuild</code> 抓取论文</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Vibe Dialog */}
      {selectedPaper && (
        <VibeDialog
          paperId={selectedPaper.id}
          paperTitle={selectedPaper.title}
          isOpen={vibeDialogOpen}
          onClose={() => {
            setVibeDialogOpen(false)
            setSelectedPaper(null)
          }}
        />
      )}

      {/* Collection Dialog */}
      {collectionDialogOpen && selectedPaper && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setCollectionDialogOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                添加到收藏夹
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                {selectedPaper.title}
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {/* Existing collections */}
              {collections.length > 0 && (
                <div className="space-y-2 mb-6">
                  {collections.map(col => (
                    <button
                      key={col.id}
                      onClick={() => handleAddToCollection(col.id)}
                      className="w-full p-4 text-left border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-md"
                    >
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {col.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {col.paperIds.length} 篇论文
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Create new collection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  新建收藏夹
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={e => setNewCollectionName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateCollection()}
                    placeholder="输入收藏夹名称"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleCreateCollection}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    创建
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * HomePage - Wrapper with Suspense boundary
 */
export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}
