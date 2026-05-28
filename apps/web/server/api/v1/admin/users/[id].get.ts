import { requireAdmin } from '~/server/utils/guards'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'User ID required' })

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      status: true,
      emailVerified: true,
      lastLoginAt: true,
      lastLoginIp: true,
      createdAt: true,
      updatedAt: true,
      isPremium: true,
      premiumExpiresAt: true,
      _count: { select: { sessions: true, importJobs: true } },
    },
  })

  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  return { data: user }
})
