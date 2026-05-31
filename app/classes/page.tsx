'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/sidebar'
import Link from 'next/link'

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', level: 'Primary', class_teacher: '' })

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else fetchClasses()
    }
    checkSession()
  }, [])

  const fetchClasses = async () => {
    const { data: classData } = await supabase
      .from('classes')
      .select('*')
      .order('name')

    if (classData) {
      const withCounts = await Promise.all(
        classData.map(async (cls) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class', cls.name)
            .eq('status', 'active')
          return { ...cls, student_count: count || 0 }
        })
      )
      setClasses(withCounts)
    }
    setLoading(false)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('classes').insert({
      name: form.name,
      level: form.level,
      class_teacher: form.class_teacher || null,
    })
    if (error) {
      alert('Error adding class. Please try again.')
    } else {
      setShowForm(false)
      setForm({ name: '', level: 'Primary', class_teacher: '' })
      fetchClasses()
    }
    setSaving(false)
  }

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  if (loading) return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-56 flex-1 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-56 flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-700">Classes</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            + Add Class
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 max-w-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Add New Class</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Class Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="e.g. Basic 1C"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Level</label>
                <select
                  value={form.level}
                  onChange={e => update('level', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                >
                  <option value="Preschool">Preschool</option>
                  <option value="Kindergarten">Kindergarten</option>
                  <option value="Primary">Primary</option>
                  <option value="JHS">JHS</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Class Teacher</label>
                <input
                  type="text"
                  value={form.class_teacher}
                  onChange={e => update('class_teacher', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Teacher name (optional)"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Class'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="border border-gray-200 text-gray-600 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="grid grid-cols-3 gap-4">
          {classes.map(cls => (
            <Link href={`/classes/${cls.id}`} key={cls.id}>
              <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">{cls.name}</h3>
                    <p className="text-xs text-gray-400">{cls.level}</p>
                  </div>
                  <span className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-1 rounded-full">
                    {cls.student_count} students
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {cls.class_teacher ? (
                    <span>👤 {cls.class_teacher}</span>
                  ) : (
                    <span className="text-gray-300">No teacher assigned</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}