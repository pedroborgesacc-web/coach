import { days, profile, type Day, type DayId } from '../data/plan'

export const DAY_IDS: DayId[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']

const pad = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
/** Fuso horário da app: hora de Miami, seja qual for o fuso do telemóvel */
export const TIME_ZONE = 'America/New_York'
const tzFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
/** Data e hora "de parede" em Miami */
export const miamiNow = () => {
  const p = Object.fromEntries(tzFmt.formatToParts(new Date()).map((x) => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, min: (Number(p.hour) % 24) * 60 + Number(p.minute) }
}
export const todayISO = () => miamiNow().date
export const addDays = (s: string, n: number) => {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}
export const dayIdOf = (s: string): DayId => DAY_IDS[(parseISO(s).getDay() + 6) % 7]
export const getDay = (id: DayId): Day => days.find((d) => d.id === id)!
/** Segunda-feira da semana da data */
export const weekStart = (s: string) => addDays(s, -DAY_IDS.indexOf(dayIdOf(s)))
/** Data do dia `id` na mesma semana (seg–dom) que `ref` */
export const dateForDay = (id: DayId, ref = todayISO()) => addDays(weekStart(ref), DAY_IDS.indexOf(id))
export const diffDays = (a: string, b: string) => Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86400000)

/** Semana do plano (1 = semana de 9/11). 0 ou negativo = antes do início. */
export const planWeek = (s: string, start = profile.startDate) => {
  const d = diffDays(weekStart(s), weekStart(start))
  return Math.floor(d / 7) + 1
}

export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
export const fmtTime = (t: string) => t.replace(/^0/, '')
export const nowMin = () => miamiNow().min
export const sleepDuration = (bed: string, wake: string) => {
  let m = toMin(wake) - toMin(bed)
  if (m <= 0) m += 1440
  return `${Math.floor(m / 60)}h${m % 60 ? pad(m % 60) : ''}`
}
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const fmtDate = (s: string) => {
  const d = parseISO(s)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}
export const fmtShort = (s: string) => {
  const d = parseISO(s)
  return `${d.getDate()}/${d.getMonth() + 1}`
}
export const fmtNum = (n: number, dec = 1) => n.toLocaleString('pt-PT', { minimumFractionDigits: dec, maximumFractionDigits: dec })
export const itemKey = (t: string, title: string) =>
  `${t}|${title.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`
