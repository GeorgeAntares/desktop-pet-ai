import type { ProviderId, RouteMode } from '../../shared/types'

export const SHORT_TEXT_LIMIT = 500

export class NoProviderError extends Error {
  constructor() {
    super('没有可用的模型')
    this.name = 'NoProviderError'
  }
}

export interface RouteInput {
  mode: RouteMode
  textLength: number
  ollamaHealthy: boolean
  cloudConfigured: boolean
  shortTextLimit?: number
}

export function chooseProvider(input: RouteInput): ProviderId {
  const limit = input.shortTextLimit ?? SHORT_TEXT_LIMIT
  const available: Record<ProviderId, boolean> = {
    ollama: input.ollamaHealthy,
    cloud: input.cloudConfigured,
  }
  let preferred: ProviderId
  if (input.mode === 'ollama') preferred = 'ollama'
  else if (input.mode === 'cloud') preferred = 'cloud'
  else preferred = input.textLength <= limit ? 'ollama' : 'cloud'

  if (available[preferred]) return preferred
  const other: ProviderId = preferred === 'ollama' ? 'cloud' : 'ollama'
  if (available[other]) return other
  throw new NoProviderError()
}
