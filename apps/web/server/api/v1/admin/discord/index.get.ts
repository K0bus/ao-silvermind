import { z } from 'zod'
import { requireAdmin } from '~/server/utils/guards'
import { prisma } from '~/server/utils/prisma'

const schema = z.object({
  q: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = await getValidatedQuery(event, (q) => schema.safeParse(q))
  if (!query.success) throw createError({ statusCode: 422, statusMessage: 'Invalid query' })

  const { q, cursor, limit } = query.data

  const where = {
    ...(q && {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { id: { contains: q, mode: 'insensitive' as const } },
        { user: { username: { contains: q, mode: 'insensitive' as const } } },
        { user: { email: { contains: q, mode: 'insensitive' as const } } },
      ],
    }),
  }

  const [configs, total] = await Promise.all([
    prisma.discordGuildConfig.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    }),
    prisma.discordGuildConfig.count({ where }),
  ])

  const hasMore = configs.length > limit
  const data = hasMore ? configs.slice(0, limit) : configs

  return {
    data,
    meta: {
      total,
      nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
    },
  }
})
