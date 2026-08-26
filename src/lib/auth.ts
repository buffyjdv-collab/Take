import bcrypt from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { db } from '@/lib/db'

// Role hierarchy for permission checks
export const ROLE_HIERARCHY: Record<string, string[]> = {
  SUPER_ADMIN: ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER', 'KITCHEN_STAFF', 'WAITER', 'CASHIER'],
  RESTAURANT_OWNER: ['RESTAURANT_OWNER', 'MANAGER', 'KITCHEN_STAFF', 'WAITER', 'CASHIER'],
  MANAGER: ['MANAGER', 'KITCHEN_STAFF', 'WAITER', 'CASHIER'],
  KITCHEN_STAFF: ['KITCHEN_STAFF'],
  WAITER: ['WAITER'],
  CASHIER: ['CASHIER'],
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  RESTAURANT_OWNER: 'Restaurant Owner',
  MANAGER: 'Manager',
  KITCHEN_STAFF: 'Kitchen Staff',
  WAITER: 'Waiter',
  CASHIER: 'Cashier',
}

// Permission matrix: which roles can access which feature areas
export const PERMISSIONS: Record<string, string[]> = {
  // Admin/dashboard access
  'dashboard.view': ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER', 'CASHIER'],
  // Menu management
  'menu.create': ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER'],
  'menu.update': ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER'],
  'menu.delete': ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER'],
  // Table & QR management
  'tables.manage': ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER'],
  // Order management
  'orders.view': ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER', 'KITCHEN_STAFF', 'WAITER', 'CASHIER'],
  'orders.update_status': ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER', 'KITCHEN_STAFF', 'WAITER'],
  'orders.cancel': ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER', 'CASHIER'],
  // Kitchen display
  'kitchen.view': ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER', 'KITCHEN_STAFF'],
  // Waiter
  'waiter.view': ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER', 'WAITER'],
  // Billing & payments
  'billing.manage': ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER', 'CASHIER'],
  'payments.verify': ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER', 'CASHIER'],
  // Reports
  'reports.view': ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER', 'CASHIER'],
  // Staff management
  'staff.manage': ['SUPER_ADMIN', 'RESTAURANT_OWNER'],
  // Restaurant settings
  'settings.manage': ['SUPER_ADMIN', 'RESTAURANT_OWNER'],
  // Multi-restaurant management (super admin only)
  'restaurants.manage': ['SUPER_ADMIN'],
}

export function hasPermission(role: string, permission: string): boolean {
  const allowed = PERMISSIONS[permission]
  if (!allowed) return false
  return allowed.includes(role)
}

export function canAccessRole(actorRole: string, targetRole: string): boolean {
  const allowed = ROLE_HIERARCHY[actorRole] || []
  return allowed.includes(targetRole)
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        try {
          const user = await db.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
            include: { restaurant: true, branch: true },
          })
          if (!user || !user.active) return null
          const valid = await bcrypt.compare(credentials.password, user.passwordHash)
          if (!valid) return null
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            restaurantId: user.restaurantId,
            branchId: user.branchId,
            restaurantName: user.restaurant?.name,
            restaurantSlug: user.restaurant?.slug,
          } as any
        } catch (err) {
          console.error('[auth] authorize error:', err)
          return null
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
        token.restaurantId = (user as any).restaurantId
        token.branchId = (user as any).branchId
        token.restaurantName = (user as any).restaurantName
        token.restaurantSlug = (user as any).restaurantSlug
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).restaurantId = token.restaurantId
        ;(session.user as any).branchId = token.branchId
        ;(session.user as any).restaurantName = token.restaurantName
        ;(session.user as any).restaurantSlug = token.restaurantSlug
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'spice-garden-quick-order-secret-key-2026-very-long-and-stable-do-not-change',
  // Gracefully handle stale JWT cookies — don't crash the page, just treat as no session
  logger: {
    error(code: string, message: any) {
      if (code === 'JWT_SESSION_ERROR') {
        console.warn('[next-auth] Stale JWT cookie — user will be asked to sign in again.')
        return
      }
      console.error(`[next-auth][${code}]`, message)
    },
  },
}
