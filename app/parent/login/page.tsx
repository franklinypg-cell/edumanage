'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ParentLoginPage() {
  const [learnerCode, setLearnerCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const convertDateFormat = (inputDate: string) => {
    const parts = inputDate.trim().split('-')
    if (parts.length !== 3) return null
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    let year = parts[2]
    if (year.length === 2) year = `20${year}`
    return `${year}-${month}-${day}`
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const dbFormattedDate = convertDateFormat(password)

    if (!dbFormattedDate) {
      setError('Please enter the date of birth in the exact format: DD-MM-YY (e.g., 31-05-18)')
      setLoading(false)
      return
    }

    try {
      const { data: student, error: dbError } = await supabase
        .from('students')
        .select('id, full_name, learner_code')
        .eq('learner_code', learnerCode.trim())
        .eq('date_of_birth', dbFormattedDate)
        .single()

      if (dbError || !student) {
        setError('Invalid Learner Code or Date of Birth. Please check and try again.')
        setLoading(false)
        return
      }

      localStorage.setItem('parent_student_id', student.id)
      localStorage.setItem('parent_student_learner_code', student.learner_code)
      localStorage.setItem('parent_student_name', student.full_name)

      window.location.href = '/parent/dashboard'
    } catch (err) {
      console.error(err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f172a', fontFamily: 'Poppins, sans-serif' }}>
      <div className="w-full max-w-md rounded-2xl p-8 shadow-2xl border" style={{ background: '#1e293b', borderColor: '#334155' }}>

        {/* Header — warm and humanised */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ background: '#0c2a3f' }}>
            <span style={{ fontSize: '26px' }}>🏫</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#e2e8f0' }}>
            Akwaaba!
          </h1>
          <p className="text-sm font-medium mt-1" style={{ color: '#38bdf8' }}>
            Frankies EduTech — Parent Portal
          </p>
          <p className="text-xs mt-3 leading-relaxed" style={{ color: '#94a3b8' }}>
            Stay close to your child's journey. View their reports, track payments, and download receipts — all in one place.
          </p>
          <p className="text-xs mt-1 italic" style={{ color: '#475569' }}>
            "Onipa na ɔkyere onipa kwan."
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-xs font-medium text-center border" style={{ background: 'rgba(127,29,29,0.2)', color: '#f87171', borderColor: 'rgba(127,29,29,0.4)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-xs block mb-1.5 font-medium" style={{ color: '#94a3b8' }}>
              Learner Code / Student ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. SCH-2026-001"
              value={learnerCode}
              onChange={(e) => setLearnerCode(e.target.value)}
              className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none transition border focus:border-sky-500"
              style={{ background: '#0f172a', borderColor: '#334155', color: '#e2e8f0' }}
            />
          </div>

          <div>
            <label className="text-xs block mb-1.5 font-medium" style={{ color: '#94a3b8' }}>
              Learner's Date of Birth
            </label>
            <input
              type="text"
              required
              placeholder="DD-MM-YY  (e.g. 31-05-18)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none transition border focus:border-sky-500"
              style={{ background: '#0f172a', borderColor: '#334155', color: '#e2e8f0' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition mt-4 disabled:opacity-50"
            style={{ background: '#38bdf8', color: '#0f172a' }}
          >
            {loading ? 'Verifying...' : 'Access Portal'}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t" style={{ borderColor: '#334155' }}>
          <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
            Use your child's learner code and date of birth to log in.<br />
            Date format: <span style={{ color: '#38bdf8' }}>DD-MM-YY</span> — e.g. <span style={{ color: '#38bdf8' }}>15-08-17</span>
          </p>
          <p className="text-xs mt-3 italic" style={{ color: '#334155' }}>
            Powered by Frankies EduTech &mdash; Built for Ghana's schools.
          </p>
        </div>

      </div>
    </div>
  )
}