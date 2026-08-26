import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'

const MAP: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  PENDING_PAYMENT: {
    label: 'Awaiting Payment',
    className:
      'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100',
  },
  NEW: {
    label: 'New',
    className:
      'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
  },
  ACCEPTED: {
    label: 'Accepted',
    className:
      'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100',
  },
  PREPARING: {
    label: 'Preparing',
    className:
      'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100',
  },
  READY: {
    label: 'Ready',
    className:
      'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
  },
  SERVED: {
    label: 'Served',
    className:
      'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100',
  },
  COMPLETED: {
    label: 'Completed',
    className:
      'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100',
  },
  CANCELLED: {
    label: 'Cancelled',
    className:
      'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
  },
}

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus | string
  className?: string
}) {
  const cfg = MAP[status as OrderStatus] || {
    label: status,
    className: 'bg-muted text-muted-foreground',
  }
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', cfg.className, className)}
    >
      {cfg.label}
    </Badge>
  )
}
