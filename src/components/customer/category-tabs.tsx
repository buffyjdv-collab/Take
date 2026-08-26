'use client'

import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CategoryTabsProps {
  categories: Array<{ id: string; name: string; icon?: string | null }>
  activeId: string
  onChange: (id: string) => void
}

export function CategoryTabs({ categories, activeId, onChange }: CategoryTabsProps) {
  // If no active id, default to first
  const effectiveActive = activeId || categories[0]?.id || ''
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Detect horizontal overflow so we can show/hide the arrow buttons.
  const updateScrollState = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateScrollState()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateScrollState, { passive: true })
    // Re-check on resize
    window.addEventListener('resize', updateScrollState)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [categories.length])

  // When activeId changes (via swipe on the menu body or via the dropdown),
  // scroll the corresponding tab into view so it stays visible.
  useEffect(() => {
    if (!effectiveActive || !scrollRef.current) return
    const idx = categories.findIndex((c) => c.id === effectiveActive)
    if (idx < 0) return
    const tabEl = scrollRef.current.children[idx] as HTMLElement | undefined
    if (tabEl) {
      tabEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
    }
    // Re-check arrows after the smooth scroll settles
    setTimeout(updateScrollState, 250)
  }, [effectiveActive, categories.length])

  const selectCategory = (id: string) => {
    onChange(id)
    const el = document.getElementById(`cat-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Programmatic scroll for the arrow buttons (Swiggy-style left/right chevrons).
  const scrollByTabs = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const delta = el.clientWidth * 0.7
    el.scrollBy({
      left: dir === 'left' ? -delta : delta,
      behavior: 'smooth',
    })
  }

  return (
    <div className="sticky top-[68px] z-20 -mb-2 border-b border-orange-100 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-3xl px-2">
        <div className="relative">
          {/* Left chevron (appears only when scrollable) */}
          {canScrollLeft && (
            <button
              onClick={() => scrollByTabs('left')}
              className="absolute left-0 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-500 shadow-md ring-1 ring-slate-200 hover:text-slate-900"
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {/* Tabs row — horizontally scrollable + swipeable */}
          <div
            ref={scrollRef}
            className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {categories.map((c) => {
              const active = c.id === effectiveActive
              return (
                <button
                  key={c.id}
                  onClick={() => selectCategory(c.id)}
                  style={{ scrollSnapAlign: 'center' }}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all',
                    active
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                      : 'bg-orange-50 text-orange-700 hover:bg-orange-100',
                  )}
                >
                  {c.icon && <span className="text-base">{c.icon}</span>}
                  <span>{c.name}</span>
                </button>
              )
            })}
          </div>

          {/* Right chevron */}
          {canScrollRight && (
            <button
              onClick={() => scrollByTabs('right')}
              className="absolute right-0 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-500 shadow-md ring-1 ring-slate-200 hover:text-slate-900"
              aria-label="Scroll categories right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
