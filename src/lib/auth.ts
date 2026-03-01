import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { User } from './users'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'vitali-studio-secret-change-in-production'
)
const COOKIE_NAME = 'vitali_session'

// ─── OTP Storage (in-memory, suficiente para 2 usuarios) ───────────────────
const otpStore = new Map<string, { code: string; expires: number; attempts: number }>()
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

// ─── Rate Limiting ──────────────────────────────────────────────────────────
export function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)

  if (entry && now < entry.resetAt) {
    if (entry.count >= 5) return false
    entry.count++
    loginAttempts.set(ip, entry)
  } else {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
  }
  return true
}

// ─── OTP ────────────────────────────────────────────────────────────────────
export function generateOtp(userId: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  otpStore.set(userId, {
    code,
    expires: Date.now() + 5 * 60 * 1000, // 5 minutos
    attempts: 0,
  })
  return code
}

export function verifyOtp(userId: string, inputCode: string): 'valid' | 'invalid' | 'expired' | 'too_many' {
  const entry = otpStore.get(userId)
  if (!entry) return 'invalid'
  if (Date.now() > entry.expires) {
    otpStore.delete(userId)
    return 'expired'
  }
  if (entry.attempts >= 3) {
    otpStore.delete(userId)
    return 'too_many'
  }

  const codeBuf = Buffer.from(entry.code)
  const inputBuf = Buffer.from(inputCode.trim())

  if (codeBuf.length !== inputBuf.length || !require('crypto').timingSafeEqual(codeBuf, inputBuf)) {
    entry.attempts++
    otpStore.set(userId, entry)
    return 'invalid'
  }

  otpStore.delete(userId)
  return 'valid'
}

// ─── JWT Session ────────────────────────────────────────────────────────────
export async function createSession(user: User): Promise<string> {
  return await new SignJWT({
    sub: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      id: payload.sub as string,
      username: payload.username as string,
      email: payload.email as string,
      displayName: payload.displayName as string,
      avatar: (payload.username as string)[0],
    }
  } catch {
    return null
  }
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME
