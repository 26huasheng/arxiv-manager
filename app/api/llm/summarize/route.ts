import { NextRequest, NextResponse } from 'next/server'
import { JsonStore } from '@/src/lib/store'
import { getGLMClient } from '@/src/lib/glm'
import { PaperSummary } from '@/src/types/paper'

export async function POST(request: NextRequest) {
  try {
    const { paperId } = await request.json()

    if (!paperId) {
      return NextResponse.json(
        { error: 'paperId is required' },
        { status: 400 }
      )
    }

    console.log(`Generating summary for paper: ${paperId}`)

    // Load paper
    const papers = await JsonStore.getPapers()
    const paper = papers.find((p) => p.id === paperId)

    if (!paper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      )
    }

    // Check if summary already exists
    const existingSummary = await JsonStore.getSummary(paperId)
    if (existingSummary) {
      console.log(`Summary already exists for ${paperId}`)
      return NextResponse.json({
        success: true,
        summary: existingSummary,
        cached: true,
      })
    }

    // Prepare paper context
    const paperContext = `
Title: ${paper.title}

Authors: ${paper.authors.join(', ')}

Categories: ${paper.categories.join(', ')}

Abstract:
${paper.abstract}
`.trim()

    // System prompt for structured analysis
    const systemPrompt = `你是一位资深的AI研究员和论文解读专家。你的任务是深入分析学术论文，并提供结构化的专业解读。

请严格按照以下格式输出，每个部分用 "### 标题" 标记，内容为 Markdown 格式：

### 概述
（2-3句话概括论文的核心贡献和研究价值）

### 研究背景
（阐述该研究所处的学术背景、要解决的问题、以及为什么这个问题重要）

### 创新方法
（详细说明论文提出的技术方法、算法或架构，突出创新点）

### 实验与成果
（总结关键实验设置、数据集、评估指标和主要结果）

### 优点
（列出该研究的主要优势和亮点）

### 局限
（客观指出研究的不足之处或潜在问题）

### 复现要点
（提供实现该方法的关键技术细节和注意事项）

要求：
1. 语言专业但易懂，避免过度学术化
2. 每个部分内容充实，至少3-5句话
3. 使用 Markdown 格式，可以使用列表、加粗等
4. 保持客观中立的学术态度`

    const userPrompt = `请对以下论文进行结构化解读：

${paperContext}`

    console.log('Calling GLM API...')

    // Call GLM to generate summary
    const glmClient = getGLMClient()
    const response = await glmClient.callChat(systemPrompt, userPrompt, 0.7)

    console.log('GLM response received, parsing sections...')

    // Parse response into structured format
    const sections = parseSections(response)

    // Create summary object
    const summary: PaperSummary = {
      paperId,
      overview: sections.overview || '',
      background: sections.background || '',
      innovation: sections.innovation || '',
      results: sections.results || '',
      strengths: sections.strengths || '',
      limitations: sections.limitations || '',
      reproduction: sections.reproduction || '',
      generatedAt: new Date().toISOString(),
    }

    // Save to summaries.json
    await JsonStore.updateSummary(paperId, summary)

    console.log(`Summary saved for ${paperId}`)

    return NextResponse.json({
      success: true,
      summary,
      cached: false,
    })
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Parse GLM response into structured sections
 */
function parseSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {
    overview: '',
    background: '',
    innovation: '',
    results: '',
    strengths: '',
    limitations: '',
    reproduction: '',
  }

  // Split by ### headers
  const lines = text.split('\n')
  let currentSection = ''
  let currentContent: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Check if this is a section header
    if (trimmed.startsWith('###')) {
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim()
      }

      // Start new section
      const header = trimmed.replace(/^###\s*/, '').toLowerCase()
      if (header.includes('概述')) {
        currentSection = 'overview'
      } else if (header.includes('背景')) {
        currentSection = 'background'
      } else if (header.includes('创新') || header.includes('方法')) {
        currentSection = 'innovation'
      } else if (header.includes('实验') || header.includes('成果')) {
        currentSection = 'results'
      } else if (header.includes('优点')) {
        currentSection = 'strengths'
      } else if (header.includes('局限')) {
        currentSection = 'limitations'
      } else if (header.includes('复现')) {
        currentSection = 'reproduction'
      }
      currentContent = []
    } else if (currentSection && trimmed) {
      currentContent.push(line)
    }
  }

  // Save last section
  if (currentSection && currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim()
  }

  return sections
}
