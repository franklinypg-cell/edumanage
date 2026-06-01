'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import Sidebar from '../components/sidebar'

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else fetchStudents()
    }
    checkSession()
  }, [])

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, learner_code, full_name, gender, status, guardian_name, guardian_phone, class')
      .order('full_name')
    if (data) setStudents(data)
    setLoading(false)
  }

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.learner_code.toLowerCase().includes(search.toLowerCase())
  )

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
          <h2 className="text-lg font-medium" style={{ color: '#e2e8f0' }}>
            All Students ({filtered.length})
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search by name or code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-lg px-4 py-2 text-sm focus:outline-none w-64"
              style={{ background: '#1e293b', border: '1.5px solid #334155', color: '#e2e8f0' }}
            />
            <Link
              href="/students/new"
              className="px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{ background: '#38bdf8', color: '#0f172a' }}
            >
              + Add Student
            </Link>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Code</th>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Name</th>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Class</th>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Gender</th>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Guardian</th>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center" style={{ color: '#475569' }}>
                    No students found. Click + Add Student to enrol your first student.
                  </td>
                </tr>
              ) : (
                filtered.map(student => (
                  <tr
                    key={student.id}
                    onClick={() => window.location.href = `/students/${student.id}`}
                    className="cursor-pointer transition"
                    style={{ borderBottom: '1px solid #1e293b' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0f172a'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td className="px-6 py-4 font-mono" style={{ color: '#38bdf8' }}>{student.learner_code}</td>
                    <td className="px-6 py-4 font-medium" style={{ color: '#e2e8f0' }}>{student.full_name}</td>
                    <td className="px-6 py-4" style={{ color: '#94a3b8' }}>{student.class || '—'}</td>
                    <td className="px-6 py-4 capitalize" style={{ color: '#94a3b8' }}>{student.gender}</td>
                    <td className="px-6 py-4" style={{ color: '#94a3b8' }}>{student.guardian_name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium" style={
                        student.status === 'active'
                          ? { background: '#052e16', color: '#4ade80' }
                          : { background: '#2d1b1b', color: '#f87171' }
                      }>
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
    </div>
  )
}