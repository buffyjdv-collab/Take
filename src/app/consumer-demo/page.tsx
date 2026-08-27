'use client'

import { useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTake } from '@/store/take'
import { Header } from '@/components/take/header'
import { Footer } from '@/components/take/footer'
import { MenuView } from '@/components/take/menu-view'
import { CartView } from '@/components/take/cart-view'
import { CheckoutView } from '@/components/take/checkout-view'
import { TrackingView } from '@/components/take/tracking-view'

// Idiomatic "are we mounted on the client after hydration" flag without
// calling setState inside an effect (avoids hydration mismatch from the
// persisted cart/order state).
const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

// Take — consumer ordering demo (self-contained module).
// Mounted at /consumer-demo so it does NOT disturb the platform's existing
// routes (the platform's `/` homepage, admin, staff, etc. remain unchanged).
export default function ConsumerDemoPage() {
  const view = useTake((s) => s.view)
  const mounted = useMounted()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {mounted ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.2, 0.6, 0.2, 1] }}
            >
              {view === 'menu' && <MenuView />}
              {view === 'cart' && <CartView />}
              {view === 'checkout' && <CheckoutView />}
              {view === 'tracking' && <TrackingView />}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="h-64 w-full rounded-3xl bg-muted/40 animate-pulse" />
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
