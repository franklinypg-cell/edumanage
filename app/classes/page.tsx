'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/sidebar'
import Link from 'next/link'

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', level: 'Primary', class_teacher: '' })

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else fetchClasses()
    }
    checkSession()
  }, [])

  const fetchClasses = async () => {
    const { data: classData } = await supabase
      .from('classes')
      .select('*, teachers(full_name)')
      .order('name')

    if (classData) {
      const withCounts = await Promise.all(
        classData.map(async (cls) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class', cls.name)
            .eq('status', 'active')
          return { ...cls, student_count: count || 0 }
        })
      )
      setClasses(withCounts)
    }
    setLoading(false)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('classes').insert({
      name: form.name,
      level: form.level,
    })
    if (error) {
      alert('Error adding class. Please try again.')
    } else {
      setShowForm(false)
      setForm({ name: '', level: 'Primary', class_teacher: '' })
      fetchClasses()
    }
    setSaving(false)
  }

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const inputStyle = { background: '#0f172a', border: '1.5px solid #334155', color: '#e2e8f0' }

  if (loading) return (
    <div className="flex min-h-screen" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="ml-56 flex-1 flex items-center justify-center">
        <p style={{ color: '#475569' }}>Loading...</p>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="ml-56 flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium" style={{ color: '#e2e8f0' }}>Classes</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{ background: '#38bdf8', color: '#0f172a' }}
          >
            + Add Class
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="rounded-xl p-6 mb-6 max-w-lg" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: '#e2e8f0' }}>Add New Class</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Class Name <span style={{ color: '#f87171' }}>*</span></label>
                <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle}
                  placeholder="e.g. Basic 1C" required />
              </div>
              <div>
                <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Level</label>
                <select value={form.level} onChange={e => update('level', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle}>
                  <option value="Preschool">Preschool</option>
                  <option value="Kindergarten">Kindergarten</option>
                  <option value="Primary">Primary</option>
                  <option value="JHS">JHS</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  style={{ background: '#38bdf8', color: '#0f172a' }}>
                  {saving ? 'Saving...' : 'Save Class'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-6 py-2 rounded-lg text-sm font-medium transition"
                  style={{ border: '1px solid #334155', color: '#94a3b8' }}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="grid grid-cols-3 gap-4">
          {classes.map(cls => (
            <Link href={`/classes/${cls.id}`} key={cls.id}>
              <div className="rounded-xl p-6 transition cursor-pointer"
                style={{ background: '#1e293b', border: '1px solid #334155' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#38bdf8'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#334155'}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg" style={{ color: '#e2e8f0' }}>{cls.name}</h3>
                    <p className="text-xs" style={{ color: '#475569' }}>{cls.level}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full"
                    style={{ background: '#0f172a', color: '#38bdf8' }}>
                    {cls.student_count} students
                  </span>
                </div>
                <div className="text-sm">
                  {(cls.teachers as any)?.full_name ? (
                    <span style={{ color: '#64748b' }}>👤 {(cls.teachers as any).full_name}</span>
                  ) : (
                    <span style={{ color: '#334155' }}>No teacher assigned</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}