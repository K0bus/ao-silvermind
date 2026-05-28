import { z } from 'zod'
import { requireAdmin } from '~/server/utils/guards'
import { prisma } from '~/server/utils/prisma'

const bodySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    requireAdmin(event)

    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'ID parameter is required',
      })
    }

    const category = await prisma.guideCategory.findUnique({
      where: { id },
    })
    if (!category) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `Category with ID "${id}" not found`,
      })
    }

    const body = await readBody(event)
    const result = bodySchema.safeParse(body)
    if (!result.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: result.error.errors[0]?.message || 'Invalid input data',
      })
    }

    const data: any = { ...result.data }

    if (data.slug && data.slug !== category.slug) {
      const existing = await prisma.guideCategory.findFirst({
        where: {
          slug: data.slug,
          id: { not: id },
        },
      })
      if (existing) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: `Category with slug "${data.slug}" already exists`,
        })
      }
    }

    const updated = await prisma.guideCategory.update({
      where: { id },
      data,
    })

    return {
      data: {
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        description: updated.description,
        sortOrder: updated.sortOrder,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error.message || 'Failed to update category',
    })
  }
})
