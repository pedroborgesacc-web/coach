import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { measurements, profile, workouts, type Exercise } from '../data/plan'
import { evaluate, nextReviewIn } from '../lib/coach'
import { addDays, dayIdOf, fmtDate, fmtNum, fmtShort, getDay, planWeek, todayISO, weekStart } from '../lib/date'
import { bestSet } from '../lib/training'
import { kcalAdjust, useStore } from '../store/store'

const chartExercises: Exercise[] = Object.values(workouts).flatMap((w) => w.exercises.filter((e) => e.chart))

export default function ProgressPage() {
  const s = useStore()
  const today = todayISO()

  const weeklyWeights = useMemo(() => {
    const by: Record<string, number[]> = {}
    for (const [d, kg] of Object.entries(s.weights)) (by[weekStart(d)] ??= []).push(kg)
    return Object.keys(by).sort().map((w) => ({ week: w, label: fmtShort(w), avg: +(by[w].reduce((a, b) => a + b, 0) / by[w].length).toFixed(2), n: by[w].length }))
  }, [s.weights])
  const waists = useMemo(() => Object.keys(s.waists).sort().map((d) => ({ label: fmtShort(d), cm: s.waists[d] })), [s.waists])

  return (
    <div className="space-y-4">
      <h1 className="h1">Progresso</h1>
      <CoachCard />
      <MeasureCard
        title="Peso" unit="kg" step="0.1" placeholder={String(profile.startWeightKg)}
        hint={`Pesa-te à ${measurements.weighDays.map((d) => getDay(d).name.toLowerCase()).join(', ')} de manhã, em jejum.`}
        values={s.weights} onSave={s.setWeight} today={today}
        suggestDay={measurements.weighDays.includes(dayIdOf(today))}
      />
      {weeklyWeights.length > 0 && (
        <div className="card">
          <h2 className="font-bold">Média semanal de peso</h2>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {weeklyWeights.slice(-3).map((w, i, arr) => {
              const prev = i > 0 ? arr[i - 1].avg : weeklyWeights[weeklyWeights.length - arr.length + i - 1]?.avg
              const d = prev != null ? w.avg - prev : null
              return (
                <div key={w.week} className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                  <div className="text-xs muted">Sem. {fmtShort(w.week)}</div>
                  <div className="text-lg font-bold tabular-nums">{fmtNum(w.avg, 1)}</div>
                  <div className="text-xs muted">{d == null ? `${w.n} pesagens` : `${d > 0 ? '+' : ''}${fmtNum(d, 2)} kg`}</div>
                </div>
              )
            })}
          </div>
          <Chart data={weeklyWeights} x="label" y="avg" color="#3b82f6" unit="kg" />
        </div>
      )}
      <MeasureCard
        title="Cintura" unit="cm" step="0.5" placeholder="80"
        hint="À sexta, ao nível do umbigo, de manhã."
        values={s.waists} onSave={s.setWaist} today={today}
        suggestDay={dayIdOf(today) === measurements.waistDay}
      />
      {waists.length > 1 && (
        <div className="card">
          <h2 className="font-bold">Cintura</h2>
          <Chart data={waists} x="label" y="cm" color="#a855f7" unit="cm" />
        </div>
      )}
      <StrengthCard />
      <PhotosCard />
    </div>
  )
}

