import { days, measurements, profile, workouts, type CategoryId, type DayId } from '../data/plan'
import { addDays, dayIdOf, itemKey, toMin } from './date'

const VTZ = `BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:DAYLIGHT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:EDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:EST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE`

const BYDAY: Record<string, string> = { seg: 'MO', ter: 'TU', qua: 'WE', qui: 'TH', sex: 'FR', sab: 'SA', dom: 'SU' }
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}00`

const EMOJI: Record<CategoryId, string> = { comida: '🍽️', treino: '🏋️', portugal: '🇵🇹', turno: '💼', prep: '🎒', sono: '🌙' }
/** Texto ICS: escapar vírgulas, pontos e vírgulas e quebras de linha */
const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n')

/** Gera o ficheiro .ics com a rotina completa e os lembretes (fuso de Miami) */
export function buildIcs(start = profile.startDate) {
  const ev: string[] = []
  /** Primeiro dia `dayId` a partir de `from` */
  const first = (dayId: string, from: string) => {
    let d = from
    while (dayIdOf(d) !== dayId) d = addDays(d, 1)
    return d
  }
  const add = (o: { uid: string; dayId: DayId; min: number; dur: number; title: string; desc: string; alarm?: string; from?: string }) => {
    const date = first(o.dayId, o.from ?? start).replace(/-/g, '')
    ev.push([
      'BEGIN:VEVENT',
      `UID:coach-${o.uid}@coach-pedro`,
      'DTSTAMP:20261109T000000Z',
      `DTSTART;TZID=America/New_York:${date}T${hhmm(o.min)}`,
      `DURATION:PT${Math.max(5, o.dur)}M`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[o.dayId]}`,
      `SUMMARY:${esc(o.title)}`,
      `DESCRIPTION:${esc(o.desc)}`,
      ...(o.alarm ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(o.alarm)}`, 'TRIGGER:PT0M', 'END:VALARM'] : []),
      'END:VEVENT',
    ].join('\r\n'))
  }

  for (const d of days) {
    const items = d.timeline
    const prepIdx = items.findIndex((i) => i.cat === 'prep' && i.title.startsWith('Preparar'))
    items.forEach((it, i) => {
      const s = toMin(it.t)
      const next = items.slice(i + 1).find((x) => toMin(x.t) > s)
      let dur = it.end ? toMin(it.end) - s : Math.min(30, (next ? toMin(next.t) : s + 15) - s)
      const isSleep = it.title === 'Dormir'
      if (isSleep) dur = (toMin(d.sleep.wake) - toMin(d.sleep.bed) + 1440) % 1440
      const isHyg = it.title.startsWith('Higiene')
      const isPrep = i === prepIdx
      const desc: string[] = []
      if (it.meal) desc.push(it.meal.desc, `${it.meal.p ? it.meal.p + ' g proteína · ' : ''}≈ ${it.meal.kcal} kcal`)
      if (it.cat === 'treino') {
        const w = workouts[d.workout]
        desc.push(w.note ?? w.exercises.map((e) => `${e.name}: ${e.sets} × ${e.unit === 'amrap' ? 'até 2 antes da falha' : e.repMin === e.repMax ? e.repMax : `${e.repMin}–${e.repMax}`}${e.unit === 's' ? ' s' : ''}`).join('\n'))
        desc.push('Regista as séries na app.')
      }
      if (isPrep) desc.push(`${d.prepTitle}:`, ...d.prepTomorrow.map((x) => `• ${x}`))
      if (isSleep) desc.push(`${d.sleep.bed} → ${d.sleep.wake}`)
      add({
        uid: `${d.id}-${itemKey(it.t, it.title).replace(/[^a-z0-9-]/g, '')}`,
        dayId: d.id,
        min: s,
        dur,
        title: `${EMOJI[it.cat]} ${it.approx ? '~' : ''}${it.title}`,
        desc: desc.join('\n'),
        alarm: isHyg ? 'Hora de ir para a cama' : isPrep ? it.title : undefined,
        // a noite da véspera do início também entra (preparar o 1.º dia)
        from: prepIdx >= 0 && i >= prepIdx ? addDays(start, -1) : start,
      })
    })
    const wake = toMin(items[0].t)
    if (measurements.weighDays.includes(d.id))
      add({ uid: `${d.id}-pesar`, dayId: d.id, min: wake + 5, dur: 5, title: '⚖️ Pesar em jejum', desc: 'Depois da casa de banho, antes de comer. Regista na app.', alarm: 'Pesar em jejum' })
    if (d.id === measurements.waistDay)
      add({ uid: `${d.id}-cintura`, dayId: d.id, min: wake + 8, dur: 5, title: '📏 Medir a cintura', desc: 'Ao nível do umbigo. Regista na app.', alarm: 'Medir a cintura' })
  }
  // RFC 5545: linhas com mais de 75 bytes são dobradas
  const fold = (line: string) => {
    const out: string[] = []
    let cur = ''
    for (const ch of line) {
      if (new TextEncoder().encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = '' }
      cur += ch
    }
    out.push(cur)
    return out.join('\r\n ')
  }
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Coach do Pedro//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Coach do Pedro', 'X-WR-TIMEZONE:America/New_York', VTZ.replace(/\n/g, '\r\n'), 'REFRESH-INTERVAL;VALUE=DURATION:P1D', 'X-PUBLISHED-TTL:P1D', ...ev, 'END:VCALENDAR'].join('\r\n')
  return body.split('\r\n').map(fold).join('\r\n') + '\r\n'
}
