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
    full_name: '', staff_id: '', phone: '', qualification: '',
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
    const { data } = await supabase.from('teachers').select('*').order('full_name')
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

  const inputStyle = { background: '#0f172a', border: '1.5px solid #334155', color: '#e2e8f0' }

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
          <h2 className="text-lg font-medium" style={{ color: '#e2e8f0' }}>Teachers</h2>
          <button
            onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ full_name: '', staff_id: '', phone: '', qualification: '' }) }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{ background: '#38bdf8', color: '#0f172a' }}
          >
            + Add Teacher
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-xl p-6 mb-6 max-w-2xl" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: '#e2e8f0' }}>
              {editId ? 'Edit Teacher' : 'Add New Teacher'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Full Name <span style={{ color: '#f87171' }}>*</span></label>
                <input type="text" value={form.full_name} onChange={e => update('full_name', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle}
                  placeholder="e.g. Mr. Kofi Mensah" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Staff ID</label>
                  <input type="text" value={form.staff_id} onChange={e => update('staff_id', e.target.value)}
                    className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle}
                    placeholder="e.g. GES-0012" />
                </div>
                <div>
                  <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Phone</label>
                  <input type="text" value={form.phone} onChange={e => update('phone', e.target.value)}
                    className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle}
                    placeholder="e.g. 0244000000" />
                </div>
              </div>
              <div>
                <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Qualification</label>
                <input type="text" value={form.qualification} onChange={e => update('qualification', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle}
                  placeholder="e.g. B.Ed Basic Education" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  style={{ background: '#38bdf8', color: '#0f172a' }}>
                  {saving ? 'Saving...' : editId ? 'Update Teacher' : 'Save Teacher'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null) }}
                  className="px-6 py-2 rounded-lg text-sm font-medium transition"
                  style={{ border: '1px solid #334155', color: '#94a3b8' }}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="rounded-xl overflow-hidden" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Name</th>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Staff ID</th>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Phone</th>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Qualification</th>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center" style={{ color: '#475569' }}>
                    No teachers added yet. Click + Add Teacher to get started.
                  </td>
                </tr>
              ) : (
                teachers.map(t => (
                  <tr key={t.id} className="transition" style={{ borderBottom: '1px solid #1e293b' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0f172a'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <td className="px-6 py-4 font-medium" style={{ color: '#e2e8f0' }}>{t.full_name}</td>
                    <td className="px-6 py-4" style={{ color: '#94a3b8' }}>{t.staff_id || '—'}</td>
                    <td className="px-6 py-4" style={{ color: '#94a3b8' }}>{t.phone || '—'}</td>
                    <td className="px-6 py-4" style={{ color: '#94a3b8' }}>{t.qualification || '—'}</td>
                    <td className="px-6 py-4 flex gap-3">
                      <button onClick={() => handleEdit(t)}
                        className="text-sm hover:underline" style={{ color: '#38bdf8' }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(t.id)}
                        className="text-sm hover:underline" style={{ color: '#f87171' }}>
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