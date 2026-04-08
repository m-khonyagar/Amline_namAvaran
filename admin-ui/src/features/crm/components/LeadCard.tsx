import type { Lead } from '../types'
import { formatShamsiDate } from '../../../lib/persianDateTime'

interface LeadCardProps {
  lead: Lead
  onView: (id: string) => void
  draggable?: boolean
  onDragStart?: (e: DragEvent, id: string) => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

const NEED_TYPE_LABELS: Record<string, string> = {
  RENT: 'اجاره',
  BUY: 'خرید',
  SELL: 'فروش',
}

const NEED_TYPE_COLORS: Record<string, string> = {
  RENT: 'bg-purple-100 text-purple-700',
  BUY: 'bg-green-100 text-green-700',
  SELL: 'bg-orange-100 text-orange-700',
}

export function LeadCard({
  lead,
  onView,
  draggable,
  onDragStart,
  selectMode,
  selected,
  onToggleSelect,
}: LeadCardProps) {
  const canDrag = draggable && !selectMode
  return (
    <div
      draggable={canDrag}
      onDragStart={canDrag && onDragStart ? (e) => onDragStart(e as unknown as DragEvent, lead.id) : undefined}
      className={`rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''} ${selected ? 'ring-2 ring-blue-500' : ''}`}
    >
      <div className="mb-2 flex items-start gap-2">
        {selectMode && onToggleSelect ? (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onToggleSelect(lead.id)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300"
            aria-label={`انتخاب ${lead.full_name}`}
            onClick={(e) => e.stopPropagation()}
          />
        ) : null}
        <p className="flex-1 text-sm font-medium text-gray-900">{lead.full_name}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${NEED_TYPE_COLORS[lead.need_type] ?? 'bg-gray-100 text-gray-600'}`}>
          {NEED_TYPE_LABELS[lead.need_type] ?? lead.need_type}
        </span>
      </div>

      <p className="mb-2 font-mono text-xs text-gray-500">{lead.mobile}</p>

      <p className="mb-3 text-xs text-gray-400">
        {formatShamsiDate(lead.created_at)}
      </p>

      <button
        onClick={() => onView(lead.id)}
        className="w-full rounded bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
      >
        مشاهده جزئیات
      </button>
    </div>
  )
}
