'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

type School = {
  id: string
  name: string
  status: string
}

type BillingRow = {
  school_id: string
  monthly_fee: number
  last_payment_date: string | null
  next_due_date: string | null
  notes: string | null
}

type MergedRow = {
  school_id: string
  school_name: string
  school_status: string
  monthly_fee: number
  last_payment_date: string | null
  next_due_date: string | null
  notes: string | null
  hasBillingSetup: boolean
}

const DAY = 24 * 60 * 60 * 1000

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(iso: string | null) {
  if (!iso) return null
  const diff = new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)
  return Math.round(diff / DAY)
}

export default function BillingStatus({ refreshKey }: { refreshKey?: number }) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<MergedRow[]>([])
  const [editingFeeFor, setEditingFeeFor] = useState<string | null>(null)
  const [feeInput, setFeeInput] = useState('')
  const [editingDueFor, setEditingDueFor] = useState<string | null>(null)
  const [dueInput, setDueInput] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [refreshKey])

  const loadData = async () => {
    setLoading(true)

    const { data: schoolsData } = await supabase
      .from('schools')
      .select('id, name, status')
      .order('name')

    const { data: billingData } = await supabase
      .from('school_billing')
      .select('school_id, monthly_fee, last_payment_date, next_due_date, notes')

    const billingMap = new Map<string, BillingRow>()
    for (const b of (billingData as BillingRow[]) || []) {
      billingMap.set(b.school_id, b)
    }

    const merged: MergedRow[] = ((schoolsData as School[]) || []).map(s => {
      const b = billingMap.get(s.id)
      return {
        school_id: s.id,
        school_name: s.name,
        school_status: s.status,
        monthly_fee: b?.monthly_fee ?? 0,
        last_payment_date: b?.last_payment_date ?? null,
        next_due_date: b?.next_due_date ?? null,
        notes: b?.notes ?? null,
        hasBillingSetup: !!b,
      }
    })

    setRows(merged)
    setLoading(false)
  }

  // Upserts so schools without a billing row yet get one created on first save.
  const upsertBilling = async (schoolId: string, fields: Partial<BillingRow>) => {
    setSavingId(schoolId)
    const { error } = await supabase
      .from('school_billing')
      .upsert({ school_id: schoolId, ...fields, updated_at: new Date().toISOString() }, { onConflict: 'school_id' })

    if (error) {
      alert('Error saving billing info: ' + error.message)
    } else {
      await loadData()
    }
    setSavingId(null)
  }

  const handleSetupBilling = (schoolId: string) => {
    setEditingFeeFor(schoolId)
    setFeeInput('0')
  }

  const startEditFee = (row: MergedRow) => {
    setEditingFeeFor(row.school_id)
    setFeeInput(String(row.monthly_fee))
  }

  const saveFee = async (schoolId: string) => {
    const parsed = parseFloat(feeInput)
    if (isNaN(parsed) || parsed < 0) {
      alert('Enter a valid amount')
      return
    }
    await upsertBilling(schoolId, { monthly_fee: parsed })
    setEditingFeeFor(null)
  }

  const startEditDue = (row: MergedRow) => {
    setEditingDueFor(row.school_id)
    setDueInput(row.next_due_date || todayISO())
  }

  const saveDue = async (schoolId: string) => {
    await upsertBilling(schoolId, { next_due_date: dueInput })
    setEditingDueFor(null)
  }

  const markAsPaid = async (row: MergedRow) => {
    if (!confirm(`Mark "${row.school_name}" as paid today? This sets the next due date to 30 days from now.`)) return
    await upsertBilling(row.school_id, {
      last_payment_date: todayISO(),
      next_due_date: addDaysISO(30),
      monthly_fee: row.monthly_fee,
    })
  }

  const statusFor = (row: MergedRow) => {
    if (!row.hasBillingSetup || !row.next_due_date) {
      return { label: 'Not set up', bg: '#0f172a', color: '#64748b' }
    }
    const days = daysUntil(row.next_due_date)!
    if (days < 0) return { label: `Overdue ${Math.abs(days)}d`, bg: '#2d1b1b', color: '#f87171' }
    if (days <= 5) return { label: `Due in ${days}d`, bg: '#3f2d0f', color: '#facc15' }
    return { label: `Paid up (${days}d left)`, bg: '#052e16', color: '#4ade80' }
  }

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        const status = statusFor(r)
        return {
          revenue: acc.revenue + (r.hasBillingSetup ? r.monthly_fee : 0),
          overdue: acc.overdue + (status.label.startsWith('Overdue') ? 1 : 0),
          dueSoon: acc.dueSoon + (status.label.startsWith('Due in') ? 1 : 0),
          paidUp: acc.paidUp + (status.label.startsWith('Paid up') ? 1 : 0),
        }
      },
      { revenue: 0, overdue: 0, dueSoon: 0, paidUp: 0 }
    )
  }, [rows])

  const cardStyle = { background: '#1e293b', border: '1px solid #334155' }
  const inputStyle = { background: '#0f172a', border: '1.5px solid #334155', color: '#e2e8f0' }

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3 className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Billing Status</h3>
        <p className="text-xs mt-1" style={{ color: '#475569' }}>Track what each school owes and when they last paid</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-xs" style={{ color: '#475569' }}>Monthly Revenue</p>
          <p className="text-xl font-semibold mt-1" style={{ color: '#38bdf8' }}>GHS {totals.revenue.toFixed(2)}</p>
        </div>
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-xs" style={{ color: '#475569' }}>Paid Up</p>
          <p className="text-xl font-semibold mt-1" style={{ color: '#4ade80' }}>{totals.paidUp}</p>
        </div>
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-xs" style={{ color: '#475569' }}>Due Soon</p>
          <p className="text-xl font-semibold mt-1" style={{ color: '#facc15' }}>{totals.dueSoon}</p>
        </div>
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-xs" style={{ color: '#475569' }}>Overdue</p>
          <p className="text-xl font-semibold mt-1" style={{ color: '#f87171' }}>{totals.overdue}</p>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>School</th>
                <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Status</th>
                <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Monthly Fee</th>
                <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Last Paid</th>
                <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Next Due</th>
                <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center" style={{ color: '#475569' }}>Loading billing data...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center" style={{ color: '#475569' }}>No schools yet.</td></tr>
              ) : (
                rows.map(row => {
                  const status = statusFor(row)
                  const busy = savingId === row.school_id
                  return (
                    <tr key={row.school_id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td className="px-4 md:px-6 py-4 font-medium" style={{ color: '#e2e8f0' }}>
                        {row.school_name}
                        {row.school_status === 'suspended' && (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: '#2d1b1b', color: '#f87171' }}>
                            suspended
                          </span>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: status.bg, color: status.color }}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        {editingFeeFor === row.school_id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: '#64748b' }}>GHS</span>
                            <input
                              type="number"
                              value={feeInput}
                              onChange={e => setFeeInput(e.target.value)}
                              className="w-20 rounded-lg px-2 py-1 text-xs focus:outline-none"
                              style={inputStyle}
                              autoFocus
                            />
                            <button onClick={() => saveFee(row.school_id)} disabled={busy}
                              className="text-xs hover:underline" style={{ color: '#4ade80' }}>Save</button>
                            <button onClick={() => setEditingFeeFor(null)}
                              className="text-xs hover:underline" style={{ color: '#64748b' }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => startEditFee(row)} className="text-xs hover:underline" style={{ color: '#94a3b8' }}>
                            GHS {row.monthly_fee.toFixed(2)} ✎
                          </button>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-xs" style={{ color: '#94a3b8' }}>
                        {formatDate(row.last_payment_date)}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-xs">
                        {editingDueFor === row.school_id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={dueInput}
                              onChange={e => setDueInput(e.target.value)}
                              className="rounded-lg px-2 py-1 text-xs focus:outline-none"
                              style={inputStyle}
                              autoFocus
                            />
                            <button onClick={() => saveDue(row.school_id)} disabled={busy}
                              className="hover:underline" style={{ color: '#4ade80' }}>Save</button>
                            <button onClick={() => setEditingDueFor(null)}
                              className="hover:underline" style={{ color: '#64748b' }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => startEditDue(row)} className="hover:underline" style={{ color: '#94a3b8' }}>
                            {formatDate(row.next_due_date)} ✎
                          </button>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        {!row.hasBillingSetup ? (
                          <button onClick={() => handleSetupBilling(row.school_id)}
                            className="text-xs hover:underline" style={{ color: '#38bdf8' }}>
                            Set Up Billing
                          </button>
                        ) : (
                          <button onClick={() => markAsPaid(row)} disabled={busy}
                            className="text-xs hover:underline disabled:opacity-50" style={{ color: '#4ade80' }}>
                            {busy ? 'Saving...' : 'Mark as Paid'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}