'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/sidebar'

const promotionMap: Record<string, string> = {
  'Creche': 'KG 1A',
  'KG 1A': 'KG 2A', 'KG 1B': 'KG 2B',
  'KG 2A': 'Basic 1A', 'KG 2B': 'Basic 1B',
  'Basic 1A': 'Basic 2A', 'Basic 1B': 'Basic 2B',
  'Basic 2A': 'Basic 3A', 'Basic 2B': 'Basic 3B',
  'Basic 3A': 'Basic 4A', 'Basic 3B': 'Basic 4B',
  'Basic 4A': 'Basic 5A', 'Basic 4B': 'Basic 5B',
  'Basic 5A': 'Basic 6A', 'Basic 5B': 'Basic 6B',
  'Basic 6A': 'JHS 1A', 'Basic 6B': 'JHS 1B',
  'JHS 1A': 'JHS 2A', 'JHS 1B': 'JHS 2B',
  'JHS 2A': 'JHS 3A', 'JHS 2B': 'JHS 3B',
  'JHS 3A': 'graduated', 'JHS 3B': 'graduated',
}

export default function PromotionPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [targetClass, setTargetClass] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else fetchClasses()
    }
    checkSession()
  }, [])

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('name')
    if (data) setClasses(data)
  }

  const handleClassChange = async (className: string) => {
    setSelectedClass(className)
    setDone(false)
    setTargetClass(promotionMap[className] || '')
    setLoading(true)
    const { data } = await supabase
      .from('students')
      .select('id, full_name, learner_code, gender')
      .eq('class', className)
      .eq('status', 'active')
      .order('full_name')
    if (data) {
      setStudents(data)
      setSelected(new Set(data.map((s: any) => s.id)))
    }
    setLoading(false)
  }

  const toggleStudent = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === students.length) setSelected(new Set())
    else setSelected(new Set(students.map(s => s.id)))
  }

  const handlePromote = async () => {
    if (!targetClass) return alert('Please select a destination class.')
    if (selected.size === 0) return alert('No students selected.')
    setPromoting(true)
    const toPromote = students.filter(s => selected.has(s.id))
    for (const s of toPromote) {
      await supabase.from('students').update(
        targetClass === 'graduated'
          ? { status: 'graduated', class: 'Graduated' }
          : { class: targetClass }
      ).eq('id', s.id)
    }
    setPromoting(false)
    setDone(true)
    setStudents([])
    setSelected(new Set())
    setSelectedClass('')
  }

  const inputStyle = { background: '#0f172a', border: '1.5px solid #334155', color: '#e2e8f0' }

  return (
    <div className="flex min-h-screen" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="ml-56 flex-1 p-8">
        <div className="mb-6">
          <h2 className="text-lg font-medium" style={{ color: '#e2e8f0' }}>Student Promotion</h2>
          <p className="text-sm mt-1" style={{ color: '#475569' }}>Promote students to the next class at the end of the academic year.</p>
        </div>

        {done && (
          <div className="rounded-xl px-6 py-4 mb-6 text-sm" style={{ background: '#052e16', border: '1px solid #166534', color: '#4ade80' }}>
            ✅ Promotion complete! Students have been moved successfully.
          </div>
        )}

        <div className="rounded-xl p-6 mb-6 max-w-2xl" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>From Class</label>
              <select value={selectedClass} onChange={e => handleClassChange(e.target.value)}
                className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle}>
                <option value="">Select class</option>
                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>To Class</label>
              <select value={targetClass} onChange={e => setTargetClass(e.target.value)}
                className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle}>
                <option value="">Select destination</option>
                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                <option value="graduated">Graduated (JHS 3)</option>
              </select>
            </div>
          </div>
        </div>

        {loading && <p className="text-sm mb-4" style={{ color: '#475569' }}>Loading students...</p>}

        {students.length > 0 && (
          <>
            <div className="rounded-xl overflow-hidden mb-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <div className="px-6 py-3 flex justify-between items-center" style={{ borderBottom: '1px solid #334155' }}>
                <span className="text-sm" style={{ color: '#64748b' }}>
                  {students.length} students — {selected.size} selected for promotion
                </span>
                <button onClick={toggleAll} className="text-sm hover:underline" style={{ color: '#38bdf8' }}>
                  {selected.size === students.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th className="px-6 py-3 w-10"></th>
                    <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Student</th>
                    <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Learner Code</th>
                    <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Gender</th>
                    <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} className="transition" style={{
                      borderBottom: '1px solid #1e293b',
                      background: selected.has(s.id) ? '#0f2744' : 'transparent'
                    }}>
                      <td className="px-6 py-4">
                        <input type="checkbox" checked={selected.has(s.id)}
                          onChange={() => toggleStudent(s.id)} className="rounded" />
                      </td>
                      <td className="px-6 py-4 font-medium" style={{ color: '#e2e8f0' }}>{s.full_name}</td>
                      <td className="px-6 py-4" style={{ color: '#94a3b8' }}>{s.learner_code}</td>
                      <td className="px-6 py-4" style={{ color: '#94a3b8' }}>{s.gender}</td>
                      <td className="px-6 py-4 text-xs">
                        {selected.has(s.id)
                          ? <span style={{ color: '#38bdf8' }}>→ {targetClass || '...'}</span>
                          : <span style={{ color: '#f97316' }}>Staying in {selectedClass}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={handlePromote} disabled={promoting || selected.size === 0}
              className="px-8 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
              style={{ background: '#38bdf8', color: '#0f172a' }}>
              {promoting ? 'Promoting...' : `Promote ${selected.size} Student${selected.size !== 1 ? 's' : ''} →`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}