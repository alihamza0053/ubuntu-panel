import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NAV, TOPBAR } from '../nav'
import Icon from './Icon'

/** Two-letter monogram for the avatar. */
function initials(name) {
  if (!name) return '··'
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean)
  const raw = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
  return raw.toUpperCase()
}

/**
 * Quick switcher over the nav items the user can reach. Purely shell chrome —
 * it navigates to routes that already exist, nothing more.
 */
function QuickSwitch({ items, open, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items
  }, [items, query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      // Focus after the panel has mounted so the caret lands in the field.
      const t = setTimeout(() => inputRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [open])

  if (!open) return null

  function go(item) {
    onClose()
    navigate(item.to)
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter' && results[cursor]) {
      e.preventDefault()
      go(results[cursor])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className="modal-scrim items-start pt-28"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Quick navigation"
    >
      <div
        className="modal-card max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-panel-border/70 px-4 py-3">
          <Icon name="search" size={16} className="text-ink-dim" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0) }}
            onKeyDown={onKeyDown}
            placeholder="Jump to a section…"
            className="w-full bg-transparent text-sm text-ink-primary placeholder-ink-faint focus:outline-none"
          />
          <span className="kbd">Esc</span>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.map((item, i) => (
            <li key={item.to}>
              <button
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(item)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  i === cursor ? 'bg-mint-500/12 text-mint-300' : 'text-ink-body hover:bg-panel-raised/70'
                }`}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-ink-faint">Nothing matches “{query}”.</li>
          )}
        </ul>
      </div>
    </div>
  )
}

export default function Layout() {
  const { user, logout, isAdmin, can } = useAuth()
  const items = NAV.filter((item) => can(item.perm))
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Ctrl/⌘+K opens the quick switcher.
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const topLinks = TOPBAR
    .map((to) => items.find((i) => i.to === to))
    .filter(Boolean)

  const quickIcons = ['/terminal', '/logs', '/settings']
    .map((to) => items.find((i) => i.to === to))
    .filter(Boolean)

  return (
    <div className="min-h-screen">
      {/* ── Fixed icon rail ─────────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[68px] flex-col items-center
                        border-r border-panel-border/70 bg-panel-rail/85 py-3 backdrop-blur-xl">
        {/* Brand mark */}
        <NavLink
          to={items[0]?.to || '/dashboard'}
          className="flex h-11 w-11 items-center justify-center rounded-tile bg-mint
                     text-base font-black text-onmint shadow-rail"
          title="ServerHub"
        >
          S
        </NavLink>

        <nav className="mt-4 flex flex-1 flex-col items-center gap-1.5 overflow-y-auto">
          {items.map((item) => (
            <div key={item.to} className="group relative">
              <NavLink
                to={item.to}
                className={({ isActive }) => `rail-btn ${isActive ? 'rail-btn-active' : ''}`}
                aria-label={item.label}
              >
                <Icon name={item.icon} size={20} />
              </NavLink>
              <span className="rail-tip top-1/2 -translate-y-1/2">{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="group relative mt-3">
          <button onClick={logout} className="rail-btn hover:text-red-400" aria-label="Sign out">
            <Icon name="log-out" size={20} />
          </button>
          <span className="rail-tip top-1/2 -translate-y-1/2">Sign out</span>
        </div>
      </aside>

      {/* ── Everything right of the rail ────────────────────────────────── */}
      <div className="pl-[68px]">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-panel-border/70
                           bg-panel-bg/80 backdrop-blur-xl">
          <div className="mx-auto flex h-full max-w-[1600px] items-center gap-4 px-6">
            {/* Search pill */}
            <button className="search-pill" onClick={() => setPaletteOpen(true)}>
              <Icon name="search" size={15} />
              <span className="hidden sm:inline">Search…</span>
              <span className="kbd ml-1">Ctrl K</span>
            </button>

            {/* Centred section links */}
            <nav className="mx-auto hidden items-center gap-1 lg:flex">
              {topLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `topbar-link ${isActive ? 'topbar-link-active' : ''}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Right cluster */}
            <div className="ml-auto flex items-center gap-1 lg:ml-0">
              {quickIcons.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  className={({ isActive }) => `btn-icon ${isActive ? 'text-mint-300' : ''}`}
                >
                  <Icon name={item.icon} size={17} />
                </NavLink>
              ))}

              <span className="mx-2 h-6 w-px bg-panel-border/70" />

              <div className="flex items-center gap-2.5">
                <span className="hidden text-right leading-tight sm:block">
                  <span className="block text-sm text-ink-secondary">{user?.username}</span>
                  <span className="block text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                    {isAdmin ? 'admin' : 'user'}
                  </span>
                </span>
                <span className="avatar">{initials(user?.username)}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-[1600px] px-6 py-7">
          <Outlet />
        </main>
      </div>

      <QuickSwitch items={items} open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
