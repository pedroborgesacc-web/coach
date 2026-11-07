import { NavLink } from 'react-router-dom'
import { IconChart, IconDumbbell, IconMore, IconPot, IconToday } from './Icons'

const tabs = [
  { to: '/', label: 'Hoje', Icon: IconToday, match: (p: string) => p === '/' || p.startsWith('/dia') },
  { to: '/treino', label: 'Treino', Icon: IconDumbbell },
  { to: '/progresso', label: 'Progresso', Icon: IconChart },
  { to: '/prep', label: 'Prep', Icon: IconPot },
  { to: '/mais', label: 'Mais', Icon: IconMore },
]

export default function BottomNav({ path }: { path: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 pb-safe">
      <div className="mx-auto flex max-w-lg">
        {tabs.map(({ to, label, Icon, match }) => {
          const active = match ? match(path) : path.startsWith(to)
          return (
            <NavLink key={to} to={to} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
              <Icon />
              {label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
