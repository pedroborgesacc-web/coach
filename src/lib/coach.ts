import { days, workouts, type Exercise } from '../data/plan'
import type { Data } from '../store/store'
import { addDays, dayIdOf, diffDays, fmtNum, itemKey, planWeek, weekStart } from './date'
import { bestSet } from './training'

export const weekDates = (startDate: string, w: number) => {
  const mon = addDays(weekStart(startDate), (w - 1) * 7)
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i))
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export const weekAvgWeight = (data: Data, startDate: string, w: number) => {
  const xs = weekDates(startDate, w).map((d) => data.weights[d]).filter((x): x is number => x != null)
  return { avg: avg(xs), n: xs.length }
}

const lastWaistIn = (data: Data, dates: string[]) => {
  const ds = dates.filter((d) => data.waists[d] != null)
  return ds.length ? data.waists[ds[ds.length - 1]] : null
}

const mainExercises: Exercise[] = Object.values(workouts).flatMap((w) => w.exercises.filter((e) => e.main))

const bestIn = (data: Data, ex: Exercise, dates: string[]) => {
  let b: number | null = null
  for (const d of dates) {
    const s = data.logs[d]?.[ex.id]
    if (!s) continue
    const bs = bestSet(s, ex.bodyweight)
    if (bs && (b == null || bs.e > b)) b = bs.e
  }
  return b
}

/** Proteína consumida (refeições marcadas) por dia, média dos dias com registo */
export const avgProtein = (data: Data, dates: string[]) => {
  const vals: number[] = []
  for (const d of dates) {
    const checks = data.checks[d]
    if (!checks?.length) continue
    const day = days.find((x) => x.id === dayIdOf(d))!
    const p = day.timeline.filter((i) => i.meal && checks.includes(itemKey(i.t, i.title))).reduce((t, i) => t + i.meal!.p, 0)
    if (p > 0) vals.push(p)
  }
  return avg(vals)
}

export interface CoachResult {
  key: string
  block: number
  weeks: [number, number]
  ready: boolean
  missing: string[]
  metrics: { label: string; value: string; tone: 'up' | 'down' | 'flat' | 'none' }[]
  title: string
  detail: string
  kcal: number
  action: string
}

