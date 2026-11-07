import { useEffect, useRef } from 'react'
import { useRest } from '../store/rest'
import { beep, fmtClock, useNow } from '../lib/hooks'

export default function RestTimer() {
  const { endAt, total, label, add, stop } = useRest()
  const now = useNow(250)
  const fired = useRef<number | null>(null)
  const left = endAt ? (endAt - now) / 1000 : 0
  useEffect(() => {
    if (endAt && left <= 0 && fired.current !== endAt) {
      fired.current = endAt
      beep()
      const t = setTimeout(stop, 4000)
      return () => clearTimeout(t)
    }
  }, [endAt, left, stop])
  if (!endAt) return null
  const done = left <= 0
  return (
    <div className="fixed inset-x-0 bottom-[64px] z-40 px-3 pb-safe">
      <div className={`mx-auto flex max-w-lg items-center gap-3 rounded-2xl px-4 py-3 shadow-lg ${done ? 'bg-green-600' : 'bg-blue-600'} text-white`}>
        <div className="flex-1">
          <div className="text-xs opacity-80">{done ? 'Descanso terminado — próxima série!' : `Descanso · ${label}`}</div>
          <div className="text-2xl font-bold tabular-nums">{fmtClock(left)}</div>
          <div className="mt-1 h-1 overflow-hidden rounded bg-white/30">
            <div className="h-full bg-white" style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%` }} />
          </div>
        </div>
        <button className="rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold" onClick={() => add(-15)}>−15</button>
        <button className="rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold" onClick={() => add(15)}>+15</button>
        <button className="rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold" onClick={stop}>✕</button>
      </div>
    </div>
  )
}
