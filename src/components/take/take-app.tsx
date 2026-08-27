'use client'

import { useEffect } from 'react'
import { useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTake } from '@/store/take'
import { Header } from './header'
import { Footer } from './footer'
import { MenuView } from './menu-view'
import { CartView } from './cart-view'
import { CheckoutView } from './checkout-view'
import { TrackingView } from './tracking-view'

// Idiomatic "are we mounted on the client after hydration" flag without
// calling setState inside an effect (avoids hydration mismatch from the
// persisted cart/order state).
const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

/**
 * Take — consumer ordering app shell.
 *
 * Reused by three entry points:
 *  - /consumer-demo            → <TakeApp />               (demo, Consumer* tables)
 *  - /qr/[token]               → <TakeApp token={token} />  (QR scan, platform tables)
 *  - /?table=<token>           → <TakeApp token={token} />  (QR scan, platform tables)
 *
 * When `token` is provided, the views read the real restaurant menu from
 * /api/customer/menu and place orders into /api/customer/order (so the
 * kitchen/admin see them). When `token` is null, they use the demo's own
 * /api/menu + /api/orders endpoints.
 */
export function TakeApp({ token }: { token?: string }) {
  const view = useTake((s) => s.view)
  const setActiveToken = useTake((s) => s.setActiveToken)
  const mounted = useMounted()

  // Keep the store's activeToken in sync with the prop. This is the only
  // external state we sync; it does not trigger cascading renders because
  // setActiveToken is a no-op when the value is unchanged.
  useEffect(() => {
    setActiveToken(token ?? null)
  }, [token, setActiveToken])

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
