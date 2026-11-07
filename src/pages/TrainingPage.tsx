import { useParams } from 'react-router-dom'
import { categories, trainingRules, workouts, type DayId, type Exercise } from '../data/plan'
import Check from '../components/Check'
import DayStrip from '../components/DayStrip'
import { dateForDay, dayIdOf, fmtDate, fmtShort, getDay, todayISO } from '../lib/date'
import { fmtClock, unlockAudio } from '../lib/hooks'
import { doneSets, effectiveSets, fmtKg, lastSession, restFor, suggest, weekState, type WeekState } from '../lib/training'
import { useRest } from '../store/rest'
import { useStore, type SetLog } from '../store/store'

const BLUE = categories.treino.color

export default function TrainingPage() {
  const params = useParams()
  const today = todayISO()
  const id = (params.id as DayId) ?? dayIdOf(today)
  const day = getDay(id)
  const date = dateForDay(id, today)
  const w = workouts[day.workout]
  const s = useStore()
  const ws = weekState(date, s.startDate, s.deloadWeeks, s.readiness)
  const dayLog = s.logs[date] ?? {}
  const totalSets = w.exercises.reduce((t, e) => t + effectiveSets(e, ws), 0)
  const doneCount = w.exercises.reduce((t, e) => t + doneSets(dayLog[e.id]).length, 0)

  return (
    <div>
      <header className="mb-3">
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: BLUE }}>
          {date === today ? 'Hoje' : fmtDate(date)}{ws.week >= 1 ? ` · Semana ${ws.week}` : ''}
        </div>
        <h1 className="h1">{w.id === 'descanso' ? 'Descanso' : `${day.name} — ${w.name}`}</h1>
      </header>
      <DayStrip active={id} base="/treino" today={today} />

      <div className="mt-3 space-y-2">
        {ws.returnMode && (
          <Banner tone="blue" title={`Semanas 1–2: modo regresso`}>
            Já cortei 1 série a cada exercício. Termina cada série com 3 repetições em reserva.
          </Banner>
        )}
        {ws.deload && (
          <Banner tone="purple" title="Semana de deload">
            {ws.deloadReason}. Metade das séries, mesma carga.
          </Banner>
        )}
        {ws.readinessAlert && !ws.deload && (
          <Banner tone="amber" title="Readiness baixa 3 dias seguidos">
            Considera fazer esta semana como deload.
            <button className="btn-ghost mt-2 w-full" onClick={() => s.toggleDeload(ws.week)}>Marcar semana {ws.week} como deload</button>
          </Banner>
        )}
        {!ws.deload && ws.week > trainingRules.returnWeeks && ws.week % trainingRules.deloadEvery === trainingRules.deloadEvery - 1 && (
          <Banner tone="purple" title="Deload na próxima semana">Semana {ws.week + 1} é de deload (a cada 6–8 semanas).</Banner>
        )}
      </div>

      {w.id === 'descanso' && <div className="card mt-3 text-center"><p className="text-lg font-semibold">Descanso total</p><p className="muted mt-1">Turno das 8h às 20h. Hoje o músculo cresce: come e dorme bem.</p></div>}
      {w.id === 'corrida' && <RunCard date={date} sprints={ws.sprints} />}

      {w.exercises.length > 0 && (
        <>
          <div className="card mt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Progresso do treino</span>
              <span className="tabular-nums muted">{doneCount}/{totalSets} séries</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full" style={{ width: `${totalSets ? (doneCount / totalSets) * 100 : 0}%`, background: BLUE }} />
            </div>
            <p className="mt-2 muted">Aquecimento: {trainingRules.warmup}. {ws.returnMode ? '3 reps em reserva.' : `Terminar com ${trainingRules.rir}.`}</p>
          </div>
          <div className="mt-3 space-y-3">
            {w.exercises.map((ex) => (
              <ExerciseCard key={ex.id} ex={ex} date={date} ws={ws} sets={dayLog[ex.id]} />
            ))}
          </div>
          <details className="card mt-3 text-sm">
            <summary className="cursor-pointer font-semibold">Regras de progressão</summary>
            <p className="mt-2 muted">{trainingRules.progression}</p>
            <p className="mt-2 muted">Descanso: 2–3 min nos exercícios principais, 60–90 s nos restantes. Deload a cada 6–8 semanas, ou se a Readiness estiver baixa 3 dias seguidos.</p>
            <button className="btn-ghost mt-3 w-full" onClick={() => s.toggleDeload(ws.week)}>
              {s.deloadWeeks.includes(ws.week) ? `Desmarcar deload da semana ${ws.week}` : `Marcar semana ${ws.week} como deload`}
            </button>
          </details>
        </>
      )}
    </div>
  )
}

