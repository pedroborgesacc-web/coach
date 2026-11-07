export default function Bar({ label, value, target, unit, color, range }: { label: string; value: number; target: number; unit: string; color: string; range?: string }) {
  const pct = Math.min(100, (value / target) * 100)
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          <b className="text-slate-900 dark:text-white">{Math.round(value)}</b> / {range ?? target} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
