/**
 * Prompt generation for paper scoring
 * Feature Pack v2.7 - GLM Scoring 2.0
 */

import { Rubric } from './rubrics'

export interface PaperEvidence {
  title: string
  abstract: string
  sections?: string[]
  citations?: string[]
  datasets?: string[]
  code_link?: string
}

export function generateScoringPrompt(
  evidence: PaperEvidence,
  rubric: Rubric
): string {
  const dimensionsDesc = rubric.dimensions
    .map((dim) => {
      const anchorsText = dim.anchors
        .map((a) => `    - ${a.score}分 (${a.label}): ${a.criteria}`)
        .join('\n')
      return `  - **${dim.name}** (权重 ${dim.weight}): ${dim.description}\n${anchorsText}`
    })
    .join('\n\n')

  return `# 论文评分任务

你是一位资深学术评审专家。请根据以下评分标准对论文进行客观、严谨的评估。

## 评分标准: ${rubric.name}
${rubric.description}

### 评分维度
${dimensionsDesc}

## 论文信息

**标题**: ${evidence.title}

**摘要**:
${evidence.abstract}

${evidence.sections && evidence.sections.length > 0 ? `**关键段落**:\n${evidence.sections.join('\n\n')}` : ''}
${evidence.citations && evidence.citations.length > 0 ? `**引用**: ${evidence.citations.join(', ')}` : ''}
${evidence.datasets && evidence.datasets.length > 0 ? `**数据集**: ${evidence.datasets.join(', ')}` : ''}
${evidence.code_link ? `**代码链接**: ${evidence.code_link}` : ''}

## 评分要求

1. **严格基于证据**: 每个维度的评分必须从论文原文中引用**具体的短句或短语**（≤ 20字）作为证据。格式: ["原文引用1", "原文引用2"]
2. **不可杜撰**: 若论文中没有明确提到某个方面（如代码、数据集），标注为 "insufficient-evidence"，不要猜测或假设。
3. **使用锚点**: 参考每个维度的 1/3/5 分锚点描述，给出最贴切的分数（可以是 1-5 之间的任意整数）。
4. **综合建议**: 给出接收建议 (strong-accept | accept | borderline | reject)。

## 输出格式（严格 JSON）

\`\`\`json
{
  "dimension_scores": {
    "dimension_name": {
      "score": 1-5的整数,
      "evidence": ["原文引用1", "原文引用2"] 或 ["insufficient-evidence"]
    }
  },
  "concerns": ["关注点1", "关注点2"],
  "recommendation": "strong-accept" | "accept" | "borderline" | "reject"
}
\`\`\`

请开始评分，输出 JSON。`
}

export interface DimensionScore {
  score: number
  evidence: string[]
}

export interface ScoringResult {
  dimension_scores: Record<string, DimensionScore>
  concerns: string[]
  recommendation: 'strong-accept' | 'accept' | 'borderline' | 'reject'
}

export function parseScoringResult(responseText: string): ScoringResult {
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonText = jsonMatch ? jsonMatch[1] : responseText

  try {
    const parsed = JSON.parse(jsonText.trim())
    if (!parsed.dimension_scores || typeof parsed.dimension_scores !== 'object') {
      throw new Error('Missing or invalid dimension_scores')
    }
    if (!parsed.recommendation) {
      throw new Error('Missing recommendation')
    }
    return parsed as ScoringResult
  } catch (error) {
    console.error('[Scoring] Failed to parse result:', error)
    throw new Error(`Invalid scoring result format: ${error}`)
  }
}
