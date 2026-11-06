import { describe, expect, it } from 'vitest'
import { chatCompletionBody } from '../electron/ai/sse'
import type { StreamChatOptions } from '../electron/ai/types'

const options = (baseUrl: string): StreamChatOptions => ({
  baseUrl,
  model: 'deepseek-flash',
  messages: [{ role: 'user', content: 'hi' }],
})

describe('chatCompletionBody', () => {
  it('turns off DeepSeek thinking so the bubble receives the answer', () => {
    expect(chatCompletionBody(options('https://api.deepseek.com')).thinking).toEqual({ type: 'disabled' })
    expect(chatCompletionBody(options('https://api.deepseek.com/v1')).thinking).toEqual({ type: 'disabled' })
  })

  it('leaves other providers unchanged', () => {
    expect(chatCompletionBody(options('https://api.x.ai/v1')).thinking).toBeUndefined()
    expect(chatCompletionBody(options('https://agentrouter.org/v1')).thinking).toBeUndefined()
  })
})