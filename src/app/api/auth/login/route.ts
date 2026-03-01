import { NextRequest, NextResponse } from 'next/server'
import { validateUser } from '@/lib/users'
import { checkRateLimit, generateOtp } from '@/lib/auth'
import { sendOtpEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera 15 minutos.' },
      { status: 429 }
    )
  }

  const body = await req.json() as { username?: string; password?: string }
  const { username, password } = body

  if (!username || !password) {
    return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 })
  }

  const user = validateUser(username, password)
  if (!user) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const code = generateOtp(user.id)
  // Intentar enviar email pero NO bloquear el login si falla
  // El código siempre está disponible en los logs de Railway
  sendOtpEmail(user.email, user.displayName, code).catch(err =>
    console.error('Email send error (non-blocking):', err)
  )

  return NextResponse.json({
    success: true,
    userId: user.id,
    email: user.email.replace(/(.{2}).*@/, '$1***@'),
    message: `Código enviado a tu email`,
  })
}
