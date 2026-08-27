'use client'

import Image from 'next/image'
import { Star, Clock, Plus, Flame } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { ToastAction } from '@/components/ui/toast'
import { QtyStepper } from './qty-stepper'
import { toast } from '@/hooks/use-toast'
import { useTake, type CartItem } from '@/store/take'
import { fmtMoney } from '@/lib/take'
import { cn } from '@/lib/utils'

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

export function MenuCard({ item }: { item: MenuItem }) {
  const cart = useTake((s) => s.cart)
  const addToCart = useTake((s) => s.addToCart)
  const decrement = useTake((s) => s.decrement)
  const setView = useTake((s) => s.setView)

  const inCart = cart.find((c) => c.id === item.id)
  const qty = inCart?.quantity ?? 0

  const handleAdd = () => {
    const payload: Omit<CartItem, 'quantity'> = {
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
    }
    addToCart(payload, 1)
    toast({
      title: 'Added to cart',
      description: `${item.name} • ${fmtMoney(item.price)}`,
      action: (
        <ToastAction altText="View cart" onClick={() => setView('cart')}>
          View cart
        </ToastAction>
      ),
    })
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.6, 0.2, 1] }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:shadow-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          {item.popular && (
            <Badge className="gap-1 border-0 bg-brand text-brand-foreground shadow-brand">
              <Flame size={12} strokeWidth={2.6} /> Popular
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            {item.rating.toFixed(1)}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 m-3 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          <Clock size={12} /> {item.prepTime} min
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold leading-tight tracking-tight">
            {item.name}
          </h3>
          <span className="shrink-0 text-base font-extrabold text-brand">
            {fmtMoney(item.price)}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {item.description}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-full bg-brand-soft/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-soft-foreground"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          {qty > 0 ? (
            <QtyStepper
              value={qty}
              size="sm"
              onDec={() => decrement(item.id)}
              onInc={handleAdd}
            />
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={handleAdd}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-brand-foreground shadow-brand transition active:scale-95 hover:brightness-105'
            )}
          >
            <Plus size={16} strokeWidth={2.6} />
            Add
          </button>
        </div>
      </div>
    </motion.article>
  )
}
