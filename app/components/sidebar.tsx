'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Students', href: '/students', icon: '👨‍🎓' },
  { label: 'Classes', href: '/classes', icon: '🏫' },
  { label: 'Teachers', href: '/teachers', icon: '👩‍🏫' },
  { label: 'Promotion', href: '/promotion', icon: '🎓' },
  { label: 'Fees', href: '/fees', icon: '💰' },
  { label: 'Report Cards', href: '/report-cards', icon: '📄' },
]

export default function Sidebar() {
  const pathname = usePathname()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="w-56 min-h-screen flex flex-col fixed left-0 top-0" style={{ background: '#0f172a', borderRight: '1px solid #1e293b' }}>
      {/* Logo */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid #1e293b' }}>
        <h1 className="text-base font-bold" style={{ color: '#38bdf8' }}>Frankies EduTech</h1>
        <p className="text-xs mt-0.5" style={{ color: '#475569' }}>School Admin</p>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition"
            style={
              pathname.startsWith(item.href)
                ? { background: '#1e293b', color: '#38bdf8', fontWeight: 500 }
                : { color: '#94a3b8' }
            }
            onMouseEnter={e => {
              if (!pathname.startsWith(item.href)) {
                (e.currentTarget as HTMLElement).style.background = '#1e293b'
                ;(e.currentTarget as HTMLElement).style.color = '#cbd5e1'
              }
            }}
            onMouseLeave={e => {
              if (!pathname.startsWith(item.href)) {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = '#94a3b8'
              }
            }}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Sign Out */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid #1e293b' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition w-full"
          style={{ color: '#64748b' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = '#1e293b'
            ;(e.currentTarget as HTMLElement).style.color = '#f87171'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = '#64748b'
          }}
        >
          <span>🚪</span>
          Sign Out
        </button>
      </div>
    </div>
  )
}