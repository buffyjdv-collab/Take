import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/tenant'
import { resolveDateRange } from '@/lib/date-range'

export const dynamic = 'force-dynamic'

type GroupBy = 'day' | 'month' | 'year'

/** Returns the period bucket key for a date based on the grouping mode. */
function getPeriodKey(date: Date, groupBy: GroupBy): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  if (groupBy === 'day') return `${y}-${m}-${d}`
  if (groupBy === 'year') return `${y}`
  return `${y}-${m}` // month (default)
}

/** Human-friendly label for a period bucket key. */
export function formatPeriodLabel(period: string, groupBy: GroupBy): string {
  if (groupBy === 'day') {
    const [y, m, d] = period.split('-')
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date)
  }
  if (groupBy === 'year') return period
  // month
  const [y, m] = period.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Platform Fees Collected — super admin view of fees collected per tenant.
 * Returns: total collected, breakdown by tenant, breakdown by fee type, trend.
 * Optional ?groupBy=day|month|year — adds a byTenantByPeriod[] array of
 * per-restaurant per-period buckets (collected / pending / refunded / etc).
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    requireSuperAdmin(session)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sp = req.nextUrl.searchParams
  const range = sp.get('range') || '30d'
  let dateRange
  try {
    dateRange = resolveDateRange(range, sp.get('from'), sp.get('to'))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  const groupByRaw = (sp.get('groupBy') || 'month').toLowerCase()
  const groupBy: GroupBy =
    groupByRaw === 'day' || groupByRaw === 'year' ? groupByRaw : 'month'

  const fees = await db.platformFee.findMany({
    where: {
      createdAt: { gte: dateRange.from, lte: dateRange.to },
    },
    select: {
      id: true,
      feeType: true,
      percentageRate: true,
      fixedAmount: true,
      baseAmount: true,
      grossFee: true,
      feeAmount: true,
      payer: true,
      customerPortion: true,
      restaurantPortion: true,
      status: true,
      collectedAt: true,
      createdAt: true,
      restaurantId: true,
      restaurant: {
        select: { id: true, name: true, slug: true, plan: true },
      },
      order: {
        select: { id: true, orderNumber: true, grandTotal: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 2000,
  })

  // Aggregate by tenant
  const tenantMap = new Map<
    string,
    {
      restaurantId: string
      restaurantName: string
      slug: string
      plan: string
      feeCount: number
      collected: number
      pending: number
      refunded: number
      customerPaid: number
      restaurantPaid: number
    }
  >()

  // Aggregate by tenant AND period bucket (only meaningful if groupBy is set,
  // but we always compute it — client can choose to render or ignore).
  const tenantPeriodMap = new Map<
    string,
    {
      restaurantId: string
      restaurantName: string
      slug: string
      plan: string
      period: string
      feeCount: number
      collected: number
      pending: number
      refunded: number
      customerPaid: number
      restaurantPaid: number
    }
  >()

  for (const f of fees) {
    const key = f.restaurantId
    const cur = tenantMap.get(key) || {
      restaurantId: f.restaurantId,
      restaurantName: f.restaurant?.name || 'Unknown',
      slug: f.restaurant?.slug || '',
      plan: f.restaurant?.plan || 'TRIAL',
      feeCount: 0,
      collected: 0,
      pending: 0,
      refunded: 0,
      customerPaid: 0,
      restaurantPaid: 0,
    }
    cur.feeCount += 1
    if (f.status === 'COLLECTED') {
      cur.collected += f.feeAmount
      cur.customerPaid += f.customerPortion
      cur.restaurantPaid += f.restaurantPortion
    } else if (f.status === 'PENDING') {
      cur.pending += f.feeAmount
    } else if (f.status === 'REFUNDED') {
      cur.refunded += f.feeAmount
    }
    tenantMap.set(key, cur)

    // Period bucket
    const periodKey = getPeriodKey(f.createdAt, groupBy)
    const tpKey = `${key}__${periodKey}`
    const tp = tenantPeriodMap.get(tpKey) || {
      restaurantId: f.restaurantId,
      restaurantName: f.restaurant?.name || 'Unknown',
      slug: f.restaurant?.slug || '',
      plan: f.restaurant?.plan || 'TRIAL',
      period: periodKey,
      feeCount: 0,
      collected: 0,
      pending: 0,
      refunded: 0,
      customerPaid: 0,
      restaurantPaid: 0,
    }
    tp.feeCount += 1
    if (f.status === 'COLLECTED') {
      tp.collected += f.feeAmount
      tp.customerPaid += f.customerPortion
      tp.restaurantPaid += f.restaurantPortion
    } else if (f.status === 'PENDING') {
      tp.pending += f.feeAmount
    } else if (f.status === 'REFUNDED') {
      tp.refunded += f.feeAmount
    }
    tenantPeriodMap.set(tpKey, tp)
  }

  const round2 = (n: number) => +n.toFixed(2)

  const byTenant = Array.from(tenantMap.values())
    .map((t) => ({
      ...t,
      collected: round2(t.collected),
      pending: round2(t.pending),
      refunded: round2(t.refunded),
      customerPaid: round2(t.customerPaid),
      restaurantPaid: round2(t.restaurantPaid),
    }))
    .sort((a, b) => b.collected - a.collected)

  const byTenantByPeriod = Array.from(tenantPeriodMap.values())
    .map((t) => ({
      ...t,
      collected: round2(t.collected),
      pending: round2(t.pending),
      refunded: round2(t.refunded),
      customerPaid: round2(t.customerPaid),
      restaurantPaid: round2(t.restaurantPaid),
    }))
    .sort((a, b) => {
      // primary: restaurantId, secondary: period ascending (oldest first)
      if (a.restaurantId !== b.restaurantId) return a.restaurantId.localeCompare(b.restaurantId)
      return a.period.localeCompare(b.period)
    })

  // Aggregate by fee type
  const feeTypeMap: Record<string, number> = {}
  for (const f of fees) {
    feeTypeMap[f.feeType] = (feeTypeMap[f.feeType] || 0) + f.feeAmount
  }

  // Aggregate by payer
  const payerMap: Record<string, number> = {}
  for (const f of fees) {
    payerMap[f.payer] = (payerMap[f.payer] || 0) + f.feeAmount
  }

  // Total collected
  const totalCollected = fees
    .filter((f) => f.status === 'COLLECTED')
    .reduce((s, f) => s + f.feeAmount, 0)
  const totalPending = fees
    .filter((f) => f.status === 'PENDING')
    .reduce((s, f) => s + f.feeAmount, 0)
  const totalRefunded = fees
    .filter((f) => f.status === 'REFUNDED')
    .reduce((s, f) => s + f.feeAmount, 0)

  // ---------------------------------------------------------------------------
  // OVERDUE DETECTION
  // A restaurant is "overdue" if it has PENDING platform fees older than 30
  // days. The super admin can then block the restaurant's QR scanning ability
  // (the customer menu route will reject scans for blocked restaurants).
  // ---------------------------------------------------------------------------
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const overdueFees = fees.filter(
    (f) => f.status === 'PENDING' && f.createdAt < thirtyDaysAgo,
  )
  // Group overdue fees by restaurant
  const overdueMap = new Map<
    string,
    {
      restaurantId: string
      restaurantName: string
      slug: string
      plan: string
      pendingAmount: number
      oldestPendingDate: Date
      feeCount: number
    }
  >()
  for (const f of overdueFees) {
    const cur = overdueMap.get(f.restaurantId) || {
      restaurantId: f.restaurantId,
      restaurantName: f.restaurant?.name || 'Unknown',
      slug: f.restaurant?.slug || '',
      plan: f.restaurant?.plan || 'TRIAL',
      pendingAmount: 0,
      oldestPendingDate: f.createdAt,
      feeCount: 0,
    }
    cur.pendingAmount += f.feeAmount
    if (f.createdAt < cur.oldestPendingDate) {
      cur.oldestPendingDate = f.createdAt
    }
    cur.feeCount += 1
    overdueMap.set(f.restaurantId, cur)
  }
  const overdueTenants = Array.from(overdueMap.values())
    .map((t) => ({
      ...t,
      pendingAmount: round2(t.pendingAmount),
      oldestPendingDate: t.oldestPendingDate.toISOString(),
      daysOverdue: Math.floor(
        (Date.now() - t.oldestPendingDate.getTime()) / (24 * 60 * 60 * 1000),
      ),
    }))
    .sort((a, b) => b.pendingAmount - a.pendingAmount)

  return NextResponse.json({
    success: true,
    data: {
      range: dateRange.label,
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
      groupBy,
      totalCollected: round2(totalCollected),
      totalPending: round2(totalPending),
      totalRefunded: round2(totalRefunded),
      totalFees: fees.length,
      byTenant,
      byTenantByPeriod,
      byFeeType: Object.entries(feeTypeMap).map(([type, amount]) => ({
        feeType: type,
        amount: round2(amount),
      })),
      byPayer: Object.entries(payerMap).map(([payer, amount]) => ({
        payer,
        amount: round2(amount),
      })),
      recentFees: fees.slice(0, 20).map((f) => ({
        id: f.id,
        feeType: f.feeType,
        feeAmount: f.feeAmount,
        baseAmount: f.baseAmount,
        payer: f.payer,
        status: f.status,
        collectedAt: f.collectedAt,
        createdAt: f.createdAt,
        restaurant: f.restaurant,
        order: f.order,
      })),
      // Restaurants with pending fees older than 30 days
      overdueTenants,
    },
  })
}
