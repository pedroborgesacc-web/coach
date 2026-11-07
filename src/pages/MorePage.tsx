import { useRef, useState } from 'react'
import { categories, profile, targets } from '../data/plan'
import { IconBell } from '../components/Icons'
import { fmtDate, planWeek, todayISO } from '../lib/date'
import { exportData, kcalAdjust, useStore, type Theme } from '../store/store'

export default function MorePage() {
  const s = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const week = planWeek(todayISO(), s.startDate)

  const doExport = async () => {
    const json = JSON.stringify({ app: 'coach-pedro', exportedAt: new Date().toISOString(), data: exportData() }, null, 2)
    const name = `coach-pedro-${todayISO()}.json`
    const file = new File([json], name, { type: 'application/json' })
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return } catch { /* cancelado */ }
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const doImport = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text())
      const data = parsed.data ?? parsed
      if (typeof data !== 'object' || !('checks' in data || 'logs' in data)) throw new Error('formato')
      if (!confirm('Substituir todos os dados atuais pelos do ficheiro?')) return
      s.importData(data)
      setMsg('Dados importados ✓')
    } catch {
      setMsg('Ficheiro inválido.')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="h1">Mais</h1>

      <div className="card text-sm">
        <h2 className="text-lg font-bold">{profile.name} · semana {week >= 1 ? week : '—'}</h2>
        <p className="mt-1 muted">{profile.goal}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat k="Kcal" v={`2600 (dom 2400)${kcalAdjust(s.adjustments) ? ` ${kcalAdjust(s.adjustments) > 0 ? '+' : ''}${kcalAdjust(s.adjustments)}` : ''}`} />
          <Stat k="Proteína" v={`${targets.proteinMin}–${targets.proteinMax} g`} />
          <Stat k="Gordura / hidratos" v={`~${targets.fat} g / ~${targets.carbs} g`} />
          <Stat k="Água · creatina" v={`${targets.waterL} L · ${targets.creatineG} g`} />
          <Stat k="Deitar · dormir" v={`${targets.bed} · ${targets.sleep}`} />
          <Stat k="Início" v={fmtDate(s.startDate)} />
        </div>
      </div>

      <div className="card">
        <h2 className="flex items-center gap-2 text-lg font-bold"><IconBell width={20} height={20} /> Lembretes</h2>
        <p className="mt-1 text-sm muted">
          No iPhone, uma app web não consegue tocar alarmes com a app fechada. A solução é juntar estes lembretes ao Calendário do iPhone, uma vez só: hora de ir para a cama, preparar o dia seguinte, pesar (seg, qua, sex) e medir a cintura (sex).
        </p>
        <a className="btn-primary mt-3 w-full" href="lembretes.ics" target="_blank" rel="noopener">Adicionar ao Calendário</a>
        <p className="mt-2 text-xs muted">Abre o ficheiro e toca em «Adicionar tudo». Os lembretes ficam num calendário novo e repetem-se todas as semanas, no fuso horário de Miami. Para os tirar, apaga esse calendário.</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold">Os teus dados</h2>
        <p className="mt-1 text-sm muted">Ficam só neste telemóvel. Exporta de vez em quando para não os perder (por exemplo, para o iCloud Drive).</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="btn-primary" onClick={doExport}>Exportar JSON</button>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>Importar JSON</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        {msg && <p className="mt-2 text-sm font-semibold">{msg}</p>}
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-bold">Definições</h2>
        <div>
          <div className="mb-1 text-sm font-medium">Tema</div>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(['auto', 'light', 'dark'] as Theme[]).map((t) => (
              <button key={t} onClick={() => s.setTheme(t)} className={`rounded-lg py-2 text-sm font-semibold ${s.theme === t ? 'bg-white shadow-sm dark:bg-slate-950' : 'muted'}`}>
                {{ auto: 'Automático', light: 'Claro', dark: 'Escuro' }[t]}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <div className="mb-1 text-sm font-medium">Data de início do plano (segunda-feira)</div>
          <input type="date" className="input" value={s.startDate} onChange={(e) => e.target.value && s.setStartDate(e.target.value)} />
        </label>
        {s.deloadWeeks.length > 0 && <p className="text-sm muted">Semanas de deload marcadas: {[...s.deloadWeeks].sort((a, b) => a - b).join(', ')}</p>}
      </div>

      <div className="card text-sm">
        <h2 className="text-lg font-bold">Categorias</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {Object.values(categories).map((c) => (
            <div key={c.label} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: c.color + '1f' }}>
              <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />{c.label}
            </div>
          ))}
        </div>
      </div>

      <div className="card text-sm">
        <h2 className="text-lg font-bold">Instalar no iPhone</h2>
        <ol className="mt-1 list-decimal space-y-1 pl-5 muted">
          <li>Abre este endereço no <b>Safari</b>.</li>
          <li>Toca em <b>Partilhar</b> (o quadrado com a seta).</li>
          <li>Escolhe <b>Adicionar ao ecrã principal</b> e depois <b>Adicionar</b>.</li>
          <li>Abre a app pelo ícone «Coach». Funciona sem internet.</li>
        </ol>
      </div>
      <p className="pb-4 text-center text-xs muted">Coach do Pedro · os dados não saem do telemóvel</p>
    </div>
  )
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
      <div className="text-xs muted">{k}</div>
      <div className="font-semibold">{v}</div>
    </div>
  )
}
