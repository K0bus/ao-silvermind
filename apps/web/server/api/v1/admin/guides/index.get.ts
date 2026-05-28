import { z } from 'zod'
import { requireAdmin } from '~/server/utils/guards'
import { prisma } from '~/server/utils/prisma'

const querySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.string().transform((val) => Math.max(1, parseInt(val, 10) || 1)).default('1'),
  limit: z.string().transform((val) => Math.max(1, Math.min(50, parseInt(val, 10) || 10))).default('10'),
})

export default defineEventHandler(async (event) => {
  try {
    requireAdmin(event)

    const result = await getValidatedQuery(event, (q) => querySchema.safeParse(q))
    if (!result.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid query parameters',
      })
    }

    const { category, search, page, limit } = result.data

    const where: any = {}

    if (category) {
      where.category = {
        slug: category,
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [total, guides] = await Promise.all([
      prisma.guide.count({ where }),
      prisma.guide.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: true,
          author: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
    ])

    return {
      data: guides.map((guide) => ({
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
      })),
      meta: {
        total,
        page,
        perPage: limit,
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error.message || 'Failed to fetch admin guides',
    })
  }
})
