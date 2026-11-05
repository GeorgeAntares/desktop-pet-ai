import { clipboard, type BrowserWindow } from 'electron'
import type { ClipboardPayload } from '../shared/types'

const POLL_MS = 400
export const CLIPBOARD_LIMIT = 8000

let lastSeen = ''
let own = ''
let timer: NodeJS.Timeout | null = null

export function noteOwnClipboard(text: string): void {
  own = text
  lastSeen = text
}

export function readClipboardPayload(): ClipboardPayload | null {
  let text = ''
  try {
    text = clipboard.readText()
  } catch {
    return null
  }
  if (!text.trim()) return null
  const truncated = text.length > CLIPBOARD_LIMIT
  const payload = {
    text: truncated ? text.slice(0, CLIPBOARD_LIMIT) : text,
    truncated,
  }
  lastSeen = text
  return payload
}

export function startClipboard(getWindow: () => BrowserWindow | null): void {
  try {
    lastSeen = clipboard.readText()
  } catch {
    lastSeen = ''
  }
  timer = setInterval(() => {
    let text = ''
    try {
      text = clipboard.readText()
    } catch {
      return
    }
    if (!text.trim() || text === lastSeen) return
    if (text === own) {
      lastSeen = text
      return
    }
    lastSeen = text
    const win = getWindow()
    if (!win || win.isDestroyed()) return
    const truncated = text.length > CLIPBOARD_LIMIT
    const payload: ClipboardPayload = {
      text: truncated ? text.slice(0, CLIPBOARD_LIMIT) : text,
      truncated,
    }
    win.webContents.send('clipboard:text', payload)
  }, POLL_MS)
}

export function stopClipboard(): void {
  if (timer) clearInterval(timer)
  timer = null
}
