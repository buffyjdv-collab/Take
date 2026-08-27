'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Sparkles, Truck, Timer, ShieldCheck, UtensilsCrossed, X } from 'lucide-react'
import { useTake } from '@/store/take'
import { MenuCard } from './menu-card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { fmtMoney } from '@/lib/take'

type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  category: string
  image: string
  tags: string[]
  rating: number
  prepTime: number
  popular: boolean
}

export function MenuView() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<string[]>(['All'])
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/menu')
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to load menu')
        return r.json()
      })
      .then((d) => {
        if (!alive) return
        setItems(d.items)
        setCategories(d.categories)
        setError(null)
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const okCat = category === 'All' || i.category === category
      const okQ =
        !query ||
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        i.description.toLowerCase().includes(query.toLowerCase()) ||
        i.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      return okCat && okQ
    })
  }, [items, category, query])

  const popular = useMemo(
    () => (category === 'All' && !query ? items.filter((i) => i.popular).slice(0, 4) : []),
    [items, category, query]
  )

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
      <Hero />

      {/* Search + categories */}
      <div className="sticky top-[64px] z-30 -mx-4 mt-5 mb-5 bg-background/85 px-4 py-3 backdrop-blur-md sm:top-16 sm:mx-0 sm:rounded-2xl sm:border sm:border-border sm:px-4 sm:shadow-soft">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes, tags…"
              className="h-11 w-full rounded-full border border-border bg-card pl-11 pr-10 text-sm font-medium outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              aria-label="Search menu"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
                  category === c
                    ? 'brand-gradient text-brand-foreground shadow-brand'
                    : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Popular rail */}
      {popular.length > 0 && !loading && (
        <section className="mb-8">
          <SectionHeading
            kicker="Most loved"
            title="Popular right now"
            icon={<Sparkles size={16} className="text-brand" />}
          />
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {popular.map((item) => (
              <PopularCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* All dishes */}
      <section>
        <SectionHeading
          kicker={category === 'All' ? 'Everything' : category}
          title={query ? `Results for “${query}”` : 'Browse the menu'}
        />
        {error ? (
          <ErrorState message={error} onRetry={() => location.reload()} />
        ) : loading ? (
          <GridSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((item) => (
                <MenuCard key={item.id} item={item} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </div>
  )
}

function Hero() {
  return (
    <section className="relative mt-5 overflow-hidden rounded-3xl border border-border brand-gradient-soft">
      <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-brand/20 blur-3xl" />
      <div className="absolute -bottom-16 left-10 h-44 w-44 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="relative grid gap-6 p-6 sm:p-9 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-card/70 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-soft-foreground backdrop-blur-sm">
            <Sparkles size={12} /> Fresh today
          </span>
          <h1 className="mt-3 text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl md:text-5xl">
            Crave it.
            <br />
            <span className="text-brand-gradient">Take it.</span>
          </h1>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground sm:text-base">
            Order from the neighbourhood's best kitchen. Real-time tracking,
            hot on arrival — every time.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Feature icon={<Timer size={14} />} label="25 min avg" />
            <Feature icon={<Truck size={14} />} label="Free over $25" />
            <Feature icon={<ShieldCheck size={14} />} label="Secure pay" />
          </div>
        </div>

        <div className="relative hidden h-52 md:block">
          <motion.div
            initial={{ rotate: -6, y: 0 }}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute right-2 top-2 h-44 w-44 overflow-hidden rounded-3xl border-4 border-card shadow-card"
          >
            <Image src="/food/burger.png" alt="Burger" fill className="object-cover" sizes="200px" />
          </motion.div>
          <motion.div
            initial={{ rotate: 8, y: 0 }}
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            className="absolute bottom-0 left-6 h-36 w-36 overflow-hidden rounded-3xl border-4 border-card shadow-card"
          >
            <Image src="/food/pizza.png" alt="Pizza" fill className="object-cover" sizes="160px" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
      <span className="text-brand">{icon}</span>
      {label}
    </span>
  )
}

function SectionHeading({
  kicker,
  title,
  icon,
}: {
  kicker: string
  title: string
  icon?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
          {kicker}
        </p>
        <h2 className="mt-0.5 flex items-center gap-2 text-xl font-extrabold tracking-tight sm:text-2xl">
          {icon}
          {title}
        </h2>
      </div>
    </div>
  )
}

function PopularCard({ item }: { item: MenuItem }) {
  const addToCart = useTake((s) => s.addToCart)
  return (
    <button
      type="button"
      onClick={() =>
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
      className="group relative w-64 shrink-0 overflow-hidden rounded-2xl border border-border bg-card text-left shadow-soft transition hover:shadow-card"
    >
      <div className="relative h-32 overflow-hidden">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="256px"
          className="object-cover transition group-hover:scale-105"
        />
        <span className="absolute bottom-2 left-2 rounded-full bg-card/90 px-2 py-0.5 text-xs font-bold text-brand backdrop-blur-sm">
          {fmtMoney(item.price)}
        </span>
      </div>
      <div className="p-3">
        <p className="text-sm font-bold leading-tight">{item.name}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {item.description}
        </p>
      </div>
    </button>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <div className="flex justify-between pt-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-9 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-brand-soft-foreground">
        <UtensilsCrossed />
      </div>
      <p className="mt-3 text-base font-bold">No dishes found</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Try a different category or search term.
      </p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-destructive/40 bg-card/50 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
        <UtensilsCrossed />
      </div>
      <p className="mt-3 text-base font-bold">Couldn’t load the menu</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full bg-brand px-4 py-2 text-sm font-bold text-brand-foreground shadow-brand"
      >
        Try again
      </button>
    </div>
  )
}
