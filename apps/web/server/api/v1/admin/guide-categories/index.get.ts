import { requireAdmin } from '~/server/utils/guards'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    requireAdmin(event)

    const categories = await prisma.guideCategory.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: { guides: true },
        },
      },
    })

    return {
      data: categories.map((cat) => ({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        _count: {
          guides: cat._count.guides,
        },
        createdAt: cat.createdAt.toISOString(),
        updatedAt: cat.updatedAt.toISOString(),
      })),
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error.message || 'Failed to fetch admin categories',
    })
  }
})
