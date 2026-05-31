'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import Sidebar from '../../components/sidebar'

export default function NewStudentPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    class: '',
    guardian_name: '',
    guardian_phone: '',
  })

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else fetchClasses()
    }
    checkSession()
  }, [])

  const fetchClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('id, name, level')
      .order('name')
    if (data) setClasses(data)
  }

  const generateLearnerCode = async () => {
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
    const number = String((count || 0) + 1).padStart(3, '0')
    return `SCH-${year}-${number}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const learner_code = await generateLearnerCode()
    const { error } = await supabase.from('students').insert({
      full_name: form.full_name,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      class: form.class,
      guardian_name: form.guardian_name,
      guardian_phone: form.guardian_phone,
      learner_code,
      status: 'active',
    })
    if (error) {
      alert('Error enrolling student. Please try again.')
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const groupedClasses = classes.reduce((acc: any, cls) => {
    const level = cls.level || 'Other'
    if (!acc[level]) acc[level] = []
    acc[level].push(cls)
    return acc
  }, {})

  if (success) return (
    <div className="flex min-h-screen" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="ml-56 flex-1 flex items-center justify-center">
        <div className="rounded-xl p-8 text-center max-w-md w-full" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <div className="text-4xl mb-4" style={{ color: '#4ade80' }}>✓</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>Student Enrolled</h2>
          <p className="text-sm mb-6" style={{ color: '#64748b' }}>The student has been successfully added to the system.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setSuccess(false); setForm({ full_name: '', date_of_birth: '', gender: '', class: '', guardian_name: '', guardian_phone: '' }) }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{ background: '#38bdf8', color: '#0f172a' }}
            >
              Add Another
            </button>
            <Link href="/students"
              className="px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{ border: '1px solid #334155', color: '#94a3b8' }}
            >
              View All Students
            </Link>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="ml-56 flex-1 p-8">
        <h2 className="text-lg font-medium mb-6" style={{ color: '#e2e8f0' }}>Enrol New Student</h2>
        <form onSubmit={handleSubmit} className="rounded-xl p-6 space-y-5 max-w-2xl" style={{ background: '#1e293b', border: '1px solid #334155' }}>

          <div>
            <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Full Name <span style={{ color: '#f87171' }}>*</span></label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => update('full_name', e.target.value)}
              className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
              style={{ background: '#0f172a', border: '1.5px solid #334155', color: '#e2e8f0' }}
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Date of Birth <span style={{ color: '#f87171' }}>*</span></label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={e => update('date_of_birth', e.target.value)}
                className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                style={{ background: '#0f172a', border: '1.5px solid #334155', color: '#e2e8f0' }}
                required
              />
            </div>
            <div>
              <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Gender <span style={{ color: '#f87171' }}>*</span></label>
              <select
                value={form.gender}
                onChange={e => update('gender', e.target.value)}
                className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                style={{ background: '#0f172a', border: '1.5px solid #334155', color: '#e2e8f0' }}
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Class <span style={{ color: '#f87171' }}>*</span></label>
            <select
              value={form.class}
              onChange={e => update('class', e.target.value)}
              className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
              style={{ background: '#0f172a', border: '1.5px solid #334155', color: '#e2e8f0' }}
              required
            >
              <option value="">Select class</option>
              {Object.entries(groupedClasses).map(([level, cls]: any) => (
                <optgroup key={level} label={level}>
                  {cls.map((c: any) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Guardian Name <span style={{ color: '#f87171' }}>*</span></label>
            <input
              type="text"
              value={form.guardian_name}
              onChange={e => update('guardian_name', e.target.value)}
              className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
              style={{ background: '#0f172a', border: '1.5px solid #334155', color: '#e2e8f0' }}
              placeholder="Enter guardian name"
              required
            />
          </div>

          <div>
            <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Guardian Phone <span style={{ color: '#f87171' }}>*</span></label>
            <input
              type="tel"
              value={form.guardian_phone}
              onChange={e => update('guardian_phone', e.target.value)}
              className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
              style={{ background: '#0f172a', border: '1.5px solid #334155', color: '#e2e8f0' }}
              placeholder="e.g. 0244000000"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
              style={{ background: '#38bdf8', color: '#0f172a' }}
            >
              {loading ? 'Enrolling...' : 'Enrol Student'}
            </button>
            <Link href="/students"
              className="px-6 py-2 rounded-lg text-sm font-medium transition"
              style={{ border: '1px solid #334155', color: '#94a3b8' }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}