import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import {
  createSession,
  hashPassword,
  setSessionCookie,
} from '~/server/utils/auth'
import {
  getInstallationStatus,
  ensureBootstrapData,
} from '~/server/utils/install'

const schema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, _ and -'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
})

export default defineEventHandler(async (event) => {
  const status = await getInstallationStatus()

  if (status.installed) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: 'Application is already installed',
    })
  }

  const body = await readValidatedBody(event, (b) => schema.safeParse(b))

  if (!body.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      message: body.error.errors[0]?.message ?? 'Invalid input',
    })
  }

  const { username, email, password } = body.data
  const emailLower = email.toLowerCase()

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: emailLower },
        { username: { equals: username, mode: 'insensitive' } },
      ],
    },
    select: { email: true, username: true },
  })

  if (existing) {
    const field = existing.email === emailLower ? 'email' : 'username'
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: `This ${field} is already taken`,
    })
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.$transaction(async (tx) => {
    await ensureBootstrapData(tx)

    return tx.user.create({
      data: {
        email: emailLower,
        username,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        isPremium: true,
        premiumExpiresAt: true,
      },
    })
  })

  const session = await createSession(
    user.id,
    getHeader(event, 'user-agent'),
    getRequestIP(event)
  )

  setSessionCookie(event, session.token)

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastLoginIp: getRequestIP(event) },
  })

  return { data: user }
})
