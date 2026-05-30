'use client'
import { useEffect, useState, use } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import Sidebar from '../../components/sidebar'

export default function StudentProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [student, setStudent] = useState<any>(null)
  const [streams, setStreams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [moving, setMoving] = useState(false)
  const [newStreamId, setNewStreamId] = useState('')
  const [moveReason, setMoveReason] = useState('')
  const [showMoveForm, setShowMoveForm] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else {
        fetchStudent()
        fetchStreams()
      }
    }
    checkSession()
  }, [])

  const fetchStudent = async () => {
    const { data } = await supabase
      .from('students')
      .select(`
        *,
        streams (
          label,
          classes ( name, levels ( name ) )
        )
      `)
      .eq('id', id)
      .single()
    if (data) setStudent(data)
    setLoading(false)
  }

  const fetchStreams = async () => {
    const { data } = await supabase
      .from('streams')
      .select('id, label, classes(name)')
    if (data) setStreams(data)
  }

  const handleMove = async () => {
    if (!newStreamId) return
    setMoving(true)
    await supabase.from('student_class_history').insert({
      student_id: id,
      stream_id: student.stream_id,
      start_date: student.enrolled_at?.split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      reason: moveReason,
      moved_by: 'Admin',
    })
    await supabase
      .from('students')
      .update({ stream_id: newStreamId })
      .eq('id', id)
    setShowMoveForm(false)
    setMoving(false)
    fetchStudent()
  }

  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw this student?')) return
    await supabase
      .from('students')
      .update({ status: 'withdrawn' })
      .eq('id', id)
    fetchStudent()
  }

  const handleReactivate = async () => {
    await supabase
      .from('students')
      .update({ status: 'active' })
      .eq('id', id)
    fetchStudent()
  }

  if (loading) return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-56 flex-1 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  )

  if (!student) return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-56 flex-1 flex items-center justify-center">
        <p className="text-gray-500">Student not found.</p>
      </div>
    </div>
  )

  const currentClass = `${(student.streams as any)?.classes?.name} ${(student.streams as any)?.label}`
  const currentLevel = (student.streams as any)?.classes?.levels?.name

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-56 flex-1 p-8 overflow-auto">
        <Link href="/students" className="text-sm text-blue-600 hover:underline mb-6 block">
          ← Back to Students
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{student.full_name}</h2>
            <p className="text-sm text-gray-500 mt-1">Learner Code: <span className="font-mono font-medium text-gray-700">{student.learner_code}</span></p>
            <p className="text-sm text-gray-500 mt-1">Class: <span className="font-medium text-gray-700">{currentClass}</span> · {currentLevel}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
              student.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {student.status}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowMoveForm(!showMoveForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Move Student
            </button>
            {student.status === 'active' ? (
              <button
                onClick={handleWithdraw}
                className="border border-red-200 text-red-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition"
              >
                Withdraw
              </button>
            ) : (
              <button
                onClick={handleReactivate}
                className="border border-green-200 text-green-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-50 transition"
              >
                Reactivate
              </button>
            )}
          </div>
        </div>

        {showMoveForm && (
          <div className="bg-white rounded-xl border border-blue-200 p-6 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Move to another class</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">New Class & Stream</label>
                <select
                  value={newStreamId}
                  onChange={e => setNewStreamId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
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
                <label className="text-sm text-gray-600 block mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={moveReason}
                  onChange={e => setMoveReason(e.target.value)}
                  placeholder="e.g. Class balancing"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
            <button
              onClick={handleMove}
              disabled={moving || !newStreamId}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {moving ? 'Moving...' : 'Confirm Move'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Personal Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Date of Birth</span>
                <span className="text-gray-800">{student.date_of_birth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Gender</span>
                <span className="text-gray-800 capitalize">{student.gender}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Nationality</span>
                <span className="text-gray-800">{student.nationality || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hometown</span>
                <span className="text-gray-800">{student.hometown || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Religion</span>
                <span className="text-gray-800">{student.religion || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Blood Group</span>
                <span className="text-gray-800">{student.blood_group || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Medical Conditions</span>
                <span className="text-gray-800">{student.medical_conditions || '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Guardian Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Guardian Name</span>
                <span className="text-gray-800">{student.guardian_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="text-gray-800">{student.guardian_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Second Phone</span>
                <span className="text-gray-800">{student.guardian_phone_2 || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Relationship</span>
                <span className="text-gray-800">{student.guardian_relationship || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Occupation</span>
                <span className="text-gray-800">{student.guardian_occupation || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Previous School</span>
                <span className="text-gray-800">{student.previous_school || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Boarding Status</span>
                <span className="text-gray-800 capitalize">{student.boarding_status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}