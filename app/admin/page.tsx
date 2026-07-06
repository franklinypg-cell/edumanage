'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AdminSidebar from '../components/admin/AdminSidebar'
import UsageStats from '../components/admin/UsageStats'

type School = {
  id: string
  name: string
  status: string
  contact_phone?: string
  contact_email?: string
  created_at: string
}

type Profile = {
  id: string
  email: string | null
  role: string
  school_id: string | null
}

export default function SuperAdminPage() {
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)
  const [schools, setSchools] = useState<School[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSchool, setSavingSchool] = useState(false)
  const [showAddSchool, setShowAddSchool] = useState(false)
  const [newSchool, setNewSchool] = useState({ name: '', contact_phone: '', contact_email: '' })
  const [assigningProfileId, setAssigningProfileId] = useState<string | null>(null)
  const [assignSchoolValue, setAssignSchoolValue] = useState('')

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/'
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role !== 'super_admin') {
        window.location.href = '/dashboard'
        return
      }

      setAuthorized(true)
      setChecking(false)
      fetchSchools()
      fetchProfiles()
    }
    checkAccess()
  }, [])

  const fetchSchools = async () => {
    const { data } = await supabase
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setSchools(data)
    setLoading(false)
  }

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, role, school_id')
      .order('email')
    if (data) setProfiles(data)
  }

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSchool(true)
    const { error } = await supabase.from('schools').insert({
      name: newSchool.name,
      contact_phone: newSchool.contact_phone || null,
      contact_email: newSchool.contact_email || null,
      status: 'active',
    })
    if (error) {
      alert('Error adding school: ' + error.message)
    } else {
      setNewSchool({ name: '', contact_phone: '', contact_email: '' })
      setShowAddSchool(false)
      fetchSchools()
    }
    setSavingSchool(false)
  }

  const toggleSchoolStatus = async (school: School) => {
    const newStatus = school.status === 'active' ? 'suspended' : 'active'
    if (!confirm(`${newStatus === 'suspended' ? 'Suspend' : 'Reactivate'} "${school.name}"? This will ${newStatus === 'suspended' ? 'immediately lock out' : 'immediately restore access for'} everyone at this school.`)) return

    const { error } = await supabase
      .from('schools')
      .update({ status: newStatus })
      .eq('id', school.id)

    if (error) {
      alert('Error updating school status: ' + error.message)
    } else {
      fetchSchools()
    }
  }

  const startAssign = (profile: Profile) => {
    setAssigningProfileId(profile.id)
    setAssignSchoolValue(profile.school_id || '')
  }

  const saveAssign = async (profileId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ school_id: assignSchoolValue || null })
      .eq('id', profileId)

    if (error) {
      alert('Error assigning school: ' + error.message)
    } else {
      setAssigningProfileId(null)
      fetchProfiles()
    }
  }

  const inputStyle = { background: '#0f172a', border: '1.5px solid #334155', color: '#e2e8f0' }

  const schoolNameById = (id: string | null) => {
    if (!id) return '—'
    return schools.find(s => s.id === id)?.name || 'Unknown'
  }

  if (checking) return (
    <div className="flex w-full min-h-screen overflow-x-hidden" style={{ background: '#0f172a' }}>
      <div className="flex-1 flex items-center justify-center">
        <p style={{ color: '#475569' }}>Checking access...</p>
      </div>
    </div>
  )

  if (!authorized) return null

  return (
    <div className="flex w-full min-h-screen overflow-x-hidden" style={{ background: '#0f172a' }}>
      <AdminSidebar />
      <div className="md:ml-56 flex-1 w-full p-4 md:p-8 pt-20 md:pt-8 min-w-0 max-w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <div>
            <h2 className="text-lg font-medium" style={{ color: '#e2e8f0' }}>Super Admin</h2>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>Manage schools and user access across the platform</p>
          </div>
          <button
            onClick={() => setShowAddSchool(!showAddSchool)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition w-full sm:w-auto"
            style={{ background: '#38bdf8', color: '#0f172a' }}
          >
            + Add School
          </button>
        </div>

        {showAddSchool && (
          <form onSubmit={handleAddSchool} className="rounded-xl p-4 md:p-6 mb-6 max-w-xl" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: '#e2e8f0' }}>New School</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>School Name <span style={{ color: '#f87171' }}>*</span></label>
                <input type="text" value={newSchool.name}
                  onChange={e => setNewSchool(p => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle}
                  placeholder="e.g. Asanko Educational Complex" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Contact Phone</label>
                  <input type="text" value={newSchool.contact_phone}
                    onChange={e => setNewSchool(p => ({ ...p, contact_phone: e.target.value }))}
                    className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle}
                    placeholder="e.g. 0244000000" />
                </div>
                <div>
                  <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Contact Email</label>
                  <input type="email" value={newSchool.contact_email}
                    onChange={e => setNewSchool(p => ({ ...p, contact_email: e.target.value }))}
                    className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle}
                    placeholder="e.g. admin@school.com" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button type="submit" disabled={savingSchool}
                  className="px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  style={{ background: '#38bdf8', color: '#0f172a' }}>
                  {savingSchool ? 'Saving...' : 'Create School'}
                </button>
                <button type="button" onClick={() => setShowAddSchool(false)}
                  className="px-6 py-2 rounded-lg text-sm font-medium transition"
                  style={{ border: '1px solid #334155', color: '#94a3b8' }}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <UsageStats />

        <div className="rounded-xl overflow-hidden mb-8" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <div className="px-4 md:px-6 py-3" style={{ borderBottom: '1px solid #334155' }}>
            <h3 className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Schools ({schools.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Name</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Status</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Contact</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center" style={{ color: '#475569' }}>Loading...</td></tr>
                ) : schools.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center" style={{ color: '#475569' }}>No schools yet.</td></tr>
                ) : (
                  schools.map(school => (
                    <tr key={school.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td className="px-4 md:px-6 py-4 font-medium" style={{ color: '#e2e8f0' }}>{school.name}</td>
                      <td className="px-4 md:px-6 py-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium" style={
                          school.status === 'active'
                            ? { background: '#052e16', color: '#4ade80' }
                            : { background: '#2d1b1b', color: '#f87171' }
                        }>
                          {school.status}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-xs" style={{ color: '#94a3b8' }}>
                        {school.contact_phone || school.contact_email || '—'}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <button onClick={() => toggleSchoolStatus(school)}
                          className="text-sm hover:underline"
                          style={{ color: school.status === 'active' ? '#f87171' : '#4ade80' }}>
                          {school.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <div className="px-4 md:px-6 py-3" style={{ borderBottom: '1px solid #334155' }}>
            <h3 className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Logins ({profiles.length})</h3>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>Assign a school to any login showing "—"</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Email</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Role</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>School</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map(profile => (
                  <tr key={profile.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td className="px-4 md:px-6 py-4" style={{ color: '#e2e8f0' }}>{profile.email || '—'}</td>
                    <td className="px-4 md:px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: '#0f172a', color: '#38bdf8' }}>
                        {profile.role}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-xs" style={{ color: '#94a3b8' }}>
                      {assigningProfileId === profile.id ? (
                        <select value={assignSchoolValue} onChange={e => setAssignSchoolValue(e.target.value)}
                          className="rounded-lg px-2 py-1 text-xs focus:outline-none" style={inputStyle}>
                          <option value="">— No school —</option>
                          {schools.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      ) : (
                        schoolNameById(profile.school_id)
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      {assigningProfileId === profile.id ? (
                        <div className="flex gap-3">
                          <button onClick={() => saveAssign(profile.id)}
                            className="text-sm hover:underline" style={{ color: '#4ade80' }}>Save</button>
                          <button onClick={() => setAssigningProfileId(null)}
                            className="text-sm hover:underline" style={{ color: '#64748b' }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => startAssign(profile)}
                          className="text-sm hover:underline" style={{ color: '#38bdf8' }}>Assign School</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}