import type { BubbleState } from '../hooks/usePetSession'

export function ResultBubble({
  bubble,
  onStop,
  onCopy,
  onClose,
  onConfigure,
}: {
  bubble: BubbleState
  onStop: () => void
  onCopy: () => void
  onClose: () => void
  onConfigure: () => void
}) {
  return (
    <section className={`bubble hit${bubble.error ? ' is-error' : ''}`} aria-live="polite">
      <header>
        <strong>{bubble.title}</strong>
        <span className="bubble-actions">
          {bubble.streaming ? (
            <button type="button" onClick={onStop}>
              停止
            </button>
          ) : (
            <>
              <button type="button" onClick={onCopy}>
                复制
              </button>
              {bubble.needsSetup && (
                <button type="button" onClick={onConfigure}>
                  去配置
                </button>
              )}
              <button type="button" onClick={onClose}>
                关闭
              </button>
            </>
          )}
        </span>
      </header>
      {bubble.truncated && <p className="hint">原文超过 8000 字，只处理了前 8000 字。</p>}
      <div className="bubble-body">{bubble.text || (bubble.streaming ? '正在想…' : '')}</div>
      {bubble.providerLabel && !bubble.streaming && <footer>{bubble.providerLabel}</footer>}
    </section>
  )
}
