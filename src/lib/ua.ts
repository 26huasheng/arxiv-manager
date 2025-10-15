/**
 * User-Agent management for arXiv API requests
 * Server-side only - DO NOT use in client components
 */

/**
 * Get User-Agent for arXiv API requests
 * Priority:
 * 1. ARXIV_UA (full UA string)
 * 2. ARXIV_CONTACT_EMAIL (email only, will construct UA)
 * 3. Hardcoded default: arxiv-manager/0.1 (mailto:2134893202@qq.com)
 *
 * @returns User-Agent string in format: "app/version (mailto:email)"
 */
export function getUA(): string {
  // Priority 1: Full UA from env
  const ua = process.env.ARXIV_UA?.trim()
  if (ua) {
    return ua
  }

  // Priority 2: Email only from env
  const email = process.env.ARXIV_CONTACT_EMAIL?.trim()
  if (email) {
    return `arxiv-manager/0.1 (mailto:${email})`
  }

  // Priority 3: Hardcoded default
  return 'arxiv-manager/0.1 (mailto:2134893202@qq.com)'
}
