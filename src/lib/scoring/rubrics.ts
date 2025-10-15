/**
 * Scoring rubrics for paper evaluation
 * Feature Pack v2.7 - GLM Scoring 2.0
 */

export interface Dimension {
  name: string
  weight: number
  description: string
  anchors: {
    score: number
    label: string
    criteria: string
  }[]
}

export interface Rubric {
  id: string
  name: string
  description: string
  dimensions: Dimension[]
}

/**
 * Balanced V1 - 默认评分标准（与现有 5 维一致）
 */
export const BALANCED_V1: Rubric = {
  id: 'balanced_v1',
  name: '均衡评分 V1',
  description: '适用于大多数论文的通用评分标准，平衡各个维度',
  dimensions: [
    {
      name: 'novelty',
      weight: 0.25,
      description: '新颖性 - 是否提出新的想法、方法或视角',
      anchors: [
        {
          score: 1,
          label: '较弱',
          criteria: '主要重复已有工作，缺乏新意',
        },
        {
          score: 3,
          label: '中等',
          criteria: '在现有方法上有改进，但突破有限',
        },
        {
          score: 5,
          label: '优秀',
          criteria: '提出创新性方法或视角，有显著突破',
        },
      ],
    },
    {
      name: 'technical_depth',
      weight: 0.25,
      description: '技术深度 - 方法的严谨性和技术复杂度',
      anchors: [
        {
          score: 1,
          label: '较弱',
          criteria: '方法简单，缺乏理论支撑',
        },
        {
          score: 3,
          label: '中等',
          criteria: '方法合理，有一定技术深度',
        },
        {
          score: 5,
          label: '优秀',
          criteria: '方法严谨，技术难度高，理论完善',
        },
      ],
    },
    {
      name: 'empirical_study',
      weight: 0.25,
      description: '实证研究 - 实验设计和结果的充分性',
      anchors: [
        {
          score: 1,
          label: '较弱',
          criteria: '实验不足或结果不具说服力',
        },
        {
          score: 3,
          label: '中等',
          criteria: '实验设计合理，结果有一定说服力',
        },
        {
          score: 5,
          label: '优秀',
          criteria: '实验全面，结果充分证明主张',
        },
      ],
    },
    {
      name: 'clarity',
      weight: 0.15,
      description: '清晰度 - 论文的可读性和组织结构',
      anchors: [
        {
          score: 1,
          label: '较弱',
          criteria: '表述混乱，难以理解',
        },
        {
          score: 3,
          label: '中等',
          criteria: '表述清晰，结构合理',
        },
        {
          score: 5,
          label: '优秀',
          criteria: '表述优秀，逻辑严密，易于理解',
        },
      ],
    },
    {
      name: 'reproducibility',
      weight: 0.1,
      description: '可复现性 - 是否提供足够的细节和资源',
      anchors: [
        {
          score: 1,
          label: '较弱',
          criteria: '缺乏实现细节，难以复现',
        },
        {
          score: 3,
          label: '中等',
          criteria: '提供基本细节，可部分复现',
        },
        {
          score: 5,
          label: '优秀',
          criteria: '提供完整代码和数据，完全可复现',
        },
      ],
    },
  ],
}

/**
 * Expert V1 - 专家评分标准（对齐顶会评审标准）
 */
export const EXPERT_V1: Rubric = {
  id: 'expert_v1',
  name: '专家评分 V1',
  description: '对齐 NeurIPS/ICLR 等顶会评审标准，适用于高质量论文评估',
  dimensions: [
    {
      name: 'originality',
      weight: 0.25,
      description: '原创性 - 研究的独创性和新颖性',
      anchors: [
        {
          score: 1,
          label: 'Incremental',
          criteria: 'Incremental improvement over existing work',
        },
        {
          score: 3,
          label: 'Moderate',
          criteria: 'Solid contribution with some novel elements',
        },
        {
          score: 5,
          label: 'Strong',
          criteria: 'Highly original work with significant novelty',
        },
      ],
    },
    {
      name: 'technical_quality',
      weight: 0.25,
      description: '技术质量 - 方法的正确性、严谨性和完整性',
      anchors: [
        {
          score: 1,
          label: 'Weak',
          criteria: 'Technical issues or insufficient rigor',
        },
        {
          score: 3,
          label: 'Good',
          criteria: 'Sound technical approach with minor gaps',
        },
        {
          score: 5,
          label: 'Excellent',
          criteria: 'Rigorous, well-executed technical work',
        },
      ],
    },
    {
      name: 'significance',
      weight: 0.2,
      description: '重要性 - 对领域的影响和贡献',
      anchors: [
        {
          score: 1,
          label: 'Limited',
          criteria: 'Limited impact or narrow applicability',
        },
        {
          score: 3,
          label: 'Moderate',
          criteria: 'Useful contribution to the field',
        },
        {
          score: 5,
          label: 'High',
          criteria: 'Significant impact with broad implications',
        },
      ],
    },
    {
      name: 'clarity',
      weight: 0.15,
      description: '清晰度 - 论文的可读性和表述质量',
      anchors: [
        {
          score: 1,
          label: 'Poor',
          criteria: 'Difficult to follow or poorly organized',
        },
        {
          score: 3,
          label: 'Good',
          criteria: 'Clear and well-structured',
        },
        {
          score: 5,
          label: 'Excellent',
          criteria: 'Exceptionally clear and well-written',
        },
      ],
    },
    {
      name: 'reproducibility',
      weight: 0.15,
      description: '可复现性 - 符合 ML Reproducibility Checklist',
      anchors: [
        {
          score: 1,
          label: 'Poor',
          criteria: 'Missing critical details for reproduction',
        },
        {
          score: 3,
          label: 'Adequate',
          criteria: 'Sufficient details, some gaps remain',
        },
        {
          score: 5,
          label: 'Excellent',
          criteria: 'Fully reproducible with code and data',
        },
      ],
    },
  ],
}

/**
 * Get rubric by ID
 */
export function getRubric(id: string): Rubric {
  const rubrics: Record<string, Rubric> = {
    balanced_v1: BALANCED_V1,
    expert_v1: EXPERT_V1,
  }

  return rubrics[id] || BALANCED_V1
}

/**
 * List all available rubrics
 */
export function listRubrics(): Rubric[] {
  return [BALANCED_V1, EXPERT_V1]
}
