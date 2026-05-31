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
      .from('teachers')
      .select('*')
      .order('full_name')
    if (teacherData) setTeachers(teacherData)

    setLoading(false)
  }

  const handleAssignTeacher = async () => {
    setSaving(true)
    await supabase
      .from('classes')
      .update({ teacher_id: selectedTeacher || null })
      .eq('id', id)
    await fetchData()
    setAssigningTeacher(false)
    setSaving(false)
  }

  if (loading) return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-56 flex-1 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  )

  const teacher = cls?.teachers

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-56 flex-1 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/classes" className="text-gray-400 hover:text-gray-600 text-sm">← Classes</Link>
          <span className="text-gray-300">/</span>
          <h2 className="text-lg font-medium text-gray-700">{cls?.name}</h2>
          <span className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-1 rounded-full">
            {students.length} students
          </span>
        </div>

        {/* Class Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs text-gray-400 mb-1">Level</p>
                <p className="text-sm font-medium text-gray-700">{cls?.level}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Class Teacher</p>
                {teacher ? (
                  <div>
                    <p className="text-sm font-medium text-gray-700">{teacher.full_name}</p>
                    {teacher.staff_id && <p className="text-xs text-gray-400">ID: {teacher.staff_id}</p>}
                    {teacher.phone && <p className="text-xs text-gray-400">📞 {teacher.phone}</p>}
                    {teacher.qualification && <p className="text-xs text-gray-400">🎓 {teacher.qualification}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No teacher assigned</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setAssigningTeacher(!assigningTeacher)}
              className="text-sm text-blue-600 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50 transition"
            >
              {teacher ? 'Change Teacher' : 'Assign Teacher'}
            </button>
          </div>

          {assigningTeacher && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3 items-center">
              <select
                value={selectedTeacher}
                onChange={e => setSelectedTeacher(e.target.value)}
                className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
              >
                <option value="">— No teacher —</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
              <button
                onClick={handleAssignTeacher}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setAssigningTeacher(false)}
                className="text-gray-500 text-sm hover:underline"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">#</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Student</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Learner Code</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Gender</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No active students in this class.
                  </td>
                </tr>
              ) : (
                students.map((s, i) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-400">{i + 1}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{s.full_name}</td>
                    <td className="px-6 py-4 text-gray-500">{s.learner_code}</td>
                    <td className="px-6 py-4 text-gray-500">{s.gender}</td>
                    <td className="px-6 py-4">
                      <Link href={`/students/${s.id}`} className="text-blue-600 hover:underline text-sm">
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
  )
}