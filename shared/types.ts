export type RouteMode = 'auto' | 'ollama' | 'cloud'
export type ProviderId = 'ollama' | 'cloud'
export type SummaryStyle = '简洁' | '详细' | '要点'
export type ActionId = 'summarize' | 'translate'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface RecentItem {
  action: ActionId
  preview: string
  providerId: ProviderId
  at: number
}

export interface AppSettings {
  routeMode: RouteMode
  ollamaBaseUrl: string
  ollamaModel: string
  cloudBaseUrl: string
  cloudModel: string
  cloudApiKey: string
  targetLang: string
  summaryStyle: SummaryStyle
  promptOverrides: Partial<Record<ActionId, string>>
  windowPosition: { x: number; y: number } | null
  recent: RecentItem[]
}

export type SettingsPatch = Partial<
  Pick<
    AppSettings,
    | 'routeMode'
    | 'ollamaBaseUrl'
    | 'ollamaModel'
    | 'cloudBaseUrl'
    | 'cloudModel'
    | 'cloudApiKey'
    | 'targetLang'
    | 'summaryStyle'
  >
>

export interface PromptView {
  id: ActionId
  name: string
  version: number
  template: string
  defaultTemplate: string
  customized: boolean
}

export interface ClipboardPayload {
  text: string
  truncated: boolean
}

export interface RunActionRequest {
  requestId: string
  action: ActionId
  text: string
}

export interface TokenEvent {
  requestId: string
  delta: string
}

export interface DoneEvent {
  requestId: string
  aborted: boolean
  providerLabel?: string
}

export interface ErrorEvent {
  requestId: string
  message: string
}

export interface ProviderStatus {
  ollama: boolean
  cloud: boolean
  cloudFromEnv: boolean
}
