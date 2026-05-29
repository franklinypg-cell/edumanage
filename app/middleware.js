import { NextResponse } from 'next/server'

export async function middleware(request) {
  const token = request.cookies.get('sb-iegrzgdgznejyaexoqva-auth-token')
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}
