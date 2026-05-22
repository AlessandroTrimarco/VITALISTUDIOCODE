import bcrypt from 'bcryptjs'
import prisma from './db'

export interface User {
  id: string
  username: string
  email: string
  displayName: string
  avatar: string
  role: string
}

export async function validateUser(username: string, password: string): Promise<User | null> {
  const dbUser = await prisma.user.findUnique({ where: { username: username.toUpperCase() } })
  if (!dbUser) return null

  const valid = await bcrypt.compare(password, dbUser.passwordHash)
  if (!valid) return null

  return {
    id: dbUser.id,
    username: dbUser.username,
    email: dbUser.email,
    displayName: dbUser.displayName,
    avatar: dbUser.username[0],
    role: dbUser.role,
  }
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const dbUser = await prisma.user.findUnique({ where: { username: username.toUpperCase() } })
  if (!dbUser) return null
  return {
    id: dbUser.id,
    username: dbUser.username,
    email: dbUser.email,
    displayName: dbUser.displayName,
    avatar: dbUser.username[0],
    role: dbUser.role,
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const dbUser = await prisma.user.findUnique({ where: { id } })
  if (!dbUser) return null
  return {
    id: dbUser.id,
    username: dbUser.username,
    email: dbUser.email,
    displayName: dbUser.displayName,
    avatar: dbUser.username[0],
    role: dbUser.role,
  }
}
