export const STAGES = ['placed', 'preparing', 'on-the-way', 'delivered'] as const
export type Stage = (typeof STAGES)[number]

export const STAGE_META: Record<
  Stage,
  { label: string; icon: string; blurb: string }
> = {
  placed: {
    label: 'Order Placed',
    icon: 'receipt',
    blurb: 'We received your order and sent it to the kitchen.',
  },
  preparing: {
    label: 'Preparing',
    icon: 'chef-hat',
    blurb: 'Our chefs are cooking your meal with love.',
  },
  'on-the-way': {
    label: 'On the Way',
    icon: 'bike',
    blurb: 'Your rider has picked up your order and is en route.',
  },
  delivered: {
    label: 'Delivered',
    icon: 'check',
    blurb: 'Enjoy your meal! Your order has been delivered.',
  },
}

export const STAGE_ORDER: Stage[] = ['placed', 'preparing', 'on-the-way', 'delivered']

export function stageIndex(s: string): number {
  return Math.max(0, STAGE_ORDER.indexOf(s as Stage))
}

export function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
}

export function fmtTime(iso: string | number): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function fmtDateTime(iso: string | number): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function timeAgo(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts)
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function maskCard(num: string): string {
  const digits = num.replace(/\D/g, '').slice(-4)
  return `•••• ${digits}`
}

/* ------------------------------------------------------------------ */
/* Platform (QR Dine) integration helpers                              */
/* The QR-scan flow reads the real restaurant menu from /api/customer/  */
/* menu and places orders into /api/customer/order. These helpers map   */
/* the platform's data shapes onto the Take consumer demo's shape so    */
/* the same UI components work for both the demo (/consumer-demo) and  */
/* the live QR flow (/qr/[token], ?table=<token>).                      */
/* ------------------------------------------------------------------ */

// Map a platform Order status → Take tracking stage.
// Platform: PENDING_PAYMENT | NEW | ACCEPTED | PREPARING | READY | SERVED | COMPLETED | CANCELLED
// Take:     placed | preparing | on-the-way | delivered
export function platformStatusToStage(status: string): Stage {
  const s = (status || '').toUpperCase()
  switch (s) {
    case 'PENDING_PAYMENT':
    case 'NEW':
      return 'placed'
    case 'ACCEPTED':
    case 'PREPARING':
      return 'preparing'
    case 'READY':
      return 'on-the-way'
    case 'SERVED':
    case 'COMPLETED':
      return 'delivered'
    case 'CANCELLED':
      // Treat cancelled as a terminal "delivered"-like state so the UI renders.
      return 'delivered'
    default:
      return 'placed'
  }
}

// Build a Take-style timeline from a platform order's individual timestamp
// fields (the platform stores each stage transition as its own column).
type PlatformOrderLike = {
  status?: string
  placedAt?: string | Date | null
  acceptedAt?: string | Date | null
  preparingAt?: string | Date | null
  readyAt?: string | Date | null
  servedAt?: string | Date | null
  completedAt?: string | Date | null
}

export function platformTimeline(order: PlatformOrderLike): {
  status: string
  at: number
}[] {
  const tl: { status: string; at: number }[] = []
  const push = (stage: string, at: string | Date | null | undefined) => {
    if (!at) return
    const t = new Date(at as any).getTime()
    if (!Number.isNaN(t)) tl.push({ status: stage, at: t })
  }
  push('placed', order.placedAt)
  push('preparing', order.preparingAt || order.acceptedAt)
  push('on-the-way', order.readyAt)
  push('delivered', order.servedAt || order.completedAt)
  return tl
}

// Map a platform MenuItem (from /api/customer/menu) → the Take menu item
// shape the MenuView expects.
type PlatformMenuItem = {
  id: string
  name: string
  description?: string | null
  image?: string | null
  basePrice: number
  isVeg?: boolean
  isSpicy?: boolean
  isFeatured?: boolean
  isPopular?: boolean
  available?: boolean
  soldOut?: boolean
  tags?: string | null
  prepTime?: number
  category?: { name: string } | null
}

const FALLBACK_IMG = '/food/burger.png'

export function mapPlatformMenuItem(
  item: PlatformMenuItem,
): {
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
  available: boolean
} {
  const tags: string[] = item.tags
    ? item.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : []
  if (item.isVeg) tags.push('veg')
  if (item.isSpicy) tags.push('spicy')
  if (item.isFeatured) tags.push('featured')
  if (item.isPopular) tags.push('popular')
  return {
    id: item.id,
    name: item.name,
    description: item.description || '',
    price: item.basePrice,
    category: item.category?.name || 'Uncategorised',
    image: item.image || FALLBACK_IMG,
    tags: Array.from(new Set(tags)),
    rating: 4.8, // platform has no per-item rating; neutral default
    prepTime: item.prepTime ?? 15,
    popular: !!(item.isPopular || item.isFeatured),
    available: !(item.soldOut) && (item.available ?? true),
  }
}

