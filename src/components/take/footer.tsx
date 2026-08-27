'use client'

import { UtensilsCrossed, Instagram, Twitter, Facebook } from 'lucide-react'
import { useTake } from '@/store/take'

export function Footer() {
  const setView = useTake((s) => s.setView)
  return (
    <footer className="mt-auto border-t border-border bg-card/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl brand-gradient text-brand-foreground shadow-brand">
              <UtensilsCrossed size={20} strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-lg font-extrabold tracking-tight">Take</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                food, fast
              </p>
            </div>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Hot, fresh & on time. Order from the neighbourhood’s best kitchen
            with real-time tracking.
          </p>
          <div className="mt-4 flex gap-2">
            <Social label="Instagram"><Instagram size={16} /></Social>
            <Social label="Twitter"><Twitter size={16} /></Social>
            <Social label="Facebook"><Facebook size={16} /></Social>
          </div>
        </div>

        <FooterCol
          title="Eat"
          links={[
            { label: 'Menu', onClick: () => setView('menu') },
            { label: 'Popular', onClick: () => setView('menu') },
            { label: 'Cart', onClick: () => setView('cart') },
          ]}
        />
        <FooterCol
          title="Help"
          links={[
            { label: 'Track order', onClick: () => setView('tracking') },
            { label: 'Contact us' },
            { label: 'FAQs' },
          ]}
        />
        <FooterCol
          title="Company"
          links={[{ label: 'About' }, { label: 'Careers' }, { label: 'Privacy' }]}
        />
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Take. All rights reserved.</p>
          <p>Made with 🔥 for hungry people.</p>
        </div>
      </div>
    </footer>
  )
}

function Social({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span
      aria-label={label}
      className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-brand"
    >
      {children}
    </span>
  )
}

function FooterCol({
  title,
  links,
}: {
  title: string
  links: { label: string; onClick?: () => void }[]
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <button
              type="button"
              onClick={l.onClick}
              className="text-muted-foreground transition hover:text-brand"
            >
              {l.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
