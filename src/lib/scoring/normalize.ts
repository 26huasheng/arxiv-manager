/**
 * Score normalization utilities
 * Feature Pack v2.7 - GLM Scoring 2.0
 */

export interface ScoreAnchor {
  dimension: string
  mean: number
  std: number
  count: number
}

export function normalizeScore(
  raw: number,
  anchor: ScoreAnchor | null,
  scale: { min: number; max: number } = { min: 0, max: 100 }
): number {
  if (!anchor || anchor.count < 3) {
    return ((raw - 1) / 4) * 100
  }

  const targetMean = 50
  const targetStd = 15
  const z = (raw - anchor.mean) / anchor.std
  const normalized = z * targetStd + targetMean
  return Math.max(scale.min, Math.min(scale.max, normalized))
}

export async function loadAnchors(
  filePath: string = 'data/score_anchors.json'
): Promise<Record<string, ScoreAnchor>> {
  try {
    const fs = await import('fs/promises')
    const data = await fs.readFile(filePath, 'utf-8')
    const anchors = JSON.parse(data) as ScoreAnchor[]
    const map: Record<string, ScoreAnchor> = {}
    anchors.forEach((anchor) => {
      map[anchor.dimension] = anchor
    })
    return map
  } catch (error) {
    console.warn('[Normalize] Failed to load anchors, using linear mapping:', error)
    return {}
  }
}

export function updateAnchor(
  existing: ScoreAnchor | null,
  newScore: number,
  dimension: string
): ScoreAnchor {
  if (!existing) {
    return { dimension, mean: newScore, std: 0, count: 1 }
  }
  const count = existing.count + 1
  const delta = newScore - existing.mean
  const mean = existing.mean + delta / count
  const delta2 = newScore - mean
  const m2 = existing.std ** 2 * existing.count + delta * delta2
  const variance = m2 / count
  const std = Math.sqrt(variance)
  return { dimension, mean, std: std || 0.01, count }
}
