'use client'

import { useState } from 'react'
import { useCustomerOrder, useCancelOrder, useInitiatePayment, useVerifyPayment } from '@/hooks/api'
import { useSocketEvent } from '@/hooks/use-socket'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrderStatusBadge } from '@/components/restaurant/order-status-badge'
import { PaymentStatusBadge } from '@/components/restaurant/payment-status-badge'
import { LoadingSpinner, EmptyState } from '@/components/restaurant/loading-states'
import { Price, formatINR } from '@/components/restaurant/price'
import { BellRing, CheckCircle2, Clock, ChefHat, PackageCheck, Utensils, XCircle, CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'
import type { RestaurantInfo } from './types'

const STEPS: { key: OrderStatus; label: string; icon: any }[] = [
  { key: 'NEW', label: 'Placed', icon: CheckCircle2 },
  { key: 'ACCEPTED', label: 'Accepted', icon: BellRing },
  { key: 'PREPARING', label: 'Preparing', icon: ChefHat },
  { key: 'READY', label: 'Ready', icon: PackageCheck },
  { key: 'SERVED', label: 'Served', icon: Utensils },
]

function stepIndex(status: string): number {
  const order: string[] = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED']
  const i = order.indexOf(status)
  if (i < 0) return -1
  return Math.min(i, STEPS.length - 1)
}

export function OrderTracking({
  orderId,
  restaurant,
  onBackToMenu,
  onProceedToBill,
}: {
  orderId: string
  restaurant?: RestaurantInfo
  onBackToMenu: () => void
  onProceedToBill: () => void
}) {
  const qc = useQueryClient()
  const { data: order, isLoading } = useCustomerOrder(orderId)
  const cancel = useCancelOrder()
  const initiate = useInitiatePayment()
  const verify = useVerifyPayment()
  const [paying, setPaying] = useState(false)

  // Real-time updates
  useSocketEvent('order:updated', (payload: any) => {
    if (payload?.orderId === orderId) {
      qc.invalidateQueries({ queryKey: ['customer-order', orderId] })
    }
  })
  useSocketEvent('order:statusChanged', (payload: any) => {
    if (payload?.orderId === orderId) {
      qc.invalidateQueries({ queryKey: ['customer-order', orderId] })
      toast.success(`Order status: ${payload.status}`)
    }
  })
  useSocketEvent('payment:confirmed', (payload: any) => {
    if (payload?.orderId === orderId) {
      qc.invalidateQueries({ queryKey: ['customer-order', orderId] })
      toast.success('Payment confirmed!')
    }
  })
  useSocketEvent('payment:requested', (payload: any) => {
    if (payload?.orderId === orderId) {
      qc.invalidateQueries({ queryKey: ['customer-order', orderId] })
      const when = payload.when === 'PRE' ? 'before we accept your order' : 'now that your order is received'
      toast.info(`Payment requested: please pay ${when}.`, {
        description: `Amount: ₹${(payload.amount || 0).toFixed(0)}`,
      })
    }
  })

  if (isLoading || !order) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const curStep = stepIndex(order.status)
  const canCancel = order.status === 'NEW' || order.status === 'PENDING_PAYMENT'
  const canRequestBill = ['SERVED', 'READY'].includes(order.status) && order.paymentStatus !== 'PAID'
  const isPaid = order.paymentStatus === 'PAID'
  const isCompleted = order.status === 'COMPLETED'
  const isPendingPayment = order.status === 'PENDING_PAYMENT'

  // If the restaurant has asked the customer to pay (pre or post), show a
  // prominent payment panel so the customer can settle the bill immediately.
  // PENDING_PAYMENT status itself implies the customer needs to pay upfront.
  const needsToPay =
    !isPaid &&
    (isPendingPayment || order.prePaymentRequested || order.postPaymentRequested)
  const acceptUpi = restaurant?.acceptUpi ?? true
  const acceptCard = restaurant?.acceptCard ?? true
  const acceptCounter = restaurant?.acceptCounter ?? true

  const handlePay = async (method: 'UPI' | 'CARD' | 'WALLET') => {
    setPaying(true)
    try {
      const init = await initiate.mutateAsync({ orderId, method })
      toast.info('Connecting to payment gateway…')
      await new Promise((r) => setTimeout(r, init.verifyInMs || 1500))
      await verify.mutateAsync({
        paymentId: init.paymentId,
        providerTxnId: init.providerTxnId,
      })
      toast.success('Payment successful!')
    } catch (err: any) {
      toast.error(err.message || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Order</p>
          <h1 className="text-xl font-bold">{order.orderNumber}</h1>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {/* Status timeline */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-orange-600" />
            Order progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {STEPS.map((s, idx) => {
              const Icon = s.icon
              const done = idx <= curStep
              const active = idx === curStep
              return (
                <div key={s.key} className="flex flex-1 flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    <div
                      className={cn(
                        'h-1 flex-1 rounded-full',
                        idx === 0 ? 'bg-transparent' : done ? 'bg-orange-500' : 'bg-slate-200',
                      )}
                    />
                    <motion.div
                      initial={false}
                      animate={{
                        scale: active ? 1.1 : 1,
                        backgroundColor: done ? '#EA580C' : '#E2E8F0',
                      }}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full text-white',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </motion.div>
                    <div
                      className={cn(
                        'h-1 flex-1 rounded-full',
                        idx === STEPS.length - 1 ? 'bg-transparent' : idx < curStep ? 'bg-orange-500' : 'bg-slate-200',
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      'mt-1 text-[11px] font-medium',
                      done ? 'text-orange-700' : 'text-muted-foreground',
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Prep estimate */}
          {order.status === 'NEW' && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Waiting for kitchen to accept your order…
            </p>
          )}
          {order.status === 'ACCEPTED' && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Your order will start preparing shortly.
            </p>
          )}
          {order.status === 'PREPARING' && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              <ChefHat className="mr-1 inline h-3 w-3" />
              Our chefs are cooking it up — typically 15-20 minutes.
            </p>
          )}
          {order.status === 'READY' && (
            <p className="mt-3 text-center text-xs font-semibold text-green-600">
              Your order is ready! A waiter will serve it shortly.
            </p>
          )}
          {order.status === 'SERVED' && (
            <p className="mt-3 text-center text-xs font-semibold text-purple-600">
              Enjoy your meal! Tap “Proceed to bill” when you're ready.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Items list */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm">Your items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.items?.map((it: any) => (
            <div key={it.id} className="flex gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                {it.quantity}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{it.menuItemName}</p>
                {it.variantName && (
                  <p className="text-xs text-muted-foreground">Size: {it.variantName}</p>
                )}
                {it.modifiers?.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {it.modifiers.map((m: any) => m.modifierName).join(', ')}
                  </p>
                )}
                {it.notes && (
                  <p className="text-xs italic text-muted-foreground">“{it.notes}”</p>
                )}
              </div>
              <Price amount={it.totalPrice} size="sm" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card className="mb-4">
        <CardContent className="space-y-1 py-4 text-sm">
          <Row label="Subtotal" value={order.subtotal} />
          {order.taxAmount > 0 && <Row label="Taxes & GST" value={order.taxAmount} />}
          {order.serviceCharge > 0 && <Row label="Service charge" value={order.serviceCharge} />}
          <div className="flex items-center justify-between border-t pt-2 text-base font-bold">
            <span>Total</span>
            <Price amount={order.grandTotal} size="lg" />
          </div>
        </CardContent>
      </Card>

      {/* Payment-requested panel — shown when the restaurant asks the customer
          to pay before accepting (PRE) or after receiving (POST) the order.
          Also shown when the order is in PENDING_PAYMENT status (auto pre-payment). */}
      {needsToPay && (
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-amber-900">
                <CreditCard className="h-4 w-4" />
                {isPendingPayment || order.prePaymentRequested
                  ? 'Please pay before we accept your order'
                  : 'Please pay to complete your order'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-amber-800">
                {isPendingPayment || order.prePaymentRequested
                  ? 'This restaurant requires upfront payment. Your order will be sent to the kitchen automatically once payment is confirmed.'
                  : 'Your order has been received. Please settle the bill before leaving the table.'}
              </p>
              <div className="flex items-center justify-between rounded-lg bg-white p-3 text-sm shadow-sm">
                <span className="font-medium text-slate-700">Amount due</span>
                <span className="text-lg font-bold text-amber-900">
                  {formatINR(order.grandTotal)}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {acceptUpi && (
                  <Button
                    variant="outline"
                    className="bg-white"
                    disabled={paying}
                    onClick={() => handlePay('UPI')}
                  >
                    Pay with UPI
                  </Button>
                )}
                {acceptCard && (
                  <Button
                    variant="outline"
                    className="bg-white"
                    disabled={paying}
                    onClick={() => handlePay('CARD')}
                  >
                    Pay with Card
                  </Button>
                )}
                {acceptCounter && (
                  <Button
                    variant="outline"
                    className="bg-white"
                    disabled={paying}
                    onClick={() => handlePay('WALLET')}
                  >
                    Pay at counter
                  </Button>
                )}
              </div>
              {paying && (
                <div className="flex items-center justify-center gap-2 text-sm text-amber-800">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing payment…
                </div>
              )}
              <p className="text-center text-xs text-amber-700">
                Prefer to pay in cash? Hand the cash to your waiter and they will
                mark your order as paid.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {canCancel && (
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
            disabled={cancel.isPending}
            onClick={async () => {
              try {
                await cancel.mutateAsync(orderId)
                toast.success('Order cancelled')
              } catch (err: any) {
                toast.error(err.message || 'Could not cancel')
              }
            }}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel order
          </Button>
        )}
        {canRequestBill && (
          <Button
            size="lg"
            className="bg-orange-600 text-white hover:bg-orange-700"
            onClick={onProceedToBill}
          >
            Proceed to bill
          </Button>
        )}
        {isPaid && !isCompleted && (
          <div className="rounded-lg bg-green-50 p-3 text-center text-sm text-green-700">
            <CheckCircle2 className="mx-auto mb-1 h-5 w-5" />
            Payment received — thank you!
          </div>
        )}
        {isCompleted && (
          <div className="rounded-lg bg-slate-50 p-3 text-center text-sm text-slate-700">
            <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-green-600" />
            Order completed. Thank you for dining with us!
          </div>
        )}
        <Button variant="ghost" onClick={onBackToMenu}>
          Back to menu
        </Button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-medium text-slate-700">{formatINR(value)}</span>
    </div>
  )
}
