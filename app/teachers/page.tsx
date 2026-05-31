'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/sidebar'

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: '',
    staff_id: '',
    phone: '',
    qualification: '',
  })

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else fetchTeachers()
    }
    checkSession()
  }, [])

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from('teachers')
      .select('*')
      .order('full_name')
    if (data) setTeachers(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    if (editId) {
      await supabase.from('teachers').update(form).eq('id', editId)
    } else {
      await supabase.from('teachers').insert(form)
    }

    setShowForm(false)
    setEditId(null)
    setForm({ full_name: '', staff_id: '', phone: '', qualification: '' })
    fetchTeachers()
    setSaving(false)
  }

  const handleEdit = (teacher: any) => {
    setEditId(teacher.id)
    setForm({
      full_name: teacher.full_name,
      staff_id: teacher.staff_id || '',
      phone: teacher.phone || '',
      qualification: teacher.qualification || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this teacher?')) return
    await supabase.from('teachers').delete().eq('id', id)
    fetchTeachers()
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
          <h2 className="text-lg font-medium text-gray-700">Teachers</h2>
          <button
            onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ full_name: '', staff_id: '', phone: '', qualification: '' }) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            + Add Teacher
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 max-w-2xl">
            <h3 className="text-sm font-medium text-gray-700 mb-4">{editId ? 'Edit Teacher' : 'Add New Teacher'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Full Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => update('full_name', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="e.g. Mr. Kofi Mensah"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Staff ID</label>
                  <input
                    type="text"
                    value={form.staff_id}
                    onChange={e => update('staff_id', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                    placeholder="e.g. GES-0012"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => update('phone', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                    placeholder="e.g. 0244000000"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Qualification</label>
                <input
                  type="text"
                  value={form.qualification}
                  onChange={e => update('qualification', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="e.g. B.Ed Basic Education"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editId ? 'Update Teacher' : 'Save Teacher'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditId(null) }}
                  className="border border-gray-200 text-gray-600 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Staff ID</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Phone</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Qualification</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No teachers added yet. Click + Add Teacher to get started.
                  </td>
                </tr>
              ) : (
                teachers.map(t => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">{t.full_name}</td>
                    <td className="px-6 py-4 text-gray-500">{t.staff_id || '—'}</td>
                    <td className="px-6 py-4 text-gray-500">{t.phone || '—'}</td>
                    <td className="px-6 py-4 text-gray-500">{t.qualification || '—'}</td>
                    <td className="px-6 py-4 flex gap-3">
                      <button
                        onClick={() => handleEdit(t)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-red-400 hover:underline text-sm"
                      >
                        Remove
                      </button>
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
