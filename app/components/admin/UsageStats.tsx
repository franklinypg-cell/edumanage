'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

type School = {
  id: string
  name: string
  status: string
}

type SchoolUsage = {
  school_id: string
  school_name: string
  status: string
  students: number
  teachers: number
  classes: number
  lastActivity: string | null // ISO timestamp
}

type SortKey = 'students' | 'teachers' | 'classes' | 'lastActivity'

const DAY = 24 * 60 * 60 * 1000

function relativeTime(iso: string | null) {
  if (!iso) return 'No activity yet'
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / DAY)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export default function UsageStats() {
  const [loading, setLoading] = useState(true)
  const [schools, setSchools] = useState<School[]>([])
  const [usage, setUsage] = useState<SchoolUsage[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('students')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [platformLastActivity, setPlatformLastActivity] = useState<string | null>(null)

  useEffect(() => {
    loadUsage()
  }, [])

  const loadUsage = async () => {
    setLoading(true)

    const { data: schoolsData } = await supabase
      .from('schools')
      .select('id, name, status')

    const schoolList = schoolsData || []
    setSchools(schoolList)

    // Pull each table once, then aggregate client-side per school_id.
    // Wrapped individually in try/catch so a missing/renamed table doesn't
    // take down the whole dashboard — it'll just show 0 for that column.
    const safeFetch = async (table: string, cols: string) => {
      try {
        const { data, error } = await supabase.from(table).select(cols)
        if (error) throw error
        return data || []
      } catch {
        return []
      }
    }

    const [students, teachers, classes] = await Promise.all([
      safeFetch('students', 'school_id, created_at'),
      safeFetch('teachers', 'school_id, created_at'),
      safeFetch('classes', 'school_id'),
    ])

    const countAndLatestBySchool = (rows: any[]) => {
      const map = new Map<string, { count: number; latest: string | null }>()
      for (const row of rows) {
        const sid = row.school_id
        if (!sid) continue
        const existing = map.get(sid) || { count: 0, latest: null }
        existing.count += 1
        if (row.created_at && (!existing.latest || row.created_at > existing.latest)) {
          existing.latest = row.created_at
        }
        map.set(sid, existing)
      }
      return map
    }

    const studentMap = countAndLatestBySchool(students as any[])
    const teacherMap = countAndLatestBySchool(teachers as any[])
    const classMap = countAndLatestBySchool(classes as any[])

    let globalLatest: string | null = null
    const allLatestTimestamps = [
      ...Array.from(studentMap.values()).map(v => v.latest),
      ...Array.from(teacherMap.values()).map(v => v.latest),
      ...Array.from(classMap.values()).map(v => v.latest),
    ]
    for (const ts of allLatestTimestamps) {
      if (ts && (!globalLatest || ts > globalLatest)) globalLatest = ts
    }
    setPlatformLastActivity(globalLatest)

    const rows: SchoolUsage[] = schoolList.map(s => {
      const st = studentMap.get(s.id)
      const te = teacherMap.get(s.id)
      const cl = classMap.get(s.id)
      const latestForSchool = [st?.latest, te?.latest, cl?.latest]
        .filter(Boolean)
        .sort()
        .reverse()[0] || null

      return {
        school_id: s.id,
        school_name: s.name,
        status: s.status,
        students: st?.count || 0,
        teachers: te?.count || 0,
        classes: cl?.count || 0,
        lastActivity: latestForSchool,
      }
    })

    setUsage(rows)
    setLoading(false)
  }

  const totals = useMemo(() => {
    return usage.reduce(
      (acc, r) => ({
        students: acc.students + r.students,
        teachers: acc.teachers + r.teachers,
        classes: acc.classes + r.classes,
        active: acc.active + (r.status === 'active' ? 1 : 0),
        suspended: acc.suspended + (r.status === 'suspended' ? 1 : 0),
      }),
      { students: 0, teachers: 0, classes: 0, active: 0, suspended: 0 }
    )
  }, [usage])

  const sortedUsage = useMemo(() => {
    const copy = [...usage]
    copy.sort((a, b) => {
      let av: number | string = a[sortKey] ?? 0
      let bv: number | string = b[sortKey] ?? 0
      if (sortKey === 'lastActivity') {
        av = a.lastActivity || ''
        bv = b.lastActivity || ''
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [usage, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  // Free-tier inactivity pause risk: Supabase pauses projects after 7 days
  // with zero activity. This badge watches platform-wide activity, not
  // any single school, since that's what actually triggers the pause.
  const pauseRisk = useMemo(() => {
    if (!platformLastActivity) return 'unknown'
    const days = (Date.now() - new Date(platformLastActivity).getTime()) / DAY
    if (days >= 6) return 'high'
    if (days >= 4) return 'medium'
    return 'low'
  }, [platformLastActivity])

  const pauseRiskStyle = {
    low: { background: '#052e16', color: '#4ade80', label: 'Healthy' },
    medium: { background: '#3f2d0f', color: '#facc15', label: 'Watch' },
    high: { background: '#2d1b1b', color: '#f87171', label: 'Pause risk' },
    unknown: { background: '#0f172a', color: '#64748b', label: 'No data' },
  }[pauseRisk]

  const cardStyle = { background: '#1e293b', border: '1px solid #334155' }

  const SortArrow = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span style={{ color: '#334155' }}> ↕</span>
    return <span style={{ color: '#38bdf8' }}>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
  }

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div>
          <h3 className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Usage Overview</h3>
          <p className="text-xs mt-1" style={{ color: '#475569' }}>Students, teachers, and classes per school</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: pauseRiskStyle.background, color: pauseRiskStyle.color }}>
          DB activity: {pauseRiskStyle.label}
          {platformLastActivity && (
            <span style={{ color: '#64748b', fontWeight: 400 }}>· last write {relativeTime(platformLastActivity)}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-xs" style={{ color: '#475569' }}>Schools</p>
          <p className="text-xl font-semibold mt-1" style={{ color: '#e2e8f0' }}>{schools.length}</p>
        </div>
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-xs" style={{ color: '#475569' }}>Active</p>
          <p className="text-xl font-semibold mt-1" style={{ color: '#4ade80' }}>{totals.active}</p>
        </div>
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-xs" style={{ color: '#475569' }}>Suspended</p>
          <p className="text-xl font-semibold mt-1" style={{ color: '#f87171' }}>{totals.suspended}</p>
        </div>
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-xs" style={{ color: '#475569' }}>Students</p>
          <p className="text-xl font-semibold mt-1" style={{ color: '#38bdf8' }}>{totals.students}</p>
        </div>
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-xs" style={{ color: '#475569' }}>Teachers</p>
          <p className="text-xl font-semibold mt-1" style={{ color: '#38bdf8' }}>{totals.teachers}</p>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>School</th>
                <th className="text-left px-4 md:px-6 py-3 font-medium cursor-pointer select-none" style={{ color: '#475569' }} onClick={() => handleSort('students')}>
                  Students<SortArrow col="students" />
                </th>
                <th className="text-left px-4 md:px-6 py-3 font-medium cursor-pointer select-none" style={{ color: '#475569' }} onClick={() => handleSort('teachers')}>
                  Teachers<SortArrow col="teachers" />
                </th>
                <th className="text-left px-4 md:px-6 py-3 font-medium cursor-pointer select-none" style={{ color: '#475569' }} onClick={() => handleSort('classes')}>
                  Classes<SortArrow col="classes" />
                </th>
                <th className="text-left px-4 md:px-6 py-3 font-medium cursor-pointer select-none" style={{ color: '#475569' }} onClick={() => handleSort('lastActivity')}>
                  Last Activity<SortArrow col="lastActivity" />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center" style={{ color: '#475569' }}>Loading usage data...</td></tr>
              ) : sortedUsage.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center" style={{ color: '#475569' }}>No schools yet.</td></tr>
              ) : (
                sortedUsage.map(row => (
                  <tr key={row.school_id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td className="px-4 md:px-6 py-4 font-medium" style={{ color: '#e2e8f0' }}>
                      {row.school_name}
                      {row.status === 'suspended' && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: '#2d1b1b', color: '#f87171' }}>
                          suspended
                        </span>
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-4" style={{ color: '#94a3b8' }}>{row.students}</td>
                    <td className="px-4 md:px-6 py-4" style={{ color: '#94a3b8' }}>{row.teachers}</td>
                    <td className="px-4 md:px-6 py-4" style={{ color: '#94a3b8' }}>{row.classes}</td>
                    <td className="px-4 md:px-6 py-4 text-xs" style={{ color: '#64748b' }}>{relativeTime(row.lastActivity)}</td>
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