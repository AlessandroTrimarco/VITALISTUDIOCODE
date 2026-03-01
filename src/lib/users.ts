// Usuarios del sistema — configurados via variables de entorno
export interface User {
  id: string
  username: string
  email: string
  displayName: string
  avatar: string
}

const USERS: Record<string, { password: string; email: string; displayName: string }> = {
  ALESSANDRO: {
    password: process.env.PASS_ALESSANDRO ?? '2000',
    email: process.env.EMAIL_ALESSANDRO ?? 'aletrimarco25@gmail.com',
    displayName: 'Alessandro',
  },
  MARTIN: {
    password: process.env.PASS_MARTIN ?? '2002',
    email: process.env.EMAIL_MARTIN ?? 'martin.onta@hotmail.com',
    displayName: 'Martín',
  },
}

export function validateUser(username: string, password: string): User | null {
  const key = username.toUpperCase()
  const user = USERS[key]
  if (!user) return null

  // Comparación constante para evitar timing attacks
  const inputBuf = Buffer.from(password)
  const storedBuf = Buffer.from(user.password)
  if (inputBuf.length !== storedBuf.length) return null
  if (!require('crypto').timingSafeEqual(inputBuf, storedBuf)) return null

  return {
    id: key.toLowerCase(),
    username: key,
    email: user.email,
    displayName: user.displayName,
    avatar: username[0].toUpperCase(),
  }
}

export function getUserByUsername(username: string): User | null {
  const key = username.toUpperCase()
  const user = USERS[key]
  if (!user) return null
  return {
    id: key.toLowerCase(),
    username: key,
    email: user.email,
    displayName: user.displayName,
    avatar: key[0],
  }
}
