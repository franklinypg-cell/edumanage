'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/sidebar'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0, male: 0, female: 0,
    preschool: { male: 0, female: 0, total: 0 },
    kindergarten: { male: 0, female: 0, total: 0 },
    primary: { male: 0, female: 0, total: 0 },
    jhs: { male: 0, female: 0, total: 0 },
  })

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else fetchStats()
    }
    checkSession()
  }, [])

  const fetchStats = async () => {
    const { data: students } = await supabase
      .from('students')
      .select('gender, class')
      .eq('status', 'active')

    if (students) {
      const preschool = { male: 0, female: 0, total: 0 }
      const kindergarten = { male: 0, female: 0, total: 0 }
      const primary = { male: 0, female: 0, total: 0 }
      const jhs = { male: 0, female: 0, total: 0 }

      students.forEach((s: any) => {
        const cls = s.class || ''
        const gender = s.gender
        let bucket = null
        if (cls === 'Creche') bucket = preschool
        else if (cls.startsWith('KG')) bucket = kindergarten
        else if (cls.startsWith('Basic')) bucket = primary
        else if (cls.startsWith('JHS')) bucket = jhs

        if (bucket) {
          bucket.total++
          if (gender === 'male') bucket.male++
          else if (gender === 'female') bucket.female++
        }
      })

      setStats({
        total: students.length,
        male: students.filter((s: any) => s.gender === 'male').length,
        female: students.filter((s: any) => s.gender === 'female').length,
        preschool, kindergarten, primary, jhs,
      })
    }
    setLoading(false)
  }

  if (loading) return (
    <div className="flex min-h-screen" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="ml-56 flex-1 flex items-center justify-center">
        <p style={{ color: '#475569' }}>Loading...</p>
      </div>
    </div>
  )

  const statCards = [
    { label: 'Total Students', value: stats.total, color: '#38bdf8' },
    { label: 'Male', value: stats.male, color: '#818cf8' },
    { label: 'Female', value: stats.female, color: '#f472b6' },
  ]

  const levels = [
    { name: 'Creche / Preschool', data: stats.preschool },
    { name: 'Kindergarten', data: stats.kindergarten },
    { name: 'Primary', data: stats.primary },
    { name: 'JHS', data: stats.jhs },
  ]

  return (
    <div className="flex min-h-screen" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="ml-56 flex-1 p-8">
        <h2 className="text-lg font-medium mb-6" style={{ color: '#e2e8f0' }}>School Overview</h2>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {statCards.map((card, i) => (
            <div key={i} className="rounded-xl p-6" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <p className="text-sm mb-2" style={{ color: '#64748b' }}>{card.label}</p>
              <p className="text-4xl font-semibold" style={{ color: card.color }}>{card.value}</p>
            </div>
          ))}
        </div>

        <h2 className="text-base font-medium mb-4" style={{ color: '#e2e8f0' }}>Enrolment by Level</h2>
        <div className="rounded-xl overflow-hidden" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Level</th>
                <th className="text-center px-6 py-3 font-medium" style={{ color: '#475569' }}>Male</th>
                <th className="text-center px-6 py-3 font-medium" style={{ color: '#475569' }}>Female</th>
                <th className="text-center px-6 py-3 font-medium" style={{ color: '#475569' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((level, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0f172a'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <td className="px-6 py-4 font-medium" style={{ color: '#cbd5e1' }}>{level.name}</td>
                  <td className="px-6 py-4 text-center" style={{ color: '#818cf8' }}>{level.data.male}</td>
                  <td className="px-6 py-4 text-center" style={{ color: '#f472b6' }}>{level.data.female}</td>
                  <td className="px-6 py-4 text-center font-semibold" style={{ color: '#38bdf8' }}>{level.data.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}