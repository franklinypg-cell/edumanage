// TARGET PATH IN YOUR PROJECT: app/students/page.tsx
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

  // Group filtered students by class
  const grouped = filtered.reduce((acc: any, student) => {
    const className = student.class || 'Unassigned'
    if (!acc[className]) acc[className] = []
    acc[className].push(student)
    return acc
  }, {})

  const sortedClasses = Object.keys(grouped).sort()

  if (loading) return (
    <div className="flex w-full min-h-screen overflow-x-hidden" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="md:ml-56 flex-1 w-full flex items-center justify-center pt-14 md:pt-0">
        <p style={{ color: '#475569' }}>Loading...</p>
      </div>
    </div>
  )

  return (
    <div className="flex w-full min-h-screen overflow-x-hidden" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="md:ml-56 flex-1 w-full p-4 md:p-8 pt-20 md:pt-8">
        <div className="flex flex-col gap-4 mb-6">
          <h2 className="text-lg font-medium" style={{ color: '#e2e8f0' }}>
            All Students ({filtered.length})
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by name or code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-lg px-4 py-2 text-sm focus:outline-none w-full sm:w-64"
              style={{ background: '#1e293b', border: '1.5px solid #334155', color: '#e2e8f0' }}
            />
            <div className="flex gap-3">
              <Link
                href="/students/new"
                className="flex-1 sm:flex-none text-center px-4 py-2 rounded-lg text-sm font-medium transition"
                style={{ background: '#38bdf8', color: '#0f172a' }}
              >
                + Add Student
              </Link>
              <Link
                href="/students/bulk-upload"
                className="flex-1 sm:flex-none text-center px-4 py-2 rounded-lg text-sm font-medium transition"
                style={{ border: '1px solid #38bdf8', color: '#38bdf8' }}
              >
                Bulk Upload
              </Link>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <p style={{ color: '#475569' }}>
              {search ? 'No students match your search.' : 'No students found. Click + Add Student to enrol your first student.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedClasses.map(className => (
              <div key={className} className="rounded-xl overflow-hidden" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                {/* Class Header */}
                <div className="px-6 py-3 flex items-center gap-3" style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
                  <span className="text-sm font-semibold" style={{ color: '#38bdf8' }}>{className}</span>
                  <span className="text-xs" style={{ color: '#475569' }}>
                    {grouped[className].length} student{grouped[className].length !== 1 ? 's' : ''}
                  </span>
                </div>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155' }}>
                        <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Code</th>
                        <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Name</th>
                        <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Gender</th>
                        <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Guardian</th>
                        <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped[className].map((student: any) => (
                        <tr
                          key={student.id}
                          onClick={() => window.location.href = `/students/${student.id}`}
                          className="cursor-pointer transition"
                          style={{ borderBottom: '1px solid #1e293b' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0f172a'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        >
                          <td className="px-4 md:px-6 py-4 font-mono whitespace-nowrap" style={{ color: '#38bdf8' }}>{student.learner_code}</td>
                          <td className="px-4 md:px-6 py-4 font-medium whitespace-nowrap" style={{ color: '#e2e8f0' }}>{student.full_name}</td>
                          <td className="px-4 md:px-6 py-4 capitalize" style={{ color: '#94a3b8' }}>{student.gender}</td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap" style={{ color: '#94a3b8' }}>{student.guardian_name}</td>
                          <td className="px-4 md:px-6 py-4">
                            <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap" style={
                              student.status === 'active'
                                ? { background: '#052e16', color: '#4ade80' }
                                : { background: '#2d1b1b', color: '#f87171' }
                            }>
                              {student.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}