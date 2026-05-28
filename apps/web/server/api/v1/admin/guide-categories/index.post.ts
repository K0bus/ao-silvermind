import { z } from 'zod'
import { requireAdmin } from '~/server/utils/guards'
import { prisma } from '~/server/utils/prisma'

const bodySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().default(0),
})

export default defineEventHandler(async (event) => {
  try {
    requireAdmin(event)

    const body = await readBody(event)
    const result = bodySchema.safeParse(body)
    if (!result.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: result.error.errors[0]?.message || 'Invalid input data',
      })
    }

    const { name, slug, description, sortOrder } = result.data

    const existing = await prisma.guideCategory.findUnique({
      where: { slug },
    })
    if (existing) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `Category with slug "${slug}" already exists`,
      })
    }

    const category = await prisma.guideCategory.create({
      data: {
        name,
        slug,
        description: description || null,
        sortOrder,
      },
    })

    return {
      data: {
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error.message || 'Failed to create category',
    })
  }
})
