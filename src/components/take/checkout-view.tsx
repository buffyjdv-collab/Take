'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  Banknote,
  Lock,
  Loader2,
  CheckCircle2,
  MapPin,
  User,
  Phone,
  StickyNote,
  ShieldCheck,
} from 'lucide-react'
import { useTake } from '@/store/take'
import { fmtMoney } from '@/lib/take'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

const PAYMENTS = [
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'cash', label: 'Cash on arrival', icon: Banknote },
] as const

export function CheckoutView() {
  const cart = useTake((s) => s.cart)
  const subtotal = useTake((s) => s.cartSubtotal())
  const setView = useTake((s) => s.setView)
  const setOrder = useTake((s) => s.setOrder)
  const clearCart = useTake((s) => s.clearCart)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [payment, setPayment] = useState<(typeof PAYMENTS)[number]['id']>('card')
  const [card, setCard] = useState('')
  const [exp, setExp] = useState('')
  const [cvc, setCvc] = useState('')
  const [processing, setProcessing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const FREE_THRESHOLD = 25
  const deliveryFee = subtotal >= FREE_THRESHOLD ? 0 : 3.99
  const tax = +(subtotal * 0.08).toFixed(2)
  const total = +(subtotal + deliveryFee + tax).toFixed(2)

  if (cart.length === 0 && !processing) {
    return (
      <div className="mx-auto grid max-w-md place-items-center px-4 py-20 text-center">
        <p className="text-sm text-muted-foreground">
          Your cart is empty.
        </p>
        <Button onClick={() => setView('menu')} className="mt-4 rounded-full">
          Browse menu
        </Button>
      </div>
    )
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Required'
    if (!address.trim() || address.trim().length < 6)
      e.address = 'Enter a full address'
    if (!/^[0-9+\-\s()]{7,}$/.test(phone.trim())) e.phone = 'Enter a valid phone'
    if (payment === 'card') {
      if (card.replace(/\s/g, '').length < 15) e.card = 'Enter a valid card number'
      if (!/^\d{2}\/\d{2}$/.test(exp)) e.exp = 'MM/YY'
      if (cvc.length < 3) e.cvc = 'CVC'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handlePay = async () => {
    if (!validate()) return
    setProcessing(true)
    try {
      // simulate payment gateway delay
      await new Promise((r) => setTimeout(r, 1100))

      const payload = {
        customerName: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        notes: notes.trim() || undefined,
        paymentMethod: payment,
        items: cart.map((c) => ({
          id: c.id,
          name: c.name,
          price: c.price,
          quantity: c.quantity,
          image: c.image,
        })),
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to place order')
      }

      const data = await res.json()
      const order = data.order

      // THE FIX: persist the order so the tracking page can ALWAYS load it,
      // even after a page refresh or accidental navigation.
      setOrder({
        id: order.id,
        shortCode: order.shortCode,
        total: order.total,
        createdAt: order.createdAt,
      })
      clearCart()

      toast({
        title: 'Payment successful!',
        description: `Order ${order.shortCode} confirmed.`,
      })

      setView('tracking')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed'
      setErrors({ form: msg })
      toast({
        title: 'Payment failed',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
      <div className="flex items-center gap-3 py-5">
        <button
          type="button"
          onClick={() => setView('cart')}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground"
          aria-label="Back to cart"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
            Checkout
          </p>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            Almost there
          </h1>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Delivery details */}
          <Section
            step={1}
            title="Delivery details"
            icon={<MapPin size={16} />}
          >
            <div className="grid gap-3">
              <Field
                label="Full name"
                icon={<User size={15} />}
                error={errors.name}
              >
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="h-11 rounded-xl"
                />
              </Field>
              <Field
                label="Delivery address"
                icon={<MapPin size={15} />}
                error={errors.address}
              >
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Garden St, Apt 4B, Springfield"
                  className="h-11 rounded-xl"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Phone"
                  icon={<Phone size={15} />}
                  error={errors.phone}
                >
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 010 1234"
                    inputMode="tel"
                    className="h-11 rounded-xl"
                  />
                </Field>
                <Field
                  label="Notes (optional)"
                  icon={<StickyNote size={15} />}
                >
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Leave at door, ring bell…"
                    className="h-11 rounded-xl"
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* Payment */}
          <Section step={2} title="Payment method" icon={<CreditCard size={16} />}>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENTS.map((p) => {
                const Icon = p.icon
                const active = payment === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPayment(p.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-bold transition',
                      active
                        ? 'border-brand bg-brand-soft text-brand-soft-foreground shadow-soft'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon size={20} className={active ? 'text-brand' : ''} />
                    {p.label}
                  </button>
                )
              })}
            </div>

            {payment === 'card' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 grid gap-3"
              >
                {/* Card preview */}
                <div className="relative overflow-hidden rounded-2xl brand-gradient p-5 text-brand-foreground shadow-brand">
                  <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                      Take Pay
                    </span>
                    <CreditCard size={22} />
                  </div>
                  <p className="mt-6 font-mono text-lg tracking-[0.2em]">
                    {card || '•••• •••• •••• ••••'}
                  </p>
                  <div className="mt-3 flex items-end justify-between text-xs">
                    <span className="max-w-[55%] truncate font-semibold uppercase">
                      {name || 'YOUR NAME'}
                    </span>
                    <span className="font-semibold">{exp || 'MM/YY'}</span>
                  </div>
                </div>

                <Field label="Card number" error={errors.card}>
                  <Input
                    value={card}
                    onChange={(e) =>
                      setCard(formatCard(e.target.value))
                    }
                    placeholder="4242 4242 4242 4242"
                    inputMode="numeric"
                    maxLength={19}
                    className="h-11 rounded-xl font-mono"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Expiry" error={errors.exp}>
                    <Input
                      value={exp}
                      onChange={(e) => setExp(formatExp(e.target.value))}
                      placeholder="MM/YY"
                      inputMode="numeric"
                      maxLength={5}
                      className="h-11 rounded-xl font-mono"
                    />
                  </Field>
                  <Field label="CVC" error={errors.cvc}>
                    <Input
                      value={cvc}
                      onChange={(e) =>
                        setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))
                      }
                      placeholder="123"
                      inputMode="numeric"
                      maxLength={4}
                      className="h-11 rounded-xl font-mono"
                    />
                  </Field>
                </div>
              </motion.div>
            )}

            {payment === 'wallet' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
              >
                You’ll confirm via your wallet app on the next step.
              </motion.p>
            )}
            {payment === 'cash' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
              >
                Please have {fmtMoney(total)} ready for the rider on arrival.
              </motion.p>
            )}
          </Section>
        </div>

        {/* Summary */}
        <aside className="md:sticky md:top-24 h-fit">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-base font-extrabold tracking-tight">
              You’re paying
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {cart.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid h-6 min-w-6 place-items-center rounded-md bg-brand-soft text-[11px] font-bold text-brand-soft-foreground">
                      {c.quantity}
                    </span>
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {fmtMoney(c.price * c.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-dashed border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-semibold">{fmtMoney(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="font-semibold">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-600">Free</span>
                  ) : (
                    fmtMoney(deliveryFee)
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="font-semibold">{fmtMoney(tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-dashed border-border pt-2 text-base font-extrabold">
                <dt>Total</dt>
                <dd className="text-brand">{fmtMoney(total)}</dd>
              </div>
            </dl>

            {errors.form && (
              <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                {errors.form}
              </p>
            )}

            <Button
              size="lg"
              disabled={processing}
              onClick={handlePay}
              className="mt-5 w-full rounded-full text-base shadow-brand"
            >
              {processing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processing payment…
                </>
              ) : (
                <>
                  <Lock size={18} />
                  Pay {fmtMoney(total)}
                </>
              )}
            </Button>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck size={14} className="text-emerald-600" />
              256-bit encrypted • Powered by Take Pay
            </div>
          </div>
        </aside>
      </div>

      {/* Processing overlay */}
      {processing && <ProcessingOverlay />}
    </div>
  )
}

function Section({
  step,
  title,
  icon,
  children,
}: {
  step: number
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <header className="mb-4 flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full brand-gradient text-sm font-extrabold text-brand-foreground shadow-brand">
          {step}
        </span>
        <h2 className="flex items-center gap-2 text-base font-extrabold tracking-tight">
          <span className="text-brand">{icon}</span>
          {title}
        </h2>
      </header>
      {children}
    </section>
  )
}

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string
  icon?: React.ReactNode
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {icon}
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-xs font-semibold text-destructive">
          {error}
        </span>
      )}
    </label>
  )
}

function ProcessingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className="w-72 rounded-3xl border border-border bg-card p-6 text-center shadow-card"
      >
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full brand-gradient text-brand-foreground shadow-brand">
          <Loader2 size={28} className="animate-spin" />
        </div>
        <p className="mt-4 text-base font-extrabold">Confirming payment</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Securely contacting your bank… please don’t close this page.
        </p>
        <div className="mt-4 space-y-2 text-left text-xs text-muted-foreground">
          <Status text="Validating card details" />
          <Status text="Authorising with bank" />
          <Status text="Confirming your order" last />
        </div>
      </motion.div>
    </motion.div>
  )
}

function Status({ text, last }: { text: string; last?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 size={14} className="text-emerald-600" />
      <span className={last ? 'font-semibold text-foreground' : ''}>
        {text}
      </span>
    </div>
  )
}

function formatCard(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 16)
  return d.replace(/(.{4})/g, '$1 ').trim()
}
function formatExp(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4)
  if (d.length <= 2) return d
  return d.slice(0, 2) + '/' + d.slice(2)
}
