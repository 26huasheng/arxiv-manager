'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Tag } from '@/components/Tag'
import { Collection, Paper } from '@/src/types/paper'

/**
 * CollectionsPage - Manage and view all collections
 */
export default function CollectionsPage() {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>([])
  const [papers, setPapers] = useState<Record<string, Paper>>({})
  const [loading, setLoading] = useState(true)
  const [expandedCollection, setExpandedCollection] = useState<string | null>(null)

  useEffect(() => {
    loadCollections()
  }, [])

  const loadCollections = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/collections')
      const data = await response.json()

      if (data.collections) {
        setCollections(data.collections)
        // Load papers for all collections
        const allPaperIds = new Set<string>()
        data.collections.forEach((col: Collection) => {
          col.paperIds.forEach(id => allPaperIds.add(id))
        })
        if (allPaperIds.size > 0) {
          await loadPapers(Array.from(allPaperIds))
        }
      }
    } catch (error) {
      console.error('Error loading collections:', error)
      toast.error('加载收藏夹失败')
    } finally {
      setLoading(false)
    }
  }

  const loadPapers = async (paperIds: string[]) => {
    try {
      // Fetch papers by IDs
      const response = await fetch('/api/papers')
      const data = await response.json()

      const papersMap: Record<string, Paper> = {}
      data.papers.forEach((paper: Paper) => {
        if (paperIds.includes(paper.id)) {
          papersMap[paper.id] = paper
        }
      })

      setPapers(papersMap)
    } catch (error) {
      console.error('Error loading papers:', error)
    }
  }

  const handleDeleteCollection = async (collectionId: string, collectionName: string) => {
    if (!confirm(`确定要删除收藏夹"${collectionName}"吗？`)) return

    try {
      const response = await fetch(`/api/collections?id=${collectionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('收藏夹已删除')
        await loadCollections()
      }
    } catch (error) {
      console.error('Error deleting collection:', error)
      toast.error('删除失败')
    }
  }

  const handleRemovePaper = async (collectionId: string, paperId: string) => {
    try {
      const response = await fetch(`/api/collections/${collectionId}/items?paperId=${paperId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('已从收藏夹移除')
        await loadCollections()
      }
    } catch (error) {
      console.error('Error removing paper:', error)
      toast.error('移除失败')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors mb-2"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">返回首页</span>
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            我的收藏夹
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            管理和浏览收藏的论文
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-600 dark:text-gray-400 mb-4">
              还没有收藏夹
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              去首页收藏论文
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 dark:border-gray-700"
              >
                {/* Collection Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {collection.name}
                      </h2>
                      {collection.description && (
                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          {collection.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                        <span className="font-medium">{collection.paperIds.length} 篇论文</span>
                        <span>创建于 {formatDate(collection.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setExpandedCollection(
                            expandedCollection === collection.id ? null : collection.id
                          )
                        }
                        className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                        title={expandedCollection === collection.id ? '收起' : '展开'}
                      >
                        {expandedCollection === collection.id ? (
                          <ChevronUp size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteCollection(collection.id, collection.name)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="删除收藏夹"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Papers in Collection */}
                {expandedCollection === collection.id && (
                  <div className="p-6 bg-gray-50 dark:bg-gray-900/50">
                    {collection.paperIds.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                        暂无论文
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {collection.paperIds.map((paperId) => {
                          const paper = papers[paperId]
                          if (!paper) return null

                          return (
                            <div
                              key={paperId}
                              className="bg-white dark:bg-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h3
                                    className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                    onClick={() => router.push(`/papers/${paper.id}`)}
                                  >
                                    {paper.title}
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                    {paper.abstract}
                                  </p>
                                  <div className="flex flex-wrap gap-1.5 mb-3">
                                    {paper.categories.slice(0, 2).map((cat) => (
                                      <Tag key={cat} variant="primary" size="sm">
                                        {cat}
                                      </Tag>
                                    ))}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    {paper.authors.slice(0, 2).join(', ')}
                                    {paper.authors.length > 2 && ` 等`}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleRemovePaper(collection.id, paperId)}
                                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                                  title="从收藏夹移除"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
