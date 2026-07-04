"use client"
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/sidebar'
import jsPDF from 'jspdf'

type Fee = {
  id: string
  amount: number
  arrears?: number
  balance?: number
  term_fee_expected?: number
  payment_date: string
  payment_method: string
  receipt_number: string
  term: string
  academic_year: string
  students: { full_name: string; learner_code: string; class?: string }
}

type FeeStructure = {
  id: string
  class: string
  term: string
  academic_year: string
  amount: number
}

// Helper: turns term + academic_year into a sortable number so we can tell
// which terms came "before" the current one (e.g. Term 1 2025/2026 < Term 2 2025/2026)
const termOrderKey = (term: string, academicYear: string) => {
  const yearStart = parseInt((academicYear || '0').split('/')[0], 10) || 0
  const termIndex = term === 'Term 1' ? 0 : term === 'Term 2' ? 1 : term === 'Term 3' ? 2 : 0
  return yearStart * 3 + termIndex
}

export default function FeesPage() {
  const [fees, setFees] = useState<Fee[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [showStructureForm, setShowStructureForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bulkPrinting, setBulkPrinting] = useState(false)
  const [bulkFilter, setBulkFilter] = useState({ term: 'Term 1', academic_year: '2025/2026' })
  const [calculatedArrears, setCalculatedArrears] = useState(0)
  const [checkingArrears, setCheckingArrears] = useState(false)
  const [termFeeExpected, setTermFeeExpected] = useState(0)
  const [paidThisTermSoFar, setPaidThisTermSoFar] = useState(0)
  const [balancePreview, setBalancePreview] = useState(0)

  const [form, setForm] = useState({
    student_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    term: 'Term 1',
    academic_year: '2025/2026',
  })

  const [structureForm, setStructureForm] = useState({
    class: '',
    term: 'Term 1',
    academic_year: '2025/2026',
    amount: '',
  })

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else { fetchFees(); fetchStudents(); fetchClasses(); fetchFeeStructures() }
    }
    checkSession()
  }, [])

  // Recalculate arrears + current-term balance whenever student, term, year, or amount changes
  useEffect(() => {
    if (form.student_id && form.term && form.academic_year) {
      recalculateArrears()
    } else {
      setCalculatedArrears(0)
      setTermFeeExpected(0)
      setPaidThisTermSoFar(0)
      setBalancePreview(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.student_id, form.term, form.academic_year, form.amount])

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
      .select('id, full_name, learner_code, class')
      .eq('status', 'active')
      .order('full_name')
    if (data) setStudents(data)
  }

  const fetchClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('name, level')
      .order('name')
    if (data) setClasses(data)
  }

  const fetchFeeStructures = async () => {
    const { data } = await supabase
      .from('fee_structure')
      .select('*')
      .order('academic_year', { ascending: false })
      .order('term')
    if (data) setFeeStructures(data as any)
  }

  // ── Core arrears + balance logic ──
  // arrears = (expected fees for all terms BEFORE the current one) - (total paid in those terms)
  // balance = (this term's fee + arrears) - (everything paid this term so far, including this payment)
  const recalculateArrears = async () => {
    setCheckingArrears(true)
    const student = students.find(s => s.id === form.student_id)
    if (!student || !student.class) {
      setCalculatedArrears(0)
      setTermFeeExpected(0)
      setPaidThisTermSoFar(0)
      setBalancePreview(0)
      setCheckingArrears(false)
      return
    }

    const currentKey = termOrderKey(form.term, form.academic_year)

    // All fee structure rows for this student's class
    const { data: structureRows } = await supabase
      .from('fee_structure')
      .select('term, academic_year, amount')
      .eq('class', student.class)

    // Arrears: expected fees from terms strictly BEFORE the current one, minus what was paid then
    const totalExpectedBefore = (structureRows || [])
      .filter(row => termOrderKey(row.term, row.academic_year) < currentKey)
      .reduce((sum, row) => sum + Number(row.amount), 0)

    // This term's own expected fee (exact match on class + term + year)
    const thisTermRow = (structureRows || []).find(
      row => row.term === form.term && row.academic_year === form.academic_year
    )
    const thisTermExpected = thisTermRow ? Number(thisTermRow.amount) : 0

    // All payments this student has made, ever
    const { data: paymentRows } = await supabase
      .from('fees')
      .select('term, academic_year, amount')
      .eq('student_id', form.student_id)

    const totalPaidBefore = (paymentRows || [])
      .filter(row => termOrderKey(row.term, row.academic_year) < currentKey)
      .reduce((sum, row) => sum + Number(row.amount), 0)

    // Already paid THIS exact term (installments so far, before this new payment)
    const paidThisTerm = (paymentRows || [])
      .filter(row => row.term === form.term && row.academic_year === form.academic_year)
      .reduce((sum, row) => sum + Number(row.amount), 0)

    const arrears = Math.max(totalExpectedBefore - totalPaidBefore, 0)
    const newPaymentAmount = parseFloat(form.amount) || 0
    const totalDue = thisTermExpected + arrears
    const totalPaidIncludingNow = paidThisTerm + newPaymentAmount
    const balance = totalDue - totalPaidIncludingNow

    setCalculatedArrears(arrears)
    setTermFeeExpected(thisTermExpected)
    setPaidThisTermSoFar(paidThisTerm)
    setBalancePreview(balance)
    setCheckingArrears(false)
  }

  const handleStructureSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('fee_structure').upsert({
      class: structureForm.class,
      term: structureForm.term,
      academic_year: structureForm.academic_year,
      amount: parseFloat(structureForm.amount),
    }, { onConflict: 'class,term,academic_year' })

    if (error) {
      alert('Error saving fee structure. Please try again.')
    } else {
      setStructureForm({ class: '', term: 'Term 1', academic_year: '2025/2026', amount: '' })
      fetchFeeStructures()
    }
  }

  const deleteFeeStructure = async (id: string) => {
    if (!confirm('Delete this fee structure entry?')) return
    await supabase.from('fee_structure').delete().eq('id', id)
    fetchFeeStructures()
  }

  // ── Draw a single slip (10-per-page: 2 cols x 5 rows) — black & white only ──
  const drawSlip = (doc: jsPDF, fee: any, x: number, y: number, slipW: number, slipH: number) => {
    const pad = 4
    const mid = x + slipW / 2
    const hasArrears = Number(fee.arrears) > 0

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

    // Amount box — black border, no fill (grows to fit arrears/balance lines)
    const slipExtraLines = (hasArrears ? 1 : 0) + (Number(fee.balance) !== 0 || Number(fee.term_fee_expected) > 0 ? 1 : 0)
    const amountBoxH = 10 + slipExtraLines * 4
    doc.setDrawColor(0)
    doc.setLineWidth(0.4)
    doc.rect(x + pad, y + 35, slipW - pad * 2, amountBoxH)
    doc.setTextColor(80)
    doc.setFontSize(4.5)
    doc.setFont('helvetica', 'normal')
    doc.text('AMOUNT PAID', mid, y + 38.5, { align: 'center' })
    doc.setTextColor(0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(`GHS ${Number(fee.amount).toFixed(2)}`, mid, y + 43, { align: 'center' })

    let slipCursor = y + 47
    if (hasArrears) {
      doc.setTextColor(0)
      doc.setFontSize(4.5)
      doc.setFont('helvetica', 'bold')
      doc.text(`Arrears (Prev. Term): GHS ${Number(fee.arrears).toFixed(2)}`, mid, slipCursor, { align: 'center' })
      slipCursor += 4
    }

    const slipBalance = Number(fee.balance) || 0
    if (slipBalance !== 0) {
      doc.setTextColor(0)
      doc.setFontSize(4.5)
      doc.setFont('helvetica', 'bold')
      const label = slipBalance > 0
        ? `Balance Owing: GHS ${slipBalance.toFixed(2)}`
        : `Overpaid: GHS ${Math.abs(slipBalance).toFixed(2)}`
      doc.text(label, mid, slipCursor, { align: 'center' })
      slipCursor += 4
    } else if (Number(fee.term_fee_expected) > 0) {
      doc.setTextColor(0)
      doc.setFontSize(4.5)
      doc.setFont('helvetica', 'bold')
      doc.text('PAID IN FULL', mid, slipCursor, { align: 'center' })
      slipCursor += 4
    }

    // Method
    const methodY = slipCursor + 0.5
    doc.setTextColor(60)
    doc.setFontSize(5)
    doc.setFont('helvetica', 'normal')
    doc.text(`Method: ${fee.payment_method.replace('_', ' ').toUpperCase()}`, x + pad, methodY)

    // Divider
    const dividerY = methodY + 3.5
    doc.setDrawColor(0)
    doc.setLineWidth(0.15)
    doc.line(x + pad, dividerY, x + slipW - pad, dividerY)

    // Signature line
    doc.setTextColor(60)
    doc.setFontSize(5)
    doc.text('Authorised by: ___________________', x + pad, dividerY + 4)

    // Stamp box
    doc.setDrawColor(0)
    doc.setLineWidth(0.3)
    doc.rect(x + slipW - pad - 22, dividerY, 22, 10)
    doc.setTextColor(120)
    doc.setFontSize(4.5)
    doc.text('OFFICIAL', x + slipW - pad - 11, dividerY + 4, { align: 'center' })
    doc.text('STAMP', x + slipW - pad - 11, dividerY + 7.5, { align: 'center' })

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
    const hasArrears = Number(fee.arrears) > 0

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

    // Payment box (grows to fit arrears/balance lines if present)
    const extraLines = (hasArrears ? 1 : 0) + (Number(fee.balance) !== 0 || Number(fee.term_fee_expected) > 0 ? 1 : 0)
    const paymentBoxH = 28 + extraLines * 8
    doc.setDrawColor(0)
    doc.setLineWidth(0.4)
    doc.rect(pad, 102, pageW - pad * 2, paymentBoxH)

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

    let afterPaymentY = 138
    let lineCursor = 134
    if (hasArrears) {
      doc.setTextColor(0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(`Arrears Carried Forward (Previous Term): GHS ${Number(fee.arrears).toFixed(2)}`, pageW / 2, lineCursor, { align: 'center' })
      lineCursor += 6
      afterPaymentY = lineCursor + 8
    }

    const balanceVal = Number(fee.balance) || 0
    if (balanceVal !== 0) {
      doc.setTextColor(0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const balanceLabel = balanceVal > 0
        ? `Balance Remaining This Term: GHS ${balanceVal.toFixed(2)}`
        : `Overpaid / Credit: GHS ${Math.abs(balanceVal).toFixed(2)}`
      doc.text(balanceLabel, pageW / 2, lineCursor, { align: 'center' })
      lineCursor += 6
      afterPaymentY = lineCursor + 8
    } else if (Number(fee.term_fee_expected) > 0) {
      doc.setTextColor(0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('PAID IN FULL FOR THIS TERM', pageW / 2, lineCursor, { align: 'center' })
      lineCursor += 6
      afterPaymentY = lineCursor + 8
    }

    doc.setTextColor(60)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Payment Method: ${fee.payment_method.replace('_', ' ').toUpperCase()}`, pad, afterPaymentY)

    doc.setDrawColor(0)
    doc.setLineWidth(0.3)
    doc.line(pad, afterPaymentY + 5, pageW - pad, afterPaymentY + 5)

    // Signature & stamp
    const sigY1 = afterPaymentY + 18
    const sigY2 = afterPaymentY + 32
    doc.setTextColor(0)
    doc.setFontSize(10)
    doc.text('Received by:   _______________________________', pad, sigY1)
    doc.text('Authorised by: _______________________________', pad, sigY2)

    doc.setDrawColor(0)
    doc.setLineWidth(0.4)
    doc.rect(pageW - pad - 50, sigY1 - 8, 50, 30)
    doc.setTextColor(120)
    doc.setFontSize(9)
    doc.text('OFFICIAL STAMP', pageW - pad - 25, sigY1 + 9, { align: 'center' })

    // Footer note
    const footerLineY = sigY2 + 18
    doc.setDrawColor(0)
    doc.setLineWidth(0.3)
    doc.line(pad, footerLineY, pageW - pad, footerLineY)
    doc.setTextColor(100)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text('Thank you for your payment. Please keep this receipt for your records.', pageW / 2, footerLineY + 8, { align: 'center' })
    doc.text('This is a computer-generated receipt and is valid without a physical signature.', pageW / 2, footerLineY + 15, { align: 'center' })

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
      arrears: calculatedArrears,
      term_fee_expected: termFeeExpected,
      balance: balancePreview,
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
      setCalculatedArrears(0)
      fetchFees()
    }
    setSubmitting(false)
  }

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const updateStructure = (field: string, value: string) =>
    setStructureForm(prev => ({ ...prev, [field]: value }))

  const inputStyle = { background: '#0f172a', border: '1.5px solid #334155', color: '#e2e8f0' }

  if (loading) return (
    <div className="flex min-h-screen" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="md:ml-56 flex-1 flex items-center justify-center pt-14 md:pt-0">
        <p style={{ color: '#475569' }}>Loading...</p>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="md:ml-56 flex-1 p-4 md:p-8 pt-20 md:pt-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <h2 className="text-lg font-medium" style={{ color: '#e2e8f0' }}>Fee Payments</h2>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowStructureForm(!showStructureForm)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{ border: '1px solid #334155', color: '#94a3b8' }}>
              Fee Structure
            </button>
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

        {showStructureForm && (
          <div className="rounded-xl p-6 mb-6 max-w-2xl" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: '#e2e8f0' }}>Fee Structure — Set Expected Fees Per Class</h3>
            <p className="text-xs mb-4" style={{ color: '#64748b' }}>
              Set the expected termly fee for each class. This is used to automatically calculate arrears (unpaid balances carried from previous terms).
            </p>
            <form onSubmit={handleStructureSubmit} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <select value={structureForm.class} onChange={e => updateStructure('class', e.target.value)}
                className="rounded-lg px-3 py-2 text-sm focus:outline-none col-span-2 sm:col-span-1" style={inputStyle} required>
                <option value="">Class</option>
                {classes.map((c, i) => (
                  <option key={i} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select value={structureForm.term} onChange={e => updateStructure('term', e.target.value)}
                className="rounded-lg px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
              <input type="text" value={structureForm.academic_year} onChange={e => updateStructure('academic_year', e.target.value)}
                className="rounded-lg px-3 py-2 text-sm focus:outline-none" style={inputStyle} placeholder="2025/2026" required />
              <div className="flex gap-2">
                <input type="number" value={structureForm.amount} onChange={e => updateStructure('amount', e.target.value)}
                  className="rounded-lg px-3 py-2 text-sm focus:outline-none w-full" style={inputStyle} placeholder="GHS" required />
                <button type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-medium transition shrink-0"
                  style={{ background: '#38bdf8', color: '#0f172a' }}>
                  Save
                </button>
              </div>
            </form>

            {feeStructures.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[400px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      <th className="text-left py-2 pr-3" style={{ color: '#475569' }}>Class</th>
                      <th className="text-left py-2 pr-3" style={{ color: '#475569' }}>Term</th>
                      <th className="text-left py-2 pr-3" style={{ color: '#475569' }}>Year</th>
                      <th className="text-left py-2 pr-3" style={{ color: '#475569' }}>Amount</th>
                      <th className="text-left py-2" style={{ color: '#475569' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeStructures.map(fs => (
                      <tr key={fs.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td className="py-2 pr-3" style={{ color: '#e2e8f0' }}>{fs.class}</td>
                        <td className="py-2 pr-3" style={{ color: '#94a3b8' }}>{fs.term}</td>
                        <td className="py-2 pr-3" style={{ color: '#94a3b8' }}>{fs.academic_year}</td>
                        <td className="py-2 pr-3" style={{ color: '#4ade80' }}>GHS {fs.amount}</td>
                        <td className="py-2">
                          <button onClick={() => deleteFeeStructure(fs.id)}
                            className="text-xs" style={{ color: '#f87171' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

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

              {/* Fee breakdown preview — auto-calculated, read-only */}
              {form.student_id && (
                <div className="rounded-lg px-4 py-3 space-y-2" style={{ background: '#0f172a', border: '1px solid #334155' }}>
                  {checkingArrears ? (
                    <p className="text-sm" style={{ color: '#94a3b8' }}>Calculating...</p>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#94a3b8' }}>Term Fee ({form.term})</span>
                        <span style={{ color: '#e2e8f0' }}>
                          {termFeeExpected > 0 ? `GHS ${termFeeExpected.toFixed(2)}` : 'Not set in Fee Structure'}
                        </span>
                      </div>
                      {calculatedArrears > 0 && (
                        <div className="flex justify-between text-sm">
                          <span style={{ color: '#94a3b8' }}>+ Arrears (previous terms)</span>
                          <span style={{ color: '#f87171' }}>GHS {calculatedArrears.toFixed(2)}</span>
                        </div>
                      )}
                      {paidThisTermSoFar > 0 && (
                        <div className="flex justify-between text-sm">
                          <span style={{ color: '#94a3b8' }}>Already paid this term</span>
                          <span style={{ color: '#4ade80' }}>GHS {paidThisTermSoFar.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm pt-2" style={{ borderTop: '1px solid #334155' }}>
                        <span style={{ color: '#e2e8f0' }}>Balance after this payment</span>
                        <span className="font-semibold" style={{ color: balancePreview > 0 ? '#f87171' : '#4ade80' }}>
                          {balancePreview > 0
                            ? `GHS ${balancePreview.toFixed(2)} owing`
                            : balancePreview < 0
                            ? `GHS ${Math.abs(balancePreview).toFixed(2)} overpaid`
                            : 'Paid in full'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Receipt No.</th>
                  <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Student</th>
                  <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Amount</th>
                  <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Arrears</th>
                  <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Balance</th>
                  <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Method</th>
                  <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Term</th>
                  <th className="text-left px-6 py-3 font-medium" style={{ color: '#475569' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {fees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center" style={{ color: '#475569' }}>
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
                      <td className="px-6 py-4 font-medium" style={{ color: Number(fee.arrears) > 0 ? '#f87171' : '#475569' }}>
                        {Number(fee.arrears) > 0 ? `GHS ${fee.arrears}` : '—'}
                      </td>
                      <td className="px-6 py-4 font-medium" style={{ color: Number((fee as any).balance) > 0 ? '#f87171' : Number((fee as any).balance) < 0 ? '#facc15' : '#4ade80' }}>
                        {Number((fee as any).balance) > 0
                          ? `GHS ${(fee as any).balance} owing`
                          : Number((fee as any).balance) < 0
                          ? `GHS ${Math.abs((fee as any).balance)} credit`
                          : 'Paid up'}
                      </td>
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
    </div>
  )
}