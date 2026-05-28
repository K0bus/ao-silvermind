import { z } from 'zod'
import { requireAdmin } from '~/server/utils/guards'
import { prisma } from '~/server/utils/prisma'

const bodySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  content: z.string().min(1, 'Content is required'),
  summary: z.string().max(1000).optional().nullable(),
  published: z.boolean().default(false),
  categoryId: z.string().min(1, 'Category is required'),
})

export default defineEventHandler(async (event) => {
  try {
    const user = requireAdmin(event)

    const body = await readBody(event)
    const result = bodySchema.safeParse(body)
    if (!result.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: result.error.errors[0]?.message || 'Invalid input data',
      })
    }

    const { title, slug, content, summary, published, categoryId } = result.data

    const category = await prisma.guideCategory.findUnique({
      where: { id: categoryId },
    })
    if (!category) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `Category with ID "${categoryId}" does not exist`,
      })
    }

    const existing = await prisma.guide.findUnique({
      where: { slug },
    })
    if (existing) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `Guide with slug "${slug}" already exists`,
      })
    }

    const guide = await prisma.guide.create({
      data: {
        title,
        slug,
        content,
        summary: summary || null,
        published,
        categoryId,
        authorId: user.id,
      },
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
        id: guide.id,
        slug: guide.slug,
        title: guide.title,
        content: guide.content,
        summary: guide.summary,
        published: guide.published,
        categoryId: guide.categoryId,
        category: guide.category ? {
          id: guide.category.id,
          slug: guide.category.slug,
          name: guide.category.name,
          description: guide.category.description,
          sortOrder: guide.category.sortOrder,
          createdAt: guide.category.createdAt.toISOString(),
          updatedAt: guide.category.updatedAt.toISOString(),
        } : undefined,
        authorId: guide.authorId,
        author: guide.author ? {
          id: guide.author.id,
          username: guide.author.username,
        } : null,
        createdAt: guide.createdAt.toISOString(),
        updatedAt: guide.updatedAt.toISOString(),
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error.message || 'Failed to create guide',
    })
  }
})
