import type { AppSettings } from '../../shared/types'
import { streamChatCompletions } from './sse'
import type { AIProvider } from './types'

export function createOllamaProvider(settings: AppSettings): AIProvider {
  return {
    id: 'ollama',
    name: '本地 Ollama',
    model: settings.ollamaModel,
    chat(messages, signal) {
      return streamChatCompletions({
        baseUrl: settings.ollamaBaseUrl,
        model: settings.ollamaModel,
        messages,
        signal,
      })
    },
  }
}

export async function checkOllama(baseUrl: string, timeoutMs = 1200): Promise<boolean> {
  const root = baseUrl.replace(/\/+$/, '')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${root}/models`, { signal: controller.signal })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
