import { Link } from 'react-router-dom'
import type { DayId } from '../data/plan'
import { DAY_IDS, dateForDay, getDay, parseISO, todayISO } from '../lib/date'

export default function DayStrip({ active, base, today = todayISO() }: { active: DayId; base: string; today?: string }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {DAY_IDS.map((id) => {
        const d = dateForDay(id, today)
        const isToday = d === today
        const isActive = id === active
        return (
          <Link
            key={id}
            to={`${base}/${id}`}
            replace
            className={`flex flex-col items-center rounded-xl py-1.5 text-xs transition ${isActive ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'}`}
          >
            <span className="font-medium">{getDay(id).short}</span>
            <span className={`text-base font-bold leading-tight ${isToday && !isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>{parseISO(d).getDate()}</span>
            <span className={`mt-0.5 h-1 w-1 rounded-full ${isToday ? (isActive ? 'bg-current' : 'bg-blue-600 dark:bg-blue-400') : 'bg-transparent'}`} />
          </Link>
        )
      })}
    </div>
  )
}