function Banner({ tone, title, children }: { tone: 'blue' | 'purple' | 'amber'; title: string; children: React.ReactNode }) {
  const cls = { blue: 'bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100', purple: 'bg-purple-50 text-purple-900 dark:bg-purple-950 dark:text-purple-100', amber: 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100' }[tone]
  return (
    <div className={`rounded-2xl px-4 py-3 text-sm ${cls}`}>
      <div className="font-bold">{title}</div>
      <div className="mt-0.5 opacity-90">{children}</div>
    </div>
  )
}

function RunCard({ date, sprints }: { date: string; sprints: boolean }) {
  const run = useStore((s) => s.runs[date])
  const setRun = useStore((s) => s.setRun)
  return (
    <div className="card mt-3 space-y-3">
      <div className="text-lg font-bold">Corrida em zona 2</div>
      <p className="muted text-sm">30–40 min a um ritmo em que consegues conversar, e 5 min de alongamentos.</p>
      <div className={`rounded-xl px-3 py-2 text-sm font-semibold ${sprints ? 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
        {sprints ? 'Hoje há sprints: 6 × 20 s no fim (recuperação completa entre eles)' : 'Sem sprints esta semana (são de 15 em 15 dias)'}
      </div>
      <label className="flex items-center gap-3 text-sm">
        <span className="w-24 font-medium">Minutos</span>
        <input className="input" inputMode="numeric" type="number" placeholder="35" value={run?.min ?? ''} onChange={(e) => setRun(date, { min: e.target.value ? Number(e.target.value) : null })} />
      </label>
      {sprints && (
        <label className="flex items-center gap-3 text-sm">
          <Check checked={!!run?.sprints} onChange={() => setRun(date, { sprints: !run?.sprints })} color={BLUE} label="Sprints feitos" />
          Sprints feitos
        </label>
      )}
      <label className="flex items-center gap-3 text-sm">
        <Check checked={!!run?.done} onChange={() => setRun(date, { done: !run?.done })} color={BLUE} label="Corrida feita" />
        Corrida feita
      </label>
    </div>
  )
}

function ExerciseCard({ ex, date, ws, sets }: { ex: Exercise; date: string; ws: WeekState; sets?: SetLog[] }) {
  const logs = useStore((s) => s.logs)
  const setSet = useStore((s) => s.setSet)
  const startRest = useRest((s) => s.start)
  const last = lastSession(logs, ex.id, date)
  const sug = suggest(ex, last, ws)
  const n = Math.max(effectiveSets(ex, ws), sets?.length ?? 0)
  const unit = ex.unit === 's' ? 's' : 'reps'
  const range = ex.unit === 'amrap' ? 'até 2 antes da falha' : ex.repMin === ex.repMax ? `${ex.repMax}` : `${ex.repMin}–${ex.repMax}`
  const allDone = sets && doneSets(sets).length >= effectiveSets(ex, ws)

  return (
    <div className={`card ${allDone ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            {ex.superset && <span className="chip" style={{ background: BLUE + '22', color: BLUE }}>Superset {ex.superset}</span>}
            <h3 className="text-base font-bold leading-tight">{ex.name}</h3>
          </div>
          <div className="mt-0.5 text-sm muted">
            {effectiveSets(ex, ws)} × {range}{ex.unit === 's' ? ' s' : ''}{ex.perSide ? ' por lado' : ''} · descanso {fmtClock(restFor(ex))}{ex.main ? ' (principal)' : ''}
          </div>
          {ex.note && <div className="text-xs muted">{ex.note}</div>}
        </div>
        {allDone && <span className="chip" style={{ background: '#22c55e22', color: '#16a34a' }}>Feito</span>}
      </div>

      <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-sm dark:bg-slate-800/60">
        {last ? (
          <div className="muted">Última vez ({fmtShort(last.date)}): <span className="font-medium text-slate-700 dark:text-slate-200">{last.sets.map((x) => (ex.unit === 's' ? `${x.reps}s` : `${ex.bodyweight && !x.kg ? 'PC' : x.kg}×${x.reps}`)).join(' · ')}</span></div>
        ) : (
          <div className="muted">Sem registos anteriores.</div>
        )}
        <div className="mt-0.5 font-medium" style={{ color: BLUE }}>{sug.text}</div>
      </div>

      <div className="mt-3 grid grid-cols-[2rem_1fr_1fr_2.25rem] items-center gap-2 text-xs font-semibold uppercase muted">
        <span>Série</span><span>{ex.bodyweight ? 'kg extra' : 'kg'}</span><span>{unit}</span><span />
      </div>
      {Array.from({ length: n }, (_, i) => {
        const v = sets?.[i] ?? { kg: null, reps: null, done: false }
        const lastSet = last?.sets[i] ?? last?.sets[last.sets.length - 1]
        const kgPh = sug.kg ?? lastSet?.kg ?? null
        const repsPh = lastSet?.reps ?? (ex.unit === 'amrap' ? null : ex.repMax)
        const toggle = () => {
          if (v.done) return setSet(date, ex.id, i, { done: false })
          unlockAudio()
          setSet(date, ex.id, i, {
            kg: v.kg ?? (ex.unit === 's' ? null : kgPh ?? (ex.bodyweight ? 0 : null)),
            reps: v.reps ?? repsPh,
            done: true,
          })
          startRest(restFor(ex), ex.name)
        }
        return (
          <div key={i} className={`mt-1.5 grid grid-cols-[2rem_1fr_1fr_2.25rem] items-center gap-2 ${v.done ? 'opacity-60' : ''}`}>
            <span className="text-center text-sm font-bold">{i + 1}</span>
            <input className="input py-1.5 text-center tabular-nums" type="number" inputMode="decimal" step="0.5" disabled={ex.unit === 's'}
              placeholder={ex.unit === 's' ? '—' : kgPh != null ? String(kgPh) : 'kg'} value={v.kg ?? ''}
              onChange={(e) => setSet(date, ex.id, i, { kg: e.target.value === '' ? null : Number(e.target.value.replace(',', '.')) })} />
            <input className="input py-1.5 text-center tabular-nums" type="number" inputMode="numeric"
              placeholder={repsPh != null ? String(repsPh) : unit} value={v.reps ?? ''}
              onChange={(e) => setSet(date, ex.id, i, { reps: e.target.value === '' ? null : Number(e.target.value) })} />
            <Check checked={v.done} onChange={toggle} color={BLUE} label={`Série ${i + 1}`} />
          </div>
        )
      })}
      <div className="mt-2 flex justify-between text-xs">
        <button className="font-semibold" style={{ color: BLUE }} onClick={() => setSet(date, ex.id, n, {})}>+ série extra</button>
        {ex.unit !== 's' && sug.kg != null && <span className="muted">Sugerido: {fmtKg(sug.kg, ex)}</span>}
      </div>
    </div>
  )
}
