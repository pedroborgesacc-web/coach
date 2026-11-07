import { IconCheck } from './Icons'
export default function Check({ checked, onChange, color = '#22c55e', label }: { checked: boolean; onChange: () => void; color?: string; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange() }}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition active:scale-90"
      style={{ borderColor: color, background: checked ? color : 'transparent', color: 'white' }}
    >
      {checked && <IconCheck width={16} height={16} />}
    </button>
  )
}
