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
