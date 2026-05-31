'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/sidebar'

export default function ReportCardsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [reportCards, setReportCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
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
      else {
        fetchStudents()
        fetchReportCards()
      }
    }
    checkSession()
  }, [])

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, full_name, learner_code')
      .order('full_name')
    if (data) setStudents(data)
  }

  const fetchReportCards = async () => {
    const { data } = await supabase
      .from('report_cards')
      .select(`*, students ( full_name, learner_code )`)
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
  console.log('Upload error:', JSON.stringify(uploadError))
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
          <h2 className="text-lg font-medium text-gray-700">Report Cards</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            + Upload Report Card
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleUpload} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 max-w-2xl">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Upload Report Card</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Student <span className="text-red-400">*</span></label>
                <select
                  value={form.student_id}
                  onChange={e => update('student_id', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                  required
                >
                  <option value="">Select student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} — {s.learner_code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Term</label>
                  <select
                    value={form.term}
                    onChange={e => update('term', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={form.academic_year}
                    onChange={e => update('academic_year', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                    placeholder="2025/2026"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">PDF File <span className="text-red-400">*</span></label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
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

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Student</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Term</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Academic Year</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Uploaded</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {reportCards.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No report cards uploaded yet. Click + Upload Report Card to add one.
                  </td>
                </tr>
              ) : (
                reportCards.map(rc => (
                  <tr key={rc.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{(rc.students as any)?.full_name}</div>
                      <div className="text-xs text-gray-400">{(rc.students as any)?.learner_code}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{rc.term}</td>
                    <td className="px-6 py-4 text-gray-600">{rc.academic_year}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(rc.uploaded_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <a
                        href={rc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View PDF
                      </a>
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
