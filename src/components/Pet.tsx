import type { PetState } from '../hooks/usePetSession'

const LABELS: Record<PetState, string> = {
  idle: '待机',
  notice: '发现新文本',
  thinking: '思考中',
  success: '完成',
  error: '出错',
}

export function Pet({ state, onOpenSettings }: { state: PetState; onOpenSettings: () => void }) {
  return (
    <div className={`pet hit is-${state}`} role="img" aria-label={`桌宠，${LABELS[state]}`}>
      <div className="pet-drag">
        <span className="ear left" />
        <span className="ear right" />
        <div className="face">
          <span className="eye left">
            <i />
          </span>
          <span className="eye right">
            <i />
          </span>
          <span className="mouth" />
          <span className="blush left" />
          <span className="blush right" />
        </div>
        {state === 'thinking' && <span className="think-ring" />}
        <span className="shadow" />
      </div>
      <button type="button" className="gear" onClick={onOpenSettings}>
        设置
      </button>
    </div>
  )
}
