// TARGET PATH IN YOUR PROJECT: app/students/bulk-upload/page.tsx
//
// Requires the 'xlsx' package (SheetJS). If not already installed:
//   npm install xlsx
//
// Reuses your existing supabase client at '../../lib/supabase' and Sidebar component,
// matching the styling conventions from app/students/new/page.tsx.

'use client'
import { useEffect, useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import Sidebar from '../../components/sidebar'

// ---------- Template column definitions ----------
// Header text in the Excel file -> field key on the students table
const HEADER_MAP: Record<string, string> = {
  'Full Name*': 'full_name',
  'Date of Birth (YYYY-MM-DD)*': 'date_of_birth',
  'Gender (Male/Female)*': 'gender',
  'Class*': 'class',
  'Guardian Name*': 'guardian_name',
  'Guardian Phone*': 'guardian_phone',
  'Guardian Phone 2': 'guardian_phone_2',
  'Guardian Relationship': 'guardian_relationship',
  'Nationality': 'nationality',
  'Hometown': 'hometown',
  'Religion': 'religion',
  'Blood Group': 'blood_group',
  'Medical Conditions': 'medical_conditions',
  'Previous School': 'previous_school',
  'Boarding Status (Day/Boarding)': 'boarding_status',
  'Class Teacher': 'class_teacher',
}
const TEMPLATE_HEADERS = Object.keys(HEADER_MAP)
const REQUIRED_KEYS = ['full_name', 'date_of_birth', 'gender', 'class', 'guardian_name', 'guardian_phone']

type Step = 'upload' | 'preview' | 'importing' | 'done'

interface ValidatedRow {
  rowNumber: number
  data: Record<string, string>
  errors: string[]
  warnings: string[]
}

interface ImportFailure {
  row: number
  name: string
  reason: string
}

export default function BulkUploadPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [step, setStep] = useState<Step>('upload')
  const [parsing, setParsing] = useState(false)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ValidatedRow[]>([])
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importResults, setImportResults] = useState<{ successCount: number; failures: ImportFailure[] } | null>(null)
  const [isTestBatch, setIsTestBatch] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else fetchClasses()
    }
    checkSession()
  }, [])

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('id, name, level').order('name')
    if (data) setClasses(data)
  }

  // ---------- Template download ----------
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new()

    const sampleRow: Record<string, string> = {
      'Full Name*': 'Ama Serwaa',
      'Date of Birth (YYYY-MM-DD)*': '2015-03-12',
      'Gender (Male/Female)*': 'Female',
      'Class*': classes[0]?.name || 'Basic 1',
      'Guardian Name*': 'Kwame Serwaa',
      'Guardian Phone*': '0244000000',
      'Guardian Phone 2': '',
      'Guardian Relationship': 'Father',
      'Nationality': 'Ghanaian',
      'Hometown': 'Drobo',
      'Religion': 'Christian',
      'Blood Group': 'O+',
      'Medical Conditions': 'None',
      'Previous School': '',
      'Boarding Status (Day/Boarding)': 'Day',
      'Class Teacher': '',
    }
    const wsStudents = XLSX.utils.json_to_sheet([sampleRow], { header: TEMPLATE_HEADERS })
    wsStudents['!cols'] = TEMPLATE_HEADERS.map(h => ({ wch: Math.max(18, h.length) }))
    XLSX.utils.book_append_sheet(wb, wsStudents, 'Students')

    const instructionLines = [
      ['Bulk Student Upload — Instructions'],
      [''],
      ['1. Do not rename or reorder the columns on the "Students" sheet.'],
      ['2. Delete the sample row before adding real data, or leave it — it will be validated like any other row.'],
      ['3. Fields marked with * are required.'],
      [''],
      ['Valid Gender values:', 'Male, Female'],
      ['Valid Boarding Status values:', 'Day, Boarding'],
      ['Date of Birth format:', 'YYYY-MM-DD (e.g. 2015-03-12)'],
      ['Guardian Phone format:', 'Digits only, e.g. 0244000000'],
      [''],
      ['Valid Class values (must match exactly):'],
      ...classes.map(c => [c.name]),
    ]
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionLines)
    wsInstructions['!cols'] = [{ wch: 45 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions')

    XLSX.writeFile(wb, 'student_bulk_upload_template.xlsx')
  }

  // ---------- File parsing ----------
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParsing(true)
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
      const sheetName = wb.SheetNames.includes('Students') ? 'Students' : wb.SheetNames[0]
      const sheet = wb.Sheets[sheetName]
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      const validated = rawRows
        .map((raw, idx) => validateRow(raw, idx + 2, classes)) // +2: row 1 is header, spreadsheet rows are 1-indexed
        .filter(r => Object.values(r.data).some(v => String(v).trim() !== '')) // skip fully blank rows

      setRows(validated)
      setStep('preview')
    } catch (err: any) {
      alert(`Could not read that file. Make sure it's the .xlsx template. (${err.message})`)
    } finally {
      setParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ---------- Import ----------
  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
  }

  const importValidRows = async () => {
    const validRows = rows.filter(r => r.errors.length === 0)
    if (validRows.length === 0) return
    setStep('importing')

    const year = new Date().getFullYear()
    const prefix = isTestBatch ? 'TEST' : 'SCH'
    const { count } = await supabase.from('students').select('*', { count: 'exact', head: true })
    let nextNumber = (count || 0) + 1

    const chunks = chunkArray(validRows, 25)
    let successCount = 0
    const failures: ImportFailure[] = []

    for (let i = 0; i < chunks.length; i++) {
      setImportProgress({ current: i + 1, total: chunks.length })
      const chunk = chunks[i]
      const payload = chunk.map(r => ({
        ...r.data,
        learner_code: `${prefix}-${year}-${String(nextNumber++).padStart(3, '0')}`,
        status: 'active',
      }))
      const { error } = await supabase.from('students').insert(payload)

      if (!error) {
        successCount += chunk.length
        continue
      }
      // Batch failed — retry row by row so we can report exactly which ones failed and why
      for (const r of chunk) {
        const singlePayload = {
          ...r.data,
          learner_code: `${prefix}-${year}-${String(nextNumber++).padStart(3, '0')}`,
          status: 'active',
        }
        const { error: singleError } = await supabase.from('students').insert(singlePayload)
        if (singleError) {
          failures.push({ row: r.rowNumber, name: r.data.full_name || '(no name)', reason: singleError.message })
        } else {
          successCount++
        }
      }
    }

    setImportResults({ successCount, failures })
    setStep('done')
  }

  const reset = () => {
    setStep('upload')
    setRows([])
    setFileName('')
    setImportResults(null)
    setImportProgress({ current: 0, total: 0 })
  }

  const validCount = rows.filter(r => r.errors.length === 0).length
  const invalidCount = rows.length - validCount

  return (
    <div className="flex w-full min-h-screen overflow-x-hidden" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="md:ml-56 flex-1 w-full p-4 md:p-8 pt-20 md:pt-8">
        <Link href="/students" className="text-sm mb-6 block" style={{ color: '#38bdf8' }}>
          ← Back to Students
        </Link>
        <h2 className="text-lg font-medium mb-6" style={{ color: '#e2e8f0' }}>Bulk Student Upload</h2>

        <div className="rounded-xl p-4 md:p-6 max-w-4xl" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          {step === 'upload' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: '#e2e8f0' }}>Step 1 — Download the template</h3>
                <p className="text-sm mb-3" style={{ color: '#94a3b8' }}>
                  The template includes an example row and an Instructions sheet listing valid classes, gender, and boarding status values pulled from your current setup.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition w-full sm:w-auto"
                  style={{ background: '#38bdf8', color: '#0f172a' }}
                >
                  Download Template (.xlsx)
                </button>
              </div>

              <div className="pt-4 border-t" style={{ borderColor: '#334155' }}>
                <h3 className="text-sm font-semibold mb-2" style={{ color: '#e2e8f0' }}>Step 2 — Fill it in and upload</h3>
                <p className="text-sm mb-3" style={{ color: '#94a3b8' }}>
                  Fields marked * are required. You'll get a chance to review and fix any problems before anything is saved.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  disabled={parsing}
                  className="text-sm"
                  style={{ color: '#e2e8f0' }}
                />
                {parsing && <p className="text-sm mt-2" style={{ color: '#38bdf8' }}>Reading file…</p>}
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Review — {fileName}</h3>
                  <p className="text-sm" style={{ color: '#94a3b8' }}>
                    {rows.length} rows found · <span style={{ color: '#4ade80' }}>{validCount} ready to import</span>
                    {invalidCount > 0 && <> · <span style={{ color: '#f87171' }}>{invalidCount} with errors</span></>}
                  </p>
                </div>
                <button onClick={reset} className="text-sm text-left sm:text-right" style={{ color: '#38bdf8' }}>Start over</button>
              </div>

              <div className="max-h-96 overflow-y-auto overflow-x-auto rounded-lg border" style={{ borderColor: '#334155' }}>
                <table className="w-full text-sm min-w-[520px]">
                  <thead className="sticky top-0" style={{ background: '#0f172a' }}>
                    <tr>
                      <th className="text-left px-3 py-2" style={{ color: '#475569' }}>Row</th>
                      <th className="text-left px-3 py-2" style={{ color: '#475569' }}>Name</th>
                      <th className="text-left px-3 py-2" style={{ color: '#475569' }}>Class</th>
                      <th className="text-left px-3 py-2" style={{ color: '#475569' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.rowNumber} className="border-t" style={{ borderColor: '#1e293b' }}>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#94a3b8' }}>{r.rowNumber}</td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#e2e8f0' }}>{r.data.full_name || <em style={{ color: '#f87171' }}>missing</em>}</td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#e2e8f0' }}>{r.data.class || '—'}</td>
                        <td className="px-3 py-2">
                          {r.errors.length > 0 ? (
                            <span style={{ color: '#f87171' }}>{r.errors.join('; ')}</span>
                          ) : r.warnings.length > 0 ? (
                            <span style={{ color: '#facc15' }}>OK — {r.warnings.join('; ')}</span>
                          ) : (
                            <span style={{ color: '#4ade80' }}>Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <label className="flex items-start gap-2 text-sm" style={{ color: '#94a3b8' }}>
                <input
                  type="checkbox"
                  checked={isTestBatch}
                  onChange={e => setIsTestBatch(e.target.checked)}
                  className="mt-1"
                />
                <span>This is a test batch — use <span className="font-mono">TEST-</span> prefixed learner codes so it's easy to find and delete later</span>
              </label>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={importValidRows}
                  disabled={validCount === 0}
                  className="px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 w-full sm:w-auto"
                  style={{ background: isTestBatch ? '#f59e0b' : '#38bdf8', color: '#0f172a' }}
                >
                  Import {validCount} valid row{validCount === 1 ? '' : 's'}{isTestBatch ? ' (test)' : ''}
                </button>
                {invalidCount > 0 && (
                  <p className="text-sm self-center" style={{ color: '#94a3b8' }}>
                    Fix the {invalidCount} row{invalidCount === 1 ? '' : 's'} with errors in Excel and re-upload to include them.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-10">
              <p className="text-sm mb-3" style={{ color: '#e2e8f0' }}>
                Importing batch {importProgress.current} of {importProgress.total}…
              </p>
              <div className="w-full h-2 rounded-full overflow-hidden max-w-xs mx-auto" style={{ background: '#334155' }}>
                <div
                  className="h-full transition-all"
                  style={{
                    background: '#38bdf8',
                    width: `${(importProgress.current / Math.max(importProgress.total, 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {step === 'done' && importResults && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4" style={{ color: '#4ade80' }}>✓</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#e2e8f0' }}>Import complete</h3>
              <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>
                {importResults.successCount} student{importResults.successCount === 1 ? '' : 's'} enrolled successfully.
              </p>
              {importResults.failures.length > 0 && (
                <div className="text-left max-w-lg mx-auto mb-6 rounded-lg p-4" style={{ background: '#2d1b1b', border: '1px solid #7f1d1d' }}>
                  <p className="text-sm font-medium mb-2" style={{ color: '#f87171' }}>
                    {importResults.failures.length} row{importResults.failures.length === 1 ? '' : 's'} failed to save:
                  </p>
                  <ul className="text-sm space-y-1" style={{ color: '#fca5a5' }}>
                    {importResults.failures.map(f => (
                      <li key={f.row}>Row {f.row} ({f.name}): {f.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition"
                  style={{ background: '#38bdf8', color: '#0f172a' }}
                >
                  Upload More
                </button>
                <Link href="/students"
                  className="px-4 py-2 rounded-lg text-sm font-medium transition"
                  style={{ border: '1px solid #334155', color: '#38bdf8' }}
                >
                  View All Students
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- Validation ----------
function validateRow(raw: Record<string, any>, rowNumber: number, classes: any[]): ValidatedRow {
  const errors: string[] = []
  const warnings: string[] = []
  const data: Record<string, string> = {}

  // Map headers -> field keys, tolerating stray whitespace in header names
  const get = (header: string) => {
    const key = Object.keys(raw).find(k => k.trim() === header)
    return key ? String(raw[key]).trim() : ''
  }

  for (const [header, fieldKey] of Object.entries(HEADER_MAP)) {
    data[fieldKey] = get(header)
  }

  // Required fields present
  for (const key of REQUIRED_KEYS) {
    if (!data[key]) errors.push(`${key.replace('_', ' ')} is required`)
  }

  // Date of birth — cellDates:true gives JS Date objects for real date cells,
  // but typed/text dates come through as strings, so handle both.
  const dobRaw = raw[Object.keys(raw).find(k => k.trim() === 'Date of Birth (YYYY-MM-DD)*') || '']
  if (dobRaw) {
    let d: Date | null = null
    if (dobRaw instanceof Date) {
      d = dobRaw
    } else {
      const parsed = new Date(String(dobRaw))
      if (!isNaN(parsed.getTime())) d = parsed
    }
    if (d) {
      const yyyy = d.getUTCFullYear()
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(d.getUTCDate()).padStart(2, '0')
      data.date_of_birth = `${yyyy}-${mm}-${dd}`
    } else {
      errors.push('date of birth is not a valid date')
    }
  }

  // Gender
  if (data.gender) {
    const g = data.gender.toLowerCase()
    if (g === 'male' || g === 'm') data.gender = 'male'
    else if (g === 'female' || g === 'f') data.gender = 'female'
    else errors.push(`gender "${data.gender}" must be Male or Female`)
  }

  // Class — must match an existing class exactly (case-insensitive)
  if (data.class) {
    const match = classes.find(c => c.name.toLowerCase() === data.class.toLowerCase())
    if (match) data.class = match.name
    else errors.push(`class "${data.class}" does not match any existing class`)
  }

  // Guardian phone — loose check, digits only, 9-13 chars after stripping spaces/dashes
  if (data.guardian_phone) {
    const digits = data.guardian_phone.replace(/[\s-]/g, '')
    if (!/^\+?\d{9,13}$/.test(digits)) {
      warnings.push('guardian phone format looks unusual — please double check')
    }
    data.guardian_phone = digits
  }
  if (data.guardian_phone_2) {
    data.guardian_phone_2 = data.guardian_phone_2.replace(/[\s-]/g, '')
  }

  // Boarding status — normalize casing if recognizable, otherwise keep as typed with a warning
  if (data.boarding_status) {
    const b = data.boarding_status.toLowerCase()
    if (b === 'day') data.boarding_status = 'Day'
    else if (b === 'boarding') data.boarding_status = 'Boarding'
    else warnings.push(`boarding status "${data.boarding_status}" is non-standard`)
  }

  return { rowNumber, data, errors, warnings }
}