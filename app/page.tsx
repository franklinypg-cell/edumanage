'use client'
import { useState } from 'react'
import { supabase } from './lib/supabase'

type LoginTab = 'admin' | 'parent'

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<LoginTab>('admin')

  // Admin state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')

  // Parent state
  const [learnerCode, setLearnerCode] = useState('')
  const [dob, setDob] = useState('')
  const [parentLoading, setParentLoading] = useState(false)
  const [parentError, setParentError] = useState('')

  const convertDateFormat = (inputDate: string) => {
    const parts = inputDate.trim().split('-')
    if (parts.length !== 3) return null
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    let year = parts[2]
    if (year.length === 2) year = `20${year}`
    return `${year}-${month}-${day}`
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminLoading(true)
    setAdminError('')

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !authData.user) {
      setAdminError('Invalid email or password')
      setAdminLoading(false)
      return
    }

    // Check role to decide where this login should land.
    // Super admins go to the platform-wide /admin dashboard;
    // everyone else goes to their school's /dashboard as before.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      // Fall back to the normal dashboard if the role lookup fails,
      // rather than leaving the user stuck on a loading state.
      window.location.href = '/dashboard'
      return
    }

    if (profile?.role === 'super_admin') {
      window.location.href = '/admin'
    } else {
      window.location.href = '/dashboard'
    }
  }

  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setParentLoading(true)
    setParentError('')

    const dbFormattedDate = convertDateFormat(dob)

    if (!dbFormattedDate) {
      setParentError('Please enter the date of birth in the exact format: DD-MM-YY (e.g., 31-05-18)')
      setParentLoading(false)
      return
    }

    try {
      const { data: studentResults, error: dbError } = await supabase
        .rpc('parent_lookup_student', {
          p_learner_code: learnerCode.trim(),
          p_dob: dbFormattedDate,
        })

      const student = studentResults?.[0]

      if (dbError || !student) {
        setParentError('Invalid Learner Code or Date of Birth. Please check and try again.')
        setParentLoading(false)
        return
      }

      localStorage.setItem('parent_student_id', student.id)
      localStorage.setItem('parent_student_learner_code', student.learner_code)
      localStorage.setItem('parent_student_name', student.full_name)

      window.location.href = '/parent/dashboard'
    } catch (err) {
      console.error(err)
      setParentError('An unexpected error occurred. Please try again.')
    } finally {
      setParentLoading(false)
    }
  }

  const inputStyle = { background: '#0f172a', borderColor: '#334155', color: '#e2e8f0' }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f172a', fontFamily: 'Poppins, sans-serif' }}>
      <div className="w-full max-w-md rounded-2xl p-8 shadow-2xl border" style={{ background: '#1e293b', borderColor: '#334155' }}>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ background: '#0c2a3f' }}>
            <span style={{ fontSize: '26px' }}>🏫</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#e2e8f0' }}>
            Frankies EduTech
          </h1>
          <p className="text-sm font-medium mt-1" style={{ color: '#38bdf8' }}>
            {activeTab === 'admin' ? 'School Admin Portal' : 'Parent Portal'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b pb-px" style={{ borderColor: '#334155' }}>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className="flex-1 px-4 py-2.5 text-sm font-semibold border-b-2 transition"
            style={{
              color: activeTab === 'admin' ? '#38bdf8' : '#64748b',
              borderColor: activeTab === 'admin' ? '#38bdf8' : 'transparent',
            }}
          >
            Admin / Staff
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parent')}
            className="flex-1 px-4 py-2.5 text-sm font-semibold border-b-2 transition"
            style={{
              color: activeTab === 'parent' ? '#38bdf8' : '#64748b',
              borderColor: activeTab === 'parent' ? '#38bdf8' : 'transparent',
            }}
          >
            Parent
          </button>
        </div>

        {/* ADMIN FORM */}
        {activeTab === 'admin' && (
          <div>
            <p className="text-xs mb-5 leading-relaxed" style={{ color: '#94a3b8' }}>
              Sign in with your staff email and password to manage students, classes, fees, and reports.
            </p>

            {adminError && (
              <div className="mb-4 p-3 rounded-lg text-xs font-medium text-center border" style={{ background: 'rgba(127,29,29,0.2)', color: '#f87171', borderColor: 'rgba(127,29,29,0.4)' }}>
                {adminError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label className="text-xs block mb-1.5 font-medium" style={{ color: '#94a3b8' }}>Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none transition border focus:border-sky-500"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-xs block mb-1.5 font-medium" style={{ color: '#94a3b8' }}>Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none transition border focus:border-sky-500"
                  style={inputStyle}
                />
              </div>
              <button
                type="submit"
                disabled={adminLoading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition mt-4 disabled:opacity-50"
                style={{ background: '#38bdf8', color: '#0f172a' }}
              >
                {adminLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        )}

        {/* PARENT FORM */}
        {activeTab === 'parent' && (
          <div>
            <p className="text-xs mb-5 leading-relaxed" style={{ color: '#94a3b8' }}>
              Stay close to your child's journey. View their reports, track payments, and download receipts — all in one place.
            </p>

            {parentError && (
              <div className="mb-4 p-3 rounded-lg text-xs font-medium text-center border" style={{ background: 'rgba(127,29,29,0.2)', color: '#f87171', borderColor: 'rgba(127,29,29,0.4)' }}>
                {parentError}
              </div>
            )}

            <form onSubmit={handleParentLogin} className="space-y-5">
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
                  style={inputStyle}
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
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none transition border focus:border-sky-500"
                  style={inputStyle}
                />
              </div>

              <button
                type="submit"
                disabled={parentLoading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition mt-4 disabled:opacity-50"
                style={{ background: '#38bdf8', color: '#0f172a' }}
              >
                {parentLoading ? 'Verifying...' : 'Access Portal'}
              </button>
            </form>

            <p className="text-xs mt-4 leading-relaxed text-center" style={{ color: '#64748b' }}>
              Date format: <span style={{ color: '#38bdf8' }}>DD-MM-YY</span> — e.g. <span style={{ color: '#38bdf8' }}>15-08-17</span>
            </p>
          </div>
        )}

        <div className="text-center mt-6 pt-4 border-t" style={{ borderColor: '#334155' }}>
          <p className="text-xs italic" style={{ color: '#334155' }}>
            Powered by Frankies EduTech &mdash; Built for Ghana's schools.
          </p>
        </div>

      </div>
    </div>
  )
}