import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

type TimelineEntry = { status: string; at: number }

// Status flow + how long (ms) the order stays in each stage before advancing.
// Kept short so the live tracking experience is visible during a demo.
const STAGE_DURATIONS: Record<string, number> = {
  placed: 8_000,
  preparing: 20_000,
  'on-the-way': 30_000,
  delivered: 0,
}

const ORDERED_STAGES = ['placed', 'preparing', 'on-the-way', 'delivered']

function randomCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      customerName,
      address,
      phone,
      notes,
      paymentMethod,
      items,
    } = body as {
      customerName: string
      address: string
      phone: string
      notes?: string
      paymentMethod: string
      items: { id: string; name: string; price: number; quantity: number; image?: string }[]
    }

    if (!customerName || !address || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Your cart is empty' },
        { status: 400 }
      )
    }

    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
    const deliveryFee = subtotal >= 25 ? 0 : 3.99
    const tax = +(subtotal * 0.08).toFixed(2)
    const total = +(subtotal + deliveryFee + tax).toFixed(2)

    const now = Date.now()
    const timeline: TimelineEntry[] = [{ status: 'placed', at: now }]

    // ETA: sum of remaining stage durations + buffer
    const etaMinutes = Math.max(
      18,
      Math.round(
        (STAGE_DURATIONS.preparing +
          STAGE_DURATIONS['on-the-way']) /
          60000
      ) + 8
    )

    // ensure unique shortCode
    let code = randomCode()
    let exists = await db.consumerOrder.findUnique({ where: { shortCode: code } })
    while (exists) {
      code = randomCode()
      exists = await db.consumerOrder.findUnique({ where: { shortCode: code } })
    }

    const order = await db.consumerOrder.create({
      data: {
        shortCode: code,
        status: 'placed',
        customerName,
        address,
        phone,
        notes: notes || null,
        subtotal: +subtotal.toFixed(2),
        deliveryFee,
        tax,
        total,
        paymentMethod: paymentMethod || 'card',
        etaMinutes,
        timeline: JSON.stringify(timeline),
        items: {
          create: items.map((i) => ({
            menuItemId: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            image: i.image || null,
          })),
        },
      },
      include: { items: true },
    })

    return NextResponse.json({ order: serialize(order) })
  } catch (err) {
    console.error('[api/orders POST] error', err)
    return NextResponse.json(
      { error: 'Failed to place order' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit') || 20)
    const orders = await db.consumerOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { items: true },
    })
    return NextResponse.json({ orders: orders.map(serialize) })
  } catch (err) {
    console.error('[api/orders GET] error', err)
    return NextResponse.json(
      { error: 'Failed to list orders' },
      { status: 500 }
    )
  }
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

export const ADVANCE = { STAGE_DURATIONS, ORDERED_STAGES }
