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
    <div
      className="w-56 min-h-screen flex flex-col fixed left-0 top-0"
      style={{
        background: 'linear-gradient(180deg, #312e81 0%, #4338ca 50%, #0f172a 100%)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Logo */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h1 className="text-base font-bold text-white">Frankies EduTech</h1>
        <p className="text-xs mt-0.5" style={{ color: '#c7d2fe' }}>School Admin</p>
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
                ? { background: 'rgba(255,255,255,0.15)', color: '#ffffff', fontWeight: 500 }
                : { color: '#c7d2fe' }
            }
            onMouseEnter={e => {
              if (!pathname.startsWith(item.href)) {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
                ;(e.currentTarget as HTMLElement).style.color = '#ffffff'
              }
            }}
            onMouseLeave={e => {
              if (!pathname.startsWith(item.href)) {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = '#c7d2fe'
              }
            }}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Sign Out */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition w-full"
          style={{ color: '#c7d2fe' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
            ;(e.currentTarget as HTMLElement).style.color = '#fca5a5'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = '#c7d2fe'
          }}
        >
          <span>🚪</span>
          Sign Out
        </button>
      </div>
    </div>
  )
}