export function evaluate(data: Data, today: string): CoachResult | null {
  const start = data.startDate
  const curWeek = planWeek(today, start)
  const block = Math.floor((curWeek - 1) / 2) // último bloco completo
  if (block < 1) return null
  const a = block * 2 - 1
  const b = block * 2
  const prevW = block === 1 ? 1 : a - 1
  const span = block === 1 ? 1 : 2
  const blockDates = [...weekDates(start, a), ...weekDates(start, b)]
  const prevDates = block === 1 ? weekDates(start, 1) : [...weekDates(start, a - 2), ...weekDates(start, a - 1)]
  const curDatesForStrength = block === 1 ? weekDates(start, 2) : blockDates

  const missing: string[] = []
  const wPrev = weekAvgWeight(data, start, prevW)
  const wCur = weekAvgWeight(data, start, b)
  if (wPrev.n < 2) missing.push(`pesagens na semana ${prevW}`)
  if (wCur.n < 2) missing.push(`pesagens na semana ${b}`)
  const rate = wPrev.avg != null && wCur.avg != null ? (wCur.avg - wPrev.avg) / span : null

  const waistPrev = lastWaistIn(data, block === 1 ? weekDates(start, 1) : weekDates(start, a - 1))
  const waistCur = lastWaistIn(data, weekDates(start, b))
  const waistDelta = waistPrev != null && waistCur != null ? waistCur - waistPrev : null
  if (waistDelta == null) missing.push('cintura (sexta)')

  const ratios: number[] = []
  for (const ex of mainExercises) {
    const p = bestIn(data, ex, prevDates)
    const c = bestIn(data, ex, curDatesForStrength)
    if (p && c) ratios.push(c / p)
  }
  const strength = avg(ratios)
  if (strength == null) missing.push('treinos registados')
  const sTone = strength == null ? 'none' : strength > 1.01 ? 'up' : strength < 0.985 ? 'down' : 'flat'
  const lowDays = blockDates.filter((d) => data.readiness[d] === 'baixa').length
  const protein = avgProtein(data, blockDates)

  const metrics: CoachResult['metrics'] = [
    { label: 'Peso', value: rate == null ? 'sem dados' : `${rate > 0 ? '+' : ''}${fmtNum(rate, 2)} kg/sem`, tone: rate == null ? 'none' : rate > 0.15 ? 'up' : rate < -0.15 ? 'down' : 'flat' },
    { label: 'Cintura', value: waistDelta == null ? 'sem dados' : `${waistDelta > 0 ? '+' : ''}${fmtNum(waistDelta)} cm`, tone: waistDelta == null ? 'none' : waistDelta > 0.3 ? 'up' : waistDelta < -0.3 ? 'down' : 'flat' },
    { label: 'Cargas', value: strength == null ? 'sem dados' : `${strength >= 1 ? '+' : ''}${fmtNum((strength - 1) * 100)} %`, tone: sTone },
    { label: 'Readiness baixa', value: `${lowDays} dias`, tone: lowDays >= 4 ? 'down' : 'flat' },
    { label: 'Proteína média', value: protein == null ? 'sem dados' : `${Math.round(protein)} g`, tone: protein == null ? 'none' : protein >= 165 ? 'up' : 'down' },
  ]

  const base = { key: `bloco-${block}`, block, weeks: [a, b] as [number, number], metrics, missing }
  if (lowDays >= 4)
    return { ...base, ready: true, kcal: 0, title: 'Semana de deload e mais 30 min de sono', detail: `Tiveste Readiness baixa em ${lowDays} dias. Faz a próxima semana com metade das séries e a mesma carga, e deita-te 30 min mais cedo.`, action: 'deload' }
  if (missing.length && (rate == null || (waistDelta == null && strength == null)))
    return { ...base, ready: false, kcal: 0, title: 'Faltam registos para decidir', detail: `Regista: ${missing.join(', ')}. Até lá, não mudes nada.`, action: 'none' }
  if ((rate != null && rate < -0.5) || sTone === 'down')
    return { ...base, ready: true, kcal: 200, title: '+200 kcal: junta 50 g de arroz ao almoço', detail: `${rate != null && rate < -0.5 ? `O peso caiu ${fmtNum(-rate, 2)} kg/semana` : 'A força caiu'}. Alternativa: 1 banana e 1 colher de manteiga de amendoim.`, action: 'kcal' }
  if (waistDelta != null && waistDelta > 0.3)
    return { ...base, ready: true, kcal: -150, title: '−150 kcal nos hidratos da ceia ou dos snacks', detail: `A cintura subiu ${fmtNum(waistDelta)} cm. Por exemplo: tira os frutos vermelhos da ceia e metade da banana do snack do turno.`, action: 'kcal' }
  const stable = rate != null && Math.abs(rate) <= 0.25
  if (waistDelta != null && waistDelta < -0.3 && stable && sTone === 'up')
    return { ...base, ready: true, kcal: 0, title: 'Não mudar nada', detail: 'A cintura desce, o peso está estável e as cargas sobem. É exatamente isto que queremos.', action: 'none' }
  if (stable && (waistDelta == null || Math.abs(waistDelta) <= 0.3) && sTone !== 'up') {
    const lowP = protein != null && protein < 165
    return { ...base, ready: true, kcal: lowP ? 0 : -150, title: lowP ? 'Primeiro: acertar a proteína' : 'Verifica sono e proteína; depois −150 kcal', detail: lowP ? `A proteína média foi ${Math.round(protein!)} g (alvo 165–180 g). Marca todas as refeições e acerta isto antes de cortar kcal.` : 'Peso, cintura e cargas parados. Se o sono e a proteína estão certos, tira 150 kcal nos hidratos da ceia ou dos snacks.', action: lowP ? 'none' : 'kcal' }
  }
  return { ...base, ready: true, kcal: 0, title: 'Não mudar nada', detail: 'Os sinais estão mistos mas nenhum pede ajuste. Mantém o plano e volta a ver daqui a 2 semanas.', action: 'none' }
}

export const nextReviewIn = (today: string, start: string) => {
  const w = planWeek(today, start)
  const nextBlockStartWeek = w < 1 ? 3 : (Math.floor((w - 1) / 2) + 1) * 2 + 1
  const date = addDays(weekStart(start), (nextBlockStartWeek - 1) * 7)
  return { date, days: diffDays(date, today) }
}
