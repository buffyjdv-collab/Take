import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { TakeApp } from '@/components/take/take-app'

// /qr/[token] — the clean QR-code URL customers scan.
// We resolve the table token server-side so an invalid/stale QR shows a
// friendly error (404) instead of crashing the client. The actual menu + 
// order placement happen client-side via /api/customer/* using this token.
export const dynamic = 'force-dynamic'

export default async function QrMenuPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Validate the token actually maps to an active table. This is a cheap
  // lookup and lets us 404 cleanly on bad/old QR codes.
  const table = await db.table.findUnique({
    where: { qrCodeToken: token },
    select: { id: true, active: true, restaurant: { select: { id: true, name: true, platformFeeBlocked: true } } },
  })

  if (!table) notFound()

  return <TakeApp token={token} />
}
