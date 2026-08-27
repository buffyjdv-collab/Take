'use client'

import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, ArrowLeft, ShoppingBag, Tag, Truck, Sparkles } from 'lucide-react'
import { useTake } from '@/store/take'
import { QtyStepper } from './qty-stepper'
import { fmtMoney } from '@/lib/take'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

export function CartView() {
  const cart = useTake((s) => s.cart)
  const subtotal = useTake((s) => s.cartSubtotal())
  const decrement = useTake((s) => s.decrement)
  const addToCart = useTake((s) => s.addToCart)
  const removeFromCart = useTake((s) => s.removeFromCart)
  const setView = useTake((s) => s.setView)
  const clearCart = useTake((s) => s.clearCart)

  const FREE_THRESHOLD = 25
  const deliveryFee = subtotal >= FREE_THRESHOLD || subtotal === 0 ? 0 : 3.99
  const tax = +(subtotal * 0.08).toFixed(2)
  const total = +(subtotal + deliveryFee + tax).toFixed(2)
  const remaining = Math.max(0, FREE_THRESHOLD - subtotal)
  const progress = Math.min(100, (subtotal / FREE_THRESHOLD) * 100)

  if (cart.length === 0) {
    return (
      <div className="mx-auto grid max-w-md place-items-center px-4 py-20 text-center">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="grid h-20 w-20 place-items-center rounded-3xl brand-gradient text-brand-foreground shadow-brand"
        >
          <ShoppingBag size={32} />
        </motion.div>
        <h2 className="mt-5 text-2xl font-extrabold tracking-tight">
          Your cart is empty
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Looks like you haven’t added anything yet. Let’s fix that.
        </p>
        <Button
          onClick={() => setView('menu')}
          className="mt-5 rounded-full px-5 shadow-brand"
          size="lg"
        >
          <ArrowLeft size={18} /> Back to menu
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
      <div className="flex items-center justify-between gap-3 py-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setView('menu')}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground"
            aria-label="Back to menu"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
              Your bag
            </p>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              {cart.length} {cart.length === 1 ? 'item' : 'items'} •{' '}
              {fmtMoney(subtotal)}
            </h1>
          </div>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-destructive"
        >
          <Trash2 size={14} /> Clear
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        {/* Items */}
        <div className="space-y-3">
          {/* free delivery nudge */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-semibold">
                <Truck size={16} className="text-brand" />
                {remaining > 0 ? (
                  <>
                    Add{' '}
                    <span className="font-extrabold text-brand">
                      {fmtMoney(remaining)}
                    </span>{' '}
                    for free delivery
                  </>
                ) : (
                  <span className="font-extrabold text-emerald-600">
                    You’ve unlocked free delivery! 🎉
                  </span>
                )}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {fmtMoney(subtotal)} / {fmtMoney(FREE_THRESHOLD)}
              </span>
            </div>
            <Progress value={progress} className="mt-3 h-2" />
          </div>

          <AnimatePresence initial={false}>
            {cart.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16, height: 0 }}
                transition={{ duration: 0.25 }}
                className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold leading-tight">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fmtMoney(item.price)} each
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => removeFromCart(item.id)}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-end justify-between">
                    <QtyStepper
                      value={item.quantity}
                      onDec={() => decrement(item.id)}
                      onInc={() =>
                        addToCart(
                          {
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            image: item.image,
                          },
                          1
                        )
                      }
                    />
                    <span className="text-sm font-extrabold">
                      {fmtMoney(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* add more */}
          <button
            type="button"
            onClick={() => setView('menu')}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-dashed border-border bg-card/60 px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:border-brand hover:text-brand"
          >
            <ArrowLeft size={16} /> Add more items
          </button>
        </div>

        {/* Summary */}
        <aside className="md:sticky md:top-24 h-fit">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-base font-extrabold tracking-tight">
              Order summary
            </h3>

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-border bg-brand-soft/50 px-3 py-2.5 text-sm">
              <Tag size={15} className="text-brand" />
              <input
                placeholder="Promo code"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-brand-foreground"
              >
                Apply
              </button>
            </div>

            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label="Subtotal" value={fmtMoney(subtotal)} />
              <Row
                label="Delivery"
                value={
                  deliveryFee === 0 ? (
                    <span className="font-bold text-emerald-600">Free</span>
                  ) : (
                    fmtMoney(deliveryFee)
                  )
                }
              />
              <Row label="Tax (8%)" value={fmtMoney(tax)} />
              <div className="!mt-4 border-t border-dashed border-border pt-3">
                <Row
                  label={
                    <span className="text-base font-extrabold">Total</span>
                  }
                  value={
                    <span className="text-base font-extrabold text-brand">
                      {fmtMoney(total)}
                    </span>
                  }
                />
              </div>
            </dl>

            <Button
              size="lg"
              onClick={() => setView('checkout')}
              className="mt-5 w-full rounded-full text-base shadow-brand"
            >
              Checkout
              <Sparkles size={18} />
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              🔒 Secure payment • Cancel anytime before delivery
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
}: {
  label: React.ReactNode
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
