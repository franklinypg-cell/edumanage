"use client"
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/sidebar'
import jsPDF from 'jspdf'

type Fee = {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  receipt_number: string
  term: string
  academic_year: string
  students: { full_name: string; learner_code: string; class?: string }
}

export default function FeesPage() {
  const [fees, setFees] = useState<Fee[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bulkPrinting, setBulkPrinting] = useState(false)
  const [bulkFilter, setBulkFilter] = useState({ term: 'Term 1', academic_year: '2025/2026' })
  const [form, setForm] = useState({
    student_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    term: 'Term 1',
    academic_year: '2025/2026',
  })

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else { fetchFees(); fetchStudents() }
    }
    checkSession()
  }, [])

  const fetchFees = async () => {
    const { data } = await supabase
      .from('fees')
      .select('*, students ( full_name, learner_code, class )')
      .order('created_at', { ascending: false })
    if (data) setFees(data as any)
    setLoading(false)
  }

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, full_name, learner_code')
      .eq('status', 'active')
      .order('full_name')
    if (data) setStudents(data)
  }

  // ── Draw a single slip (10-per-page: 2 cols x 5 rows) — black & white only ──
  const drawSlip = (doc: jsPDF, fee: any, x: number, y: number, slipW: number, slipH: number) => {
    const pad = 4
    const mid = x + slipW / 2

    // Outer border
    doc.setDrawColor(0)
    doc.setLineWidth(0.5)
    doc.rect(x + 1, y + 1, slipW - 2, slipH - 2)

    // Header — black bar with white text
    doc.setFillColor(0, 0, 0)
    doc.rect(x + 1, y + 1, slipW - 2, 13, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('FRANKIES EDUTECH', mid, y + 7, { align: 'center' })
    doc.setFontSize(5)
    doc.setFont('helvetica', 'normal')
    doc.text('OFFICIAL FEE RECEIPT', mid, y + 11.5, { align: 'center' })

    // Receipt ref & date
    doc.setTextColor(0)
    doc.setFontSize(5.5)
    doc.setFont('helvetica', 'bold')
    doc.text(`Ref: ${fee.receipt_number}`, x + pad, y + 17)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60)
    doc.text(`${fee.payment_date}`, x + slipW - pad, y + 17, { align: 'right' })

    // Divider
    doc.setDrawColor(0)
    doc.setLineWidth(0.2)
    doc.line(x + pad, y + 19, x + slipW - pad, y + 19)

    // Student info
    doc.setTextColor(80)
    doc.setFontSize(4.5)
    doc.setFont('helvetica', 'normal')
    doc.text('STUDENT', x + pad, y + 22.5)
    doc.setTextColor(0)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    const name = fee.students?.full_name || '—'
    doc.text(name.length > 24 ? name.substring(0, 24) + '...' : name, x + pad, y + 26)

    doc.setTextColor(80)
    doc.setFontSize(4.5)
    doc.setFont('helvetica', 'normal')
    doc.text('CODE', mid, y + 22.5)
    doc.setTextColor(0)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.text(fee.students?.learner_code || '—', mid, y + 26)

    doc.setTextColor(80)
    doc.setFontSize(4.5)
    doc.setFont('helvetica', 'normal')
    doc.text('CLASS', x + pad, y + 29.5)
    doc.setTextColor(0)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.text(fee.students?.class || '—', x + pad, y + 33)

    doc.setTextColor(80)
    doc.setFontSize(4.5)
    doc.setFont('helvetica', 'normal')
    doc.text('TERM / YEAR', mid, y + 29.5)
    doc.setTextColor(0)
    doc.setFontSize(5.5)
    doc.setFont('helvetica', 'bold')
    doc.text(`${fee.term}  ${fee.academic_year}`, mid, y + 33)

    // Amount box — black border, no fill
    doc.setDrawColor(0)
    doc.setLineWidth(0.4)
    doc.rect(x + pad, y + 35, slipW - pad * 2, 10)
    doc.setTextColor(80)
    doc.setFontSize(4.5)
    doc.setFont('helvetica', 'normal')
    doc.text('AMOUNT PAID', mid, y + 38.5, { align: 'center' })
    doc.setTextColor(0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(`GHS ${Number(fee.amount).toFixed(2)}`, mid, y + 43, { align: 'center' })

    // Method
    doc.setTextColor(60)
    doc.setFontSize(5)
    doc.setFont('helvetica', 'normal')
    doc.text(`Method: ${fee.payment_method.replace('_', ' ').toUpperCase()}`, x + pad, y + 47.5)

    // Divider
    doc.setDrawColor(0)
    doc.setLineWidth(0.15)
    doc.line(x + pad, y + 49, x + slipW - pad, y + 49)

    // Signature line
    doc.setTextColor(60)
    doc.setFontSize(5)
    doc.text('Authorised by: ___________________', x + pad, y + 53)

    // Stamp box
    doc.setDrawColor(0)
    doc.setLineWidth(0.3)
    doc.rect(x + slipW - pad - 22, y + 49, 22, 10)
    doc.setTextColor(120)
    doc.setFontSize(4.5)
    doc.text('OFFICIAL', x + slipW - pad - 11, y + 53, { align: 'center' })
    doc.text('STAMP', x + slipW - pad - 11, y + 56.5, { align: 'center' })

    // Trademark footer
    doc.setTextColor(140)
    doc.setFontSize(3.8)
    doc.setFont('helvetica', 'italic')
    doc.text('TM Frankies EduTech. All rights reserved.', mid, y + slipH - 2, { align: 'center' })
  }

  // ── Single A4 receipt — black & white, official ──
  const generateReceipt = (fee: any) => {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' })
    const pageW = 210
    const pad = 20

    // Header bar — black
    doc.setFillColor(0, 0, 0)
    doc.rect(0, 0, pageW, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('FRANKIES EDUTECH', pageW / 2, 13, { align: 'center' })
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(200, 200, 200)
    doc.text('School Management & Fee Payment System', pageW / 2, 20, { align: 'center' })
    doc.setFontSize(7.5)
    doc.text('OFFICIAL FEE RECEIPT', pageW / 2, 27, { align: 'center' })

    // Receipt ref & date
    doc.setTextColor(0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`Receipt No:  ${fee.receipt_number}`, pad, 42)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80)
    doc.text(`Date Issued: ${fee.payment_date}`, pageW - pad, 42, { align: 'right' })

    doc.setDrawColor(0)
    doc.setLineWidth(0.4)
    doc.line(pad, 46, pageW - pad, 46)

    // Student info box
    doc.setDrawColor(0)
    doc.setLineWidth(0.4)
    doc.rect(pad, 52, pageW - pad * 2, 44)

    // Section header — black bar
    doc.setFillColor(0, 0, 0)
    doc.rect(pad, 52, pageW - pad * 2, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('STUDENT INFORMATION', pad + 5, 57.5)

    doc.setTextColor(100)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Full Name', pad + 5, 68)
    doc.setTextColor(0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(fee.students?.full_name || '—', pad + 5, 75)

    doc.setTextColor(100)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Learner Code', pageW / 2, 68)
    doc.setTextColor(0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(fee.students?.learner_code || '—', pageW / 2, 75)

    doc.setTextColor(100)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Class', pad + 5, 84)
    doc.setTextColor(0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(fee.students?.class || '—', pad + 5, 91)

    doc.setTextColor(100)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Term / Academic Year', pageW / 2, 84)
    doc.setTextColor(0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`${fee.term}  |  ${fee.academic_year}`, pageW / 2, 91)

    // Payment box
    doc.setDrawColor(0)
    doc.setLineWidth(0.4)
    doc.rect(pad, 102, pageW - pad * 2, 28)

    doc.setFillColor(0, 0, 0)
    doc.rect(pad, 102, pageW - pad * 2, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('PAYMENT DETAILS', pad + 5, 107.5)

    doc.setTextColor(80)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Amount Paid', pageW / 2, 117, { align: 'center' })
    doc.setTextColor(0)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text(`GHS ${Number(fee.amount).toFixed(2)}`, pageW / 2, 126, { align: 'center' })

    doc.setTextColor(60)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Payment Method: ${fee.payment_method.replace('_', ' ').toUpperCase()}`, pad, 138)

    doc.setDrawColor(0)
    doc.setLineWidth(0.3)
    doc.line(pad, 143, pageW - pad, 143)

    // Signature & stamp
    doc.setTextColor(0)
    doc.setFontSize(10)
    doc.text('Received by:   _______________________________', pad, 156)
    doc.text('Authorised by: _______________________________', pad, 170)

    doc.setDrawColor(0)
    doc.setLineWidth(0.4)
    doc.rect(pageW - pad - 50, 148, 50, 30)
    doc.setTextColor(120)
    doc.setFontSize(9)
    doc.text('OFFICIAL STAMP', pageW - pad - 25, 165, { align: 'center' })

    // Footer note
    doc.setDrawColor(0)
    doc.setLineWidth(0.3)
    doc.line(pad, 188, pageW - pad, 188)
    doc.setTextColor(100)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text('Thank you for your payment. Please keep this receipt for your records.', pageW / 2, 196, { align: 'center' })
    doc.text('This is a computer-generated receipt and is valid without a physical signature.', pageW / 2, 203, { align: 'center' })

    // Trademark footer bar — black
    doc.setFillColor(0, 0, 0)
    doc.rect(0, 277, pageW, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('FRANKIES EDUTECH', pageW / 2, 285, { align: 'center' })
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(180, 180, 180)
    doc.text('Empowering Ghana\'s Schools with Smart Technology  |  frankiesedutech.com', pageW / 2, 291, { align: 'center' })
    doc.text('TM Frankies EduTech. All rights reserved.', pageW / 2, 296, { align: 'center' })

    doc.save(`receipt-${fee.receipt_number}.pdf`)
  }

  // ── Bulk print — 10 per page (2 cols x 5 rows) ──
  const generateBulkReceipts = async () => {
    setBulkPrinting(true)
    const { data } = await supabase
      .from('fees')
      .select('*, students ( full_name, learner_code, class )')
      .eq('term', bulkFilter.term)
      .eq('academic_year', bulkFilter.academic_year)
      .order('created_at', { ascending: true })

    if (!data || data.length === 0) {
      alert('No payments found for the selected term and year.')
      setBulkPrinting(false)
      return
    }

    const doc = new jsPDF({ format: 'a4', unit: 'mm' })
    const pageW = 210
    const pageH = 297
    const cols = 2
    const rows = 5
    const slipW = pageW / cols
    const slipH = pageH / rows

    data.forEach((fee, index) => {
      if (index > 0 && index % (cols * rows) === 0) doc.addPage()
      const pos = index % (cols * rows)
      const col = pos % cols
      const row = Math.floor(pos / cols)
      drawSlip(doc, fee, col * slipW, row * slipH, slipW, slipH)
    })

    doc.save(`bulk-receipts-${bulkFilter.term}-${bulkFilter.academic_year.replace('/', '-')}.pdf`)
    setBulkPrinting(false)
    setShowBulkForm(false)
  }

  const generateReceiptNumber = async () => {
    const { count } = await supabase
      .from('fees')
      .select('*', { count: 'exact', head: true })
    const number = String((count || 0) + 1).padStart(4, '0')
    return `RCP-${new Date().getFullYear()}-${number}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const receipt_number = await generateReceiptNumber()
    const { error } = await supabase.from('fees').insert({
      ...form,
      amount: parseFloat(form.amount),
      receipt_number,
    })
    if (error) {
      alert('Error recording payment. Please try again.')
    } else {
      setShowForm(false)
      setForm({
        student_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        term: 'Term 1',
        academic_year: '2025/2026',
      })
      fetchFees()
    }
    setSubmitting(false)
  }

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
    <div className="flex min-h-screen" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="ml-56 flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium" style={{ color: '#e2e8f0' }}>Fee Payments</h2>
          <div className="flex gap-3">
            <button onClick={() => setShowBulkForm(!showBulkForm)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{ border: '1px solid #334155', color: '#94a3b8' }}>
              Bulk Print Receipts
            </button>
            <button onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{ background: '#38bdf8', color: '#0f172a' }}>
              + Record Payment
            </button>
          </div>
        </div>

        {showBulkForm && (
          <div className="rounded-xl p-6 mb-6 max-w-lg" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: '#e2e8f0' }}>Bulk Print Receipts</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Term</label>
                <select value={bulkFilter.term}
                  onChange={e => setBulkFilter(p => ({ ...p, term: e.target.value }))}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle}>
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>
              <div>
                <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Academic Year</label>
                <input type="text" value={bulkFilter.academic_year}
                  onChange={e => setBulkFilter(p => ({ ...p, academic_year: e.target.value }))}
                  className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle}
                  placeholder="2025/2026" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={generateBulkReceipts} disabled={bulkPrinting}
                className="px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                style={{ background: '#38bdf8', color: '#0f172a' }}>
                {bulkPrinting ? 'Generating...' : 'Download PDF'}
              </button>
              <button onClick={() => setShowBulkForm(false)}
                className="px-6 py-2 rounded-lg text-sm font-medium transition"
                style={{ border: '1px solid #334155', color: '#94a3b8' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-xl p-6 mb-6 max-w-2xl" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: '#e2e8f0' }}>Record New Payment</h3>
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
                  <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Amount (GHS) <span style={{ color: '#f87171' }}>*</span></label>
                  <input type="number" value={form.amount} onChange={e => update('amount', e.target.value)}
                    className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle} placeholder="0.00" required />
                </div>
                <div>
                  <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Payment Date <span style={{ color: '#f87171' }}>*</span></label>
                  <input type="date" value={form.payment_date} onChange={e => update('payment_date', e.target.value)}
                    className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm block mb-1" style={{ color: '#94a3b8' }}>Payment Method</label>
                  <select value={form.payment_method} onChange={e => update('payment_method', e.target.value)}
                    className="w-full rounded-lg px-4 py-2 text-sm focus:outline-none" style={inputStyle}>
                    <option value="cash">Cash</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
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
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting}
                  className="px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  style={{ background: '#38bdf8', color: '#0f172a' }}>
                  {submitting ? 'Saving...' : 'Record Payment'}
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

        <div className="rounded-xl overflow-hidden" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Receipt No.</th>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Student</th>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Amount</th>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Method</th>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Term</th>
                <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {fees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center" style={{ color: '#475569' }}>
                    No payments recorded yet. Click + Record Payment to add one.
                  </td>
                </tr>
              ) : (
                fees.map(fee => (
                  <tr key={fee.id} className="cursor-pointer transition" style={{ borderBottom: '1px solid #1e293b' }}
                    onClick={() => generateReceipt(fee)}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0f172a'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <td className="px-6 py-4 font-mono" style={{ color: '#38bdf8' }}>{fee.receipt_number}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium" style={{ color: '#e2e8f0' }}>{(fee.students as any)?.full_name}</div>
                      <div className="text-xs" style={{ color: '#475569' }}>{(fee.students as any)?.learner_code}</div>
                    </td>
                    <td className="px-6 py-4 font-medium" style={{ color: '#4ade80' }}>GHS {fee.amount}</td>
                    <td className="px-6 py-4 capitalize" style={{ color: '#94a3b8' }}>{fee.payment_method.replace('_', ' ')}</td>
                    <td className="px-6 py-4" style={{ color: '#94a3b8' }}>{fee.term} · {fee.academic_year}</td>
                    <td className="px-6 py-4" style={{ color: '#94a3b8' }}>{fee.payment_date}</td>
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