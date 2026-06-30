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

  if (loading) return (
    <div className="flex min-h-screen bg-indigo-50/40">
      <Sidebar />
      <div className="ml-56 flex-1 flex items-center justify-center">
        <p style={{ color: '#6366f1' }}>Loading...</p>
      </div>
    </div>
  )

  if (!student) return (
    <div className="flex min-h-screen bg-indigo-50/40">
      <Sidebar />
      <div className="ml-56 flex-1 flex items-center justify-center">
        <p style={{ color: '#64748b' }}>Student not found.</p>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-indigo-50/40">
      <Sidebar />
      <div className="ml-56 flex-1 p-8 overflow-auto">
        <Link href="/students" className="text-sm mb-6 block" style={{ color: '#4f46e5' }}>
          ← Back to Students
        </Link>

        {/* Header Card */}
        <div className="rounded-xl p-6 mb-6 flex justify-between items-start bg-white shadow-sm" style={{ border: '1px solid #e0e7ff' }}>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: '#1e1b4b' }}>{student.full_name}</h2>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>
              Learner Code: <span className="font-mono" style={{ color: '#4f46e5' }}>{student.learner_code}</span>
            </p>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>
              Class: <span style={{ color: '#334155' }}>{student.class || '—'}</span>
            </p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium" style={
              student.status === 'active'
                ? { background: '#dcfce7', color: '#16a34a' }
                : { background: '#fee2e2', color: '#dc2626' }
            }>
              {student.status}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowMoveForm(!showMoveForm)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{ background: '#4f46e5', color: '#ffffff' }}
            >
              Move Student
            </button>
            {student.status === 'active' ? (
              <button
                onClick={handleWithdraw}
                className="px-4 py-2 rounded-lg text-sm font-medium transition"
                style={{ border: '1px solid #f87171', color: '#dc2626' }}
              >
                Withdraw
              </button>
            ) : (
              <button
                onClick={handleReactivate}
                className="px-4 py-2 rounded-lg text-sm font-medium transition"
                style={{ border: '1px solid #4ade80', color: '#16a34a' }}
              >
                Reactivate
              </button>
            )}
          </div>
        </div>

        {/* Move Form */}
        {showMoveForm && (
          <div className="rounded-xl p-6 mb-6 bg-white shadow-sm" style={{ border: '1px solid #4f46e5' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: '#1e1b4b' }}>Move to another class</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm block mb-1" style={{ color: '#64748b' }}>New Class</label>
                <select
                  value={newClass}
                  onChange={e => setNewClass(e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                  style={{ background: '#ffffff', border: '1.5px solid #c7d2fe', color: '#1e293b' }}
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
                <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Reason (optional)</label>
                <input
                  type="text"
                  value={moveReason}
                  onChange={e => setMoveReason(e.target.value)}
                  placeholder="e.g. Class balancing"
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                  style={{ background: '#ffffff', border: '1.5px solid #c7d2fe', color: '#1e293b' }}
                />
              </div>
            </div>
            <button
              onClick={handleMove}
              disabled={moving || !newClass}
              className="px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
              style={{ background: '#4f46e5', color: '#ffffff' }}
            >
              {moving ? 'Moving...' : 'Confirm Move'}
            </button>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl p-6 bg-white shadow-sm" style={{ border: '1px solid #e0e7ff' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: '#4f46e5' }}>Personal Details</h3>
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
                <div key={i} className="flex justify-between">
                  <span style={{ color: '#94a3b8' }}>{item.label}</span>
                  <span className="capitalize" style={{ color: '#334155' }}>{item.value || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-6 bg-white shadow-sm" style={{ border: '1px solid #e0e7ff' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: '#4f46e5' }}>Guardian Details</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Guardian Name', value: student.guardian_name },
                { label: 'Phone', value: student.guardian_phone },
                { label: 'Second Phone', value: student.guardian_phone_2 },
                { label: 'Relationship', value: student.guardian_relationship },
                { label: 'Previous School', value: student.previous_school },
                { label: 'Boarding Status', value: student.boarding_status },
              ].map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span style={{ color: '#94a3b8' }}>{item.label}</span>
                  <span className="capitalize" style={{ color: '#334155' }}>{item.value || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}