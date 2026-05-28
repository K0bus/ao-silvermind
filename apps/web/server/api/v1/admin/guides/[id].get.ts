import { requireAdmin } from '~/server/utils/guards'
import { prisma } from '~/server/utils/prisma'

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
      include: {
        category: true,
      },
    })

    if (!guide) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `Guide with ID "${id}" not found`,
      })
    }

    return {
      data: {
        id: guide.id,
        slug: guide.slug,
        title: guide.title,
        content: guide.content,
        summary: guide.summary,
        published: guide.published,
        categoryId: guide.categoryId,
        createdAt: guide.createdAt.toISOString(),
        updatedAt: guide.updatedAt.toISOString(),
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error.message || 'Failed to fetch admin guide details',
    })
  }
})
