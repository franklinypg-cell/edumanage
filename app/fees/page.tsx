"use client"
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/sidebar'

type Fee = {
	id: string
	amount: number
	payment_date: string
	payment_method: string
	receipt_number: string
	term: string
	academic_year: string
	students: {
		full_name: string
		learner_code: string
	}
}

export default function FeesPage() {
	const [fees, setFees] = useState<Fee[]>([])
	const [students, setStudents] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [showForm, setShowForm] = useState(false)
	const [submitting, setSubmitting] = useState(false)
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
			else {
				fetchFees()
				fetchStudents()
			}
		}
		checkSession()
	}, [])

	const fetchFees = async () => {
		const { data } = await supabase
			.from('fees')
			.select(`
				*,
				students ( full_name, learner_code )
			`)
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

	if (loading) return (
		<div className="flex min-h-screen">
			<Sidebar />
			<div className="ml-56 flex-1 flex items-center justify-center">
				<p className="text-gray-500">Loading...</p>
			</div>
		</div>
	)

	return (
		<div className="flex min-h-screen bg-gray-50">
			<Sidebar />
			<div className="ml-56 flex-1 p-8">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-lg font-medium text-gray-700">Fee Payments</h2>
					<button
						onClick={() => setShowForm(!showForm)}
						className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
					>
						+ Record Payment
					</button>
				</div>

				{showForm && (
					<form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 max-w-2xl">
						<h3 className="text-sm font-medium text-gray-700 mb-4">Record New Payment</h3>
						<div className="space-y-4">
							<div>
								<label className="text-sm text-gray-600 block mb-1">Student <span className="text-red-400">*</span></label>
								<select
									value={form.student_id}
									onChange={e => update('student_id', e.target.value)}
									className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
									required
								>
									<option value="">Select student</option>
									{students.map(s => (
										<option key={s.id} value={s.id}>
											{s.full_name} — {s.learner_code}
										</option>
									))}
								</select>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-sm text-gray-600 block mb-1">Amount (GH₵) <span className="text-red-400">*</span></label>
									<input
										type="number"
										value={form.amount}
										onChange={e => update('amount', e.target.value)}
										className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
										placeholder="0.00"
										required
									/>
								</div>
								<div>
									<label className="text-sm text-gray-600 block mb-1">Payment Date <span className="text-red-400">*</span></label>
									<input
										type="date"
										value={form.payment_date}
										onChange={e => update('payment_date', e.target.value)}
										className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
										required
									/>
								</div>
							</div>

							<div className="grid grid-cols-3 gap-4">
								<div>
									<label className="text-sm text-gray-600 block mb-1">Payment Method</label>
									<select
										value={form.payment_method}
										onChange={e => update('payment_method', e.target.value)}
										className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
									>
										<option value="cash">Cash</option>
										<option value="mobile_money">Mobile Money</option>
										<option value="bank_transfer">Bank Transfer</option>
									</select>
								</div>
								<div>
									<label className="text-sm text-gray-600 block mb-1">Term</label>
									<select
										value={form.term}
										onChange={e => update('term', e.target.value)}
										className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
									>
										<option value="Term 1">Term 1</option>
										<option value="Term 2">Term 2</option>
										<option value="Term 3">Term 3</option>
									</select>
								</div>
								<div>
									<label className="text-sm text-gray-600 block mb-1">Academic Year</label>
									<input
										type="text"
										value={form.academic_year}
										onChange={e => update('academic_year', e.target.value)}
										className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
										placeholder="2025/2026"
									/>
								</div>
							</div>

							<div className="flex gap-3 pt-2">
								<button
									type="submit"
									disabled={submitting}
									className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
								>
									{submitting ? 'Saving...' : 'Record Payment'}
								</button>
								<button
									type="button"
									onClick={() => setShowForm(false)}
									className="border border-gray-200 text-gray-600 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
								>
									Cancel
								</button>
							</div>
						</div>
					</form>
				)}

				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-100">
								<th className="text-left px-6 py-3 text-gray-500 font-medium">Receipt No.</th>
								<th className="text-left px-6 py-3 text-gray-500 font-medium">Student</th>
								<th className="text-left px-6 py-3 text-gray-500 font-medium">Amount</th>
								<th className="text-left px-6 py-3 text-gray-500 font-medium">Method</th>
								<th className="text-left px-6 py-3 text-gray-500 font-medium">Term</th>
								<th className="text-left px-6 py-3 text-gray-500 font-medium">Date</th>
							</tr>
						</thead>
						<tbody>
							{fees.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-6 py-8 text-center text-gray-400">
										No payments recorded yet. Click + Record Payment to add one.
									</td>
								</tr>
							) : (
								fees.map(fee => (
									<tr key={fee.id} className="border-b border-gray-50 hover:bg-gray-50">
										<td className="px-6 py-4 font-mono text-gray-600">{fee.receipt_number}</td>
										<td className="px-6 py-4">
											<div className="font-medium text-gray-800">{(fee.students as any)?.full_name}</div>
											<div className="text-xs text-gray-400">{(fee.students as any)?.learner_code}</div>
										</td>
										<td className="px-6 py-4 font-medium text-green-600">GH₵ {fee.amount}</td>
										<td className="px-6 py-4 text-gray-600 capitalize">{fee.payment_method.replace('_', ' ')}</td>
										<td className="px-6 py-4 text-gray-600">{fee.term} · {fee.academic_year}</td>
										<td className="px-6 py-4 text-gray-600">{fee.payment_date}</td>
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