function Chart({ data, x, y, color, unit }: { data: object[]; x: string; y: string; color: string; unit: string }) {
  return (
    <div className="mt-3 h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
          <XAxis dataKey={x} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtNum(v, 0)} />
          <Tooltip formatter={(v: number) => [`${fmtNum(v, 1)} ${unit}`, '']} separator="" contentStyle={{ borderRadius: 12, fontSize: 13 }} />
          <Line type="monotone" dataKey={y} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function MeasureCard({ title, unit, step, placeholder, hint, values, onSave, today, suggestDay }: {
  title: string; unit: string; step: string; placeholder: string; hint: string
  values: Record<string, number>; onSave: (d: string, v: number | null) => void; today: string; suggestDay: boolean
}) {
  const [date, setDate] = useState(today)
  const [val, setVal] = useState('')
  const recent = Object.keys(values).sort().reverse().slice(0, 5)
  const save = () => {
    const n = Number(val.replace(',', '.'))
    if (!val || isNaN(n)) return
    onSave(date, n)
    setVal('')
  }
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">{title}</h2>
        {suggestDay && values[today] == null && <span className="chip" style={{ background: '#3b82f622', color: '#2563eb' }}>Hoje é dia de medir</span>}
      </div>
      <p className="mt-0.5 text-sm muted">{hint}</p>
      <div className="mt-3 flex gap-2">
        <input type="date" className="input w-[9.5rem] shrink-0 text-sm" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} />
        <input className="input text-center tabular-nums" type="number" inputMode="decimal" step={step} placeholder={values[date] != null ? String(values[date]) : placeholder} value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        <button className="btn-primary shrink-0" onClick={save}>Guardar</button>
      </div>
      {recent.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {recent.map((d) => (
            <li key={d} className="flex items-center justify-between py-1.5">
              <span className="muted">{getDay(dayIdOf(d)).short}, {fmtDate(d)}</span>
              <span className="flex items-center gap-3">
                <b className="tabular-nums">{fmtNum(values[d], 1)} {unit}</b>
                <button className="text-xs muted" onClick={() => onSave(d, null)} aria-label="Apagar">✕</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StrengthCard() {
  const logs = useStore((s) => s.logs)
  const [exId, setExId] = useState(chartExercises[0].id)
  const ex = chartExercises.find((e) => e.id === exId)!
  const data = useMemo(
    () => Object.keys(logs).sort().flatMap((d) => {
      const b = logs[d][exId] ? bestSet(logs[d][exId], ex.bodyweight) : null
      return b ? [{ label: fmtShort(d), e1rm: +b.e.toFixed(1), set: `${ex.bodyweight ? (b.kg ? `PC+${b.kg}` : 'PC') : b.kg} kg × ${b.reps}` }] : []
    }),
    [logs, exId, ex.bodyweight],
  )
  const best = data.reduce<(typeof data)[number] | null>((m, x) => (!m || x.e1rm > m.e1rm ? x : m), null)
  return (
    <div className="card">
      <h2 className="font-bold">Força: melhor série</h2>
      <select className="input mt-2 text-sm" value={exId} onChange={(e) => setExId(e.target.value)}>
        {chartExercises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      {data.length === 0 ? (
        <p className="mt-3 text-sm muted">Ainda sem registos deste exercício.</p>
      ) : (
        <>
          <div className="mt-2 flex gap-4 text-sm">
            <span>Última: <b>{data[data.length - 1].set}</b></span>
            {best && <span>Recorde: <b>{best.set}</b></span>}
          </div>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtNum(v, 0)} />
                <Tooltip formatter={(_v, _n, p) => [(p.payload as { set: string }).set, 'Melhor série']} contentStyle={{ borderRadius: 12, fontSize: 13 }} />
                <Line type="monotone" dataKey="e1rm" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-xs muted">Linha = 1RM estimado da melhor série (kg × reps convertidos), para comparar séries com reps diferentes.</p>
        </>
      )}
    </div>
  )
}

function CoachCard() {
  const s = useStore()
  const today = todayISO()
  const r = evaluate(s, today)
  const next = nextReviewIn(today, s.startDate)
  const accepted = r && s.adjustments.some((a) => a.text.startsWith(`[${r.key}]`))
  const dismissed = r && s.coachDismissed.includes(r.key)
  const total = kcalAdjust(s.adjustments)
  const toneCls = { up: 'text-emerald-600 dark:text-emerald-400', down: 'text-rose-600 dark:text-rose-400', flat: 'text-slate-600 dark:text-slate-300', none: 'text-slate-400' }

  return (
    <div className="card border-2" style={{ borderColor: '#22c55e55' }}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Coach</h2>
        <span className="chip">Próxima análise: {fmtDate(next.date)}</span>
      </div>
      {!r ? (
        <p className="mt-2 text-sm muted">
          A primeira análise é ao fim das semanas 1 e 2 ({fmtDate(addDays(weekStart(s.startDate), 14))}). Até lá: pesa-te à segunda, quarta e sexta, mede a cintura à sexta e regista os treinos.
          {planWeek(today, s.startDate) < 1 && ` O plano começa a ${fmtDate(s.startDate)}.`}
        </p>
      ) : (
        <>
          <div className="mt-1 text-xs muted">Semanas {r.weeks[0]}–{r.weeks[1]}</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {r.metrics.map((m) => (
              <div key={m.label} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                <div className="text-xs muted">{m.label}</div>
                <div className={`font-bold tabular-nums ${toneCls[m.tone]}`}>{m.value}</div>
              </div>
            ))}
          </div>
          {!dismissed && (
            <div className={`mt-3 rounded-xl p-3 ${r.ready ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-amber-50 dark:bg-amber-950'}`}>
              <div className="text-base font-bold">{r.title}</div>
              <p className="mt-1 text-sm opacity-90">{r.detail}</p>
              <div className="mt-3 flex gap-2">
                {r.kcal !== 0 && !accepted && (
                  <button className="btn-primary" onClick={() => s.addAdjustment({ date: today, kcal: r.kcal, text: `[${r.key}] ${r.title}` })}>
                    Aplicar {r.kcal > 0 ? '+' : ''}{r.kcal} kcal
                  </button>
                )}
                {r.action === 'deload' && !s.deloadWeeks.includes(planWeek(today, s.startDate)) && (
                  <button className="btn-primary" onClick={() => s.toggleDeload(planWeek(today, s.startDate))}>Marcar esta semana como deload</button>
                )}
                {accepted && <span className="chip">Aplicado ✓</span>}
                <button className="btn-ghost" onClick={() => s.dismissCoach(r.key)}>OK</button>
              </div>
            </div>
          )}
        </>
      )}
      {s.adjustments.length > 0 && (
        <div className="mt-3 text-sm">
          <div className="font-semibold">Ajustes aplicados (total {total > 0 ? '+' : ''}{total} kcal/dia)</div>
          <ul className="mt-1 space-y-1">
            {s.adjustments.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-2 muted">
                <span>{fmtShort(a.date)} · {a.text.replace(/^\[[^\]]+\]\s*/, '')}</span>
                <button className="text-xs" onClick={() => s.removeAdjustment(i)}>Anular</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs muted">Muda só uma coisa a cada 2 semanas.</p>
    </div>
  )
}

function PhotosCard() {
  const start = useStore((s) => s.startDate)
  const w = planWeek(todayISO(), start)
  const next = w < 1 ? 1 : w === 1 ? 1 : Math.ceil((w - 1) / measurements.photosEveryWeeks) * measurements.photosEveryWeeks + 1
  const isNow = w >= 1 && (w - 1) % measurements.photosEveryWeeks === 0
  return (
    <div className="card text-sm">
      <h2 className="font-bold">Fotos</h2>
      <p className="mt-1 muted">Frente, lado e costas, com a mesma luz e à mesma hora. Na semana 1 e depois a cada 4 semanas.</p>
      <p className="mt-2 font-semibold">{isNow ? 'Esta semana é semana de fotos.' : `Próximas fotos: semana ${next} (${fmtDate(addDays(weekStart(start), (next - 1) * 7))}).`}</p>
    </div>
  )
}
