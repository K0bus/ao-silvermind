import bcrypt from 'bcryptjs'
const { hash, compare } = bcrypt
import { randomBytes } from 'node:crypto'
import { prisma } from './prisma'
import { redis } from './redis'
import type { H3Event } from 'h3'

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 jours
const SESSION_CACHE_TTL = 300 // 5 minutes en secondes
const COOKIE_NAME = 'ao_session'

export type SessionUser = {
  id: string
  email: string
  username: string
  role: string
  status: string
  avatar?: string | null
  isPremium: boolean
  premiumExpiresAt?: Date | null
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed)
}

export async function createSession(
  userId: string,
  userAgent?: string | null,
  ipAddress?: string | null
) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  const session = await prisma.session.create({
    data: { userId, token, userAgent, ipAddress, expiresAt },
  })

  return session
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const cacheKey = `session:${token}`

  const cached = await redis.get(cacheKey).catch(() => null)
  if (cached) {
    return JSON.parse(cached) as SessionUser
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          status: true,
          avatar: true,
          isPremium: true,
          premiumExpiresAt: true,
        },
      },
    },
  })

  if (!session || session.expiresAt < new Date()) return null
  if (session.user.status === 'SUSPENDED') return null

  const user = session.user as unknown as SessionUser
  await redis.setex(cacheKey, SESSION_CACHE_TTL, JSON.stringify(user)).catch(() => {})

  return user
}

export async function deleteSession(token: string) {
  await Promise.all([
    prisma.session.delete({ where: { token } }).catch(() => {}),
    redis.del(`session:${token}`).catch(() => {}),
  ])
}

export async function invalidateUserSessions(userId: string) {
  const sessions = await prisma.session.findMany({
    where: { userId },
    select: { token: true },
  })
  await prisma.session.deleteMany({ where: { userId } })
  for (const s of sessions) {
    await redis.del(`session:${s.token}`).catch(() => {})
  }
}

export function setSessionCookie(event: H3Event, token: string) {
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000,
    path: '/',
  })
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export function getSessionToken(event: H3Event): string | undefined {
  return getCookie(event, COOKIE_NAME)
}
