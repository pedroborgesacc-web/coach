import { useRef } from 'react'
/** Swipe horizontal simples */
export function useSwipe(onLeft: () => void, onRight: () => void) {
  const s = useRef<{ x: number; y: number } | null>(null)
  return {
    onTouchStart: (e: React.TouchEvent) => { s.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!s.current) return
      const dx = e.changedTouches[0].clientX - s.current.x
      const dy = e.changedTouches[0].clientY - s.current.y
      s.current = null
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? onLeft : onRight)()
    },
  }
}
