'use client'

import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function QtyStepper({
  value,
  onDec,
  onInc,
  size = 'md',
  className,
}: {
  value: number
  onDec: () => void
  onInc: () => void
  size?: 'sm' | 'md'
  className?: string
}) {
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  const icon = size === 'sm' ? 14 : 16
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-brand-soft p-1',
        className
      )}
    >
      <button
        type="button"
        aria-label="decrease"
        onClick={onDec}
        className={cn(
          'grid place-items-center rounded-full bg-card text-brand-soft-foreground shadow-soft transition active:scale-90 hover:bg-brand hover:text-brand-foreground',
          dim
        )}
      >
        <Minus size={icon} strokeWidth={2.6} />
      </button>
      <span
        className="min-w-6 text-center text-sm font-bold tabular-nums text-brand-soft-foreground"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="increase"
        onClick={onInc}
        className={cn(
          'grid place-items-center rounded-full bg-brand text-brand-foreground transition active:scale-90 hover:brightness-105 shadow-brand',
          dim
        )}
      >
        <Plus size={icon} strokeWidth={2.6} />
      </button>
    </div>
  )
}
