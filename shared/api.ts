import type {
  ActionId,
  AppSettings,
  ClipboardPayload,
  DoneEvent,
  ErrorEvent,
  PromptView,
  ProviderStatus,
  RecentItem,
  RunActionRequest,
  SettingsPatch,
  TokenEvent,
} from './types'

export interface PetApi {
  onClipboard(cb: (payload: ClipboardPayload) => void): () => void
  onHotkey(cb: (payload: ClipboardPayload | null) => void): () => void
  runAction(req: RunActionRequest): Promise<{ requestId: string }>
  abort(requestId: string): Promise<void>
  onToken(cb: (event: TokenEvent) => void): () => void
  onDone(cb: (event: DoneEvent) => void): () => void
  onError(cb: (event: ErrorEvent) => void): () => void
  getSettings(): Promise<AppSettings>
  saveSettings(patch: SettingsPatch): Promise<AppSettings>
  getPrompts(): Promise<PromptView[]>
  savePrompt(id: ActionId, template: string): Promise<PromptView[]>
  resetPrompt(id: ActionId): Promise<PromptView[]>
  checkProviders(): Promise<ProviderStatus>
  copyText(text: string): Promise<void>
  setClickThrough(ignore: boolean): void
  getRecent(): Promise<RecentItem[]>
}
