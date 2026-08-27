'use client'

import { TakeApp } from '@/components/take/take-app'

// Take — consumer ordering demo (no QR table token).
// Uses the demo's own Consumer* tables (prisma/seed.ts).
// The QR-scan experience lives at /qr/[token] and /?table=<token>.
export default function ConsumerDemoPage() {
  return <TakeApp />
}
