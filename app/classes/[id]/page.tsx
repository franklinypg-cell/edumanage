'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Sidebar from '../../components/sidebar'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function ClassDetailPage() {
  const { id } = useParams()
  const [cls, setCls] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningTeacher, setAssigningTeacher] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else fetchData()
    }
    checkSession()
  }, [])

  const fetchData = async () => {
    const { data: classData } = await supabase
      .from('classes')
      .select('*, teachers(id, full_name, staff_id, phone, qualification)')
      .eq('id', id)
      .single()

    if (classData) {
      setCls(classData)
      setSelectedTeacher(classData.teacher_id || '')
      const { data: studentData } = await supabase
        .from('students')
        .select('id, full_name, learner_code, gender, status')
        .eq('class', classData.name)
        .eq('status', 'active')
        .order('full_name')
      if (studentData) setStudents(studentData)
    }

    const { data: teacherData } = await supabase
      .from('teachers').select('*').order('full_name')
    if (teacherData) setTeachers(teacherData)
    setLoading(false)
  }

  const handleAssignTeacher = async () => {
    setSaving(true)
    await supabase.from('classes').update({ teacher_id: selectedTeacher || null }).eq('id', id)
    await fetchData()
    setAssigningTeacher(false)
    setSaving(false)
  }

  const inputStyle = { background: '#0f172a', border: '1.5px solid #334155', color: '#e2e8f0' }

  if (loading) return (
    <div className="flex min-h-screen w-full" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="md:ml-56 flex-1 flex items-center justify-center">
        <p style={{ color: '#475569' }}>Loading...</p>
      </div>
    </div>
  )

  const teacher = cls?.teachers

  return (
    <div className="flex min-h-screen w-full" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="md:ml-56 flex-1 p-4 md:p-8 min-w-0 max-w-full">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link href="/classes" className="text-sm" style={{ color: '#475569' }}>← Classes</Link>
          <span style={{ color: '#334155' }}>/</span>
          <h2 className="text-lg font-medium" style={{ color: '#e2e8f0' }}>{cls?.name}</h2>
          <span className="text-xs font-medium px-2 py-1 rounded-full"
            style={{ background: '#0f172a', color: '#38bdf8' }}>
            {students.length} students
          </span>
        </div>

        <div className="rounded-xl p-4 md:p-6 mb-6" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 w-full md:w-auto">
              <div>
                <p className="text-xs mb-1" style={{ color: '#475569' }}>Level</p>
                <p className="text-sm font-medium" style={{ color: '#cbd5e1' }}>{cls?.level}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: '#475569' }}>Class Teacher</p>
                {teacher ? (
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#cbd5e1' }}>{teacher.full_name}</p>
                    {teacher.staff_id && <p className="text-xs" style={{ color: '#475569' }}>ID: {teacher.staff_id}</p>}
                    {teacher.phone && <p className="text-xs" style={{ color: '#475569' }}>📞 {teacher.phone}</p>}
                    {teacher.qualification && <p className="text-xs" style={{ color: '#475569' }}>🎓 {teacher.qualification}</p>}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: '#475569' }}>No teacher assigned</p>
                )}
              </div>
            </div>
            <button onClick={() => setAssigningTeacher(!assigningTeacher)}
              className="text-sm px-4 py-2 rounded-lg transition w-full md:w-auto shrink-0"
              style={{ border: '1px solid #38bdf8', color: '#38bdf8' }}>
              {teacher ? 'Change Teacher' : 'Assign Teacher'}
            </button>
          </div>

          {assigningTeacher && (
            <div className="mt-4 pt-4 flex flex-col sm:flex-row gap-3 sm:items-center" style={{ borderTop: '1px solid #334155' }}>
              <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}
                className="rounded-lg px-4 py-2 text-sm focus:outline-none w-full sm:w-auto" style={inputStyle}>
                <option value="">— No teacher —</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
              <div className="flex gap-3 items-center">
                <button onClick={handleAssignTeacher} disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  style={{ background: '#38bdf8', color: '#0f172a' }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setAssigningTeacher(false)}
                  className="text-sm hover:underline" style={{ color: '#64748b' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>#</th>
                  <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Student</th>
                  <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Learner Code</th>
                  <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Gender</th>
                  <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center" style={{ color: '#475569' }}>
                      No active students in this class.
                    </td>
                  </tr>
                ) : (
                  students.map((s, i) => (
                    <tr key={s.id} className="transition" style={{ borderBottom: '1px solid #1e293b' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0f172a'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <td className="px-6 py-4" style={{ color: '#475569' }}>{i + 1}</td>
                      <td className="px-6 py-4 font-medium" style={{ color: '#e2e8f0' }}>{s.full_name}</td>
                      <td className="px-6 py-4" style={{ color: '#94a3b8' }}>{s.learner_code}</td>
                      <td className="px-6 py-4" style={{ color: '#94a3b8' }}>{s.gender}</td>
                      <td className="px-6 py-4">
                        <Link href={`/students/${s.id}`} className="text-sm hover:underline" style={{ color: '#38bdf8' }}>
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}