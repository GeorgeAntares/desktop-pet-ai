import type { StreamChatOptions } from './types'

interface ChatDelta {
  content?: string | null
  reasoning_content?: string | null
}

interface ChatChunk {
  choices?: Array<{
    delta?: ChatDelta
    message?: { content?: string | null }
  }>
}

export async function* streamChatCompletions(options: StreamChatOptions): AsyncGenerator<string> {
  const root = options.baseUrl.replace(/\/+$/, '')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options.apiKey) headers.Authorization = `Bearer ${options.apiKey}`

  const response = await fetch(`${root}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: true,
      temperature: 0.3,
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    const body = await response.text()
    const detail = body.replace(/\s+/g, ' ').slice(0, 240)
    throw new Error(`模型请求失败 (${response.status}) ${detail}`.trim())
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/event-stream')) {
    const json = (await response.json()) as ChatChunk
    const text = json.choices?.[0]?.message?.content
    if (typeof text === 'string' && text.length > 0) {
      yield text
      return
    }
    throw new Error('模型没有返回文本')
  }

  if (!response.body) throw new Error('模型没有返回流')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let reasoning = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const piece = takeVisibleDelta(line)
      if (!piece) continue
      if (piece.kind === 'content') {
        content += piece.text
        yield piece.text
      } else {
        reasoning += piece.text
      }
    }
  }

  if (!content && reasoning) yield reasoning
  if (!content && !reasoning) throw new Error('模型返回了空内容')
}

function takeVisibleDelta(line: string): { kind: 'content' | 'reasoning'; text: string } | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return null
  const data = trimmed.slice(5).trim()
  if (!data || data === '[DONE]') return null
  let json: ChatChunk
  try {
    json = JSON.parse(data) as ChatChunk
  } catch {
    return null
  }
  const delta = json.choices?.[0]?.delta
  if (!delta) return null
  if (typeof delta.content === 'string' && delta.content.length > 0) {
    return { kind: 'content', text: delta.content }
  }
  if (typeof delta.reasoning_content === 'string' && delta.reasoning_content.length > 0) {
    return { kind: 'reasoning', text: delta.reasoning_content }
  }
  return null
}
