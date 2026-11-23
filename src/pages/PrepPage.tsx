import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { categories, mealPreps, shopping, swaps } from '../data/plan'
import Check from '../components/Check'
import { IconTimer } from '../components/Icons'
import { dateForDay, fmtDate, fmtTime, todayISO, weekStart } from '../lib/date'
import { beep, fmtClock, unlockAudio, useNow } from '../lib/hooks'
import { useStore } from '../store/store'

const ORANGE = categories.prep.color
type Tab = 'sab' | 'qua' | 'compras'

export default function PrepPage() {
  const p = useParams()
  const today = todayISO()
  const tab: Tab = (p.tab as Tab) ?? (dateForDay('qua', today) === today ? 'qua' : 'sab')
  const tabs: { id: Tab; label: string }[] = [
    { id: 'sab', label: 'Sábado' },
    { id: 'qua', label: 'Quarta' },
    { id: 'compras', label: 'Compras' },
  ]
  return (
    <div>
      <h1 className="h1">Meal prep e compras</h1>
      <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {tabs.map((t) => (
          <Link key={t.id} to={`/prep/${t.id}`} replace className={`rounded-lg py-2 text-center text-sm font-semibold ${tab === t.id ? 'bg-white shadow-sm dark:bg-slate-950' : 'muted'}`}>{t.label}</Link>
        ))}
      </div>
      {tab === 'compras' ? <Shopping /> : <PrepSteps which={tab} />}
    </div>
  )
}

function PrepSteps({ which }: { which: 'sab' | 'qua' }) {
  const prep = mealPreps[which]
  const date = dateForDay(which)
  const s = useStore()
  const now = useNow(1000)
  const checks = s.checks[date] ?? []
  const fired = useRef(new Set<string>())
  useEffect(() => {
    for (const [k, end] of Object.entries(s.prepTimers)) {
      if (k.startsWith(date) && end <= now && !fired.current.has(k + end)) {
        fired.current.add(k + end)
        beep(4)
      }
    }
  }, [now, s.prepTimers, date])

  return (
    <div className="mt-4 space-y-2">
      <div className="text-sm muted">{prep.title} · {fmtDate(date)} · {prep.window}</div>
      {prep.steps.map((st, i) => {
        const key = `${date}|mp${i}`
        const ck = `mealprep:${i}`
        const done = checks.includes(ck)
        const end = s.prepTimers[key]
        const left = end ? (end - now) / 1000 : null
        return (
          <div key={i} className={`card flex gap-3 p-3 ${done ? 'opacity-55' : ''}`} style={{ borderColor: ORANGE + '55' }}>
            <div className="w-11 shrink-0 pt-0.5 text-right text-sm font-bold tabular-nums">{fmtTime(st.t)}</div>
            <div className="min-w-0 flex-1">
              <div className={`text-[15px] leading-snug ${done ? 'line-through' : ''}`}>{st.text}</div>
              {st.min && (
                <div className="mt-2 flex items-center gap-2">
                  {left == null ? (
                    <button className="btn-ghost py-1.5" onClick={() => { unlockAudio(); s.startPrepTimer(key, st.min!) }}>
                      <IconTimer width={16} height={16} /> {st.min} min
                    </button>
                  ) : (
                    <>
                      <span className={`rounded-xl px-3 py-1.5 text-lg font-bold tabular-nums ${left <= 0 ? 'bg-green-600 text-white' : ''}`} style={left > 0 ? { background: ORANGE + '22', color: ORANGE } : {}}>
                        {left <= 0 ? 'Pronto!' : fmtClock(left)}
                      </span>
                      <button className="btn-ghost py-1.5" onClick={() => s.stopPrepTimer(key)}>{left <= 0 ? 'OK' : 'Parar'}</button>
                    </>
                  )}
                </div>
              )}
            </div>
            <Check checked={done} onChange={() => s.toggleCheck(date, ck)} color={ORANGE} label={st.text} />
          </div>
        )
      })}
      <p className="pt-2 text-xs muted">Os temporizadores contam com a app fechada, mas o alarme só toca com a app aberta. Para o forno, usa também o temporizador do forno ou do iPhone.</p>
    </div>
  )
}

function Shopping() {
  const s = useStore()
  const week = weekStart(todayISO())
  const done = s.shopping[week] ?? []
  const sections = [...new Set(shopping.map((x) => x.sec))]
  const base = shopping.filter((x) => !x.extra)
  const total = base.reduce((t, x) => t + x.usd, 0)
  const inCart = shopping.filter((x) => done.includes(x.item)).reduce((t, x) => t + x.usd, 0)
  const doneBase = base.filter((x) => done.includes(x.item)).length
  return (
    <div className="mt-4 space-y-3">
      <div className="card sticky top-2 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Lista da semana</h2>
            <div className="text-xs muted">Semana de {fmtDate(week)} · reinicia à segunda</div>
          </div>
          <span className="chip">{doneBase}/{base.length}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span>No carrinho: <b className="tabular-nums">~${inCart}</b></span>
          <span className="muted">Base da semana: ~${total}</span>
        </div>
      </div>
      {sections.map((sec) => (
        <div key={sec} className="card">
          <h3 className="mb-1 font-bold">{sec}</h3>
          {sec === 'Só se já acabou' && <p className="mb-1 text-xs muted">Duram mais de uma semana: vê em casa o que falta.</p>}
          <ul>
            {shopping.filter((x) => x.sec === sec).map(({ item, usd }) => {
              const c = done.includes(item)
              return (
                <li key={item} className="flex items-center gap-3 py-1.5" onClick={() => s.toggleShop(week, item)}>
                  <Check checked={c} onChange={() => s.toggleShop(week, item)} color={categories.comida.color} label={item} />
                  <span className={`flex-1 text-[15px] ${c ? 'line-through muted' : ''}`}>{item}</span>
                  <span className="text-xs tabular-nums muted">${usd}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      {done.length > 0 && <button className="btn-ghost w-full" onClick={() => s.resetShop(week)}>Limpar marcações</button>}
      <div className="card text-sm">
        <h2 className="font-bold">Orgânico ou normal?</h2>
        <p className="mt-1 muted">Normal em quase tudo: carne, ovos, lacticínios, congelados, banana, tangerina e abacate. A diferença nutricional é mínima e o orgânico custa 1,5–2×. Se quiseres gastar em orgânico, só nos pimentos (estão na lista dos que levam mais pesticida); senão, lava-os bem.</p>
        <p className="mt-2 muted">Marca da loja (Publix, Great Value) poupa ~20%. Preços são estimativas.</p>
      </div>
      <div className="card text-sm">
        <h2 className="font-bold">Trocas permitidas</h2>
        <ul className="mt-1 list-disc pl-5 muted">{swaps.map((x) => <li key={x}>{x}</li>)}</ul>
        <p className="mt-2 text-xs muted">Pesos de arroz, aveia, carne e peixe são sempre em cru.</p>
      </div>
    </div>
  )
}
