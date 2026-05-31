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
    const suggested = promotionMap[className] || ''
    setTargetClass(suggested)

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
    if (selected.size === students.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(students.map(s => s.id)))
    }
  }

  const handlePromote = async () => {
    if (!targetClass) return alert('Please select a destination class.')
    if (selected.size === 0) return alert('No students selected.')
    setPromoting(true)

    const toPromote = students.filter(s => selected.has(s.id))

    if (targetClass === 'graduated') {
      for (const s of toPromote) {
        await supabase
          .from('students')
          .update({ status: 'graduated', class: 'Graduated' })
          .eq('id', s.id)
      }
    } else {
      for (const s of toPromote) {
        await supabase
          .from('students')
          .update({ class: targetClass })
          .eq('id', s.id)
      }
    }

    setPromoting(false)
    setDone(true)
    setStudents([])
    setSelected(new Set())
    setSelectedClass('')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-56 flex-1 p-8">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-700">Student Promotion</h2>
          <p className="text-sm text-gray-400 mt-1">Promote students to the next class at the end of term.</p>
        </div>

        {done && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-6 py-4 mb-6 text-sm">
            ✅ Promotion complete! Students have been moved successfully.
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 max-w-2xl">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">From Class</label>
              <select
                value={selectedClass}
                onChange={e => handleClassChange(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
              >
                <option value="">Select class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">To Class</label>
              <select
                value={targetClass}
                onChange={e => setTargetClass(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
              >
                <option value="">Select destination</option>
                {classes.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
                <option value="graduated">Graduated (JHS 3)</option>
              </select>
            </div>
          </div>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading students...</p>}

        {students.length > 0 && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
              <div className="px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                <span className="text-sm text-gray-600">{students.length} active students — {selected.size} selected for promotion</span>
                <button
                  onClick={toggleAll}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {selected.size === students.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-3 w-10"></th>
                    <th className="text-left px-6 py-3 text-gray-500 font-medium">Student</th>
                    <th className="text-left px-6 py-3 text-gray-500 font-medium">Learner Code</th>
                    <th className="text-left px-6 py-3 text-gray-500 font-medium">Gender</th>
                    <th className="text-left px-6 py-3 text-gray-500 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} className={`border-b border-gray-50 ${selected.has(s.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggleStudent(s.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">{s.full_name}</td>
                      <td className="px-6 py-4 text-gray-500">{s.learner_code}</td>
                      <td className="px-6 py-4 text-gray-500">{s.gender}</td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {selected.has(s.id) ? '→ ' + targetClass : 'Staying in ' + selectedClass}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handlePromote}
              disabled={promoting || selected.size === 0}
              className="bg-blue-600 text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {promoting ? 'Promoting...' : `Promote ${selected.size} Student${selected.size !== 1 ? 's' : ''}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}