import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { Paper } from '../src/types/paper'

/**
 * Normalize text: remove excessive whitespace and newlines
 */
function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim()
}

/**
 * Regenerate sourceUrl and pdfUrl from arxivId
 */
function regenerateUrls(paper: Paper): Paper {
  if (!paper.arxivId) {
    console.warn(`Paper ${paper.id} has no arxivId, skipping URL regeneration`)
    return paper
  }

  return {
    ...paper,
    title: normalizeText(paper.title),
    abstract: normalizeText(paper.abstract),
    sourceUrl: `https://arxiv.org/abs/${paper.arxivId}`,
    pdfUrl: `https://arxiv.org/pdf/${paper.arxivId}.pdf`,
  }
}

/**
 * Validate URL by sending HEAD request
 */
async function validateUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch (err) {
    return false
  }
}

/**
 * Repair links in data/papers.json
 */
async function repairLinks() {
  const filePath = resolve(process.cwd(), 'data/papers.json')

  if (!existsSync(filePath)) {
    console.error('❌ data/papers.json not found')
    process.exit(1)
  }

  console.log('Loading papers...')
  const papers: Paper[] = JSON.parse(readFileSync(filePath, 'utf-8'))
  console.log(`Loaded ${papers.length} papers`)

  console.log('\nRegenerating URLs and normalizing text...')
  let repaired = 0
  const repairedPapers = papers.map(paper => {
    const updated = regenerateUrls(paper)
    if (
      updated.sourceUrl !== paper.sourceUrl ||
      updated.pdfUrl !== paper.pdfUrl ||
      updated.title !== paper.title ||
      updated.abstract !== paper.abstract
    ) {
      repaired++
    }
    return updated
  })

  console.log(`Repaired ${repaired} papers`)

  // Optional: Validate links
  const validateLinks = process.env.VALIDATE_LINKS === '1'
  let removed = 0

  if (validateLinks) {
    console.log('\nValidating sourceUrls...')
    const validPapers: Paper[] = []

    for (let i = 0; i < repairedPapers.length; i++) {
      const paper = repairedPapers[i]
      const progress = `[${i + 1}/${repairedPapers.length}]`

      const isValid = await validateUrl(paper.sourceUrl)
      if (isValid) {
        validPapers.push(paper)
        console.log(`${progress} ✓ ${paper.arxivId}`)
      } else {
        console.log(`${progress} ✗ ${paper.arxivId} (invalid, removing)`)
        removed++
      }

      // Rate limiting: wait 500ms between requests
      if (i < repairedPapers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // Save valid papers
    writeFileSync(filePath, JSON.stringify(validPapers, null, 2), 'utf-8')
    console.log(`\n✅ Repair completed!`)
    console.log(`   - Repaired: ${repaired}`)
    console.log(`   - Removed: ${removed}`)
    console.log(`   - Total: ${validPapers.length}`)
  } else {
    // Save without validation
    writeFileSync(filePath, JSON.stringify(repairedPapers, null, 2), 'utf-8')
    console.log(`\n✅ Repair completed!`)
    console.log(`   - Repaired: ${repaired}`)
    console.log(`   - Total: ${repairedPapers.length}`)
    console.log('\nTip: Set VALIDATE_LINKS=1 to validate and remove invalid URLs')
  }
}

// Main
async function main() {
  try {
    await repairLinks()
  } catch (error) {
    console.error('❌ Repair failed:', error)
    process.exit(1)
  }
}

main()
