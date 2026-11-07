import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Rest { endAt: number | null; total: number; label: string; start: (sec: number, label: string) => void; add: (sec: number) => void; stop: () => void }
export const useRest = create<Rest>()(
  persist(
    (set, get) => ({
      endAt: null, total: 0, label: '',
      start: (sec, label) => set({ endAt: Date.now() + sec * 1000, total: sec, label }),
      add: (sec) => { const e = get().endAt; if (e) set({ endAt: e + sec * 1000, total: get().total + sec }) },
      stop: () => set({ endAt: null }),
    }),
    { name: 'coach-rest' },
  ),
)
