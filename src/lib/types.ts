// Type definitions shared between client and server

// NextAuth type augmentation
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      restaurantId?: string
      branchId?: string
      restaurantName?: string
      restaurantSlug?: string
    }
  }

  interface User {
    role?: string
    restaurantId?: string
    branchId?: string
    restaurantName?: string
    restaurantSlug?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    restaurantId?: string
    branchId?: string
    restaurantName?: string
    restaurantSlug?: string
  }
}

export type Role =
  | 'SUPER_ADMIN'
  | 'RESTAURANT_OWNER'
  | 'MANAGER'
  | 'KITCHEN_STAFF'
  | 'WAITER'
  | 'CASHIER'

export type OrderStatus =
  | 'NEW'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'CANCELLED'

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'

export type PaymentMethod = 'UPI' | 'CARD' | 'WALLET' | 'CASH' | 'COUNTER'

export type TableStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'ORDERING'
  | 'FOOD_PREPARING'
  | 'BILL_REQUESTED'
  | 'PAYMENT_PENDING'
  | 'COMPLETED'

export type ServiceRequestType =
  | 'CALL_WAITER'
  | 'REQUEST_BILL'
  | 'WATER'
  | 'CLEANUP'
  | 'CUSTOM'

export type ServiceRequestStatus = 'PENDING' | 'ACKNOWLEDGED' | 'COMPLETED'

// Cart item shape used by the customer storefront
export interface CartItem {
  menuItemId: string
  name: string
  image?: string | null
  basePrice: number
  variantId?: string
  variantName?: string
  variantPrice: number
  modifierIds: string[]
  modifierNames: string[]
  modifiersTotal: number
  quantity: number
  notes?: string
  isVeg: boolean
  unitPrice: number
  totalPrice: number
}

// API request shapes
export interface CreateOrderItemInput {
  menuItemId: string
  variantId?: string
  modifierIds?: string[]
  quantity: number
  notes?: string
}

export interface CreateOrderInput {
  tableToken: string
  items: CreateOrderItemInput[]
  customerInfo?: { name?: string; phone?: string; email?: string }
  idempotencyKey: string
  notes?: string
}

// API response wrapper
export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

// Real-time event payloads
export interface RealtimeEvent<T = unknown> {
  type: string
  restaurantId: string
  payload: T
}

export interface OrderEventPayload {
  orderId: string
  orderNumber: string
  tableId: string
  tableNumber: string
  status: string
  paymentStatus?: string
}

export interface ServiceEventPayload {
  requestId: string
  tableId: string
  tableNumber: string
  type: string
  notes?: string
}

export interface PaymentEventPayload {
  orderId: string
  paymentId: string
  amount: number
  method: string
  status: string
}
