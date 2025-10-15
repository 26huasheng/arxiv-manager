/**
 * GLM Chat API Client
 * Provides a simple interface to call GLM chat completions
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class GLMClient {
  private apiBase: string
  private apiKey: string
  private model: string

  constructor() {
    this.apiBase = process.env.GLM_API_BASE || ''
    this.apiKey = process.env.GLM_API_KEY || ''
    this.model = process.env.GLM_MODEL || 'glm-4-flash'

    if (!this.apiBase || !this.apiKey) {
      throw new Error('GLM_API_BASE and GLM_API_KEY must be configured in .env.local')
    }
  }

  /**
   * Call GLM chat completion API
   * @param systemPrompt System role instructions
   * @param userPrompt User's query or request
   * @param temperature Sampling temperature (0-1)
   * @returns Assistant's response text
   */
  async callChat(
    systemPrompt: string,
    userPrompt: string,
    temperature: number = 0.7
  ): Promise<string> {
    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]

      const response = await fetch(`${this.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `GLM API request failed (${response.status}): ${errorText}`
        )
      }

      const data: ChatCompletionResponse = await response.json()

      if (!data.choices || data.choices.length === 0) {
        throw new Error('GLM API returned no choices')
      }

      return data.choices[0].message.content
    } catch (error) {
      // Ensure we always return a readable error message
      if (error instanceof Error) {
        console.error('GLM API error:', error.message)
        return `❌ LLM 调用失败: ${error.message}`
      }
      console.error('Unknown GLM API error:', error)
      return '❌ LLM 调用失败: 未知错误'
    }
  }

  /**
   * Get the configured model name
   */
  getModel(): string {
    return this.model
  }
}

/**
 * Get a singleton GLM client instance
 */
export function getGLMClient(): GLMClient {
  return new GLMClient()
}
