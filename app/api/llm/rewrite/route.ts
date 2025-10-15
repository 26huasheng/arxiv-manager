import { NextRequest, NextResponse } from 'next/server'
import { JsonStore } from '@/src/lib/store'
import { getGLMClient } from '@/src/lib/glm'

export type RewriteTone = 'popular' | 'weekly' | 'social' | 'poster'

const TONE_PROMPTS: Record<RewriteTone, { system: string; instruction: string }> = {
  popular: {
    system: '你是一位科普作家，擅长将学术内容转化为通俗易懂、生动有趣的科普文章。',
    instruction: '请将这篇论文的概述改写为科普风格，要求：\n1. 使用通俗易懂的语言，避免专业术语\n2. 用生动的比喻和例子帮助理解\n3. 保持轻松有趣的语气\n4. 长度控制在150-200字\n5. 突出研究的实际意义和价值',
  },
  weekly: {
    system: '你是一位技术周报编辑，擅长撰写简洁、专业的技术动态报告。',
    instruction: '请将这篇论文的概述改写为技术周报风格，要求：\n1. 使用专业但简洁的语言\n2. 突出核心技术点和创新之处\n3. 采用客观、中立的报道口吻\n4. 长度控制在100-150字\n5. 适合技术团队快速了解前沿动态',
  },
  social: {
    system: '你是一位社交媒体运营者，擅长创作吸引眼球、引发讨论的内容。',
    instruction: '请将这篇论文的概述改写为社交媒体风格，要求：\n1. 开头要有吸引力，激发好奇心\n2. 语言轻松活泼，可以使用emoji\n3. 突出研究的亮点和话题性\n4. 长度控制在80-120字\n5. 引导用户关注和互动',
  },
  poster: {
    system: '你是一位学术海报设计师，擅长用简洁有力的文字传达研究核心。',
    instruction: '请将这篇论文的概述改写为学术海报风格，要求：\n1. 语言简洁有力，每句话都是关键信息\n2. 使用短句和列表，便于快速阅读\n3. 突出研究问题、方法和结果\n4. 长度控制在60-100字\n5. 适合在海报上展示，一眼抓住重点',
  },
}

export async function POST(request: NextRequest) {
  try {
    const { paperId, tone } = await request.json()

    if (!paperId || !tone) {
      return NextResponse.json(
        { error: 'paperId and tone are required' },
        { status: 400 }
      )
    }

    if (!['popular', 'weekly', 'social', 'poster'].includes(tone)) {
      return NextResponse.json(
        { error: 'Invalid tone. Must be: popular, weekly, social, or poster' },
        { status: 400 }
      )
    }

    console.log(`Rewriting summary for paper ${paperId} in ${tone} tone`)

    // Load paper and summary
    const [papers, summary] = await Promise.all([
      JsonStore.getPapers(),
      JsonStore.getSummary(paperId),
    ])

    const paper = papers.find((p) => p.id === paperId)

    if (!paper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      )
    }

    if (!summary) {
      return NextResponse.json(
        { error: 'Summary not found. Please generate summary first.' },
        { status: 404 }
      )
    }

    // Prepare context
    const context = `
论文标题：${paper.title}

原始概述：
${summary.overview}
`.trim()

    const toneConfig = TONE_PROMPTS[tone as RewriteTone]

    console.log('Calling GLM API for rewriting...')

    // Call GLM to rewrite
    const glmClient = getGLMClient()
    const rewritten = await glmClient.callChat(
      toneConfig.system,
      `${toneConfig.instruction}\n\n${context}`,
      0.8 // Higher temperature for more creative rewriting
    )

    console.log('Rewriting completed')

    return NextResponse.json({
      success: true,
      tone,
      rewritten: rewritten.trim(),
    })
  } catch (error) {
    console.error('Error rewriting summary:', error)
    return NextResponse.json(
      {
        error: 'Failed to rewrite summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
