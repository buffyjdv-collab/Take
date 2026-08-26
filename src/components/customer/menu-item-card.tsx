'use client'

import { Plus, Minus, Star, Flame } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { VegBadge } from '@/components/restaurant/veg-badge'
import { Price, formatINR } from '@/components/restaurant/price'
import { cn } from '@/lib/utils'
import type { MenuItemWithRelations } from './types'
import { useCustomerCart, lineKeyOf } from '@/stores/customer-cart'

export function MenuSection({
  item,
  onSelect,
}: {
  item: MenuItemWithRelations
  onSelect: () => void
}) {
  const items = useCustomerCart((s) => s.items)
  const addItem = useCustomerCart((s) => s.addItem)
  const updateQuantity = useCustomerCart((s) => s.updateQuantity)

  // Aggregate all cart lines that point to this menu item (regardless of
  // variant/modifier/notes). We sum the quantities so the counter reflects
  // the total number of this dish the customer has added.
  const matchingLines = items.filter((i) => i.menuItemId === item.id)
  const inCartQty = matchingLines.reduce((n, i) => n + i.quantity, 0)

  // Variant "from" price
  const variantFrom = item.variants.length
    ? Math.min(...item.variants.map((v) => item.basePrice + v.priceModifier))
    : item.basePrice

  // Swiggy-style quick add: directly adds the default variant (or no variant)
  // with no modifiers. If the item has required modifier groups, we still
  // fall through to the detail sheet.
  const hasRequiredModifiers = item.modifierGroups.some((g) => g.required)
  const hasVariants = item.variants.length > 0

  const quickAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    // If the item has variants or required modifiers, open the detail sheet
    // instead of doing a blind quick-add — the customer needs to choose.
    if (hasVariants || hasRequiredModifiers) {
      onSelect()
      return
    }
    // Otherwise, add the base item directly (Swiggy-style one-tap add).
    const defaultVariant = item.variants.find((v) => v.isDefault) || null
    const cartItem = {
      menuItemId: item.id,
      name: item.name,
      image: item.image,
      basePrice: item.basePrice,
      variantId: defaultVariant?.id,
      variantName: defaultVariant?.name,
      variantPrice: defaultVariant?.priceModifier || 0,
      modifierIds: [],
      modifierNames: [],
      modifiersTotal: 0,
      quantity: 1,
      isVeg: item.isVeg,
      unitPrice: item.basePrice + (defaultVariant?.priceModifier || 0),
      totalPrice: item.basePrice + (defaultVariant?.priceModifier || 0),
    }
    addItem(cartItem)
  }

  // Increment the first matching cart line by 1 (Swiggy-style)
  const quickInc = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (matchingLines.length === 0) return
    const first = matchingLines[0]
    updateQuantity(lineKeyOf(first), first.quantity + 1)
  }

  // Decrement the first matching cart line by 1; removes if it hits 0
  const quickDec = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (matchingLines.length === 0) return
    const first = matchingLines[0]
    updateQuantity(lineKeyOf(first), first.quantity - 1)
  }

  return (
    <div
      role="button"
      tabIndex={item.soldOut ? -1 : 0}
      onClick={item.soldOut ? undefined : onSelect}
      onKeyDown={(e) => {
        if (item.soldOut) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left transition-all hover:border-emerald-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400',
        item.soldOut && 'pointer-events-none opacity-60',
      )}
    >
      {/* Left content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <VegBadge isVeg={item.isVeg} />
          {item.isSpicy && (
            <span className="inline-flex items-center text-orange-600" title="Spicy">
              <Flame className="h-3.5 w-3.5" />
            </span>
          )}
          {item.isFeatured && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
              Featured
            </span>
          )}
        </div>
        <h3 className="line-clamp-1 text-sm font-semibold text-slate-900">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {item.description}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <Price amount={variantFrom} size="sm" />
          {item.variants.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {variantFrom < item.basePrice ? 'from' : '+'} variants
            </span>
          )}
        </div>
      </div>

      {/* Right image + Swiggy-style counter */}
      <div className="relative shrink-0">
        <div className="h-20 w-20 overflow-hidden rounded-xl bg-slate-50 sm:h-24 sm:w-24">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">
              🍽️
            </div>
          )}
        </div>
        {item.soldOut ? (
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
            Sold out
          </span>
        ) : (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
            <AnimatePresence mode="popLayout" initial={false}>
              {inCartQty === 0 ? (
                <motion.button
                  key="add"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  onClick={quickAdd}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-600 shadow-md transition-colors hover:bg-emerald-50"
                  aria-label={`Add ${item.name} to cart`}
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                </motion.button>
              ) : (
                <motion.div
                  key="counter"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="flex h-8 items-center overflow-hidden rounded-lg border border-emerald-300 bg-white shadow-md"
                >
                  <button
                    onClick={quickDec}
                    className="flex h-8 w-8 items-center justify-center text-emerald-600 transition-colors hover:bg-emerald-50"
                    aria-label={`Remove one ${item.name}`}
                  >
                    <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                  <motion.span
                    key={inCartQty}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                    className="min-w-6 px-1 text-center text-sm font-bold text-emerald-700"
                  >
                    {inCartQty}
                  </motion.span>
                  <button
                    onClick={quickInc}
                    className="flex h-8 w-8 items-center justify-center text-emerald-600 transition-colors hover:bg-emerald-50"
                    aria-label={`Add one more ${item.name}`}
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

// Convenience export
export { formatINR }
