import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CustomerApp } from '@/components/customer/customer-app'
import { LandingPage } from '@/components/landing-page'
import { AppShell } from '@/components/app-shell'

interface HomePageProps {
  searchParams: Promise<{ table?: string }>
}

export default async function Home({ searchParams }: HomePageProps) {
  const sp = await searchParams
  const tableToken = sp.table

  // Customer flow — no auth required
  if (tableToken) {
    return <CustomerApp token={tableToken} />
  }

  // Wrap in try/catch — a stale/invalid JWT cookie should never crash the page.
  // If session decoding fails, we simply show the landing page (user signs in again).
  let session: Awaited<ReturnType<typeof getServerSession>> = null
  try {
    session = await getServerSession(authOptions)
  } catch (err) {
    console.warn('[page] getServerSession failed (likely stale JWT cookie):', err instanceof Error ? err.message : err)
    session = null
  }

  if (!session?.user) {
    return <LandingPage />
  }

  // Pass the server-side session to AppShell so the sidebar has role/permissions
  // immediately without waiting for a client-side useSession() fetch.
  return <AppShell serverSession={session} />
}
