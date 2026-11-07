import { trainingRules, type Exercise } from '../data/plan'
import type { Readiness, SetLog } from '../store/store'
import { addDays, planWeek } from './date'

export interface WeekState {
  week: number
  returnMode: boolean
  deload: boolean
  deloadReason: string | null
  readinessAlert: boolean
  sprints: boolean
}

export function weekState(date: string, startDate: string, deloadWeeks: number[], readiness: Record<string, Readiness>): WeekState {
  const week = planWeek(date, startDate)
  const returnMode = week >= 1 && week <= trainingRules.returnWeeks
  const scheduled = week > trainingRules.returnWeeks && week % trainingRules.deloadEvery === 0
  const manual = deloadWeeks.includes(week)
  // Readiness baixa 3 dias seguidos (até hoje)
  let lowStreak = 0
  for (let i = 0; i < 3; i++) if (readiness[addDays(date, -i)] === 'baixa') lowStreak++
  const readinessAlert = lowStreak === 3
  const deload = scheduled || manual
  return {
    week,
    returnMode,
    deload,
    deloadReason: manual ? 'Marcada por ti' : scheduled ? `Semana ${week}: deload programado (a cada 6–8 semanas)` : null,
    readinessAlert,
    sprints: week >= 3 && week % 2 === 1,
  }
}

export function effectiveSets(ex: Exercise, ws: WeekState) {
  let n = ex.sets
  if (ws.returnMode) n -= 1
  if (ws.deload) n = Math.ceil(n / 2)
  return Math.max(1, n)
}

export const restFor = (ex: Exercise) => (ex.main ? trainingRules.restMainSec : trainingRules.restOtherSec)

export const doneSets = (sets: SetLog[] | undefined) => (sets ?? []).filter((s) => s.done && s.reps != null)

export function lastSession(logs: Record<string, Record<string, SetLog[]>>, exId: string, before: string) {
  const dates = Object.keys(logs).filter((d) => d < before && doneSets(logs[d][exId]).length).sort()
  const d = dates[dates.length - 1]
  return d ? { date: d, sets: doneSets(logs[d][exId]) } : null
}

const roundTo = (x: number, step: number) => Math.round(x / step) * step

export function suggest(ex: Exercise, last: ReturnType<typeof lastSession>, ws: WeekState): { kg: number | null; text: string } {
  const rir = ws.returnMode ? '3 reps em reserva' : '1–2 reps em reserva'
  if (!last) {
    if (ex.unit === 's') return { kg: null, text: `Começa por ${ex.repMin} s por lado.` }
    if (ex.bodyweight) return { kg: 0, text: `Peso corporal, ${rir}.` }
    return { kg: null, text: `Primeira vez: escolhe uma carga que te deixe ${rir}.` }
  }
  const kg = Math.max(...last.sets.map((s) => s.kg ?? 0))
  const top = last.sets.filter((s) => (s.kg ?? 0) === kg)
  if (ws.deload) return { kg, text: `Deload: mesma carga (${fmtKg(kg, ex)}), metade das séries.` }
  if (ex.unit === 'amrap') {
    const total = last.sets.reduce((t, s) => t + (s.reps ?? 0), 0)
    return { kg, text: `Última vez: ${total} reps no total. Tenta bater esse total.` }
  }
  if (ex.unit === 's') {
    const allTop = last.sets.every((s) => (s.reps ?? 0) >= ex.repMax)
    return { kg: null, text: allTop ? `Chegaste aos ${ex.repMax} s: passa a ${ex.repMax + 15} s ou junta peso.` : `Tenta +5 s por série até ${ex.repMax} s.` }
  }
  const allTop = top.length >= Math.min(ex.sets - (ws.returnMode ? 1 : 0), last.sets.length) && top.every((s) => (s.reps ?? 0) >= ex.repMax)
  if (allTop && ex.inc > 0) {
    if (ex.bodyweight && kg === 0) return { kg: ex.inc, text: `Todas as séries no topo (${ex.repMax}): junta ${fmtNum(ex.inc)} kg de peso.` }
    const next = roundTo(kg + ex.inc, 0.5)
    return { kg: next, text: `Todas as séries no topo (${ex.repMax}): sobe para ${fmtKg(next, ex)}.` }
  }
  if (allTop) return { kg, text: `Todas no topo: aumenta a dificuldade (mais lento, mais amplitude).` }
  return { kg, text: `Mantém ${fmtKg(kg, ex)} e tenta +1 rep até ${ex.repMax} em todas as séries.` }
}

const fmtNum = (n: number) => n.toLocaleString('pt-PT', { maximumFractionDigits: 1 })
export const fmtKg = (kg: number | null, ex: Exercise) =>
  kg == null ? '—' : ex.bodyweight ? (kg ? `PC + ${fmtNum(kg)} kg` : 'peso corporal') : `${fmtNum(kg)} kg`

/** 1RM estimado (Epley). Em calistenia usa o peso extra + 72,5 kg (peso de partida) só para comparar. */
export const e1rm = (kg: number, reps: number, bodyweight = false) => {
  const load = bodyweight ? kg + 72.5 : kg
  return load * (1 + Math.min(reps, 15) / 30)
}

export function bestSet(sets: SetLog[], bodyweight = false) {
  let best: { kg: number; reps: number; e: number } | null = null
  for (const s of sets) {
    if (!s.done || s.reps == null) continue
    const kg = s.kg ?? 0
    const e = e1rm(kg, s.reps, bodyweight)
    if (!best || e > best.e) best = { kg, reps: s.reps, e }
  }
  return best
}
