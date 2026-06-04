'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/sidebar'

export default function ReportCardsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [reportCards, setReportCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    student_id: '',
    term: 'Term 1',
    academic_year: '2025/2026',
  })
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else { fetchStudents(); fetchReportCards() }
    }
    checkSession()
  }, [])

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, full_name, learner_code, class')
      .order('full_name')
    if (data) setStudents(data)
  }

  const fetchReportCards = async () => {
    const { data } = await supabase
      .from('report_cards')
      .select(`*, students ( full_name, learner_code, class )`)
      .order('uploaded_at', { ascending: false })
    if (data) setReportCards(data)
    setLoading(false)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return alert('Please select a PDF file.')
    setUploading(true)

    const fileName = `${form.student_id}-${form.term.replace(/\s+/g, '_')}-${form.academic_year.replace(/\//g, '-')}-${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('report-cards')
      .upload(fileName, file)

    if (uploadError) {
      alert('Error uploading file. Please try again.')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('report-cards')
      .getPublicUrl(fileName)

    const { error: dbError } = await supabase.from('report_cards').insert({
      student_id: form.student_id,
      term: form.term,
      academic_year: form.academic_year,
      file_url: urlData.publicUrl,
    })

    if (dbError) {
      alert('Error saving report card. Please try again.')
    } else {
      setShowForm(false)
      setForm({ student_id: '', term: 'Term 1', academic_year: '2025/2026' })
      setFile(null)
      fetchReportCards()
    }
    setUploading(false)
  }

  const handleDelete = async (id: string, fileUrl: string, studentName: string) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete the report card for ${studentName}?`)
    if (!confirmed) return

    setDeletingId(id)
    try {
      const urlParts = fileUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      if (fileName) {
        await supabase.storage.from('report-cards').remove([fileName])
      }
      const { error: dbError } = await supabase
        .from('report_cards')
        .delete()
        .eq('id', id)
      if (dbError) throw dbError
      setReportCards(prev => prev.filter(rc => rc.id !== id))
    } catch (error) {
      alert('Failed to delete report card. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  // Group report cards by class
  const grouped = reportCards.reduce((acc: any, rc) => {
    const className = (rc.students as any)?.class || 'Unassigned'
    if (!acc[className]) acc[className] = []
    acc[className].push(rc)
    return acc
  }, {})

  const sortedClasses = Object.keys(grouped).sort()

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
    <div className="flex min-h-screen" style={{ background: '#0f172a', fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />
      <div className="ml-56 flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium" style={{ color: '#e2e8f0' }}>Report Cards</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{ background: '#38bdf8', color: '#0f172a' }}
          >
            {showForm ? 'Cancel Upload' : '+ Upload Report Card'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleUpload} className="rounded-xl p-6 mb-6 max-w-2xl" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: '#e2e8f0' }}>Upload Report Card</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Student <span style={{ color: '#f87171' }}>*</span></label>
                <select value={form.student_id} onChange={e => update('student_id', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle} required>
                  <option value="">Select student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} — {s.learner_code}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Term</label>
                  <select value={form.term} onChange={e => update('term', e.target.value)}
                    className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle}>
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Academic Year</label>
                  <input type="text" value={form.academic_year} onChange={e => update('academic_year', e.target.value)}
                    className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle} placeholder="2025/2026" />
                </div>
              </div>
              <div>
                <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>PDF File <span style={{ color: '#f87171' }}>*</span></label>
                <input type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={uploading}
                  className="px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  style={{ background: '#38bdf8', color: '#0f172a' }}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-6 py-2 rounded-lg text-sm font-medium transition"
                  style={{ border: '1px solid #334155', color: '#94a3b8' }}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Grouped by Class */}
        {reportCards.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <p style={{ color: '#475569' }}>No report cards uploaded yet. Click + Upload Report Card to add one.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedClasses.map(className => (
              <div key={className} className="rounded-xl overflow-hidden" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                {/* Class Header */}
                <div className="px-6 py-3" style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
                  <span className="text-sm font-semibold" style={{ color: '#38bdf8' }}>{className}</span>
                  <span className="text-xs ml-2" style={{ color: '#475569' }}>
                    {grouped[className].length} report card{grouped[className].length !== 1 ? 's' : ''}
                  </span>
                </div>
                {/* Table */}
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Student</th>
                      <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Term</th>
                      <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Academic Year</th>
                      <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Uploaded</th>
                      <th className="text-right px-6 py-3 font-medium" style={{ color: '#475569' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[className].map((rc: any) => {
                      const sName = (rc.students as any)?.full_name || 'Unknown Student'
                      return (
                        <tr key={rc.id} className="transition" style={{ borderBottom: '1px solid #1e293b' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0f172a'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                          <td className="px-6 py-4">
                            <div className="font-medium" style={{ color: '#e2e8f0' }}>{sName}</div>
                            <div className="text-xs" style={{ color: '#475569' }}>{(rc.students as any)?.learner_code}</div>
                          </td>
                          <td className="px-6 py-4" style={{ color: '#94a3b8' }}>{rc.term}</td>
                          <td className="px-6 py-4" style={{ color: '#94a3b8' }}>{rc.academic_year}</td>
                          <td className="px-6 py-4" style={{ color: '#94a3b8' }}>{new Date(rc.uploaded_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-4">
                              <a href={rc.file_url} target="_blank" rel="noopener noreferrer"
                                className="text-sm hover:underline font-medium" style={{ color: '#38bdf8' }}>
                                View PDF
                              </a>
                              <button
                                onClick={() => handleDelete(rc.id, rc.file_url, sName)}
                                disabled={deletingId === rc.id}
                                className="text-sm font-medium hover:underline disabled:opacity-40 transition"
                                style={{ color: '#f87171' }}>
                                {deletingId === rc.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}