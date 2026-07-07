import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

// Generates a readable random password — avoids ambiguous characters
// like 0/O and 1/l/I so it's easy to read back over WhatsApp/phone.
function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.randomBytes(length)
  let pass = ''
  for (let i = 0; i < length; i++) {
    pass += chars[bytes[i] % chars.length]
  }
  return pass
}

export async function POST(req: Request) {
  try {
    const { email, schoolId } = await req.json()

    if (!email || !schoolId) {
      return NextResponse.json({ error: 'Missing email or schoolId' }, { status: 400 })
    }

    const password = generatePassword()

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError || !userData.user) {
      return NextResponse.json(
        { error: createError?.message || 'Failed to create login' },
        { status: 400 }
      )
    }

    // Link the new auth user to the school as an admin profile.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userData.user.id,
        email,
        role: 'admin',
        school_id: schoolId,
      })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ password })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 })
  }
}