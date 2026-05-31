'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import Sidebar from '../../components/sidebar'

type Stream = {
  id: string
  label: string
  class_id: string
  classes: { name: string; level_id: string }
}

export default function NewStudentPage() {
  const [streams, setStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    stream_id: '',
    guardian_name: '',
    guardian_phone: '',
  })

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else fetchStreams()
    }
    checkSession()
  }, [])

  const fetchStreams = async () => {
  const { data } = await supabase
    .from('streams')
    .select('id, label, class_id, classes(name)')
  if (data) setStreams(data as any)
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
      ...form,
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

  if (success) return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-56 flex-1 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center max-w-md w-full">
          <div className="text-green-500 text-4xl mb-4">✓</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Student Enrolled</h2>
          <p className="text-gray-500 text-sm mb-6">The student has been successfully added to the system.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setSuccess(false); setForm({ full_name: '', date_of_birth: '', gender: '', stream_id: '', guardian_name: '', guardian_phone: '' }) }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
              Add Another
            </button>
            <Link href="/students"
              className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
              View All Students
            </Link>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-56 flex-1 p-8">
        <h2 className="text-lg font-medium text-gray-700 mb-6">Enrol New Student</h2>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 max-w-2xl">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Full Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => update('full_name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Date of Birth <span className="text-red-400">*</span></label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={e => update('date_of_birth', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Gender <span className="text-red-400">*</span></label>
              <select
                value={form.gender}
                onChange={e => update('gender', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Class & Stream <span className="text-red-400">*</span></label>
            <select
              value={form.stream_id}
              onChange={e => update('stream_id', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
              required
            >
              <option value="">Select class</option>
              {streams.map(stream => (
                <option key={stream.id} value={stream.id}>
                  {(stream.classes as any)?.name} {stream.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Guardian Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.guardian_name}
              onChange={e => update('guardian_name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
              placeholder="Enter guardian name"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Guardian Phone <span className="text-red-400">*</span></label>
            <input
              type="tel"
              value={form.guardian_phone}
              onChange={e => update('guardian_phone', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
              placeholder="e.g. 0244000000"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Enrolling...' : 'Enrol Student'}
            </button>
            <Link href="/students"
              className="border border-gray-200 text-gray-600 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}