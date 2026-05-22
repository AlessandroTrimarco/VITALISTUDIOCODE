import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { User } from './users'
import prisma from './db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'vitali-studio-secret-change-in-production'
)
const COOKIE_NAME = 'vitali_session'

// ─── Rate Limiting (in-memory, por IP — no necesita persistencia) ───────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

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

// ─── OTP — persistido en SQLite con TTL 10 min ──────────────────────────────
export async function generateOtp(userId: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  // Borrar tokens previos del mismo usuario
  await prisma.otpToken.deleteMany({ where: { userId } })

  await prisma.otpToken.create({
    data: { userId, code, expiresAt },
  })

  return code
}

export async function verifyOtp(
  userId: string,
  inputCode: string
): Promise<'valid' | 'invalid' | 'expired' | 'too_many'> {
  const token = await prisma.otpToken.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  if (!token) return 'invalid'

  if (new Date() > token.expiresAt) {
    await prisma.otpToken.delete({ where: { id: token.id } })
    return 'expired'
  }

  if (token.attempts >= 3) {
    await prisma.otpToken.delete({ where: { id: token.id } })
    return 'too_many'
  }

  const codeBuf = Buffer.from(token.code)
  const inputBuf = Buffer.from(inputCode.trim())

  if (codeBuf.length !== inputBuf.length || !require('crypto').timingSafeEqual(codeBuf, inputBuf)) {
    await prisma.otpToken.update({
      where: { id: token.id },
      data: { attempts: token.attempts + 1 },
    })
    return 'invalid'
  }

  await prisma.otpToken.delete({ where: { id: token.id } })
  return 'valid'
}

// ─── JWT Session ────────────────────────────────────────────────────────────
export async function createSession(user: User): Promise<string> {
  return await new SignJWT({
    sub: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
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
      role: (payload.role as string) ?? 'user',
    }
  } catch {
    return null
  }
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME
