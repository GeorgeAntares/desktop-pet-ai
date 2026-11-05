import type { ChatMessage, ProviderId } from '../../shared/types'

export interface AIProvider {
  id: ProviderId
  name: string
  model: string
  chat(messages: ChatMessage[], signal?: AbortSignal): AsyncIterable<string>
}

export interface StreamChatOptions {
  baseUrl: string
  apiKey?: string
  model: string
  messages: ChatMessage[]
  signal?: AbortSignal
}
