import { z } from 'zod'
import { requireAdmin } from '~/server/utils/guards'
import { prisma } from '~/server/utils/prisma'

const schema = z.object({
  q: z.string().optional(),
  role: z.enum(['ADMIN', 'MODERATOR', 'USER']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = await getValidatedQuery(event, (q) => schema.safeParse(q))
  if (!query.success) throw createError({ statusCode: 422, statusMessage: 'Invalid query' })

  const { q, role, status, cursor, limit } = query.data

  const where = {
    ...(role && { role }),
    ...(status && { status }),
    ...(q && {
      OR: [
        { email: { contains: q, mode: 'insensitive' as const } },
        { username: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        isPremium: true,
        premiumExpiresAt: true,
        _count: { select: { sessions: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  const hasMore = users.length > limit
  const data = hasMore ? users.slice(0, limit) : users

  return {
    data,
    meta: {
      total,
      nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
    },
  }
})
