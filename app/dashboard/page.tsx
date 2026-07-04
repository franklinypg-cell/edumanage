'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/sidebar'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function getGreeting(hour: number): { en: string; tw: string } {
  if (hour < 12) return { en: 'Good morning', tw: 'Maakye' }
  if (hour < 17) return { en: 'Good afternoon', tw: 'Maaha' }
  return { en: 'Good evening', tw: 'Maadwo' }
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [greeting, setGreeting] = useState<{ en: string; tw: string } | null>(null)
  const [dateStr, setDateStr] = useState('')
  const [stats, setStats] = useState({
    total: 0, male: 0, female: 0,
    preschool: { male: 0, female: 0, total: 0 },
    kindergarten: { male: 0, female: 0, total: 0 },
    primary: { male: 0, female: 0, total: 0 },
    jhs: { male: 0, female: 0, total: 0 },
  })

  useEffect(() => {
    const now = new Date()
    setGreeting(getGreeting(now.getHours()))
    setDateStr(
      now.toLocaleDateString('en-GH', { weekday: 'long', month: 'long', day: 'numeric' })
    )

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) window.location.href = '/'
      else fetchStats()
    }
    checkSession()
  }, [])

  const fetchStats = async () => {
    const { data: students } = await supabase
      .from('students')
      .select('gender, class')
      .eq('status', 'active')

    if (students) {
      const preschool = { male: 0, female: 0, total: 0 }
      const kindergarten = { male: 0, female: 0, total: 0 }
      const primary = { male: 0, female: 0, total: 0 }
      const jhs = { male: 0, female: 0, total: 0 }

      students.forEach((s: any) => {
        const cls = s.class || ''
        const gender = s.gender
        let bucket = null
        if (cls.toLowerCase() === 'creche') bucket = preschool
        else if (cls.startsWith('KG')) bucket = kindergarten
        else if (cls.startsWith('Basic')) bucket = primary
        else if (cls.startsWith('JHS')) bucket = jhs

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
        preschool, kindergarten, primary, jhs,
      })
    }
    setLoading(false)
  }

  const generateRegisterPDF = async () => {
    setGeneratingPdf(true)
    try {
      const { data: students } = await supabase
        .from('students')
        .select('gender, class')
        .eq('status', 'active')

      const { data: classes } = await supabase
        .from('classes')
        .select('name, level')
        .order('name')

      if (!students || !classes) return

      const classMap: Record<string, { male: number; female: number; total: number; level: string }> = {}
      classes.forEach((cls: any) => {
        classMap[cls.name] = { male: 0, female: 0, total: 0, level: cls.level || 'other' }
      })

      students.forEach((s: any) => {
        const cls = s.class
        if (cls && classMap[cls]) {
          classMap[cls].total++
          if (s.gender === 'male') classMap[cls].male++
          else if (s.gender === 'female') classMap[cls].female++
        }
      })

      const levelOrder = ['preschool', 'kindergarten', 'primary', 'jhs']
      const levelLabels: Record<string, string> = {
        preschool: 'Creche / Preschool',
        kindergarten: 'Kindergarten',
        primary: 'Primary',
        jhs: 'Junior High School (JHS)',
      }

      const grouped: Record<string, { name: string; male: number; female: number; total: number }[]> = {}
      levelOrder.forEach(l => grouped[l] = [])

      Object.entries(classMap).forEach(([name, data]) => {
        const lvl = data.level.toLowerCase()
        if (grouped[lvl]) grouped[lvl].push({ name, ...data })
        else {
          if (!grouped['other']) grouped['other'] = []
          grouped['other'].push({ name, ...data })
        }
      })

      levelOrder.forEach(l => grouped[l]?.sort((a, b) => a.name.localeCompare(b.name)))

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('STUDENT CLASS REGISTER', pageWidth / 2, 20, { align: 'center' })

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Academic Year: 2025/2026', pageWidth / 2, 28, { align: 'center' })
      doc.text(`Generated: ${today}`, pageWidth / 2, 34, { align: 'center' })

      doc.setDrawColor(0)
      doc.line(14, 38, pageWidth - 14, 38)

      let currentY = 44
      let grandMale = 0, grandFemale = 0, grandTotal = 0

      const activeLevels = levelOrder.filter(l => grouped[l]?.length > 0)

      activeLevels.forEach(level => {
        const rows = grouped[level]
        if (!rows || rows.length === 0) return

        let subtotalMale = 0, subtotalFemale = 0, subtotalTotal = 0

        const tableRows: string[][] = rows.map(cls => {
          subtotalMale += cls.male
          subtotalFemale += cls.female
          subtotalTotal += cls.total
          return [cls.name, cls.male.toString(), cls.female.toString(), cls.total.toString()]
        })

        tableRows.push(['Subtotal', subtotalMale.toString(), subtotalFemale.toString(), subtotalTotal.toString()])

        grandMale += subtotalMale
        grandFemale += subtotalFemale
        grandTotal += subtotalTotal

        autoTable(doc, {
          startY: currentY,
          head: [
            [{ content: levelLabels[level] || level, colSpan: 4, styles: { halign: 'left', fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 10 } }],
            ['Class', 'Male', 'Female', 'Total'],
          ],
          body: tableRows,
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0], fillColor: [255, 255, 255] },
          headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { halign: 'center', cellWidth: 25 },
            2: { halign: 'center', cellWidth: 25 },
            3: { halign: 'center', cellWidth: 25 },
          },
          didParseCell: (data) => {
            if (data.row.index === tableRows.length - 1 && data.section === 'body') {
              data.cell.styles.fontStyle = 'bold'
              data.cell.styles.fillColor = [240, 240, 240]
              data.cell.styles.textColor = [0, 0, 0]
            }
          },
          margin: { left: 14, right: 14 },
        })

        currentY = (doc as any).lastAutoTable.finalY + 8
      })

      autoTable(doc, {
        startY: currentY,
        body: [['GRAND TOTAL', grandMale.toString(), grandFemale.toString(), grandTotal.toString()]],
        theme: 'grid',
        styles: { fontSize: 10, fontStyle: 'bold', cellPadding: 4, textColor: [0, 0, 0], fillColor: [220, 220, 220] },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { halign: 'center', cellWidth: 25 },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'center', cellWidth: 25 },
        },
        margin: { left: 14, right: 14 },
      })

      doc.save(`Class-Register-${today.replace(/ /g, '-')}.pdf`)
    } catch (err) {
      alert('Failed to generate PDF. Please try again.')
      console.error(err)
    } finally {
      setGeneratingPdf(false)
    }
  }

  if (loading) return (
    <div className="flex min-h-screen" style={{ background: '#0f172a' }}>
      <Sidebar />
      <div className="md:ml-56 flex-1 flex items-center justify-center pt-14 md:pt-0">
        <p style={{ color: '#475569' }}>Loading...</p>
      </div>
    </div>
  )

  const statCards = [
    { label: 'Total Students', value: stats.total, color: '#38bdf8' },
    { label: 'Male', value: stats.male, color: '#38bdf8' },
    { label: 'Female', value: stats.female, color: '#f472b6' },
  ]

  const levels = [
    { name: 'Creche / Preschool', data: stats.preschool },
    { name: 'Kindergarten', data: stats.kindergarten },
    { name: 'Primary', data: stats.primary },
    { name: 'JHS', data: stats.jhs },
  ]

  // Find the level with the highest enrolment for a small human-readable note
  const topLevel = levels.reduce((a, b) => (b.data.total > a.data.total ? b : a), levels[0])

  return (
    <div className="flex min-h-screen" style={{ background: '#0f172a', fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />
      <div className="md:ml-56 flex-1 p-4 md:p-8 pt-20 md:pt-8">

        {/* Humanized greeting */}
        {greeting && (
          <div className="mb-6">
            <h1 className="text-xl md:text-2xl font-semibold" style={{ color: '#e2e8f0' }}>
              {greeting.en}, Frankie EduTech <span className="font-normal" style={{ color: '#38bdf8' }}>· {greeting.tw}</span> 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
              {dateStr}
              {stats.total > 0 && (
                <span style={{ color: '#475569' }}>
                  {' '}· {stats.total} students enrolled{topLevel.data.total > 0 ? `, most in ${topLevel.name}` : ''}
                </span>
              )}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <h2 className="text-lg font-medium" style={{ color: '#e2e8f0' }}>School Overview</h2>
          <button
            onClick={generateRegisterPDF}
            disabled={generatingPdf}
            className="px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 w-full sm:w-auto"
            style={{ background: 'transparent', border: '1px solid #334155', color: '#38bdf8' }}
          >
            {generatingPdf ? 'Generating...' : '⬇ Download Class Register'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {statCards.map((card, i) => (
            <div key={i} className="rounded-xl p-6" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <p className="text-sm mb-2" style={{ color: '#94a3b8' }}>{card.label}</p>
              <p className="text-4xl font-semibold" style={{ color: card.color }}>{card.value}</p>
            </div>
          ))}
        </div>

        <h2 className="text-base font-medium mb-4" style={{ color: '#e2e8f0' }}>Enrolment by Level</h2>
        <div className="rounded-xl overflow-hidden" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th className="text-left px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Level</th>
                  <th className="text-center px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Male</th>
                  <th className="text-center px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Female</th>
                  <th className="text-center px-4 md:px-6 py-3 font-medium" style={{ color: '#475569' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((level, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0f172a'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td className="px-4 md:px-6 py-4 font-medium whitespace-nowrap" style={{ color: '#e2e8f0' }}>{level.name}</td>
                    <td className="px-4 md:px-6 py-4 text-center" style={{ color: '#38bdf8' }}>{level.data.male}</td>
                    <td className="px-4 md:px-6 py-4 text-center" style={{ color: '#f472b6' }}>{level.data.female}</td>
                    <td className="px-4 md:px-6 py-4 text-center font-semibold" style={{ color: '#4ade80' }}>{level.data.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}