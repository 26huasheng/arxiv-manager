import { NextRequest, NextResponse } from 'next/server'
import { JsonStore } from '@/src/lib/store'
import { getGLMClient } from '@/src/lib/glm'
import { PaperScore } from '@/src/types/paper'

const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function POST(request: NextRequest) {
  try {
    const { paperId } = await request.json()

    if (!paperId) {
      return NextResponse.json(
        { error: 'paperId is required' },
        { status: 400 }
      )
    }

    console.log(`Generating score for paper: ${paperId}`)

    // Load paper
    const papers = await JsonStore.getPapers()
    const paper = papers.find((p) => p.id === paperId)

    if (!paper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      )
    }

    // Check if score already exists and is still valid (within 7 days)
    const existingScore = await JsonStore.getScore(paperId)
    if (existingScore) {
      const ageMs = Date.now() - new Date(existingScore.updatedAt).getTime()
      if (ageMs < CACHE_DURATION_MS) {
        const remainingDays = Math.ceil((CACHE_DURATION_MS - ageMs) / (24 * 60 * 60 * 1000))
        console.log(`Score cached for ${paperId} (${remainingDays} days remaining)`)
        return NextResponse.json({
          success: true,
          score: existingScore,
          cached: true,
          cacheAge: Math.floor(ageMs / (24 * 60 * 60 * 1000)),
        })
      }
    }

    // Prepare paper context
    const paperContext = `
Title: ${paper.title}

Authors: ${paper.authors.join(', ')}

Abstract:
${paper.abstract}

Categories: ${paper.categories.join(', ')}
`.trim()

    // System prompt for scoring
    const systemPrompt = `你是一位资深的学术论文评审专家。请根据以下评分标准（Rubric）对论文进行客观、专业的评分。

评分标准（总分100分）：
1. 新颖性 (Novelty) - 25分
   - 研究问题是否新颖
   - 方法或视角是否有创新
   - 是否对领域有新的贡献

2. 技术深度 (Technical Depth) - 25分
   - 技术方法是否扎实
   - 理论分析是否充分
   - 技术实现的复杂度和质量

3. 实证研究 (Empirical Evidence) - 25分
   - 实验设计是否合理
   - 数据集和评估指标是否充分
   - 结果是否有说服力

4. 清晰度 (Clarity) - 15分
   - 论文结构是否清晰
   - 表达是否准确易懂
   - 图表是否有效

5. 可复现性 (Reproducibility) - 10分
   - 方法描述是否详细
   - 是否提供代码或数据
   - 他人能否复现结果

请严格按照以下 JSON 格式输出（不要添加任何其他文本）：

{
  "novelty": <0-25>,
  "technical": <0-25>,
  "empirical": <0-25>,
  "clarity": <0-15>,
  "reproducibility": <0-10>,
  "reason_novelty": "<简短评价，50字以内>",
  "reason_technical": "<简短评价，50字以内>",
  "reason_empirical": "<简短评价，50字以内>",
  "reason_clarity": "<简短评价，50字以内>",
  "reason_reproducibility": "<简短评价，50字以内>"
}

要求：
1. 分数必须是整数
2. 评价要客观、简洁
3. 基于摘要内容评估，合理推测`

    const userPrompt = `请评分以下论文：

${paperContext}`

    console.log('Calling GLM API for scoring...')

    // Call GLM to generate score
    const glmClient = getGLMClient()
    const response = await glmClient.callChat(systemPrompt, userPrompt, 0.3) // Low temperature for consistency

    console.log('GLM scoring response received, parsing...')

    // Parse response
    let scoreData: any
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      scoreData = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse GLM response:', response)
      throw new Error('Failed to parse scoring response')
    }

    // Validate and construct score object
    const rubric = {
      novelty: Math.min(25, Math.max(0, parseInt(scoreData.novelty) || 0)),
      technical: Math.min(25, Math.max(0, parseInt(scoreData.technical) || 0)),
      empirical: Math.min(25, Math.max(0, parseInt(scoreData.empirical) || 0)),
      clarity: Math.min(15, Math.max(0, parseInt(scoreData.clarity) || 0)),
      reproducibility: Math.min(10, Math.max(0, parseInt(scoreData.reproducibility) || 0)),
    }

    const overall = rubric.novelty + rubric.technical + rubric.empirical + rubric.clarity + rubric.reproducibility

    const score: PaperScore = {
      paperId,
      rubric,
      reasons: {
        novelty: scoreData.reason_novelty || '未提供评价',
        technical: scoreData.reason_technical || '未提供评价',
        empirical: scoreData.reason_empirical || '未提供评价',
        clarity: scoreData.reason_clarity || '未提供评价',
        reproducibility: scoreData.reason_reproducibility || '未提供评价',
      },
      overall,
      updatedAt: new Date().toISOString(),
    }

    // Save to scores.json
    await JsonStore.updateScore(paperId, score)

    console.log(`Score saved for ${paperId}: ${overall}/100`)

    return NextResponse.json({
      success: true,
      score,
      cached: false,
    })
  } catch (error) {
    console.error('Error generating score:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate score',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
