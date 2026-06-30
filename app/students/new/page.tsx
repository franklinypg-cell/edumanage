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
    // Personal
    full_name: '',
    date_of_birth: '',
    gender: '',
    class: '',
    nationality: '',
    hometown: '',
    religion: '',
    blood_group: '',
    medical_conditions: '',
    // Guardian
    guardian_name: '',
    guardian_phone: '',
    guardian_phone_2: '',
    guardian_relationship: '',
    // Additional
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

  const inputStyle = {
    background: '#ffffff',
    border: '1.5px solid #c7d2fe',
    color: '#1e293b',
  }

  const sectionLabel = (title: string) => (
    <h3 className="text-xs font-semibold uppercase tracking-wider pb-2 mb-1 border-b" style={{ color: '#4f46e5', borderColor: '#e0e7ff' }}>
      {title}
    </h3>
  )

  if (success) return (
    <div className="flex min-h-screen bg-indigo-50/40">
      <Sidebar />
      <div className="ml-56 flex-1 flex items-center justify-center">
        <div className="rounded-xl p-8 text-center max-w-md w-full bg-white shadow-sm" style={{ border: '1px solid #e0e7ff' }}>
          <div className="text-4xl mb-4" style={{ color: '#16a34a' }}>✓</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#1e1b4b' }}>Student Enrolled</h2>
          <p className="text-sm mb-6" style={{ color: '#64748b' }}>The student has been successfully added to the system.</p>
          <div className="flex gap-3 justify-center">
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
              className="px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{ background: '#4f46e5', color: '#ffffff' }}
            >
              Add Another
            </button>
            <Link href="/students"
              className="px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{ border: '1px solid #c7d2fe', color: '#4f46e5' }}
            >
              View All Students
            </Link>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-indigo-50/40">
      <Sidebar />
      <div className="ml-56 flex-1 p-8">
        <Link href="/students" className="text-sm mb-6 block" style={{ color: '#4f46e5' }}>
          ← Back to Students
        </Link>
        <h2 className="text-lg font-medium mb-6" style={{ color: '#1e1b4b' }}>Enrol New Student</h2>

        <form onSubmit={handleSubmit} className="rounded-xl p-6 space-y-8 max-w-3xl bg-white shadow-sm" style={{ border: '1px solid #e0e7ff' }}>

          {sectionLabel('Personal Information')}
          <div className="space-y-4">

            <div>
              <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Full Name <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="text"
                value={form.full_name}
                onChange={e => update('full_name', e.target.value)}
                className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                style={inputStyle}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Date of Birth <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => update('date_of_birth', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Gender <span style={{ color: '#dc2626' }}>*</span></label>
                <select
                  value={form.gender}
                  onChange={e => update('gender', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Nationality</label>
                <input
                  type="text"
                  value={form.nationality}
                  onChange={e => update('nationality', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="e.g. Ghanaian"
                />
              </div>
              <div>
                <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Hometown</label>
                <input
                  type="text"
                  value={form.hometown}
                  onChange={e => update('hometown', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="e.g. Drobo"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Religion</label>
                <select
                  value={form.religion}
                  onChange={e => update('religion', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                >
                  <option value="">Select religion</option>
                  <option value="Christian">Christian</option>
                  <option value="Muslim">Muslim</option>
                  <option value="Traditional">Traditional</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Blood Group</label>
                <select
                  value={form.blood_group}
                  onChange={e => update('blood_group', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                >
                  <option value="">Select blood group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Medical Conditions</label>
              <input
                type="text"
                value={form.medical_conditions}
                onChange={e => update('medical_conditions', e.target.value)}
                className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                style={inputStyle}
                placeholder="e.g. Asthma, None"
              />
            </div>
          </div>

          {sectionLabel('School Details')}
          <div className="space-y-4">
            <div>
              <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Class <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                value={form.class}
                onChange={e => update('class', e.target.value)}
                className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                style={inputStyle}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Class Teacher</label>
                <input
                  type="text"
                  value={form.class_teacher}
                  onChange={e => update('class_teacher', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="e.g. Mr. Osei"
                />
              </div>
              <div>
                <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Boarding Status</label>
                <select
                  value={form.boarding_status}
                  onChange={e => update('boarding_status', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                >
                  <option value="">Select status</option>
                  <option value="Day">Day</option>
                  <option value="Boarding">Boarding</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Previous School</label>
              <input
                type="text"
                value={form.previous_school}
                onChange={e => update('previous_school', e.target.value)}
                className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                style={inputStyle}
                placeholder="e.g. Drobo Anglican Primary"
              />
            </div>
          </div>

          {sectionLabel('Guardian / Parent Details')}
          <div className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Guardian Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text"
                  value={form.guardian_name}
                  onChange={e => update('guardian_name', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="Enter guardian name"
                  required
                />
              </div>
              <div>
                <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Relationship</label>
                <select
                  value={form.guardian_relationship}
                  onChange={e => update('guardian_relationship', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                  style={inputStyle}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Primary Phone <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="tel"
                  value={form.guardian_phone}
                  onChange={e => update('guardian_phone', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="e.g. 0244000000"
                  required
                />
              </div>
              <div>
                <label className="text-sm block mb-1" style={{ color: '#64748b' }}>Secondary Phone</label>
                <input
                  type="tel"
                  value={form.guardian_phone_2}
                  onChange={e => update('guardian_phone_2', e.target.value)}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="e.g. 0554000000"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
              style={{ background: '#4f46e5', color: '#ffffff' }}
            >
              {loading ? 'Enrolling...' : 'Enrol Student'}
            </button>
            <Link href="/students"
              className="px-6 py-2 rounded-lg text-sm font-medium transition"
              style={{ border: '1px solid #c7d2fe', color: '#4f46e5' }}
            >
              Cancel
            </Link>
          </div>

        </form>
      </div>
    </div>
  )
}