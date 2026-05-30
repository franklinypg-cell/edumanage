'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

type Student = {
  id: string
  learner_code: string
  full_name: string
  gender: string
  status: string
  guardian_name: string
  guardian_phone: string
  streams: {
    label: string
    classes: {
      name: string
    }
  }
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/'
      } else {
        fetchStudents()
      }
    }
    checkSession()
  }, [])

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select(`
        id, learner_code, full_name, gender, status,
        guardian_name, guardian_phone,
        streams ( label, classes ( name ) )
      `)
      .order('full_name')
    if (data) setStudents(data as any)
    setLoading(false)
  }

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.learner_code.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-700">All Students ({filtered.length})</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400 w-64"
          />
          <Link href="/students/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            + Add Student
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Code</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Class</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Gender</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Guardian</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  No students found. Click + Add Student to enrol your first student.
                </td>
              </tr>
            ) : (
              filtered.map(student => (
                <tr
                  key={student.id}
                  onClick={() => window.location.href = `/students/${student.id}`}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 font-mono text-gray-600">{student.learner_code}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{student.full_name}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {(student.streams as any)?.classes?.name} {(student.streams as any)?.label}
                  </td>
                  <td className="px-6 py-4 text-gray-600 capitalize">{student.gender}</td>
                  <td className="px-6 py-4 text-gray-600">{student.guardian_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      student.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}