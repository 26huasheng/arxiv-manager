import fs from 'fs/promises'
import path from 'path'
import { Paper, PaperInteraction, Embedding, PaperSummary, PaperScore, Collection } from '@/src/types/paper'

const DATA_DIR = path.join(process.cwd(), 'data')

export class JsonStore {
  private static async readJson<T>(filename: string): Promise<T> {
    try {
      const filePath = path.join(DATA_DIR, filename)
      const content = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.error(`Error reading ${filename}:`, error)
      throw error
    }
  }

  private static async writeJson<T>(filename: string, data: T): Promise<void> {
    try {
      const filePath = path.join(DATA_DIR, filename)
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
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
      ...interaction,
    }
    return this.saveInteractions(interactions)
  }

  // Embeddings
  static async getEmbeddings(): Promise<Record<string, Embedding>> {
    return this.readJson<Record<string, Embedding>>('embeddings.json')
  }

  static async saveEmbeddings(embeddings: Record<string, Embedding>): Promise<void> {
    return this.writeJson('embeddings.json', embeddings)
  }

  static async updateEmbedding(paperId: string, embedding: Partial<Embedding>): Promise<void> {
    const embeddings = await this.getEmbeddings()
    embeddings[paperId] = {
      ...embeddings[paperId],
      paperId,
      ...embedding,
    }
    return this.saveEmbeddings(embeddings)
  }

  // Summaries
  static async getSummaries(): Promise<Record<string, PaperSummary>> {
    return this.readJson<Record<string, PaperSummary>>('summaries.json')
  }

  static async saveSummaries(summaries: Record<string, PaperSummary>): Promise<void> {
    return this.writeJson('summaries.json', summaries)
  }

  static async updateSummary(paperId: string, summary: PaperSummary): Promise<void> {
    const summaries = await this.getSummaries()
    summaries[paperId] = summary
    return this.saveSummaries(summaries)
  }

  static async getSummary(paperId: string): Promise<PaperSummary | null> {
    const summaries = await this.getSummaries()
    return summaries[paperId] || null
  }

  // Scores
  static async getScores(): Promise<Record<string, PaperScore>> {
    return this.readJson<Record<string, PaperScore>>('scores.json')
  }

  static async saveScores(scores: Record<string, PaperScore>): Promise<void> {
    return this.writeJson('scores.json', scores)
  }

  static async updateScore(paperId: string, score: PaperScore): Promise<void> {
    const scores = await this.getScores()
    scores[paperId] = score
    return this.saveScores(scores)
  }

  static async getScore(paperId: string): Promise<PaperScore | null> {
    const scores = await this.getScores()
    return scores[paperId] || null
  }

  // Collections
  static async getCollections(): Promise<Collection[]> {
    return this.readJson<Collection[]>('collections.json')
  }

  static async saveCollections(collections: Collection[]): Promise<void> {
    return this.writeJson('collections.json', collections)
  }

  static async addCollection(collection: Collection): Promise<void> {
    const collections = await this.getCollections()
    collections.push(collection)
    return this.saveCollections(collections)
  }

  static async updateCollection(id: string, updates: Partial<Collection>): Promise<void> {
    const collections = await this.getCollections()
    const index = collections.findIndex(c => c.id === id)
    if (index !== -1) {
      collections[index] = { ...collections[index], ...updates, updatedAt: new Date().toISOString() }
      return this.saveCollections(collections)
    }
  }

  static async deleteCollection(id: string): Promise<void> {
    const collections = await this.getCollections()
    const filtered = collections.filter(c => c.id !== id)
    return this.saveCollections(filtered)
  }

  static async getCollection(id: string): Promise<Collection | null> {
    const collections = await this.getCollections()
    return collections.find(c => c.id === id) || null
  }

  static async addPaperToCollection(collectionId: string, paperId: string): Promise<void> {
    const collection = await this.getCollection(collectionId)
    if (collection && !collection.paperIds.includes(paperId)) {
      collection.paperIds.push(paperId)
      await this.updateCollection(collectionId, { paperIds: collection.paperIds })
    }
  }

  static async removePaperFromCollection(collectionId: string, paperId: string): Promise<void> {
    const collection = await this.getCollection(collectionId)
    if (collection) {
      collection.paperIds = collection.paperIds.filter(id => id !== paperId)
      await this.updateCollection(collectionId, { paperIds: collection.paperIds })
    }
  }
}
