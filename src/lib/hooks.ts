import { useEffect, useState } from 'react'
import { useStore } from '../store/store'

/** Re-renderiza a cada `ms` (relógio) */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    const vis = () => setNow(Date.now())
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis) }
  }, [ms])
  return now
}

export function useHydrated() {
  const [h, setH] = useState(useStore.persist.hasHydrated())
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setH(true))
    setH(useStore.persist.hasHydrated())
    return unsub
  }, [])
  return h
}

export function useApplyTheme() {
  const theme = useStore((s) => s.theme)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'auto' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0b1120' : '#f8fafc')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

let audioCtx: AudioContext | null = null
/** Beep curto (só funciona com a app aberta) */
export function beep(times = 3) {
  try {
    audioCtx = audioCtx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const ctx = audioCtx
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = 880
      o.connect(g)
      g.connect(ctx.destination)
      const t = ctx.currentTime + i * 0.35
      g.gain.setValueAtTime(0.2, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
      o.start(t)
      o.stop(t + 0.25)
    }
    navigator.vibrate?.([200, 100, 200])
  } catch { /* sem áudio */ }
}
/** Desbloqueia o áudio no iOS (tem de ser chamado num toque) */
export function unlockAudio() {
  try {
    audioCtx = audioCtx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume()
  } catch { /* nada */ }
}

export const fmtClock = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
