import fs from 'fs/promises'
import path from 'path'
import { Paper, PaperInteraction, Embedding, PaperSummary, PaperScore, Collection } from '@/src/types/paper'

// 原有常量保留（本地/CI 仍写这里）
const DATA_DIR = path.join(process.cwd(), 'data')
// 新增：Vercel 唯一可写目录
const TMP_DIR = '/tmp/arxiv-manager'

// 线上判定：Vercel 默认会注入 VERCEL=1；也支持你手动设置 READ_ONLY_FS=1
function isReadOnlyFS() {
  return process.env.VERCEL === '1' || process.env.READ_ONLY_FS === '1'
}

// 读取优先级：先 /tmp（刷新后的最新），再仓库 data/，最后抛错
async function readJsonPreferTmp<T>(filename: string): Promise<T> {
  // 1) /tmp 优先（线上刷新写在这里）
  try {
    const pTmp = path.join(TMP_DIR, filename)
    const content = await fs.readFile(pTmp, 'utf-8')
    return JSON.parse(content)
  } catch {
    // ignore
  }
  // 2) 回退仓库 data/
  const pRepo = path.join(DATA_DIR, filename)
  const content = await fs.readFile(pRepo, 'utf-8')
  return JSON.parse(content)
}

// 写入位置：线上写 /tmp，本地/CI 写 data
async function writeJsonSmart<T>(filename: string, data: T): Promise<void> {
  if (isReadOnlyFS()) {
    await fs.mkdir(TMP_DIR, { recursive: true })
    const p = path.join(TMP_DIR, filename)
    await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf-8')
    return
  }
  await fs.mkdir(DATA_DIR, { recursive: true })
  const p = path.join(DATA_DIR, filename)
  await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf-8')
}

export class JsonStore {
  private static async readJson<T>(filename: string): Promise<T> {
    try {
      return await readJsonPreferTmp<T>(filename)
    } catch (error) {
      console.error(`Error reading ${filename}:`, error)
      throw error
    }
  }

  private static async writeJson<T>(filename: string, data: T): Promise<void> {
    try {
      await writeJsonSmart(filename, data)
    } catch (error) {
      console.error(`Error writing ${filename}:`, error)
      throw error
    }
  }

  // Papers
  static async getPapers(): Promise<Paper[]> {
    return this.readJson<Paper[]>('papers.json')
  }

  static async savePapers(papers: Paper[]): Promise<void> {
    return this.writeJson('papers.json', papers)
  }

  static async addPaper(paper: Paper): Promise<void> {
    const papers = await this.getPapers()
    papers.push(paper)
    return this.savePapers(papers)
  }

  static async updatePaper(id: string, updates: Partial<Paper>): Promise<void> {
    const papers = await this.getPapers()
    const index = papers.findIndex(p => p.id === id)
    if (index !== -1) {
      papers[index] = { ...papers[index], ...updates }
      return this.savePapers(papers)
    }
  }

  // Interactions
  static async getInteractions(): Promise<Record<string, PaperInteraction>> {
    return this.readJson<Record<string, PaperInteraction>>('interactions.json')
  }

  static async saveInteractions(interactions: Record<string, PaperInteraction>): Promise<void> {
    return this.writeJson('interactions.json', interactions)
  }

  static async updateInteraction(paperId: string, interaction: Partial<PaperInteraction>): Promise<void> {
    const interactions = await this.getInteractions()
    interactions[paperId] = {
      ...interactions[paperId],
      paperId,
      ...
