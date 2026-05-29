"use client"
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    male: 0,
    female: 0,
    preschool: { male: 0, female: 0, total: 0 },
    lowerPrimary: { male: 0, female: 0, total: 0 },
    upperPrimary: { male: 0, female: 0, total: 0 },
  })

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/'
      } else {
        fetchStats()
      }
    }
    checkSession()
  }, [])

  const fetchStats = async () => {
    const { data: students } = await supabase
      .from('students')
      .select(`
        gender,
        streams (
          classes (
            levels ( name )
          )
        )
      `)
      .eq('status', 'active')

    if (students) {
      const preschool = { male: 0, female: 0, total: 0 }
      const lowerPrimary = { male: 0, female: 0, total: 0 }
      const upperPrimary = { male: 0, female: 0, total: 0 }

      students.forEach(student => {
        const level = (student.streams as any)?.classes?.levels?.name
        const gender = student.gender

        let bucket = null
        if (level === 'Preschool') bucket = preschool
        else if (level === 'Lower Primary') bucket = lowerPrimary
        else if (level === 'Upper Primary') bucket = upperPrimary

        if (bucket) {
          bucket.total++
          if (gender === 'male') bucket.male++
          else if (gender === 'female') bucket.female++
        }
      })

      setStats({
        total: students.length,
        male: students.filter((s: any) => s.gender === 'male').length,
        female: students.filter((s: any) => s.gender === 'female').length,
        preschool,
        lowerPrimary,
        upperPrimary,
      })
    }
    setLoading(false)
  }
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-800">EduManage</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-500 transition"
        >
          Sign Out
        </button>
      </div>

      {/* Content */}
      <div className="p-8">
        <h2 className="text-lg font-medium text-gray-700 mb-6">School Overview</h2>

        {/* Total Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Total Students</p>
            <p className="text-3xl font-semibold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Male</p>
            <p className="text-3xl font-semibold text-blue-600">{stats.male}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Female</p>
            <p className="text-3xl font-semibold text-pink-500">{stats.female}</p>
          </div>
        </div>

        {/* Level Breakdown */}
        <h2 className="text-lg font-medium text-gray-700 mb-4">By Level</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Level</th>
                <th className="text-center px-6 py-3 text-gray-500 font-medium">Male</th>
                <th className="text-center px-6 py-3 text-gray-500 font-medium">Female</th>
                <th className="text-center px-6 py-3 text-gray-500 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Preschool', data: stats.preschool },
                { name: 'Lower Primary', data: stats.lowerPrimary },
                { name: 'Upper Primary', data: stats.upperPrimary },
              ].map((level, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-700">{level.name}</td>
                  <td className="px-6 py-4 text-center text-blue-600">{level.data.male}</td>
                  <td className="px-6 py-4 text-center text-pink-500">{level.data.female}</td>
                  <td className="px-6 py-4 text-center font-semibold">{level.data.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
