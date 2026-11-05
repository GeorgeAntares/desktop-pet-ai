import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { PetApi } from '../shared/api'
import type {
  ClipboardPayload,
  DoneEvent,
  ErrorEvent,
  TokenEvent,
} from '../shared/types'

function listen<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T) => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

let clickThrough = true

const api: PetApi = {
  onClipboard: (cb) => listen<ClipboardPayload>('clipboard:text', cb),
  onHotkey: (cb) => listen<ClipboardPayload | null>('hotkey:open', cb),
  runAction: (req) => ipcRenderer.invoke('ai:run', req),
  abort: (requestId) => ipcRenderer.invoke('ai:abort', requestId),
  onToken: (cb) => listen<TokenEvent>('ai:token', cb),
  onDone: (cb) => listen<DoneEvent>('ai:done', cb),
  onError: (cb) => listen<ErrorEvent>('ai:error', cb),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),
  getPrompts: () => ipcRenderer.invoke('prompts:get'),
  savePrompt: (id, template) => ipcRenderer.invoke('prompts:save', id, template),
  resetPrompt: (id) => ipcRenderer.invoke('prompts:reset', id),
  checkProviders: () => ipcRenderer.invoke('providers:check'),
  copyText: (text) => ipcRenderer.invoke('clipboard:write', text),
  setClickThrough: (ignore) => {
    if (ignore === clickThrough) return
    clickThrough = ignore
    ipcRenderer.send('window:click-through', ignore)
  },
  getRecent: () => ipcRenderer.invoke('memory:recent'),
}

contextBridge.exposeInMainWorld('pet', api)
