import { days, measurements, profile } from '../data/plan'
import { addDays, dayIdOf, toMin } from './date'

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

/** Gera o ficheiro .ics com os lembretes semanais (fuso de Miami) */
export function buildIcs(start = profile.startDate) {
  const ev: string[] = []
  let n = 0
  /** Primeiro dia `dayId` a partir de `from` */
  const first = (dayId: string, from: string) => {
    let d = from
    while (dayIdOf(d) !== dayId) d = addDays(d, 1)
    return d
  }
  // Lembretes da noite começam na véspera (preparar o 1.º dia); medições a partir do início
  const add = (dayId: string, min: number, title: string, desc: string, from = start) => {
    const date = first(dayId, from).replace(/-/g, '')
    ev.push([
      'BEGIN:VEVENT',
      `UID:coach-pedro-${++n}-${dayId}@coach`,
      'DTSTAMP:20261107T000000Z',
      `DTSTART;TZID=America/New_York:${date}T${hhmm(min)}`,
      'DURATION:PT10M',
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[dayId]}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${desc}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${title}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n'))
  }
  for (const d of days) {
    const hyg = d.timeline.find((i) => i.title.startsWith('Higiene'))
    if (hyg) add(d.id, toMin(hyg.t), '🌙 Hora de ir para a cama', `${hyg.title}. Dormir às ${d.sleep.bed}.`, addDays(start, -1))
    const prep = d.timeline.find((i) => i.cat === 'prep' && i.title.startsWith('Preparar'))
    if (prep) add(d.id, toMin(prep.t), `🎒 ${prep.title}`, `${d.prepTitle}: abre a app e marca a checklist.`, addDays(start, -1))
    const wake = toMin(d.timeline[0].t)
    if (measurements.weighDays.includes(d.id)) add(d.id, wake + 5, '⚖️ Pesar em jejum', 'Depois da casa de banho, antes de comer. Regista na app.')
    if (d.id === measurements.waistDay) add(d.id, wake + 8, '📏 Medir a cintura', 'Ao nível do umbigo. Regista na app.')
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
