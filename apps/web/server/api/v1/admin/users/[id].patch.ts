import { z } from 'zod'
import { requireAdmin } from '~/server/utils/guards'
import { prisma } from '~/server/utils/prisma'
import { invalidateUserSessions } from '~/server/utils/auth'

const schema = z.object({
  role: z.enum(['ADMIN', 'MODERATOR', 'USER']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).optional(),
  isPremium: z.boolean().optional(),
  premiumExpiresAt: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : new Date(val as string)),
    z.date().nullable().optional()
  ),
}).refine((d) => d.role !== undefined || d.status !== undefined || d.isPremium !== undefined || d.premiumExpiresAt !== undefined, {
  message: 'At least one field required',
})

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'User ID required' })

  // Un admin ne peut pas modifier son propre rôle (sécurité)
  if (id === admin.id) {
    throw createError({ statusCode: 403, statusMessage: 'Cannot modify your own account' })
  }

  const body = await readValidatedBody(event, (b) => schema.safeParse(b))
  if (!body.success) {
    throw createError({ statusCode: 422, statusMessage: body.error.errors[0]?.message ?? 'Invalid input' })
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, status: true, isPremium: true, premiumExpiresAt: true }
  })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const updated = await prisma.user.update({
    where: { id },
    data: body.data,
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      status: true,
      isPremium: true,
      premiumExpiresAt: true
    },
  })

  // Si l'user est suspendu → invalider toutes ses sessions immédiatement
  if (body.data.status === 'SUSPENDED') {
    await invalidateUserSessions(id)
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'user.update',
      targetType: 'User',
      targetId: id,
      before: {
        role: target.role,
        status: target.status,
        isPremium: target.isPremium,
        premiumExpiresAt: target.premiumExpiresAt
      },
      after: body.data,
      ipAddress: getRequestIP(event),
    },
  })

  return { data: updated }
})
