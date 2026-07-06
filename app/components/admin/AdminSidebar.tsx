'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminSidebar() {
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const closeDrawer = () => setOpen(false)

  return (
    <>
      {/* Mobile top bar - visible only below md breakpoint */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
        style={{
          background: '#0f172a',
          borderBottom: '1px solid #334155',
        }}
      >
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="text-2xl leading-none px-2 py-1"
          style={{ color: '#e2e8f0' }}
        >
          ☰
        </button>
        <h1 className="text-sm font-bold" style={{ color: '#e2e8f0' }}>Frankie EduTech</h1>
        <div className="w-8" /> {/* spacer to keep title centered */}
      </div>

      {/* Overlay - only shown on mobile when drawer is open */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={closeDrawer}
        />
      )}

      {/* Sidebar drawer */}
      <div
        className={`w-64 md:w-56 min-h-screen flex flex-col fixed left-0 top-0 z-50 transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{
          background: '#1e293b',
          borderRight: '1px solid #334155',
        }}
      >
        {/* Logo */}
        <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid #334155' }}>
          <div>
            <h1 className="text-base font-bold" style={{ color: '#e2e8f0' }}>Frankie EduTech</h1>
            <p className="text-xs mt-0.5" style={{ color: '#38bdf8' }}>Super Admin</p>
          </div>
          {/* Close button - mobile only */}
          <button
            onClick={closeDrawer}
            aria-label="Close menu"
            className="md:hidden text-xl leading-none px-2"
            style={{ color: '#e2e8f0' }}
          >
            ✕
          </button>
        </div>

        {/* Nav — this page is single-view for now (Schools, Usage, Logins
            all live as sections on /admin), so there's just one active
            link. Add more entries here as Stage 3+ splits into subpages. */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
            style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontWeight: 500 }}
          >
            <span>🛠️</span>
            Overview
          </div>
        </nav>

        {/* Sign Out */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid #334155' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition w-full"
            style={{ color: '#94a3b8' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = '#0f172a'
              ;(e.currentTarget as HTMLElement).style.color = '#f87171'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = '#94a3b8'
            }}
          >
            <span>🚪</span>
            Sign Out
          </button>
        </div>
      </div>
    </>
  )
}