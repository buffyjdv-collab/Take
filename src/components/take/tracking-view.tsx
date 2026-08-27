'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  MapPin,
  Phone,
  Receipt,
  ChefHat,
  Bike,
  Check,
  Package,
  Home,
  Store,
  Clock,
  Search,
  Loader2,
  RefreshCw,
  Share2,
  RotateCcw,
} from 'lucide-react'
import { useTake } from '@/store/take'
import { fmtMoney, fmtTime, timeAgo, STAGE_META, stageIndex, platformStatusToStage, platformTimeline } from '@/lib/take'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

type OrderItem = {
  id: string
  name: string
  price: number
  quantity: number
  image: string | null
}

type TimelineEntry = { status: string; at: number }

type Order = {
  id: string
  shortCode: string
  status: string
  customerName: string
  address: string
  phone: string
  notes: string | null
  subtotal: number
  deliveryFee: number
  tax: number
  total: number
  paymentMethod: string
  etaMinutes: number
  createdAt: string
  updatedAt: string
  timeline: TimelineEntry[]
  items: OrderItem[]
}

const STAGES = ['placed', 'preparing', 'on-the-way', 'delivered'] as const

export function TrackingView() {
  const currentOrderId = useTake((s) => s.currentOrderId)
  const lastOrder = useTake((s) => s.lastOrder)
  const setView = useTake((s) => s.setView)
  const setOrder = useTake((s) => s.setOrder)
  const clearOrder = useTake((s) => s.clearOrder)
  const token = useTake((s) => s.activeToken)

  // If we have no order id at all, show the "find order" screen.
  // This is the graceful fallback so the page ALWAYS renders something
  // instead of the old "page couldn’t load" error.
  if (!currentOrderId && !lastOrder) {
    return <NoOrder onBack={() => setView('menu')} onFound={(o) => setOrder(o)} />
  }

  return (
    <Tracker
      orderId={currentOrderId || lastOrder?.id || ''}
      token={token}
      onBack={() => setView('menu')}
      onClear={() => {
        clearOrder()
        setView('menu')
      }}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Main tracker — polls the API, auto-advances status, never crashes  */
/* ------------------------------------------------------------------ */
function Tracker({
  orderId,
  token,
  onBack,
  onClear,
}: {
  orderId: string
  token: string | null
  onBack: () => void
  onClear: () => void
}) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      let o: Order
      if (token) {
        // QR-scan flow: fetch the platform Order and map it onto the Take
        // tracking shape (status → stage, timestamps → timeline).
        const res = await fetch(`/api/customer/order/${encodeURIComponent(orderId)}`)
        const d = await res.json().catch(() => ({}))
        if (!res.ok || !d?.success) {
          throw new Error(d?.error || 'Could not load your order')
        }
        const p = d.data
        o = {
          id: p.id,
          shortCode: p.orderNumber || p.id.slice(-5).toUpperCase(),
          status: platformStatusToStage(p.status),
          customerName: p.customerName || '',
          address: p.table?.number ? `Table ${p.table.number}` : '',
          phone: p.customerPhone || '',
          notes: p.notes,
          subtotal: p.subtotal,
          deliveryFee: 0,
          tax: p.taxAmount,
          total: p.grandTotal ?? p.netTotal ?? p.subtotal,
          paymentMethod: (p.paymentMethod || 'card').toLowerCase(),
          etaMinutes: 25,
          createdAt: p.placedAt || p.createdAt,
          updatedAt: p.updatedAt,
          timeline: platformTimeline(p),
          items: (p.items || []).map((it: any) => ({
            id: it.id,
            name: it.menuItemName,
            price: it.unitPrice,
            quantity: it.quantity,
            image: it.menuItemImage || it.menuItem?.image || null,
          })),
        }
      } else {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`)
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error || 'Could not load your order')
        }
        const data = await res.json()
        o = data.order
      }
      setOrder(o)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [orderId, token])

  useEffect(() => {
    load()
    // poll every 3s so the live timeline advances (server auto-advances)
    const poll = setInterval(load, 3000)
    // local clock for live "x ago" labels
    const clock = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      clearInterval(poll)
      clearInterval(clock)
    }
  }, [load])

  if (loading && !order) return <TrackingSkeleton onBack={onBack} />
  if (error && !order)
    return (
      <TrackingError
        message={error}
        onRetry={load}
        onBack={onBack}
      />
    )
  if (!order) return null

  const idx = stageIndex(order.status)
  const eta = computeEta(order, now)

  return (
    <div className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 py-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground"
            aria-label="Back to menu"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
              Order tracking
            </p>
            <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight sm:text-2xl">
              #{order.shortCode}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(order.shortCode)
                  toast({ title: 'Code copied' })
                }}
                className="rounded-md p-1 text-muted-foreground transition hover:text-brand"
                aria-label="Copy order code"
              >
                <Share2 size={14} />
              </button>
            </h1>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Hero status card */}
      <motion.div
        layout
        className="relative overflow-hidden rounded-3xl border border-border brand-gradient-soft p-6 shadow-card"
      >
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-soft-foreground">
              {order.status === 'delivered'
                ? 'Delivered — enjoy your meal! 🎉'
                : 'Your order is on track'}
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight">
              {order.status === 'delivered'
                ? 'Arrived'
                : eta > 0
                ? `Arriving in ${eta} min`
                : 'Arriving any moment'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Placed {timeAgo(new Date(order.createdAt).getTime(), now)} •{' '}
              {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Stat icon={<Clock size={15} />} label="ETA" value={`${order.etaMinutes}m`} />
            <Stat icon={<Receipt size={15} />} label="Total" value={fmtMoney(order.total)} />
          </div>
        </div>

        {/* progress bar */}
        <div className="relative mt-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-brand/15">
            <motion.div
              className="h-full rounded-full brand-gradient"
              initial={{ width: 0 }}
              animate={{ width: `${(idx / (STAGES.length - 1)) * 100}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] font-semibold text-muted-foreground">
            {STAGES.map((s) => (
              <span
                key={s}
                className={cn(
                  stageIndex(s) <= idx && 'text-brand'
                )}
              >
                {STAGE_META[s].label}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_360px]">
        {/* Timeline + Rider map */}
        <div className="space-y-6">
          <RiderMap status={order.status} idx={idx} />

          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold tracking-tight">
              <Package size={16} className="text-brand" /> Order progress
            </h2>
            <Timeline order={order} now={now} />
          </section>
        </div>

        {/* Details */}
        <aside className="space-y-6 md:sticky md:top-24 h-fit">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
              Delivery to
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Home size={16} className="mt-0.5 shrink-0 text-brand" />
                <span className="font-semibold">{order.customerName}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0 text-brand" />
                <span className="text-muted-foreground">{order.address}</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone size={16} className="mt-0.5 shrink-0 text-brand" />
                <span className="text-muted-foreground">{order.phone}</span>
              </div>
              {order.notes && (
                <div className="flex items-start gap-2">
                  <Receipt size={16} className="mt-0.5 shrink-0 text-brand" />
                  <span className="text-muted-foreground">
                    “{order.notes}”
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
              Items
            </h3>
            <ul className="space-y-2.5">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3">
                  {it.image && (
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={it.image}
                        alt={it.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{it.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.quantity} × {fmtMoney(it.price)}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums">
                    {fmtMoney(it.price * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-dashed border-border pt-3 text-sm">
              <Row label="Subtotal" value={fmtMoney(order.subtotal)} />
              <Row
                label="Delivery"
                value={
                  order.deliveryFee === 0 ? (
                    <span className="font-semibold text-emerald-600">Free</span>
                  ) : (
                    fmtMoney(order.deliveryFee)
                  )
                }
              />
              <Row label="Tax" value={fmtMoney(order.tax)} />
              <div className="flex justify-between border-t border-dashed border-border pt-2 text-base font-extrabold">
                <dt>Paid</dt>
                <dd className="text-brand">{fmtMoney(order.total)}</dd>
              </div>
              <p className="pt-1 text-xs font-semibold capitalize text-muted-foreground">
                via {order.paymentMethod.replace('-', ' ')}
              </p>
            </dl>
          </section>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-full"
              onClick={load}
            >
              <RefreshCw size={14} /> Refresh
            </Button>
            {order.status === 'delivered' && (
              <Button
                size="sm"
                className="flex-1 rounded-full"
                onClick={onClear}
              >
                <RotateCcw size={14} /> New order
              </Button>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Live timeline                                                       */
/* ------------------------------------------------------------------ */
function Timeline({ order, now }: { order: Order; now: number }) {
  const idx = stageIndex(order.status)
  return (
    <ol className="relative space-y-5 pl-2">
      {STAGES.map((s, i) => {
        const meta = STAGE_META[s]
        const done = i < idx
        const active = i === idx
        const entry = order.timeline.find((t) => t.status === s)
        const Icon = iconFor(s)
        return (
          <li key={s} className="relative flex gap-4">
            {/* connector */}
            {i < STAGES.length - 1 && (
              <span
                className={cn(
                  'absolute left-5 top-12 h-[calc(100%+0px)] w-0.5',
                  i < idx ? 'bg-brand' : 'bg-border'
                )}
              />
            )}
            <div
              className={cn(
                'relative grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 transition',
                done && 'border-brand bg-brand text-brand-foreground shadow-brand',
                active && 'border-brand bg-card text-brand',
                !done && !active && 'border-border bg-card text-muted-foreground'
              )}
            >
              {done ? (
                <Check size={18} strokeWidth={3} />
              ) : (
                <Icon size={18} strokeWidth={2.4} />
              )}
              {active && (
                <span className="pulse-ring pointer-events-none absolute inset-0 rounded-full" />
              )}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    'text-sm font-bold',
                    active && 'text-brand',
                    !done && !active && 'text-muted-foreground'
                  )}
                >
                  {meta.label}
                </p>
                {entry && (
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {timeAgo(entry.at, now)} · {fmtTime(entry.at)}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {active
                  ? meta.blurb
                  : done
                  ? `Completed at ${entry ? fmtTime(entry.at) : '—'}`
                  : 'Pending'}
              </p>
              {active && s === 'on-the-way' && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-soft/60 px-2.5 py-1 text-xs font-semibold text-brand-soft-foreground">
                  <Bike size={13} /> Rider is heading your way
                </div>
              )}
            </div>
          </li>
        )
      })}
      <li className="flex gap-4 pl-2">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-emerald-500 bg-emerald-500 text-white">
          <Home size={18} strokeWidth={2.4} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">Delivered to you</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {order.address}
          </p>
        </div>
      </li>
    </ol>
  )
}

/* ------------------------------------------------------------------ */
/* Animated rider map                                                  */
/* ------------------------------------------------------------------ */
function RiderMap({ status, idx }: { status: string; idx: number }) {
  // progress 0..1 along route
  const progress =
    status === 'placed' ? 0 : status === 'preparing' ? 0.18 : status === 'on-the-way' ? 0.62 : 1

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-soft">
      <div className="relative h-52 w-full overflow-hidden rounded-xl bg-[linear-gradient(135deg,var(--brand-soft),var(--muted))]">
        {/* decorative grid */}
        <svg
          className="absolute inset-0 h-full w-full opacity-30"
          aria-hidden
        >
          <defs>
            <pattern id="g" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)" />
        </svg>

        {/* route path */}
        <svg
          viewBox="0 0 100 50"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <path
            d="M 8 40 C 30 38, 28 12, 52 14 C 74 16, 70 38, 92 36"
            fill="none"
            stroke="currentColor"
            className="text-brand/30"
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />
          <path
            d="M 8 40 C 30 38, 28 12, 52 14 C 74 16, 70 38, 92 36"
            fill="none"
            stroke="currentColor"
            className="text-brand"
            strokeWidth="1"
            strokeLinecap="round"
            style={{
              strokeDasharray: 110,
              strokeDashoffset: 110 - 110 * progress,
              transition: 'stroke-dashoffset 1.1s ease',
            }}
          />
        </svg>

        {/* restaurant pin (start) */}
        <Pin left="6%" top="82%" tone="brand">
          <Store size={16} />
        </Pin>

        {/* home pin (end) */}
        <Pin left="90%" top="74%" tone="emerald">
          <Home size={16} />
        </Pin>

        {/* moving rider */}
        <motion.div
          className="absolute"
          initial={false}
          animate={{
            left: `${6 + (90 - 6) * progress}%`,
            top: `${82 - (82 - 74) * progress}%`,
          }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
          style={{ translateX: '-50%', translateY: '-50%' }}
        >
          <div className="relative grid h-9 w-9 place-items-center rounded-full brand-gradient text-brand-foreground shadow-brand ring-4 ring-card">
            <Bike size={18} />
            {status === 'on-the-way' && (
              <span className="pulse-ring pointer-events-none absolute inset-0 rounded-full" />
            )}
          </div>
        </motion.div>

        {/* status chip */}
        <div className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1.5 text-xs font-bold shadow-soft backdrop-blur-sm">
          {STAGE_META[status as keyof typeof STAGE_META]?.label || 'Tracking'}
        </div>
      </div>
    </section>
  )
}

function Pin({
  left,
  top,
  tone,
  children,
}: {
  left: string
  top: string
  tone: 'brand' | 'emerald'
  children: React.ReactNode
}) {
  return (
    <div
      className="absolute"
      style={{ left, top, translateX: '-50%', translateY: '-50%' }}
    >
      <div
        className={cn(
          'grid h-7 w-7 place-items-center rounded-full text-white shadow-brand ring-4 ring-card',
          tone === 'brand' ? 'bg-brand' : 'bg-emerald-500'
        )}
      >
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* No-order fallback (graceful, replaces the old crash)               */
/* ------------------------------------------------------------------ */
function NoOrder({
  onBack,
  onFound,
}: {
  onBack: () => void
  onFound: (o: { id: string; shortCode: string; total: number; createdAt: string }) => void
}) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const find = async () => {
    if (!code.trim()) {
      setError('Enter your order code')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(code.trim().toUpperCase())}?code=1`
      )
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Order not found')
      }
      const data = await res.json()
      onFound({
        id: data.order.id,
        shortCode: data.order.shortCode,
        total: data.order.total,
        createdAt: data.order.createdAt,
      })
      toast({ title: 'Order found', description: data.order.shortCode })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Not found')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-md place-items-center px-4 py-16 text-center">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="grid h-20 w-20 place-items-center rounded-3xl bg-brand-soft text-brand-soft-foreground"
      >
        <Search size={32} />
      </motion.div>
      <h2 className="mt-5 text-2xl font-extrabold tracking-tight">
        Track an order
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        No active order found. Enter your order code (e.g. <b>AB12C</b>) from
        your confirmation to track it live.
      </p>
      <div className="mt-5 w-full">
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Order code"
            className="h-12 rounded-xl text-center text-lg font-bold tracking-widest"
            maxLength={6}
            onKeyDown={(e) => e.key === 'Enter' && find()}
          />
          <Button
            onClick={find}
            disabled={loading}
            className="h-12 rounded-xl px-5 shadow-brand"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Find'}
          </Button>
        </div>
        {error && (
          <p className="mt-2 text-left text-xs font-semibold text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        onClick={onBack}
        className="mt-5 rounded-full"
      >
        <ArrowLeft size={16} /> Back to menu
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Loading & error states                                              */
/* ------------------------------------------------------------------ */
function TrackingSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
      <div className="flex items-center gap-3 py-5">
        <button
          onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-52 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

function TrackingError({
  message,
  onRetry,
  onBack,
}: {
  message: string
  onRetry: () => void
  onBack: () => void
}) {
  return (
    <div className="mx-auto grid max-w-md place-items-center px-4 py-20 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-destructive/10 text-destructive">
        <RefreshCw size={30} />
      </div>
      <h2 className="mt-5 text-2xl font-extrabold tracking-tight">
        Couldn’t load tracking
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <div className="mt-5 flex gap-2">
        <Button onClick={onRetry} className="rounded-full shadow-brand">
          <RefreshCw size={16} /> Try again
        </Button>
        <Button variant="outline" onClick={onBack} className="rounded-full">
          <ArrowLeft size={16} /> Menu
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    placed: 'bg-amber-100 text-amber-700',
    preparing: 'bg-orange-100 text-orange-700',
    'on-the-way': 'bg-sky-100 text-sky-700',
    delivered: 'bg-emerald-100 text-emerald-700',
  }
  return (
    <Badge
      className={cn(
        'border-0 px-3 py-1.5 text-xs font-bold capitalize',
        map[status] || 'bg-muted text-muted-foreground'
      )}
    >
      {STAGE_META[status as keyof typeof STAGE_META]?.label || status}
    </Badge>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 px-3.5 py-2.5 text-center backdrop-blur-sm">
      <div className="flex items-center justify-center gap-1 text-brand">
        {icon}
      </div>
      <p className="mt-0.5 text-base font-extrabold leading-none">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function computeEta(order: Order, now: number): number {
  const start = new Date(order.createdAt).getTime()
  const elapsedMin = Math.floor((now - start) / 60000)
  return Math.max(0, order.etaMinutes - elapsedMin)
}

function iconFor(stage: string) {
  switch (stage) {
    case 'placed':
      return Receipt
    case 'preparing':
      return ChefHat
    case 'on-the-way':
      return Bike
    case 'delivered':
      return Check
    default:
      return Package
  }
}
