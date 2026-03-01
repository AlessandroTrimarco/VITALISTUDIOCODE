import { NextRequest, NextResponse } from 'next/server'
import { verifyOtp, createSession } from '@/lib/auth'
import { getUserByUsername } from '@/lib/users'

const COOKIE_NAME = 'vitali_session'

export async function POST(req: NextRequest) {
  const body = await req.json() as { userId?: string; code?: string }
  const { userId, code } = body

  if (!userId || !code) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const result = verifyOtp(userId, code)

  if (result === 'expired') {
    return NextResponse.json({ error: 'Código expirado. Inicia sesión nuevamente.' }, { status: 401 })
  }
  if (result === 'too_many') {
    return NextResponse.json({ error: 'Demasiados intentos. Inicia sesión nuevamente.' }, { status: 401 })
  }
  if (result === 'invalid') {
    return NextResponse.json({ error: 'Código incorrecto' }, { status: 401 })
  }

  // OTP válido — crear sesión
  const user = getUserByUsername(userId)
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const token = await createSession(user)

  const response = NextResponse.json({ success: true, user: { displayName: user.displayName } })
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: '/',
  })

  return response
}
