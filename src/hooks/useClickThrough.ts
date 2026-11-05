import { useEffect } from 'react'

export function useClickThrough(): void {
  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const el = document.elementFromPoint(event.clientX, event.clientY)
      const hit = Boolean(el && el instanceof Element && el.closest('.hit'))
      window.pet.setClickThrough(!hit)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])
}
