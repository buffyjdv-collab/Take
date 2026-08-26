'use client'

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useCustomerCart, lineKeyOf } from '@/stores/customer-cart'
import { Price } from '@/components/restaurant/price'
import { VegBadge } from '@/components/restaurant/veg-badge'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/restaurant/loading-states'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePlaceOrder } from '@/hooks/api'
import { toast } from 'sonner'
import type { RestaurantInfo } from './types'
import type { CartItem } from '@/lib/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurant: RestaurantInfo
  onCheckout: (orderId: string) => void
}

export function CartDrawer({ open, onOpenChange, restaurant, onCheckout }: Props) {
  const items = useCustomerCart((s) => s.items)
  const updateQuantity = useCustomerCart((s) => s.updateQuantity)
  const removeItem = useCustomerCart((s) => s.removeItem)
  const clear = useCustomerCart((s) => s.clear)
  const totals = useCustomerCart((s) => s.totals)

  const [confirmOpen, setConfirmOpen] = useState(false)
  // Collect customer name & phone instead of an "order notes" textarea.
  // The restaurant uses these to identify the customer and contact them if
  // there's an issue with their order.
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [touched, setTouched] = useState(false)
  const placeOrder = usePlaceOrder()

  const t = totals(restaurant.taxRate, restaurant.serviceChargeRate)

  // Basic client-side validation (the server re-validates with zod).
  const nameValid = customerName.trim().length >= 2
  // 7–15 digits, optional leading +, spaces/dashes ignored
  const digits = customerPhone.replace(/[^\d]/g, '')
  const phoneValid = digits.length >= 7 && digits.length <= 15
  const formValid = nameValid && phoneValid

  const handlePlace = async () => {
    setTouched(true)
    if (!formValid) {
      toast.error('Please enter your name and phone number to place the order.')
      return
    }
    try {
      // Generate idempotency key
      const idempotencyKey =
        sessionStorage.getItem('last-idem-key') ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`
      sessionStorage.setItem('last-idem-key', idempotencyKey)

      const body = {
        tableToken:
          new URLSearchParams(window.location.search).get('table') || '',
        items: items.map((i: CartItem) => ({
          menuItemId: i.menuItemId,
          variantId: i.variantId,
          modifierIds: i.modifierIds,
          quantity: i.quantity,
          notes: i.notes,
        })),
        idempotencyKey,
        // Required by the server now — name & phone are persisted on the order
        // so the restaurant can reach the customer about pre-payment or status.
        customerInfo: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
        },
      }
      const order = await placeOrder.mutateAsync(body)
      // Clear idempotency key + cart + customer fields
      sessionStorage.removeItem('last-idem-key')
      clear()
      setCustomerName('')
      setCustomerPhone('')
      setTouched(false)
      setConfirmOpen(false)
      onOpenChange(false)
      onCheckout(order.id)
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order')
    }
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[88vh]">
          <DrawerHeader className="border-b pb-3">
            <DrawerTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-orange-600" />
              Your cart
              {items.length > 0 && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                  {t.itemCount}
                </span>
              )}
            </DrawerTitle>
          </DrawerHeader>

          {items.length === 0 ? (
            <div className="px-4 py-10">
              <EmptyState
                icon={<ShoppingBag className="h-6 w-6" />}
                title="Your cart is empty"
                description="Add some dishes from the menu to get started."
              />
            </div>
          ) : (
            <>
              <div className="max-h-[44vh] space-y-2 overflow-y-auto px-3 py-3">
                {items.map((item) => {
                  const key = lineKeyOf(item)
                  return (
                    <div
                      key={key}
                      className="flex gap-3 rounded-xl border border-slate-100 p-2.5"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-orange-50">
                        {item.image ? (
                           
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl">
                            🍽️
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-1.5">
                          <VegBadge isVeg={item.isVeg} />
                          <p className="line-clamp-1 flex-1 text-sm font-semibold">
                            {item.name}
                          </p>
                          <button
                            onClick={() => removeItem(key)}
                            className="text-muted-foreground hover:text-red-600"
                            aria-label="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {item.variantName && (
                          <p className="text-xs text-muted-foreground">
                            Size: {item.variantName}
                          </p>
                        )}
                        {item.modifierNames.length > 0 && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {item.modifierNames.join(', ')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-xs italic text-muted-foreground">
                            “{item.notes}”
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center justify-between">
                          <Price amount={item.totalPrice} size="sm" />
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() =>
                                updateQuantity(key, item.quantity - 1)
                              }
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-5 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() =>
                                updateQuantity(key, item.quantity + 1)
                              }
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t bg-slate-50 px-4 py-3">
                <div className="space-y-1 text-sm">
                  <Row label="Subtotal" value={t.subtotal} />
                  {restaurant.taxRate > 0 && (
                    <Row
                      label={`Taxes & GST (${(restaurant.taxRate * 100).toFixed(1)}%)`}
                      value={t.taxAmount}
                    />
                  )}
                  {restaurant.serviceChargeRate > 0 && (
                    <Row
                      label={`Service charge (${(restaurant.serviceChargeRate * 100).toFixed(0)}%)`}
                      value={t.serviceCharge}
                    />
                  )}
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between text-base font-bold">
                    <span>Total</span>
                    <Price amount={t.grandTotal} size="lg" />
                  </div>
                </div>
              </div>
            </>
          )}

          {items.length > 0 && (
            <DrawerFooter className="border-t bg-white px-4 pt-3">
              <Button
                size="lg"
                className="bg-orange-600 text-white hover:bg-orange-700"
                onClick={() => setConfirmOpen(true)}
              >
                Place order · ₹{t.grandTotal.toFixed(0)}
              </Button>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your details</DialogTitle>
            <DialogDescription>
              You're about to place an order for {t.itemCount} item(s) totalling{' '}
              <strong>₹{t.grandTotal.toFixed(0)}</strong> on Table{' '}
              {new URLSearchParams(window.location.search).get('table')}.
              Please share your name & phone so the restaurant can confirm your
              order and contact you if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="customer-name">Your name *</Label>
              <Input
                id="customer-name"
                placeholder="e.g. Arjun Patel"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                maxLength={80}
                autoFocus
                aria-invalid={touched && !nameValid}
              />
              {touched && !nameValid && (
                <p className="text-xs text-red-600">
                  Please enter your name (min 2 characters).
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-phone">Phone number *</Label>
              <Input
                id="customer-phone"
                inputMode="tel"
                placeholder="e.g. +91 98765 43210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                maxLength={20}
                aria-invalid={touched && !phoneValid}
              />
              {touched && !phoneValid ? (
                <p className="text-xs text-red-600">
                  Please enter a valid phone number (7–15 digits).
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  We&apos;ll only use this to contact you about your order.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={placeOrder.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePlace}
              disabled={placeOrder.isPending || !formValid}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {placeOrder.isPending ? 'Placing…' : `Confirm · ₹${t.grandTotal.toFixed(0)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-medium text-slate-700">
        ₹{value.toFixed(0)}
      </span>
    </div>
  )
}
