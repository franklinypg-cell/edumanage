'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ParentDashboardPage() {
  const [student, setStudent] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'academics' | 'finance'>('academics')
  const [displayClass, setDisplayClass] = useState('General / Unassigned')
  const [totalPaid, setTotalPaid] = useState(0)

  useEffect(() => {
    const fetchPortalData = async () => {
      const studentId = localStorage.getItem('parent_student_id')
      const storedName = localStorage.getItem('parent_student_name')
      const learnerCode = localStorage.getItem('parent_student_learner_code')

      if (!studentId) {
        window.location.href = '/parent/login'
        return
      }

      try {
        const { data: studentData } = await supabase
          .from('students')
          .select('*')
          .eq('id', studentId)
          .single()

        const activeStudent = studentData || { id: studentId, full_name: storedName, learner_code: learnerCode }
        setStudent(activeStudent)

        let detectedClass = activeStudent.class_name || activeStudent.class || activeStudent.grade || activeStudent.classroom || ''
        const targetName = String(activeStudent.full_name || '').trim().toLowerCase()
        const targetCode = String(activeStudent.learner_code || '').trim().toLowerCase()
        const targetId = String(activeStudent.id || '').trim().toLowerCase()

        const { data: allReports } = await supabase
          .from('report_cards')
          .select('*')
          .order('uploaded_at', { ascending: false })

        if (allReports && allReports.length > 0) {
          const filteredReports = allReports.filter((rc: any) => {
            const rcStudentId = String(rc.student_id || '').trim().toLowerCase()
            const rcStudentName = String(rc.student_name || '').trim().toLowerCase()
            const rcLearnerCode = String(rc.learner_code || '').trim().toLowerCase()
            return rcStudentId === targetId || rcStudentId === targetCode || rcStudentName === targetName || rcLearnerCode === targetCode
          })
          setReports(filteredReports)

          if (!detectedClass && filteredReports.length > 0) {
            const firstReport = filteredReports[0]
            detectedClass = firstReport.class_name || firstReport.class || firstReport.class_group || ''
            if (!detectedClass && firstReport.term) {
              const termParts = firstReport.term.split('-')
              if (termParts.length > 1) detectedClass = termParts[0].trim()
            }
          }
        }
        if (detectedClass) setDisplayClass(detectedClass)

        const { data: feeRecords } = await supabase
          .from('fees')
          .select('*')
          .eq('student_id', studentId)
          .order('payment_date', { ascending: false })

        if (feeRecords && feeRecords.length > 0) {
          setPayments(feeRecords)
          let paidSum = 0
          feeRecords.forEach((p: any) => { paidSum += Number(p.amount || 0) })
          setTotalPaid(paidSum)
        }

      } catch (err) {
        console.error('Error fetching portal data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPortalData()
  }, [])

  const handlePrintReceipt = (receipt: any) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const receiptHtml = `
      <html>
        <head>
          <title>Receipt - Frankies Edutech</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
            .receipt-box { max-width: 800px; margin: auto; border: 1px solid #eee; padding: 30px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); }
            .header { display: flex; justify-content: space-between; border-b: 2px solid #0284c7; padding-bottom: 20px; margin-bottom: 30px; }
            .school-title { font-size: 24px; font-weight: bold; color: #0284c7; }
            .receipt-title { font-size: 20px; font-weight: bold; text-transform: uppercase; color: #475569; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .meta-item p { margin: 4px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 14px; }
            th { background-color: #f8fafc; font-weight: bold; }
            .footer { text-align: center; margin-top: 60px; font-size: 12px; color: #94a3b8; border-t: 1px dashed #cbd5e1; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <div class="header">
              <div>
                <div class="school-title">FRANKIES EDUTECH</div>
                <p style="margin:4px 0; font-size:12px; color:#64748b;">Official Academic Payment Receipt</p>
              </div>
              <div class="receipt-title">Official Receipt</div>
            </div>
            <div class="meta-grid">
              <div class="meta-item">
                <p><strong>Learner Name:</strong> ${student?.full_name}</p>
                <p><strong>Learner Code:</strong> ${student?.learner_code || 'N/A'}</p>
                <p><strong>Classroom:</strong> ${displayClass}</p>
              </div>
              <div class="meta-item" style="text-align: right;">
                <p><strong>Receipt No:</strong> ${receipt.receipt_number || 'N/A'}</p>
                <p><strong>Date Issued:</strong> ${new Date(receipt.payment_date).toLocaleDateString()}</p>
                <p><strong>Payment Method:</strong> ${receipt.payment_method || 'Cash / Mobile Money'}</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Description / Academic Cycle</th>
                  <th style="text-align: right;">Amount Paid (GHS)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>School Fees Payment - ${receipt.term || 'Current Term'} (${receipt.academic_year || 'Current Year'})</td>
                  <td style="text-align: right; font-weight: bold;">GHS ${Number(receipt.amount || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <div class="footer">
              <p>Thank you for your continuous support towards your child's education.</p>
              <p style="font-size:10px; margin-top:5px;">This is a computer-generated document. No physical signature required.</p>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `
    printWindow.document.write(receiptHtml)
    printWindow.document.close()
  }

  const handleLogout = () => {
    localStorage.clear()
    window.location.href = '/parent/login'
  }

  // Get first name only for greeting
  const firstName = student?.full_name?.split(' ')[0] || 'Parent'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a', fontFamily: 'Poppins, sans-serif' }}>
      <div className="text-center">
        <p style={{ color: '#38bdf8', fontSize: '14px' }}>Loading your child's profile...</p>
        <p style={{ color: '#475569', fontSize: '12px', marginTop: '6px' }}>Mɛhwɛ wo ba ho nsɛm...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: '#0f172a', fontFamily: 'Poppins, sans-serif' }}>
      <div className="max-w-5xl mx-auto">

        {/* Navigation */}
        <div className="flex justify-between items-center mb-8 pb-4 border-b" style={{ borderColor: '#334155' }}>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: '#e2e8f0' }}>
              Frankies EduTech
            </h1>
            <p className="text-xs" style={{ color: '#38bdf8' }}>Parent & Learner Portal</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg text-xs font-medium border transition hover:bg-red-950/20"
            style={{ borderColor: '#334155', color: '#f87171' }}
          >
            Sign Out
          </button>
        </div>

        {/* Welcome Banner */}
        {student && (
          <div className="rounded-2xl p-6 mb-6 border" style={{ background: '#0c1a2e', borderColor: '#1e3a5f' }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#38bdf8' }}>
                  Akwaaba — Wo ho te sɛn?
                </p>
                <h2 className="text-xl font-semibold" style={{ color: '#e2e8f0' }}>
                  Good to see you, {firstName}'s family.
                </h2>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: '#94a3b8' }}>
                  Here's a full view of <span style={{ color: '#38bdf8', fontWeight: 500 }}>{student.full_name}</span>'s academic progress and payment history. We're glad you're involved — it makes all the difference.
                </p>
                <p className="text-xs mt-3 italic" style={{ color: '#334155' }}>
                  "Onipa na ɔkyere onipa kwan." — It takes a person to show another the way.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Card */}
        {student && (
          <div className="rounded-2xl p-5 mb-6 border flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ background: '#1e293b', borderColor: '#334155' }}>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: '#0284c7', color: '#e0f2fe' }}>
                Active Learner
              </span>
              <h3 className="text-lg font-semibold mt-2" style={{ color: '#e2e8f0' }}>
                {student.full_name}
              </h3>
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                ID Code: <span className="font-mono" style={{ color: '#38bdf8' }}>{student.learner_code}</span>
              </p>
            </div>
            <div className="md:text-right border-t md:border-t-0 pt-4 md:pt-0" style={{ borderColor: '#334155' }}>
              <p className="text-xs" style={{ color: '#64748b' }}>Assigned Classroom</p>
              <p className="text-lg font-medium" style={{ color: '#38bdf8' }}>{displayClass}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b pb-px" style={{ borderColor: '#334155' }}>
          <button
            onClick={() => setActiveTab('academics')}
            className="px-4 py-2.5 text-xs font-semibold border-b-2 transition"
            style={{
              color: activeTab === 'academics' ? '#38bdf8' : '#64748b',
              borderColor: activeTab === 'academics' ? '#38bdf8' : 'transparent'
            }}
          >
            Terminal Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className="px-4 py-2.5 text-xs font-semibold border-b-2 transition"
            style={{
              color: activeTab === 'finance' ? '#38bdf8' : '#64748b',
              borderColor: activeTab === 'finance' ? '#38bdf8' : 'transparent'
            }}
          >
            Fees & Receipts ({payments.length})
          </button>
        </div>

        {/* ACADEMICS TAB */}
        {activeTab === 'academics' && (
          <div>
            {reports.length === 0 ? (
              <div className="rounded-xl p-10 text-center border" style={{ background: '#1e293b', borderColor: '#334155' }}>
                <p style={{ color: '#e2e8f0', fontWeight: 500, marginBottom: '6px' }}>No reports published yet</p>
                <p style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.6' }}>
                  Once the school publishes {student?.full_name?.split(' ')[0]}'s terminal report card, it will appear here. Check back after the end of term.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {reports.map((rc) => (
                  <div key={rc.id} className="rounded-xl p-5 border flex flex-col justify-between gap-4" style={{ background: '#1e293b', borderColor: '#334155' }}>
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-sm" style={{ color: '#e2e8f0' }}>{rc.term}</h4>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#0f172a', color: '#94a3b8' }}>{rc.academic_year}</span>
                      </div>
                      <p className="text-[11px] mt-2" style={{ color: '#64748b' }}>
                        Published: {new Date(rc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <a
                      href={rc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center block py-2 rounded-lg text-xs font-semibold transition"
                      style={{ background: '#38bdf8', color: '#0f172a' }}
                    >
                      View Report Card (PDF)
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FINANCE TAB */}
        {activeTab === 'finance' && (
          <div className="space-y-6">

            <div className="p-4 rounded-xl border max-w-sm" style={{ background: '#111827', borderColor: '#22c55e40' }}>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#22c55e' }}>Total Fees Paid</p>
              <p className="text-xl font-bold mt-1" style={{ color: '#e2e8f0' }}>GHS {totalPaid.toFixed(2)}</p>
              <p className="text-xs mt-1" style={{ color: '#475569' }}>Across all recorded payments</p>
            </div>

            <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Payment History</h4>

            {payments.length === 0 ? (
              <div className="rounded-xl p-10 text-center border" style={{ background: '#1e293b', borderColor: '#334155' }}>
                <p style={{ color: '#e2e8f0', fontWeight: 500, marginBottom: '6px' }}>No payments recorded yet</p>
                <p style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.6' }}>
                  Once a fee payment is recorded by the school, it will show up here along with a printable receipt.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-4 rounded-xl border flex justify-between items-center gap-4" style={{ background: '#1e293b', borderColor: '#334155' }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono px-1.5 py-0.5 rounded" style={{ color: '#4ade80', background: 'rgba(20,83,45,0.3)' }}>
                          + GHS {Number(payment.amount || 0).toFixed(2)}
                        </span>
                        <p className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>
                          {payment.term || 'General Fee'}
                        </p>
                      </div>
                      <p className="text-[11px] mt-1" style={{ color: '#64748b' }}>
                        {new Date(payment.payment_date).toLocaleDateString()} &nbsp;&middot;&nbsp; {payment.academic_year || 'N/A'} &nbsp;&middot;&nbsp; {payment.payment_method || 'Cash'}
                      </p>
                    </div>
                    <button
                      onClick={() => handlePrintReceipt(payment)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition"
                      style={{ borderColor: '#334155', color: '#38bdf8' }}
                    >
                      Print Receipt
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t text-center" style={{ borderColor: '#1e293b' }}>
          <p className="text-xs italic" style={{ color: '#334155' }}>
            Frankies EduTech &mdash; Built for Ghana's schools, with love.
          </p>
        </div>

      </div>
    </div>
  )
}