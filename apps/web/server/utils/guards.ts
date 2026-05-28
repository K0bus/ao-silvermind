import type { H3Event } from 'h3'
import type { SessionUser } from './auth'

export function requireAuth(event: H3Event): SessionUser {
  const user = event.context.user as SessionUser | undefined
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return user
}

export function requireAdmin(event: H3Event): SessionUser {
  const user = requireAuth(event)
  if (user.role !== 'ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}

export function requireModerator(event: H3Event): SessionUser {
  const user = requireAuth(event)
  if (!['ADMIN', 'MODERATOR'].includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}

export function isPremiumUser(user: SessionUser): boolean {
  if (user.role === 'ADMIN') return true
  if (!user.isPremium) return false
  if (!user.premiumExpiresAt) return true
  return new Date(user.premiumExpiresAt) > new Date()
}

export function requirePremium(event: H3Event): SessionUser {
  const user = requireAuth(event)
  if (!isPremiumUser(user)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Premium membership required' })
  }
  return user
}

export async function checkFeaturePremium(key: string, event: H3Event) {
  const { prisma } = await import('./prisma')
  const lock = await prisma.systemConfig.findUnique({
    where: { key: `premium_lock_${key}` },
  })
  if (lock && lock.value === true) {
    requirePremium(event)
  }
}
