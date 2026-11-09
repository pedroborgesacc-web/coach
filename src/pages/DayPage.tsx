import { useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { categories, measurements, targets, workouts, type DayId, type TimelineItem } from '../data/plan'
import Bar from '../components/Bar'
import Check from '../components/Check'
import DayStrip from '../components/DayStrip'
import { IconDrop, IconMoon } from '../components/Icons'
import { DAY_IDS, addDays, dateForDay, dayIdOf, fmtDate, fmtNum, fmtTime, getDay, itemKey, nowMin, planWeek, sleepDuration, todayISO, toMin } from '../lib/date'
import { useNow } from '../lib/hooks'
import { useSwipe } from '../lib/swipe'
import { weekState } from '../lib/training'
import { kcalAdjust, useStore, type Readiness } from '../store/store'

function activeKeys(items: TimelineItem[], now: number) {
  const act = new Set<string>()
  items.forEach((it, i) => {
    const s = toMin(it.t)
    const next = items.slice(i + 1).find((x) => toMin(x.t) > s)
    const e = it.end ? toMin(it.end) : Math.min(next ? toMin(next.t) : s + 30, s + 30)
    if (s <= now && now < e) act.add(itemKey(it.t, it.title))
  })
  if (!act.size) {
    const past = items.filter((it) => toMin(it.t) <= now)
    const last = past[past.length - 1]
    if (last && !(last.end && toMin(last.end) <= now)) act.add(itemKey(last.t, last.title))
  }
  return act
}

export default function DayPage() {
  const params = useParams()
  const nav = useNavigate()
  useNow(30000)
  const today = todayISO()
  const todayId = dayIdOf(today)
  const id = (params.id as DayId) ?? todayId
  const day = getDay(id)
  const date = dateForDay(id, today)
  const isToday = date === today
  const s = useStore()
  const checks = s.checks[date] ?? []
  const water = s.water[date] ?? 0
  const ws = weekState(date, s.startDate, s.deloadWeeks, s.readiness)
  const week = planWeek(date, s.startDate)
  const kcalTarget = day.kcalTarget + kcalAdjust(s.adjustments, date)
  const workout = workouts[day.workout]

  const meals = day.timeline.filter((i) => i.meal)
  const eaten = meals.filter((i) => checks.includes(itemKey(i.t, i.title)))
  const protein = eaten.reduce((t, i) => t + i.meal!.p, 0)
  const kcal = eaten.reduce((t, i) => t + i.meal!.kcal, 0)
  const planned = meals.reduce((t, i) => t + i.meal!.kcal, 0)

  const active = useMemo(() => (isToday ? activeKeys(day.timeline, nowMin()) : new Set<string>()), [isToday, day, Math.floor(Date.now() / 60000)])
  const firstActive = [...active][0]
  const activeRef = useRef<HTMLLIElement | null>(null)
  useEffect(() => {
    if (isToday && activeRef.current) activeRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [isToday, id])

  const idx = DAY_IDS.indexOf(id)
  const go = (d: number) => nav(`/dia/${DAY_IDS[(idx + d + 7) % 7]}`, { replace: true })
  const swipe = useSwipe(() => go(1), () => go(-1))

  // Avisos do dia
  const notices: { text: string; to?: string; tone: string }[] = []
  if (isToday) {
    if (measurements.weighDays.includes(id) && s.weights[date] == null) notices.push({ text: 'Pesa-te hoje em jejum', to: '/progresso', tone: 'blue' })
    if (id === measurements.waistDay && s.waists[date] == null) notices.push({ text: 'Mede a cintura ao nível do umbigo', to: '/progresso', tone: 'blue' })
    if (id === 'sex' && week >= 1 && (week - 1) % measurements.photosEveryWeeks === 0) notices.push({ text: 'Semana de fotos: frente, lado e costas', tone: 'purple' })
    if (ws.readinessAlert) notices.push({ text: 'Readiness baixa 3 dias seguidos: considera uma semana de deload', to: '/treino', tone: 'amber' })
    if (date < s.startDate) notices.push({ text: addDays(date, 1) === s.startDate ? `O plano começa amanhã. Hoje à noite: «${day.prepTitle}» e deitar a horas.` : `O plano começa a ${fmtDate(s.startDate)}`, tone: 'purple' })
  }
  const prepDone = day.prepTomorrow.filter((_, i) => checks.includes(`prep:${i}`)).length

  return (
    <div {...swipe}>
      <header className="sticky top-0 z-20 -mx-4 bg-slate-50/90 px-4 pb-2 pt-safe backdrop-blur dark:bg-[#0b1120]/90" style={{ marginTop: 'calc(-1 * max(env(safe-area-inset-top), 12px))' }}>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">{isToday ? 'Hoje' : fmtDate(date)}{week >= 1 ? ` · Semana ${week}` : ''}</div>
            <h1 className="h1">{day.name}</h1>
          </div>
          {!isToday && <Link to="/" replace className="btn-ghost">Ir para hoje</Link>}
        </div>
        <DayStrip active={id} base="/dia" today={today} />
      </header>

      <section className="card mt-3 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <span className="chip">{day.type}</span>
          <Link to={`/treino/${id}`} className="chip" style={{ background: categories.treino.color + '22', color: categories.treino.color }}>
            {workout.id === 'descanso' ? 'Sem treino' : `Treino ${workout.name}`}{ws.returnMode && workout.exercises.length ? ' · regresso' : ''}{ws.deload ? ' · deload' : ''}
          </Link>
          <span className="chip" style={{ background: categories.sono.color + '22', color: categories.sono.color }}>
            <IconMoon width={12} height={12} /> {fmtTime(day.sleep.bed)}→{fmtTime(day.sleep.wake)} · {sleepDuration(day.sleep.bed, day.sleep.wake)}
          </span>
        </div>
        <Bar label="Proteína" value={protein} target={targets.proteinMin} range={`${targets.proteinMin}–${targets.proteinMax}`} unit="g" color={categories.comida.color} />
        <Bar label="Calorias" value={kcal} target={kcalTarget} unit="kcal" color="#16a34a" />
        <div className="flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            <IconDrop width={18} height={18} className="text-sky-500" />
            <span className="tabular-nums"><b>{fmtNum(water, 1)}</b> / {targets.waterL} L</span>
            <span className="muted text-xs">{day.water.replace(/^3 L ?/, '')}</span>
          </div>
          <div className="flex gap-1">
            <button className="btn-ghost px-2.5 py-1" onClick={() => s.setWater(date, water - 0.25)} aria-label="Menos água">−</button>
            <button className="btn-ghost px-2.5 py-1" onClick={() => s.setWater(date, water + 0.5)}>+0,5 L</button>
          </div>
        </div>
        <ReadinessPicker value={s.readiness[date]} onChange={(r) => s.setReadiness(date, r)} />
        {planned !== kcalTarget && (
          <p className="text-xs muted">Plano do dia ≈ {planned} kcal (estimativa){kcalAdjust(s.adjustments, date) ? ` · alvo inclui ajuste do coach de ${kcalAdjust(s.adjustments, date) > 0 ? '+' : ''}${kcalAdjust(s.adjustments, date)} kcal` : ''}</p>
        )}
      </section>

      {notices.map((n) => {
        const cls = `mt-2 flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium ${n.tone === 'blue' ? 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200' : n.tone === 'amber' ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200' : 'bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200'}`
        return n.to ? <Link key={n.text} to={n.to} className={cls}>{n.text}<span>→</span></Link> : <div key={n.text} className={cls}>{n.text}</div>
      })}

      <ol className="mt-4 space-y-2">
        {day.timeline.map((it) => {
          const key = itemKey(it.t, it.title)
          const done = checks.includes(key)
          const cat = categories[it.cat]
          const isActive = active.has(key)
          const toTraining = it.cat === 'treino'
          return (
            <li
              key={key}
              ref={key === firstActive ? activeRef : undefined}
              className={`relative flex gap-3 rounded-2xl border p-3 transition ${isActive ? 'shadow-md ring-2' : ''} ${done ? 'opacity-55' : ''}`}
              style={{ background: cat.color + (isActive ? '2e' : '14'), borderColor: cat.color + '40', ...(isActive ? { ['--tw-ring-color' as string]: cat.color } : {}) }}
            >
              <div className="w-12 shrink-0 pt-0.5 text-right">
                <div className="text-sm font-bold tabular-nums">{it.approx ? '~' : ''}{fmtTime(it.t)}</div>
                {it.end && <div className="text-[11px] tabular-nums muted">{fmtTime(it.end)}</div>}
              </div>
              <div className="w-1 shrink-0 rounded-full" style={{ background: cat.color }} />
              <div className="min-w-0 flex-1">
                {isActive && <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: cat.color }}>Agora</div>}
                <div className={`text-[15px] font-semibold leading-snug ${done ? 'line-through' : ''}`}>{it.title}</div>
                {it.meal && (
                  <div className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                    {it.meal.desc}
                    <div className="mt-1 flex gap-1.5">
                      {it.meal.p > 0 && <span className="chip">{it.meal.p} g proteína</span>}
                      <span className="chip">≈ {it.meal.kcal} kcal</span>
                    </div>
                  </div>
                )}
                {toTraining && workout.exercises.length > 0 && <Link to={`/treino/${id}`} className="mt-1 inline-block text-sm font-semibold" style={{ color: cat.color }}>Abrir treino →</Link>}
                {it.title.startsWith('Meal prep') && <Link to={`/prep/${id === 'qua' ? 'qua' : 'sab'}`} className="mt-1 inline-block text-sm font-semibold" style={{ color: cat.color }}>Abrir passos e temporizadores →</Link>}
              </div>
              <Check checked={done} onChange={() => s.toggleCheck(date, key)} color={cat.color} label={it.title} />
            </li>
          )
        })}
      </ol>

      <section className="card mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">{day.prepTitle}</h2>
          <span className="chip">{prepDone}/{day.prepTomorrow.length}</span>
        </div>
        <ul className="space-y-1">
          {day.prepTomorrow.map((p, i) => {
            const k = `prep:${i}`
            const done = checks.includes(k)
            return (
              <li key={k} className="flex items-center gap-3 py-1.5" onClick={() => s.toggleCheck(date, k)}>
                <Check checked={done} onChange={() => s.toggleCheck(date, k)} color={categories.prep.color} label={p} />
                <span className={`text-[15px] ${done ? 'line-through muted' : ''}`}>{p}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-xs muted">
        {Object.values(categories).map((c) => (
          <span key={c.label} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.label}</span>
        ))}
      </div>
    </div>
  )
}

function ReadinessPicker({ value, onChange }: { value?: Readiness; onChange: (r: Readiness | null) => void }) {
  const opts: { v: Readiness; label: string; c: string }[] = [
    { v: 'baixa', label: 'Baixa', c: '#ef4444' },
    { v: 'ok', label: 'OK', c: '#eab308' },
    { v: 'alta', label: 'Alta', c: '#22c55e' },
  ]
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="font-medium text-slate-700 dark:text-slate-200">Readiness Fitbit</span>
      <div className="flex gap-1">
        {opts.map((o) => (
          <button key={o.v} onClick={() => onChange(value === o.v ? null : o.v)} className="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
            style={value === o.v ? { background: o.c, color: 'white' } : { background: o.c + '1f', color: o.c }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
