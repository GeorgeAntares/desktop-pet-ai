import type { AppSettings, ProviderId } from '../../shared/types'
import { createCloudProvider } from './openai-compat'
import { createOllamaProvider } from './ollama'
import type { AIProvider } from './types'

export function createProvider(id: ProviderId, settings: AppSettings, apiKey: string): AIProvider {
  if (id === 'ollama') return createOllamaProvider(settings)
  return createCloudProvider(settings, apiKey)
}
