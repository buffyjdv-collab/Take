'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { MenuSection } from './menu-item-card'
import type { MenuItemWithRelations } from './types'

interface MenuListProps {
  categories: Array<{ id: string; name: string; icon?: string | null; description?: string | null }>
  items: MenuItemWithRelations[]
  onSelectItem: (id: string) => void
  activeCategoryId: string
  onActiveCategoryChange: (id: string) => void
}

export function MenuList({
  categories,
  items,
  onSelectItem,
  activeCategoryId,
  onActiveCategoryChange,
}: MenuListProps) {
  // IntersectionObserver: when a category section crosses the 30% threshold,
  // fire onActiveCategoryChange so the CategoryTabs highlights the right tab.
  // This gives the customer true "swipe to next category" behaviour — as they
  // scroll/swipe the menu, the active tab follows.
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry with the largest intersection ratio that's currently intersecting
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length === 0) return
        const top = visible[0]
        const id = (top.target as HTMLElement).dataset.categoryId
        if (id && id !== activeCategoryId) {
          onActiveCategoryChange(id)
        }
      },
      {
        // Trigger when a section is at least 25% visible, with a small
        // negative rootMargin so the sticky header doesn't trigger a false
        // positive on the section just below it.
        rootMargin: '-80px 0px -60% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    )
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [categories, activeCategoryId, onActiveCategoryChange])

  return (
    <main className="mx-auto max-w-3xl px-4 pb-32 pt-4">
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category?.id === cat.id)
        if (catItems.length === 0) return null
        return (
          <section
            key={cat.id}
            id={`cat-${cat.id}`}
            data-category-id={cat.id}
            ref={(el) => {
              sectionRefs.current[cat.id] = el
            }}
            className="mb-8 scroll-mt-32"
          >
            <div className="mb-3 flex items-center gap-2">
              {cat.icon && <span className="text-2xl">{cat.icon}</span>}
              <h2 className="text-lg font-bold text-slate-900">{cat.name}</h2>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                {catItems.length}
              </span>
            </div>
            {cat.description && (
              <p className="mb-3 text-sm text-muted-foreground">{cat.description}</p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {catItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                >
                  <MenuSection item={item} onSelect={() => onSelectItem(item.id)} />
                </motion.div>
              ))}
            </div>
          </section>
        )
      })}
    </main>
  )
}
