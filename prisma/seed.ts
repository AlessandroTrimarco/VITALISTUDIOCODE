import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'

const dbUrl = process.env.DATABASE_URL ??
  `file:${path.join(process.cwd(), 'dev.db')}`
const adapter = new PrismaBetterSqlite3({ url: dbUrl })
const prisma = new PrismaClient({ adapter })

async function main() {
  const users = [
    {
      username: 'ALESSANDRO',
      email: process.env.EMAIL_ALESSANDRO ?? 'aletrimarco25@gmail.com',
      password: process.env.PASS_ALESSANDRO ?? '2000',
      displayName: 'Alessandro',
      role: 'admin',
    },
    {
      username: 'MARTIN',
      email: process.env.EMAIL_MARTIN ?? 'martin.onta@hotmail.com',
      password: process.env.PASS_MARTIN ?? '2002',
      displayName: 'Martín',
      role: 'user',
    },
  ]

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12)
    await prisma.user.upsert({
      where: { username: u.username },
      update: { email: u.email, passwordHash, displayName: u.displayName, role: u.role },
      create: { username: u.username, email: u.email, passwordHash, displayName: u.displayName, role: u.role },
    })
    console.log(`✓ Upserted user: ${u.username}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
