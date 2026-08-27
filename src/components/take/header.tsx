'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, Home, MapPin, UtensilsCrossed } from 'lucide-react'
import { useTake } from '@/store/take'
import { cn } from '@/lib/utils'

export function Header() {
  const view = useTake((s) => s.view)
  const setView = useTake((s) => s.setView)
  const cartCount = useTake((s) => s.cartCount())
  const currentOrderId = useTake((s) => s.currentOrderId)

  const nav = [
    { id: 'menu' as const, label: 'Menu', icon: Home },
    {
      id: 'tracking' as const,
      label: 'Track',
      icon: MapPin,
      disabled: !currentOrderId,
    },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 glass">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Logo */}
        <button
          type="button"
          onClick={() => setView('menu')}
          className="group flex items-center gap-2.5"
          aria-label="Take home"
        >
          <span className="relative grid h-10 w-10 place-items-center rounded-xl brand-gradient text-brand-foreground shadow-brand transition group-hover:scale-105">
            <UtensilsCrossed size={20} strokeWidth={2.4} />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-card" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-lg font-extrabold tracking-tight">
              Take
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              food, fast
            </span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1 shadow-soft sm:flex">
          {nav.map((n) => {
            const Icon = n.icon
            const active = view === n.id
            return (
              <button
                key={n.id}
                type="button"
                disabled={n.disabled}
                onClick={() => setView(n.id)}
                className={cn(
                  'relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition',
                  active
                    ? 'text-brand-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                  n.disabled && 'cursor-not-allowed opacity-40 hover:text-muted-foreground'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full brand-gradient shadow-brand"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon size={16} strokeWidth={2.4} className="relative z-10" />
                <span className="relative z-10">{n.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Cart button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView('cart')}
            className={cn(
              'relative flex items-center gap-2 rounded-full bg-card px-3.5 py-2.5 text-sm font-bold shadow-soft transition hover:shadow-card',
              view === 'cart' && 'ring-2 ring-brand'
            )}
          >
            <ShoppingBag size={18} strokeWidth={2.4} className="text-brand" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-extrabold text-brand-foreground"
              >
                {cartCount}
              </motion.span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 border-t border-border/50 px-3 py-2 sm:hidden">
        {nav.map((n) => {
          const Icon = n.icon
          const active = view === n.id
          return (
            <button
              key={n.id}
              type="button"
              disabled={n.disabled}
              onClick={() => setView(n.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition',
                active
                  ? 'bg-brand text-brand-foreground'
                  : 'text-muted-foreground',
                n.disabled && 'opacity-40'
              )}
            >
              <Icon size={16} strokeWidth={2.4} />
              {n.label}
            </button>
          )
        })}
      </nav>
    </header>
  )
}
