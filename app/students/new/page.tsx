'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import Sidebar from '../../components/sidebar'

export default function NewStudentPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    class: '',
    nationality: '',
    hometown: '',
    religion: '',
    blood_group: '',
    medical_conditions: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_phone_2: '',
    guardian_relationship: '',
    previous_school: '',
    boarding_status: '',
    class_teacher: '',
  })

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else fetchClasses()
    }
    checkSession()
  }, [])

  const fetchClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('id, name, level')
      .order('name')
    if (data) setClasses(data)
  }

  const generateLearnerCode = async () => {
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
    const number = String((count || 0) + 1).padStart(3, '0')
    return `SCH-${year}-${number}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user?.id)
      .single()

    const learner_code = await generateLearnerCode()
    const { error } = await supabase.from('students').insert({
      full_name: form.full_name,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      class: form.class,
      nationality: form.nationality,
      hometown: form.hometown,
      religion: form.religion,
      blood_group: form.blood_group,
      medical_conditions: form.medical_conditions,
      guardian_name: form.guardian_name,
      guardian_phone: form.guardian_phone,
      guardian_phone_2: form.guardian_phone_2,
      guardian_relationship: form.guardian_relationship,
      previous_school: form.previous_school,
      boarding_status: form.boarding_status,
      class_teacher: form.class_teacher,
      learner_code,
      status: 'active',
      school_id: profile?.school_id,
    })
    if (error) {
      console.error('Enrollment error:', error)
      alert(`Error enrolling student: ${error.message}`)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const groupedClasses = classes.reduce((acc: any, cls) => {
    const level = cls.level || 'Other'
    if (!acc[level]) acc[level] = []
    acc[level].push(cls)
    return acc
  }, {})

  const inputClass =
    "w-full rounded-lg px-4 py-2 text-sm bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"

  const sectionLabel = (title: string) => (
    <h3 className="text-xs font-semibold uppercase tracking-wider pb-2 mb-1 border-b border-slate-700 text-sky-400">
      {title}
    </h3>
  )

  if (success) return (
    <div className="flex min-h-screen bg-slate-900 w-full overflow-x-hidden">
      <Sidebar />
      <div className="md:ml-56 flex-1 flex items-center justify-center p-4">
        <div className="rounded-xl p-8 text-center max-w-md w-full bg-slate-800 border border-slate-700 shadow-sm">
          <div className="text-4xl mb-4 text-green-400">✓</div>
          <h2 className="text-xl font-semibold mb-2 text-slate-100">Student Enrolled</h2>
          <p className="text-sm mb-6 text-slate-400">The student has been successfully added to the system.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setSuccess(false)
                setForm({
                  full_name: '', date_of_birth: '', gender: '', class: '',
                  nationality: '', hometown: '', religion: '', blood_group: '',
                  medical_conditions: '', guardian_name: '', guardian_phone: '',
                  guardian_phone_2: '', guardian_relationship: '', previous_school: '',
                  boarding_status: '', class_teacher: '',
                })
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition bg-sky-500 text-white hover:bg-sky-400"
            >
              Add Another
            </button>
            <Link href="/students"
              className="px-4 py-2 rounded-lg text-sm font-medium transition border border-slate-600 text-sky-400 hover:bg-slate-700"
            >
              View All Students
            </Link>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-900 w-full overflow-x-hidden">
      <Sidebar />
      <div className="md:ml-56 flex-1 p-4 md:p-8">
        <Link href="/students" className="text-sm mb-6 block text-sky-400 hover:text-sky-300">
          ← Back to Students
        </Link>
        <h2 className="text-lg font-medium mb-6 text-slate-100">Enrol New Student</h2>

        <form onSubmit={handleSubmit} className="rounded-xl p-4 md:p-6 space-y-8 max-w-3xl bg-slate-800 border border-slate-700 shadow-sm">

          {sectionLabel('Personal Information')}
          <div className="space-y-4">

            <div>
              <label className="text-sm block mb-1 text-slate-400">Full Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={form.full_name}
                onChange={e => update('full_name', e.target.value)}
                className={inputClass}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm block mb-1 text-slate-400">Date of Birth <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => update('date_of_birth', e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="text-sm block mb-1 text-slate-400">Gender <span className="text-red-400">*</span></label>
                <select
                  value={form.gender}
                  onChange={e => update('gender', e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm block mb-1 text-slate-400">Nationality</label>
                <input
                  type="text"
                  value={form.nationality}
                  onChange={e => update('nationality', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Ghanaian"
                />
              </div>
              <div>
                <label className="text-sm block mb-1 text-slate-400">Hometown</label>
                <input
                  type="text"
                  value={form.hometown}
                  onChange={e => update('hometown', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Drobo"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm block mb-1 text-slate-400">Religion</label>
                <select
                  value={form.religion}
                  onChange={e => update('religion', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select religion</option>
                  <option value="Christian">Christian</option>
                  <option value="Muslim">Muslim</option>
                  <option value="Traditional">Traditional</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm block mb-1 text-slate-400">Blood Group</label>
                <select
                  value={form.blood_group}
                  onChange={e => update('blood_group', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select blood group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm block mb-1 text-slate-400">Medical Conditions</label>
              <input
                type="text"
                value={form.medical_conditions}
                onChange={e => update('medical_conditions', e.target.value)}
                className={inputClass}
                placeholder="e.g. Asthma, None"
              />
            </div>
          </div>

          {sectionLabel('School Details')}
          <div className="space-y-4">
            <div>
              <label className="text-sm block mb-1 text-slate-400">Class <span className="text-red-400">*</span></label>
              <select
                value={form.class}
                onChange={e => update('class', e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Select class</option>
                {Object.entries(groupedClasses).map(([level, cls]: any) => (
                  <optgroup key={level} label={level}>
                    {cls.map((c: any) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm block mb-1 text-slate-400">Class Teacher</label>
                <input
                  type="text"
                  value={form.class_teacher}
                  onChange={e => update('class_teacher', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Mr. Osei"
                />
              </div>
              <div>
                <label className="text-sm block mb-1 text-slate-400">Boarding Status</label>
                <select
                  value={form.boarding_status}
                  onChange={e => update('boarding_status', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select status</option>
                  <option value="Day">Day</option>
                  <option value="Boarding">Boarding</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm block mb-1 text-slate-400">Previous School</label>
              <input
                type="text"
                value={form.previous_school}
                onChange={e => update('previous_school', e.target.value)}
                className={inputClass}
                placeholder="e.g. Drobo Anglican Primary"
              />
            </div>
          </div>

          {sectionLabel('Guardian / Parent Details')}
          <div className="space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm block mb-1 text-slate-400">Guardian Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.guardian_name}
                  onChange={e => update('guardian_name', e.target.value)}
                  className={inputClass}
                  placeholder="Enter guardian name"
                  required
                />
              </div>
              <div>
                <label className="text-sm block mb-1 text-slate-400">Relationship</label>
                <select
                  value={form.guardian_relationship}
                  onChange={e => update('guardian_relationship', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select relationship</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Uncle">Uncle</option>
                  <option value="Aunt">Aunt</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm block mb-1 text-slate-400">Primary Phone <span className="text-red-400">*</span></label>
                <input
                  type="tel"
                  value={form.guardian_phone}
                  onChange={e => update('guardian_phone', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 0244000000"
                  required
                />
              </div>
              <div>
                <label className="text-sm block mb-1 text-slate-400">Secondary Phone</label>
                <input
                  type="tel"
                  value={form.guardian_phone_2}
                  onChange={e => update('guardian_phone_2', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 0554000000"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 bg-sky-500 text-white hover:bg-sky-400"
            >
              {loading ? 'Enrolling...' : 'Enrol Student'}
            </button>
            <Link href="/students"
              className="px-6 py-2 rounded-lg text-sm font-medium transition border border-slate-600 text-sky-400 hover:bg-slate-700 text-center"
            >
              Cancel
            </Link>
          </div>

        </form>
      </div>
    </div>
  )
}