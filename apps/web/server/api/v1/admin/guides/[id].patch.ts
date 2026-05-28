import { z } from 'zod'
import { requireAdmin } from '~/server/utils/guards'
import { prisma } from '~/server/utils/prisma'

const bodySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  summary: z.string().max(1000).optional().nullable(),
  published: z.boolean().optional(),
  categoryId: z.string().min(1, 'Category is required').optional(),
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

    const guide = await prisma.guide.findUnique({
      where: { id },
    })
    if (!guide) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `Guide with ID "${id}" not found`,
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

    if (data.categoryId) {
      const category = await prisma.guideCategory.findUnique({
        where: { id: data.categoryId },
      })
      if (!category) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: `Category with ID "${data.categoryId}" does not exist`,
        })
      }
    }

    if (data.slug && data.slug !== guide.slug) {
      const existing = await prisma.guide.findFirst({
        where: {
          slug: data.slug,
          id: { not: id },
        },
      })
      if (existing) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: `Guide with slug "${data.slug}" already exists`,
        })
      }
    }

    const updated = await prisma.guide.update({
      where: { id },
      data,
      include: {
        category: true,
        author: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })

    return {
      data: {
        id: updated.id,
        slug: updated.slug,
        title: updated.title,
        content: updated.content,
        summary: updated.summary,
        published: updated.published,
        categoryId: updated.categoryId,
        category: updated.category ? {
          id: updated.category.id,
          slug: updated.category.slug,
          name: updated.category.name,
          description: updated.category.description,
          sortOrder: updated.category.sortOrder,
          createdAt: updated.category.createdAt.toISOString(),
          updatedAt: updated.category.updatedAt.toISOString(),
        } : undefined,
        authorId: updated.authorId,
        author: updated.author ? {
          id: updated.author.id,
          username: updated.author.username,
        } : null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error.message || 'Failed to update guide',
    })
  }
})
