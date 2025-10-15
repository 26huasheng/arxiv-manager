export interface Paper {
  id: string
  /** 原始 arXiv 号（包含版本，如 2501.12345v2）。可选，旧数据为 undefined */
  arxivId?: string
  title: string
  authors: string[]
  categories: string[]
  abstract: string
  pdfUrl: string
  sourceUrl: string
  publishedAt: string
  updatedAt?: string
  /** 数据来源（如 'arxiv', 'mock'）。可选，旧数据为 undefined */
  source?: string
}

export interface PaperInteraction {
  paperId: string
  liked?: boolean
  saved?: boolean
  rating?: number // 1-5 stars
  collections?: string[] // Collection IDs
  lastViewed?: string
}

export interface Collection {
  id: string
  name: string
  description?: string
  paperIds: string[]
  createdAt: string
  updatedAt: string
}

export interface Embedding {
  paperId: string
  vector: number[]
  dim: number
  updatedAt: string
}

export interface VectorSearchResult extends Paper {
  score: number
  why: string
}

export interface PaperSummary {
  paperId: string
  overview: string // 概述
  background: string // 研究背景
  innovation: string // 创新方法
  results: string // 实验与成果
  strengths: string // 优点
  limitations: string // 局限
  reproduction: string // 复现要点
  generatedAt: string
}

export interface PaperScore {
  paperId: string
  rubric: {
    novelty: number // 新颖性 (0-25)
    technical: number // 技术深度 (0-25)
    empirical: number // 实证 (0-25)
    clarity: number // 清晰度 (0-15)
    reproducibility: number // 复现性 (0-10)
  }
  reasons: {
    novelty: string
    technical: string
    empirical: string
    clarity: string
    reproducibility: string
  }
  overall: number // 总分 (0-100)
  updatedAt: string
}
