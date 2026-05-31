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
    <div className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <h1 className="text-lg font-bold text-blue-600">EduManage</h1>
        <p className="text-xs text-gray-400 mt-0.5">School Admin</p>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
              pathname.startsWith(item.href)
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Sign Out */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-500 transition w-full"
        >
          <span>🚪</span>
          Sign Out
        </button>
      </div>
    </div>
  )
}