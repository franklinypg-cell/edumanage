'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ParentLoginPage() {
  const [learnerCode, setLearnerCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Automatically turns "DD-MM-YY" into database-friendly "YYYY-MM-DD"
  const convertDateFormat = (inputDate: string) => {
    const parts = inputDate.trim().split('-')
    if (parts.length !== 3) return null

    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    let year = parts[2]

    if (year.length === 2) {
      year = `20${year}`
    }

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

      // Securely store all possible matching identifiers for the dashboard query cross-check
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
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#e2e8f0' }}>
            Frankies Edutech
          </h1>
          <p className="text-sm mt-2" style={{ color: '#94a3b8' }}>
            Parent & Learner Portal Access
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-xs font-medium text-center border bg-red-950/30 text-red-400 border-red-900/50">
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
              Learner Date of Birth (DD-MM-YY)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 31-05-18"
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
            {loading ? 'Verifying Credentials...' : 'Secure Login'}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t" style={{ borderColor: '#334155' }}>
          <p className="text-xs" style={{ color: '#64748b' }}>
            Please input your child's birth date using hyphens. Example: 15-08-17
          </p>
        </div>

      </div>
    </div>
  )
}