import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

type TimelineEntry = { status: string; at: number }

const STAGE_DURATIONS: Record<string, number> = {
  placed: 8_000,
  preparing: 20_000,
  'on-the-way': 30_000,
  delivered: 0,
}

const ORDERED_STAGES = ['placed', 'preparing', 'on-the-way', 'delivered']

// Advance the order status based on how much time has passed since the last
// stage change. This makes the tracking page "live" without a websocket and,
// crucially, means the tracking page ALWAYS has valid data to render.
async function maybeAdvance(order: any) {
  let timeline: TimelineEntry[] = []
  try {
    timeline = order.timeline ? JSON.parse(order.timeline) : []
  } catch {
    timeline = []
  }
  if (!timeline.length) {
    timeline = [{ status: order.status || 'placed', at: new Date(order.createdAt).getTime() }]
  }

  let currentStage = order.status
  const now = Date.now()

  let changed = false
  // loop in case we skipped multiple stages (e.g. long delay between polls)
  for (let i = 0; i < ORDERED_STAGES.length - 1; i++) {
    const stage = ORDERED_STAGES[i]
    if (stage !== currentStage) continue
    const lastAt = timeline[timeline.length - 1]?.at ?? new Date(order.createdAt).getTime()
    const elapsed = now - lastAt
    const duration = STAGE_DURATIONS[stage] ?? 0
    if (duration > 0 && elapsed >= duration) {
      const nextStage = ORDERED_STAGES[i + 1]
      currentStage = nextStage
      timeline = [...timeline, { status: nextStage, at: now }]
      changed = true
    } else {
      break
    }
  }

  if (changed) {
    const updated = await db.consumerOrder.update({
      where: { id: order.id },
      data: { status: currentStage, timeline: JSON.stringify(timeline) },
      include: { items: true },
    })
    return serialize(updated)
  }
  return serialize(order)
}

function serialize(order: any) {
  let timeline: TimelineEntry[] = []
  try {
    timeline = order.timeline ? JSON.parse(order.timeline) : []
  } catch {
    timeline = []
  }
  return {
    id: order.id,
    shortCode: order.shortCode,
    status: order.status,
    customerName: order.customerName,
    address: order.address,
    phone: order.phone,
    notes: order.notes,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    tax: order.tax,
    total: order.total,
    paymentMethod: order.paymentMethod,
    etaMinutes: order.etaMinutes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    timeline,
    items: order.items?.map((i: any) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      image: i.image,
    })),
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const byCode = searchParams.get('code') === '1'

    const order = byCode
      ? await db.consumerOrder.findUnique({
          where: { shortCode: id.toUpperCase() },
          include: { items: true },
        })
      : await db.consumerOrder.findUnique({
          where: { id },
          include: { items: true },
        })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const advanced = await maybeAdvance(order)
    return NextResponse.json({ order: advanced })
  } catch (err) {
    console.error('[api/orders/[id] GET] error', err)
    return NextResponse.json(
      { error: 'Failed to load order' },
      { status: 500 }
    )
  }
}

// Manual advance (not required but handy for the demo "advance" button).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const order = await db.consumerOrder.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    const idx = ORDERED_STAGES.indexOf(order.status)
    const next = ORDERED_STAGES[Math.min(idx + 1, ORDERED_STAGES.length - 1)]
    let timeline: TimelineEntry[] = []
    try {
      timeline = order.timeline ? JSON.parse(order.timeline) : []
    } catch {
      timeline = []
    }
    timeline = [...timeline, { status: next, at: Date.now() }]
    const updated = await db.consumerOrder.update({
      where: { id },
      data: { status: next, timeline: JSON.stringify(timeline) },
      include: { items: true },
    })
    return NextResponse.json({ order: serialize(updated) })
  } catch (err) {
    console.error('[api/orders/[id] PATCH] error', err)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}
