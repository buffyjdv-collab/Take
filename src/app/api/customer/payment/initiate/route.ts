import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { fail, ok } from '@/lib/api-helpers'
import { initiatePaymentSchema } from '@/lib/validations'
import { buildUpiDeepLink, buildUpiQrPayload } from '@/lib/upi'

export const dynamic = 'force-dynamic'

// POST /api/customer/payment/initiate
// Body: { orderId, method: 'UPI' | 'CARD' | 'WALLET' }
// For UPI method, also returns:
//   - upiDeepLink: upi://pay?... URL that opens the customer's UPI app
//   - upiQrPayload: the string to encode in a QR code (same as deep link)
//   - upiId: the restaurant's UPI ID (VPA)
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('Invalid JSON body.', 400)
  }
  const parsed = initiatePaymentSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || 'Invalid input.', 422)
  }
  const input = parsed.data

  const order = await db.order.findUnique({
    where: { id: input.orderId },
    include: { restaurant: true },
  })
  if (!order) return fail('Order not found.', 404)

  // Method allowed by restaurant?
  const r = order.restaurant
  if (input.method === 'UPI' && !r.acceptUpi)
    return fail('UPI payments are not accepted.', 403)
  if (input.method === 'CARD' && !r.acceptCard)
    return fail('Card payments are not accepted.', 403)
  // WALLET treated like UPI for acceptance

  // For UPI method, require the restaurant to have a UPI ID configured
  let upiDeepLink: string | undefined
  let upiQrPayload: string | undefined
  if (input.method === 'UPI') {
    if (!r.upiId) {
      return fail(
        'This restaurant has not configured a UPI ID yet. Please choose another payment method or pay in cash.',
        400,
      )
    }
    upiDeepLink = buildUpiDeepLink(
      r.upiId,
      order.grandTotal,
      order.orderNumber,
      r.name,
    )
    upiQrPayload = buildUpiQrPayload(
      r.upiId,
      order.grandTotal,
      order.orderNumber,
      r.name,
    )
  }

  // Create payment record with status PROCESSING
  const providerTxnId = `MOCK-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`
  const payment = await db.payment.create({
    data: {
      orderId: order.id,
      restaurantId: order.restaurantId,
      method: input.method,
      status: 'PROCESSING',
      amount: order.grandTotal,
      currency: r.currency,
      provider: input.method === 'UPI' ? 'UPI' : 'MOCK',
      providerTxnId,
      idempotencyKey: `pay-${order.id}-${Date.now()}`,
    },
  })

  // Update order payment status to PROCESSING + method
  await db.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'PROCESSING',
      paymentMethod: input.method,
    },
  })

  return ok({
    paymentId: payment.id,
    providerTxnId,
    amount: order.grandTotal,
    currency: r.currency,
    method: input.method,
    // For UPI: include deep link + QR payload + the VPA
    upiDeepLink,
    upiQrPayload,
    upiId: r.upiId || undefined,
    restaurantName: r.name,
    orderNumber: order.orderNumber,
    // Mock: tell client to "verify" in 2 seconds (simulates the customer
    // completing the payment in their UPI app)
    verifyInMs: 1500,
  })
}
