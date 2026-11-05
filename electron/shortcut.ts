import { globalShortcut } from 'electron'

export function registerHotkey(handler: () => void): boolean {
  return globalShortcut.register('CommandOrControl+Shift+Space', handler)
}

export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll()
}
