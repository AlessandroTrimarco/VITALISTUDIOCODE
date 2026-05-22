import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/db'

const createUserSchema = z.object({
  username: z.string().min(2).max(32).regex(/^[A-Za-z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(4),
  displayName: z.string().min(1).max(64),
  role: z.enum(['admin', 'user']).default('user'),
})

export async function GET(_req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, displayName: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { username, email, password, displayName, role } = parsed.data

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: username.toUpperCase() }, { email }] },
  })
  if (existing) {
    return NextResponse.json({ error: 'El usuario o email ya existe' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { username: username.toUpperCase(), email, passwordHash, displayName, role },
    select: { id: true, username: true, email: true, displayName: true, role: true, createdAt: true },
  })

  return NextResponse.json({ success: true, user }, { status: 201 })
}
