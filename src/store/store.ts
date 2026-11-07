import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'
import { profile } from '../data/plan'

export type Readiness = 'baixa' | 'ok' | 'alta'
export interface SetLog { kg: number | null; reps: number | null; done: boolean }
export interface Adjustment { date: string; kcal: number; text: string }
export type Theme = 'auto' | 'light' | 'dark'

export interface Data {
  checks: Record<string, string[]> // data -> chaves marcadas
  water: Record<string, number> // data -> litros
  readiness: Record<string, Readiness>
  logs: Record<string, Record<string, SetLog[]>> // data -> exercício -> séries
  runs: Record<string, { min: number | null; sprints: boolean; done: boolean }>
  weights: Record<string, number>
  waists: Record<string, number>
  shopping: Record<string, string[]> // segunda da semana -> itens
  prepTimers: Record<string, number> // chave -> termina em (ms)
  adjustments: Adjustment[]
  coachDismissed: string[]
  deloadWeeks: number[] // semanas marcadas manualmente como deload
  startDate: string
  theme: Theme
}

interface Actions {
  toggleCheck: (date: string, key: string) => void
  setWater: (date: string, l: number) => void
  setReadiness: (date: string, r: Readiness | null) => void
  setSet: (date: string, ex: string, i: number, v: Partial<SetLog>) => void
  setSets: (date: string, ex: string, sets: SetLog[]) => void
  setRun: (date: string, v: Partial<Data['runs'][string]>) => void
  setWeight: (date: string, kg: number | null) => void
  setWaist: (date: string, cm: number | null) => void
  toggleShop: (week: string, item: string) => void
  resetShop: (week: string) => void
  startPrepTimer: (key: string, min: number) => void
  stopPrepTimer: (key: string) => void
  addAdjustment: (a: Adjustment) => void
  removeAdjustment: (i: number) => void
  dismissCoach: (key: string) => void
  toggleDeload: (week: number) => void
  setStartDate: (d: string) => void
  setTheme: (t: Theme) => void
  importData: (d: Partial<Data>) => void
}

export const initialData: Data = {
  checks: {}, water: {}, readiness: {}, logs: {}, runs: {}, weights: {}, waists: {},
  shopping: {}, prepTimers: {}, adjustments: [], coachDismissed: [], deloadWeeks: [],
  startDate: profile.startDate, theme: 'auto',
}

const idbStorage: StateStorage = {
  getItem: async (k) => (await get(k)) ?? null,
  setItem: (k, v) => set(k, v),
  removeItem: (k) => del(k),
}

const setOrDel = <T,>(rec: Record<string, T>, k: string, v: T | null) => {
  const r = { ...rec }
  if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) delete r[k]
  else r[k] = v
  return r
}

export const useStore = create<Data & Actions>()(
  persist(
    (setS) => ({
      ...initialData,
      toggleCheck: (date, key) =>
        setS((s) => {
          const cur = s.checks[date] ?? []
          const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
          return { checks: { ...s.checks, [date]: next } }
        }),
      setWater: (date, l) => setS((s) => ({ water: { ...s.water, [date]: Math.max(0, l) } })),
      setReadiness: (date, r) => setS((s) => ({ readiness: setOrDel(s.readiness, date, r) })),
      setSet: (date, ex, i, v) =>
        setS((s) => {
          const day = { ...(s.logs[date] ?? {}) }
          const sets = [...(day[ex] ?? [])]
          while (sets.length <= i) sets.push({ kg: null, reps: null, done: false })
          sets[i] = { ...sets[i], ...v }
          day[ex] = sets
          return { logs: { ...s.logs, [date]: day } }
        }),
      setSets: (date, ex, sets) =>
        setS((s) => ({ logs: { ...s.logs, [date]: { ...(s.logs[date] ?? {}), [ex]: sets } } })),
      setRun: (date, v) =>
        setS((s) => ({ runs: { ...s.runs, [date]: { ...({ min: null, sprints: false, done: false } as Data['runs'][string]), ...s.runs[date], ...v } } })),
      setWeight: (date, kg) => setS((s) => ({ weights: setOrDel(s.weights, date, kg) })),
      setWaist: (date, cm) => setS((s) => ({ waists: setOrDel(s.waists, date, cm) })),
      toggleShop: (week, item) =>
        setS((s) => {
          const cur = s.shopping[week] ?? []
          return { shopping: { ...s.shopping, [week]: cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item] } }
        }),
      resetShop: (week) => setS((s) => ({ shopping: { ...s.shopping, [week]: [] } })),
      startPrepTimer: (key, min) => setS((s) => ({ prepTimers: { ...s.prepTimers, [key]: Date.now() + min * 60000 } })),
      stopPrepTimer: (key) => setS((s) => ({ prepTimers: setOrDel(s.prepTimers, key, null) })),
      addAdjustment: (a) => setS((s) => ({ adjustments: [...s.adjustments, a] })),
      removeAdjustment: (i) => setS((s) => ({ adjustments: s.adjustments.filter((_, j) => j !== i) })),
      dismissCoach: (key) => setS((s) => ({ coachDismissed: [...s.coachDismissed, key] })),
      toggleDeload: (w) =>
        setS((s) => ({ deloadWeeks: s.deloadWeeks.includes(w) ? s.deloadWeeks.filter((x) => x !== w) : [...s.deloadWeeks, w] })),
      setStartDate: (d) => setS({ startDate: d }),
      setTheme: (t) => {
        try { localStorage.setItem('coach-theme', JSON.stringify(t)) } catch { /* sem storage */ }
        setS({ theme: t })
      },
      importData: (d) => setS({ ...initialData, ...d }),
    }),
    { name: 'coach-pedro', version: 1, storage: createJSONStorage(() => idbStorage) },
  ),
)

export const exportData = (): Data => {
  const s = useStore.getState()
  const out = {} as Record<string, unknown>
  for (const k of Object.keys(initialData)) out[k] = (s as unknown as Record<string, unknown>)[k]
  return out as unknown as Data
}

/** Ajuste total de kcal aceite no coach */
export const kcalAdjust = (adj: Adjustment[], upTo?: string) =>
  adj.filter((a) => !upTo || a.date <= upTo).reduce((t, a) => t + a.kcal, 0)
