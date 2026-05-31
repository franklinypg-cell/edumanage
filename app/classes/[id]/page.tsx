
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Sidebar from '../../components/sidebar'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function ClassDetailPage() {
	const { id } = useParams()
	const [cls, setCls] = useState<any>(null)
	const [students, setStudents] = useState<any[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const checkSession = async () => {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) window.location.href = '/'
			else fetchData()
		}
		checkSession()
	}, [])

	const fetchData = async () => {
		const { data: classData } = await supabase
			.from('classes')
			.select('*')
			.eq('id', id)
			.single()

		if (classData) {
			setCls(classData)
			const { data: studentData } = await supabase
				.from('students')
				.select('id, full_name, learner_code, gender, status')
				.eq('class', classData.name)
				.eq('status', 'active')
				.order('full_name')
			if (studentData) setStudents(studentData)
		}
		setLoading(false)
	}

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
				<div className="flex items-center gap-3 mb-6">
					<Link href="/classes" className="text-gray-400 hover:text-gray-600 text-sm">← Classes</Link>
					<span className="text-gray-300">/</span>
					<h2 className="text-lg font-medium text-gray-700">{cls?.name}</h2>
					<span className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-1 rounded-full">
						{students.length} students
					</span>
				</div>

				<div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-6">
					<div>
						<p className="text-xs text-gray-400">Level</p>
						<p className="text-sm font-medium text-gray-700">{cls?.level}</p>
					</div>
					<div>
						<p className="text-xs text-gray-400">Class Teacher</p>
						<p className="text-sm font-medium text-gray-700">{cls?.class_teacher || '—'}</p>
					</div>
				</div>

				<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-100">
								<th className="text-left px-6 py-3 text-gray-500 font-medium">#</th>
								<th className="text-left px-6 py-3 text-gray-500 font-medium">Student</th>
								<th className="text-left px-6 py-3 text-gray-500 font-medium">Learner Code</th>
								<th className="text-left px-6 py-3 text-gray-500 font-medium">Gender</th>
								<th className="text-left px-6 py-3 text-gray-500 font-medium">Action</th>
							</tr>
						</thead>
						<tbody>
							{students.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-6 py-8 text-center text-gray-400">
										No active students in this class.
									</td>
								</tr>
							) : (
								students.map((s, i) => (
									<tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
										<td className="px-6 py-4 text-gray-400">{i + 1}</td>
										<td className="px-6 py-4 font-medium text-gray-800">{s.full_name}</td>
										<td className="px-6 py-4 text-gray-500">{s.learner_code}</td>
										<td className="px-6 py-4 text-gray-500">{s.gender}</td>
										<td className="px-6 py-4">
											<Link href={`/students/${s.id}`} className="text-blue-600 hover:underline text-sm">
												View Profile
											</Link>
										</td>
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
