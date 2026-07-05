'use client'
import { useEffect, useState, use } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import Sidebar from '../../components/sidebar'

export default function StudentProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [student, setStudent] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [moving, setMoving] = useState(false)
  const [newClass, setNewClass] = useState('')
  const [moveReason, setMoveReason] = useState('')
  const [showMoveForm, setShowMoveForm] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else { fetchStudent(); fetchClasses() }
    }
    checkSession()
  }, [])

  const fetchStudent = async () => {
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single()
    if (data) setStudent(data)
    setLoading(false)
  }

  const fetchClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('id, name, level')
      .order('name')
    if (data) setClasses(data)
  }

  const handleMove = async () => {
    if (!newClass) return
    setMoving(true)
    await supabase.from('students').update({ class: newClass }).eq('id', id)
    setShowMoveForm(false)
    setMoving(false)
    fetchStudent()
  }

  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw this student?')) return
    await supabase.from('students').update({ status: 'withdrawn' }).eq('id', id)
    fetchStudent()
  }

  const handleReactivate = async () => {
    await supabase.from('students').update({ status: 'active' }).eq('id', id)
    fetchStudent()
  }

  const groupedClasses = classes.reduce((acc: any, cls) => {
    const level = cls.level || 'Other'
    if (!acc[level]) acc[level] = []
    acc[level].push(cls)
    return acc
  }, {})

  const inputStyle = { background: '#0f172a', border: '1.5px solid #334155', color: '#e2e8f0' }

  if (loading) return (
    <div className="flex w-full min-h-screen overflow-x-hidden" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="md:ml-56 flex-1 w-full flex items-center justify-center pt-14 md:pt-0">
        <p style={{ color: '#475569' }}>Loading...</p>
      </div>
    </div>
  )

  if (!student) return (
    <div className="flex w-full min-h-screen overflow-x-hidden" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="md:ml-56 flex-1 w-full flex items-center justify-center pt-14 md:pt-0">
        <p style={{ color: '#475569' }}>Student not found.</p>
      </div>
    </div>
  )

  return (
    <div className="flex w-full min-h-screen overflow-x-hidden" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="md:ml-56 flex-1 w-full p-4 md:p-8 pt-20 md:pt-8 overflow-auto">
        <Link href="/students" className="text-sm mb-6 block" style={{ color: '#38bdf8' }}>
          ← Back to Students
        </Link>

        {/* Header Card */}
        <div className="rounded-xl p-6 mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: '#e2e8f0' }}>{student.full_name}</h2>
            <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
              Learner Code: <span className="font-mono" style={{ color: '#38bdf8' }}>{student.learner_code}</span>
            </p>
            <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
              Class: <span style={{ color: '#e2e8f0' }}>{student.class || '—'}</span>
            </p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium" style={
              student.status === 'active'
                ? { background: '#052e16', color: '#4ade80' }
                : { background: '#2d1b1b', color: '#f87171' }
            }>
              {student.status}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowMoveForm(!showMoveForm)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{ background: '#38bdf8', color: '#0f172a' }}
            >
              Move Student
            </button>
            {student.status === 'active' ? (
              <button
                onClick={handleWithdraw}
                className="px-4 py-2 rounded-lg text-sm font-medium transition"
                style={{ border: '1px solid #f87171', color: '#f87171' }}
              >
                Withdraw
              </button>
            ) : (
              <button
                onClick={handleReactivate}
                className="px-4 py-2 rounded-lg text-sm font-medium transition"
                style={{ border: '1px solid #4ade80', color: '#4ade80' }}
              >
                Reactivate
              </button>
            )}
          </div>
        </div>

        {/* Move Form */}
        {showMoveForm && (
          <div className="rounded-xl p-6 mb-6" style={{ background: '#1e293b', border: '1px solid #38bdf8' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: '#e2e8f0' }}>Move to another class</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>New Class</label>
                <select
                  value={newClass}
                  onChange={e => setNewClass(e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                  style={inputStyle}
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
                <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Reason (optional)</label>
                <input
                  type="text"
                  value={moveReason}
                  onChange={e => setMoveReason(e.target.value)}
                  placeholder="e.g. Class balancing"
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                />
              </div>
            </div>
            <button
              onClick={handleMove}
              disabled={moving || !newClass}
              className="px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 w-full sm:w-auto"
              style={{ background: '#38bdf8', color: '#0f172a' }}
            >
              {moving ? 'Moving...' : 'Confirm Move'}
            </button>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl p-6" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: '#38bdf8' }}>Personal Details</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Date of Birth', value: student.date_of_birth },
                { label: 'Gender', value: student.gender },
                { label: 'Nationality', value: student.nationality },
                { label: 'Hometown', value: student.hometown },
                { label: 'Religion', value: student.religion },
                { label: 'Blood Group', value: student.blood_group },
                { label: 'Medical Conditions', value: student.medical_conditions },
              ].map((item, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <span style={{ color: '#64748b' }}>{item.label}</span>
                  <span className="capitalize text-right" style={{ color: '#e2e8f0' }}>{item.value || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-6" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: '#38bdf8' }}>Guardian Details</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Guardian Name', value: student.guardian_name },
                { label: 'Phone', value: student.guardian_phone },
                { label: 'Second Phone', value: student.guardian_phone_2 },
                { label: 'Relationship', value: student.guardian_relationship },
                { label: 'Previous School', value: student.previous_school },
                { label: 'Boarding Status', value: student.boarding_status },
              ].map((item, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <span style={{ color: '#64748b' }}>{item.label}</span>
                  <span className="capitalize text-right" style={{ color: '#e2e8f0' }}>{item.value || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}