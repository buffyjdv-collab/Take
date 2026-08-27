'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type View = 'menu' | 'cart' | 'checkout' | 'tracking'

export type CartItem = {
  id: string
  name: string
  price: number
  image: string
  quantity: number
}

export type PlacedOrder = {
  id: string
  shortCode: string
  total: number
  createdAt: string
}

type TakeState = {
  view: View
  cart: CartItem[]
  currentOrderId: string | null
  lastOrder: PlacedOrder | null
  // When the app is opened via a QR scan, this is the table's qrCodeToken.
  // It scopes menu fetch + order placement to that restaurant/table. When
  // null (the /consumer-demo route), the demo's own Consumer* tables are used.
  activeToken: string | null

  setView: (v: View) => void
  setActiveToken: (t: string | null) => void
  addToCart: (item: Omit<CartItem, 'quantity'>, qty?: number) => void
  decrement: (id: string) => void
  removeFromCart: (id: string) => void
  clearCart: () => void
  setQuantity: (id: string, qty: number) => void

  // Called right after a successful payment: stores the order so the tracking
  // page can ALWAYS load it, even after a page refresh.
  setOrder: (order: PlacedOrder) => void
  clearOrder: () => void

  cartCount: () => number
  cartSubtotal: () => number
}

export const useTake = create<TakeState>()(
  persist(
    (set, get) => ({
      view: 'menu',
      cart: [],
      currentOrderId: null,
      lastOrder: null,
      activeToken: null,

      setView: (v) => set({ view: v }),
      setActiveToken: (t) => set({ activeToken: t }),

      addToCart: (item, qty = 1) =>
        set((s) => {
          const existing = s.cart.find((c) => c.id === item.id)
          if (existing) {
            return {
              cart: s.cart.map((c) =>
                c.id === item.id
                  ? { ...c, quantity: c.quantity + qty }
                  : c
              ),
            }
          }
          return { cart: [...s.cart, { ...item, quantity: qty }] }
        }),

      decrement: (id) =>
        set((s) => {
          const existing = s.cart.find((c) => c.id === id)
          if (!existing) return {}
          if (existing.quantity <= 1) {
            return { cart: s.cart.filter((c) => c.id !== id) }
          }
          return {
            cart: s.cart.map((c) =>
              c.id === id ? { ...c, quantity: c.quantity - 1 } : c
            ),
          }
        }),

      removeFromCart: (id) =>
        set((s) => ({ cart: s.cart.filter((c) => c.id !== id) })),

      clearCart: () => set({ cart: [] }),

      setQuantity: (id, qty) =>
        set((s) => ({
          cart:
            qty <= 0
              ? s.cart.filter((c) => c.id !== id)
              : s.cart.map((c) => (c.id === id ? { ...c, quantity: qty } : c)),
        })),

      setOrder: (order) =>
        set({ currentOrderId: order.id, lastOrder: order }),

      clearOrder: () => set({ currentOrderId: null }),

      cartCount: () => get().cart.reduce((n, c) => n + c.quantity, 0),
      cartSubtotal: () =>
        get().cart.reduce((s, c) => s + c.price * c.quantity, 0),
    }),
    {
      name: 'take-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        cart: s.cart,
        currentOrderId: s.currentOrderId,
        lastOrder: s.lastOrder,
        // NOTE: `view` intentionally NOT persisted — it always starts at 'menu'
        // on a fresh load to avoid hydration mismatch. After payment we switch
        // to 'tracking' in-session, and currentOrderId (persisted) lets the
        // user reopen tracking from the header.
      }),
    }
  )
)
