import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const q = searchParams.get('q')

    const items = await db.consumerMenuItem.findMany({
      where: {
        available: true,
        ...(category && category !== 'All' ? { category } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { tags: { has: q } },
              ],
            }
          : {}),
      },
      orderBy: [{ popular: 'desc' }, { rating: 'desc' }, { name: 'asc' }],
    })

    const categories = await db.consumerMenuItem.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    })

    return NextResponse.json({
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        price: i.price,
        category: i.category,
        image: i.image,
        tags: i.tags,
        rating: i.rating,
        prepTime: i.prepTime,
        popular: i.popular,
      })),
      categories: ['All', ...categories.map((c) => c.category)],
    })
  } catch (err) {
    console.error('[api/menu] error', err)
    return NextResponse.json(
      { error: 'Failed to load menu' },
      { status: 500 }
    )
  }
}
