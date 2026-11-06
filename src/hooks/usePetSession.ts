import { useEffect, useRef, useState } from 'react'
import type { ActionId, ClipboardPayload } from '../../shared/types'

export type PetState = 'idle' | 'notice' | 'thinking' | 'success' | 'error'

export interface BubbleState {
  title: string
  text: string
  streaming: boolean
  error: boolean
  truncated: boolean
  needsSetup?: boolean
  providerLabel?: string
}

const TITLES: Record<ActionId, string> = {
  summarize: '总结',
  translate: '翻译',
}

export function usePetSession() {
  const [petState, setPetState] = useState<PetState>('idle')
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [clip, setClip] = useState<ClipboardPayload | null>(null)
  const [bubble, setBubble] = useState<BubbleState | null>(null)
  const requestRef = useRef<string | null>(null)
  const setupRef = useRef(false)
  const settingsRef = useRef(false)
  setupRef.current = setupOpen
  settingsRef.current = settingsOpen

  useEffect(() => {
    const showClip = (payload: ClipboardPayload | null) => {
      if (!payload?.text.trim()) {
        setMenuOpen(false)
        setBubble({
          title: '剪贴板',
          text: '剪贴板是空的。',
          streaming: false,
          error: true,
          truncated: false,
        })
        setPetState('error')
        return
      }
      setClip(payload)
      if (!setupRef.current) setSettingsOpen(false)
      setMenuOpen(true)
      setPetState((state) => (state === 'thinking' ? state : 'notice'))
    }

    // 配置时复制密钥不应关面板或弹出总结/翻译。主进程已推进 lastSeen，关掉后不会补弹。
    const onClipboard = (payload: ClipboardPayload | null) => {
      if (setupRef.current || settingsRef.current) return
      showClip(payload)
    }

    const offClip = window.pet.onClipboard(onClipboard)
    const offHotkey = window.pet.onHotkey(showClip)
    const offToken = window.pet.onToken(({ requestId, delta }) => {
      if (requestId !== requestRef.current) return
      setBubble((current) => (current ? { ...current, text: current.text + delta } : current))
    })
    const offDone = window.pet.onDone(({ requestId, aborted, providerLabel }) => {
      if (requestId !== requestRef.current) return
      requestRef.current = null
      setBubble((current) => {
        if (!current) return current
        const stopped = aborted ? (current.text ? `${current.text}\n（已停止）` : '（已停止）') : current.text
        if (!aborted && !stopped.trim()) {
          return {
            ...current,
            text: '没有得到结果。',
            streaming: false,
            error: true,
            providerLabel,
          }
        }
        return { ...current, text: stopped, streaming: false, providerLabel }
      })
      setPetState(aborted ? 'idle' : 'success')
    })
    const offError = window.pet.onError(({ requestId, message }) => {
      if (requestId !== requestRef.current) return
      requestRef.current = null
      setBubble((current) => ({
        title: current?.title ?? '出错了',
        text: message,
        streaming: false,
        error: true,
        truncated: current?.truncated ?? false,
        needsSetup: /设置|API Key|Ollama|没有可用的模型/.test(message),
      }))
      setPetState('error')
    })
    return () => {
      offClip()
      offHotkey()
      offToken()
      offDone()
      offError()
    }
  }, [])

  useEffect(() => {
    if (petState !== 'success' && petState !== 'error') return
    const timer = setTimeout(() => {
      setPetState((state) => (state === 'success' || state === 'error' ? 'idle' : state))
    }, 2600)
    return () => clearTimeout(timer)
  }, [petState])

  useEffect(() => {
    let alive = true
    void (async () => {
      const [settings, status] = await Promise.all([window.pet.getSettings(), window.pet.checkProviders()])
      if (!alive) return
      if (!settings.setupDismissed && !status.ollama && !status.cloud) setSetupOpen(true)
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      setSettingsOpen(false)
      setSetupOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function run(action: ActionId) {
    if (!clip?.text.trim()) return
    if (requestRef.current) void window.pet.abort(requestRef.current)
    const requestId = crypto.randomUUID()
    requestRef.current = requestId
    setMenuOpen(false)
    setPetState('thinking')
    setBubble({
      title: TITLES[action],
      text: '',
      streaming: true,
      error: false,
      truncated: clip.truncated,
    })
    try {
      await window.pet.runAction({ requestId, action, text: clip.text })
    } catch (err) {
      requestRef.current = null
      setPetState('error')
      setBubble({
        title: TITLES[action],
        text: err instanceof Error ? err.message : '请求没有发出去',
        streaming: false,
        error: true,
        truncated: clip.truncated,
        needsSetup: true,
      })
    }
  }

  function ignore() {
    setMenuOpen(false)
    setPetState((state) => (state === 'thinking' ? state : 'idle'))
  }

  function stop() {
    if (requestRef.current) void window.pet.abort(requestRef.current)
  }

  async function copyResult() {
    if (!bubble?.text.trim()) return
    await window.pet.copyText(bubble.text)
  }

  function closeBubble() {
    setBubble(null)
  }

  function openSettings() {
    setSetupOpen(false)
    setSettingsOpen(true)
    setMenuOpen(false)
  }

  return {
    petState,
    menuOpen,
    settingsOpen,
    setupOpen,
    setSettingsOpen,
    setSetupOpen,
    bubble,
    run,
    ignore,
    stop,
    copyResult,
    closeBubble,
    openSettings,
  }
}
