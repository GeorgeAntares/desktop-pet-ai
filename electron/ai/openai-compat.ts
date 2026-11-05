import type { AppSettings } from '../../shared/types'
import { streamChatCompletions } from './sse'
import type { AIProvider } from './types'

export function createCloudProvider(settings: AppSettings, apiKey: string): AIProvider {
  return {
    id: 'cloud',
    name: '云端',
    model: settings.cloudModel,
    chat(messages, signal) {
      return streamChatCompletions({
        baseUrl: settings.cloudBaseUrl,
        apiKey,
        model: settings.cloudModel,
        messages,
        signal,
      })
    },
  }
}
