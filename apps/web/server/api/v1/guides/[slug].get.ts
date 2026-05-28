import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const slug = getRouterParam(event, 'slug')
    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Slug parameter is required',
      })
    }

    const guide = await prisma.guide.findFirst({
      where: {
        slug,
        published: true,
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

    if (!guide) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `Guide with slug "${slug}" not found`,
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
      message: error.message || 'Failed to fetch guide details',
    })
  }
})
