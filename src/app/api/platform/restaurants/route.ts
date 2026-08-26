import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/tenant'
import { platformCreateTenantSchema } from '@/lib/validations'
import bcrypt from 'bcryptjs'
import { getPlan } from '@/lib/plans'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

/** List all restaurants (tenants) on the platform. */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    requireSuperAdmin(session)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const search = url.searchParams.get('search') || ''
  const status = url.searchParams.get('status')
  const plan = url.searchParams.get('plan')

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { slug: { contains: search } },
      { email: { contains: search } },
      { city: { contains: search } },
    ]
  }
  if (status) where.subscriptionStatus = status
  if (plan) where.plan = plan

  const restaurants = await db.restaurant.findMany({
    where,
    include: {
      subscription: true,
      _count: {
        select: {
          tables: true,
          menuItems: true,
          users: true,
          orders: true,
          branches: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({
    success: true,
    data: restaurants.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      tagline: r.tagline,
      address: r.address,
      city: r.city,
      phone: r.phone,
      email: r.email,
      plan: r.plan,
      subscriptionStatus: r.subscriptionStatus,
      trialEndsAt: r.trialEndsAt,
      suspendedAt: r.suspendedAt,
      suspendedReason: r.suspendedReason,
      isOpen: r.isOpen,
      createdAt: r.createdAt,
      counts: r._count,
      subscription: r.subscription
        ? {
            status: r.subscription.status,
            billingCycle: r.subscription.billingCycle,
            amount: r.subscription.amount,
            currentPeriodEnd: r.subscription.currentPeriodEnd,
          }
        : null,
    })),
  })
}

/** Super admin creates a new tenant manually. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    requireSuperAdmin(session)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = platformCreateTenantSchema.parse(body)

    // Check slug uniqueness
    const existing = await db.restaurant.findUnique({ where: { slug: parsed.slug } })
    if (existing) {
      return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
    }

    // Check owner email uniqueness (if password provided → create owner)
    if (parsed.ownerEmail) {
      const existingUser = await db.user.findUnique({
        where: { email: parsed.ownerEmail.toLowerCase() },
      })
      if (existingUser) {
        return NextResponse.json({ error: 'Owner email already exists' }, { status: 409 })
      }
    }

    const plan = getPlan(parsed.plan)
    const superAdminId = (session.user as any).id as string

    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    const result = await db.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          slug: parsed.slug,
          name: parsed.name,
          tagline: parsed.tagline,
          address: parsed.address,
          city: parsed.city,
          phone: parsed.phone,
          email: parsed.email || null,
          plan: parsed.plan,
          subscriptionStatus: parsed.plan === 'TRIAL' ? 'TRIALING' : 'ACTIVE',
          trialEndsAt: parsed.plan === 'TRIAL' ? trialEndsAt : null,
          onboardedById: superAdminId,
        },
      })

      const branch = await tx.branch.create({
        data: {
          restaurantId: restaurant.id,
          name: 'Main Branch',
          address: parsed.address,
          phone: parsed.phone,
          active: true,
        },
      })

      await tx.restaurantSettings.create({ data: { restaurantId: restaurant.id } })

      // Create owner if password provided
      let owner = null
      if (parsed.ownerPassword && parsed.ownerEmail) {
        const passwordHash = await bcrypt.hash(parsed.ownerPassword, 10)
        owner = await tx.user.create({
          data: {
            email: parsed.ownerEmail.toLowerCase(),
            name: parsed.ownerName,
            passwordHash,
            role: 'RESTAURANT_OWNER',
            restaurantId: restaurant.id,
            branchId: branch.id,
            active: true,
          },
        })
      }

      // Subscription
      const subStatus = parsed.plan === 'TRIAL' ? 'TRIALING' : 'ACTIVE'
      await tx.subscription.create({
        data: {
          restaurantId: restaurant.id,
          plan: parsed.plan,
          status: subStatus,
          billingCycle: parsed.billingCycle,
          amount:
            parsed.billingCycle === 'YEARLY'
              ? plan.yearlyPrice * 100
              : plan.monthlyPrice * 100,
          currency: 'INR',
          trialStartsAt: parsed.plan === 'TRIAL' ? new Date() : null,
          trialEndsAt: parsed.plan === 'TRIAL' ? trialEndsAt : null,
          currentPeriodStart: parsed.plan === 'TRIAL' ? null : new Date(),
          currentPeriodEnd: parsed.plan === 'TRIAL'
            ? null
            : new Date(Date.now() + (parsed.billingCycle === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000),
          autoRenew: parsed.plan !== 'TRIAL',
        },
      })

      // Audit
      await tx.auditLog.create({
        data: {
          restaurantId: restaurant.id,
          userId: superAdminId,
          action: 'CREATE',
          entity: 'RESTAURANT',
          entityId: restaurant.id,
          details: JSON.stringify({ source: 'PLATFORM_ADMIN', plan: parsed.plan }),
        },
      })

      return { restaurant, owner }
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message }, { status: 400 })
    }
    console.error('[platform/restaurants] error:', err)
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
  }
}
