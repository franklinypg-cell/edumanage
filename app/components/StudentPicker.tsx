'use client'
import { useState, useRef, useEffect } from 'react'

type Student = {
  id: string
  full_name: string
  learner_code: string
  class?: string
  [key: string]: any
}

type Props = {
  students: Student[]
  value: string
  onChange: (studentId: string) => void
  placeholder?: string
  inputStyle?: React.CSSProperties
  required?: boolean
}

export default function StudentPicker({ students, value, onChange, placeholder, inputStyle, required }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedStudent = students.find(s => s.id === value)

  useEffect(() => {
    // Keep the visible text in sync with the selected student when value changes externally
    if (selectedStudent) {
      setQuery(`${selectedStudent.full_name} — ${selectedStudent.learner_code}`)
    } else if (!value) {
      setQuery('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        // Revert to selected student's name if they click away without picking a new one
        if (selectedStudent) {
          setQuery(`${selectedStudent.full_name} — ${selectedStudent.learner_code}`)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedStudent])

  const filtered = query.trim() === '' || (selectedStudent && query === `${selectedStudent.full_name} — ${selectedStudent.learner_code}`)
    ? students
    : students.filter(s =>
        s.full_name.toLowerCase().includes(query.toLowerCase()) ||
        s.learner_code.toLowerCase().includes(query.toLowerCase())
      )

  const handleSelect = (student: Student) => {
    onChange(student.id)
    setQuery(`${student.full_name} — ${student.learner_code}`)
    setOpen(false)
  }

  const handleInputChange = (val: string) => {
    setQuery(val)
    setOpen(true)
    if (value) onChange('') // clear selection while typing a new search
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={query}
        onChange={e => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || 'Type a student name or code...'}
        className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none"
        style={inputStyle}
        required={required}
        autoComplete="off"
      />
      {/* Hidden field ensures form validation still works with required */}
      <input type="hidden" value={value} required={required} />

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg overflow-y-auto shadow-lg"
          style={{ background: '#0f172a', border: '1.5px solid #334155', maxHeight: '220px' }}
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm" style={{ color: '#64748b' }}>
              No students match "{query}"
            </div>
          ) : (
            filtered.map(s => (
              <button
                type="button"
                key={s.id}
                onClick={() => handleSelect(s)}
                className="w-full text-left px-4 py-2.5 text-sm transition"
                style={{ color: '#e2e8f0' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1e293b'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div className="font-medium">{s.full_name}</div>
                <div className="text-xs" style={{ color: '#64748b' }}>
                  {s.learner_code}{s.class ? ` · ${s.class}` : ''}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
