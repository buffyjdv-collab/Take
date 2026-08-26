'use client'

import { ShoppingBag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCustomerCart } from '@/stores/customer-cart'
import { useCustomerMenu } from '@/hooks/api'

export function FloatingCartButton({ onClick }: { onClick: () => void }) {
  const items = useCustomerCart((s) => s.items)
  const totals = useCustomerCart((s) => s.totals)
  const table = new URLSearchParams(window.location.search).get('table')
  const { data } = useCustomerMenu(table)
  const r = data?.restaurant
  const t = r ? totals(r.taxRate, r.serviceChargeRate) : null

  if (items.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4"
      >
        <button
          onClick={onClick}
          className="flex w-full max-w-md items-center justify-between gap-3 rounded-2xl bg-emerald-600 px-5 py-3 text-white shadow-xl shadow-emerald-600/30 transition-all hover:bg-emerald-700 hover:shadow-emerald-600/40 active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <ShoppingBag className="h-5 w-5" />
              <motion.span
                key={t?.itemCount || 0}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-emerald-700"
              >
                {t?.itemCount || 0}
              </motion.span>
            </div>
            <span className="font-semibold tracking-tight">View cart</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">₹{(t?.grandTotal || 0).toFixed(0)}</span>
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
