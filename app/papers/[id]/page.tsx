'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Paper, PaperSummary, PaperScore, PaperInteraction, Collection } from '@/src/types/paper'
import { RewriteTone } from '@/app/api/llm/rewrite/route'

type SectionKey = 'overview' | 'background' | 'innovation' | 'results' | 'strengths' | 'limitations' | 'reproduction'

const SECTIONS: Array<{ key: SectionKey; title: string; anchor: string }> = [
  { key: 'overview', title: '概述', anchor: 'overview' },
  { key: 'background', title: '研究背景', anchor: 'background' },
  { key: 'innovation', title: '创新方法', anchor: 'innovation' },
  { key: 'results', title: '实验与成果', anchor: 'results' },
  { key: 'strengths', title: '优点', anchor: 'strengths' },
  { key: 'limitations', title: '局限', anchor: 'limitations' },
  { key: 'reproduction', title: '复现要点', anchor: 'reproduction' },
]

const TONE_OPTIONS: Array<{ value: RewriteTone; label: string }> = [
  { value: 'popular', label: '科普风格' },
  { value: 'weekly', label: '技术周报' },
  { value: 'social', label: '社交媒体' },
  { value: 'poster', label: '学术海报' },
]

export default function PaperDetailPage() {
  const params = useParams()
  const router = useRouter()
  const paperId = params.id as string

  const [paper, setPaper] = useState<Paper | null>(null)
  const [summary, setSummary] = useState<PaperSummary | null>(null)
  const [score, setScore] = useState<PaperScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [rewriting, setRewriting] = useState(false)
  const [selectedTone, setSelectedTone] = useState<RewriteTone>('popular')
  const [rewrittenText, setRewrittenText] = useState<Record<RewriteTone, string>>({
    popular: '',
    weekly: '',
    social: '',
    poster: '',
  })
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error'
  }>({ show: false, message: '', type: 'success' })

  // UI/UX Pack v3.1 - Favorites logic from homepage
  const [interaction, setInteraction] = useState<PaperInteraction | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')

  useEffect(() => {
    loadPaper()
  }, [paperId])

  const loadPaper = async () => {
    try {
      setLoading(true)

      // Fetch paper, interactions, and collections (UI/UX Pack v3.1)
      const [paperRes, interactionsRes, collectionsRes] = await Promise.all([
        fetch(`/api/papers?id=${paperId}`),
        fetch('/api/papers/interactions'),
        fetch('/api/collections'),
      ])

      const paperData = await paperRes.json()
      const interactionsData = await interactionsRes.json()
      const collectionsData = await collectionsRes.json()

      if (paperData.papers && paperData.papers.length > 0) {
        setPaper(paperData.papers[0])
        setInteraction(interactionsData.interactions?.[paperId] || null)
        setCollections(collectionsData.collections || [])
      } else {
        showToast('论文不存在', 'error')
        return
      }
    } catch (error) {
      console.error('Error loading paper:', error)
      showToast('加载论文失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateSummary = async () => {
    if (generating) return

    setGenerating(true)
    showToast('正在生成解读，请稍候...', 'success')

    try {
      const response = await fetch('/api/llm/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId }),
      })

      const data = await response.json()

      if (data.success) {
        setSummary(data.summary)
        showToast(
          data.cached ? '已加载缓存的解读' : '解读生成成功！',
          'success'
        )
      } else {
        showToast(`生成失败: ${data.message || data.error}`, 'error')
      }
    } catch (error) {
      console.error('Error generating summary:', error)
      showToast('生成解读失败', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleRewrite = async (tone: RewriteTone) => {
    if (rewriting || !summary) return

    setRewriting(true)
    setSelectedTone(tone)
    showToast(`正在生成${TONE_OPTIONS.find(t => t.value === tone)?.label}...`, 'success')

    try {
      const response = await fetch('/api/llm/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId, tone }),
      })

      const data = await response.json()

      if (data.success) {
        setRewrittenText(prev => ({ ...prev, [tone]: data.rewritten }))
        showToast('重写成功！', 'success')
      } else {
        showToast(`重写失败: ${data.message || data.error}`, 'error')
      }
    } catch (error) {
      console.error('Error rewriting:', error)
      showToast('重写失败', 'error')
    } finally {
      setRewriting(false)
    }
  }

  const handleGenerateScore = async () => {
    if (scoring) return

    setScoring(true)
    showToast('正在评分，请稍候...', 'success')

    try {
      const response = await fetch('/api/llm/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId }),
      })

      const data = await response.json()

      if (data.success) {
        setScore(data.score)
        const cacheMsg = data.cached
          ? `已加载缓存的评分 (${data.cacheAge} 天前生成)`
          : '评分生成成功！'
        showToast(cacheMsg, 'success')
      } else {
        showToast(`评分失败: ${data.message || data.error}`, 'error')
      }
    } catch (error) {
      console.error('Error generating score:', error)
      showToast('评分失败', 'error')
    } finally {
      setScoring(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' })
    }, 5000)
  }

  // UI/UX Pack v3.1 - Like handler (same logic as homepage)
  const handleLike = async () => {
    if (!paper) return
    const currentLiked = interaction?.liked || false
    const newLiked = !currentLiked

    // Optimistic update
    setInteraction(prev => ({ paperId: paper.id, liked: newLiked }))

    try {
      const res = await fetch(`/api/papers/${paper.id}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: newLiked }),
      })

      if (!res.ok) throw new Error('Failed to update')

      showToast(newLiked ? '已喜欢 ❤️' : '取消喜欢', 'success')
    } catch (error) {
      // Rollback on error
      setInteraction(prev => ({ paperId: paper.id, liked: currentLiked }))
      showToast('操作失败，请重试', 'error')
    }
  }

  // UI/UX Pack v3.1 - Save to collection handler
  const handleSaveClick = () => {
    setCollectionDialogOpen(true)
  }

  const handleAddToCollection = async (collectionId: string) => {
    if (!paper) return

    try {
      const res = await fetch(`/api/collections/${collectionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId: paper.id }),
      })

      if (!res.ok) throw new Error('Failed to add')

      showToast('已添加到收藏夹 ⭐', 'success')
      setCollectionDialogOpen(false)
    } catch (error) {
      showToast('添加失败', 'error')
    }
  }

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      showToast('请输入收藏夹名称', 'error')
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
      if (paper) {
        await handleAddToCollection(data.collection.id)
      }

      setNewCollectionName('')
      showToast('收藏夹已创建 ✨', 'success')
    } catch (error) {
      showToast('创建失败', 'error')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">加载中...</div>
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">论文不存在</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === 'success' ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="font-medium">{toast.message}</span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="mb-6 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回列表
        </button>

        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {/* Paper Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {paper.title}
              </h1>

              <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <span className="font-semibold">作者：</span>
                  {paper.authors.join(', ')}
                </div>
                <div>
                  <span className="font-semibold">发布时间：</span>
                  {formatDate(paper.publishedAt)}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {paper.categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
                  >
                    {cat}
                  </span>
                ))}
              </div>

              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  摘要
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {paper.abstract}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleGenerateScore}
                  disabled={scoring}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    scoring
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700'
                  } text-white flex items-center gap-2`}
                >
                  {scoring ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      评分中...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      {score ? '重新评分' : 'AI 评分'}
                    </>
                  )}
                </button>
                <a
                  href={paper.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  下载 PDF
                </a>
                <a
                  href={paper.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  arXiv 原文
                </a>
              </div>
            </div>

            {/* Paper Score Section */}
            {score && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  论文评分
                </h2>

                {/* Overall Score */}
                <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      综合评分
                    </span>
                    <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                      {score.overall}<span className="text-2xl text-gray-500">/100</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-4 rounded-full transition-all"
                      style={{ width: `${score.overall}%` }}
                    ></div>
                  </div>
                </div>

                {/* Rubric Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Novelty */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">新颖性</h3>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {score.rubric.novelty}/25
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-3">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(score.rubric.novelty / 25) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {score.reasons.novelty}
                    </p>
                  </div>

                  {/* Technical */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">技术深度</h3>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {score.rubric.technical}/25
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-3">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(score.rubric.technical / 25) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {score.reasons.technical}
                    </p>
                  </div>

                  {/* Empirical */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">实证研究</h3>
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {score.rubric.empirical}/25
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-3">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${(score.rubric.empirical / 25) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {score.reasons.empirical}
                    </p>
                  </div>

                  {/* Clarity */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">清晰度</h3>
                      <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                        {score.rubric.clarity}/15
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-3">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${(score.rubric.clarity / 15) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {score.reasons.clarity}
                    </p>
                  </div>

                  {/* Reproducibility */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">可复现性</h3>
                      <span className="text-lg font-bold text-red-600 dark:text-red-400">
                        {score.rubric.reproducibility}/10
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-3">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${(score.rubric.reproducibility / 10) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {score.reasons.reproducibility}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* LLM Analysis Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  AI 解读
                </h2>
                <button
                  onClick={handleGenerateSummary}
                  disabled={generating}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    generating
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700'
                  } text-white flex items-center gap-2`}
                >
                  {generating ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      生成中...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {summary ? '重新生成解读' : '生成解读'}
                    </>
                  )}
                </button>
              </div>

              {summary ? (
                <>
                  {/* Section Navigation */}
                  <nav className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap gap-3">
                      {SECTIONS.map((section) => (
                        <a
                          key={section.key}
                          href={`#${section.anchor}`}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {section.title}
                        </a>
                      ))}
                    </div>
                  </nav>

                  {/* Sections */}
                  {SECTIONS.map((section) => (
                    <section
                      key={section.key}
                      id={section.anchor}
                      className="mb-8 scroll-mt-4"
                    >
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <span className="w-1 h-6 bg-purple-600 rounded"></span>
                        {section.title}
                      </h3>
                      <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
                        {summary[section.key] ? (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: summary[section.key].replace(/\n/g, '<br />'),
                            }}
                          />
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 italic">
                            暂无内容
                          </p>
                        )}
                      </div>
                    </section>
                  ))}

                  {/* Atmosphere Rewriting */}
                  <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                      氛围写作
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      选择不同的语气风格，重新演绎论文概述
                    </p>

                    <div className="flex flex-wrap gap-3 mb-6">
                      {TONE_OPTIONS.map((tone) => (
                        <button
                          key={tone.value}
                          onClick={() => handleRewrite(tone.value)}
                          disabled={rewriting}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            selectedTone === tone.value && rewrittenText[tone.value]
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          } ${rewriting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {tone.label}
                        </button>
                      ))}
                    </div>

                    {rewrittenText[selectedTone] && (
                      <div className="p-6 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <span className="font-semibold text-purple-900 dark:text-purple-200">
                            {TONE_OPTIONS.find(t => t.value === selectedTone)?.label}版本
                          </span>
                        </div>
                        <p className="text-purple-900 dark:text-purple-100 leading-relaxed whitespace-pre-wrap">
                          {rewrittenText[selectedTone]}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  点击"生成解读"按钮，使用 AI 深度分析这篇论文
                </div>
              )}
            </div>
          </div>

          {/* Floating Action Bar (UI/UX Pack v3.1 - Functional favorites) */}
          <div className="w-16">
            <div className="sticky top-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-2 flex flex-col gap-4">
              {/* Like */}
              <button
                onClick={handleLike}
                className={`p-3 rounded-lg transition-colors ${
                  interaction?.liked
                    ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                }`}
                title="喜欢"
              >
                <svg className="h-6 w-6" fill={interaction?.liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>

              {/* Bookmark */}
              <button
                onClick={handleSaveClick}
                className="p-3 text-gray-600 dark:text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                title="收藏"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>

              {/* Close */}
              <button
                onClick={() => router.push('/')}
                className="p-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="关闭"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collection Dialog (UI/UX Pack v3.1 - Same as homepage) */}
      {collectionDialogOpen && paper && (
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
                {paper.title}
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
    </main>
  )
}
