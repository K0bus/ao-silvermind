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

    await prisma.guideCategory.delete({
      where: { id },
    })

    return {
      data: {
        success: true,
        message: 'Category deleted successfully',
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error.message || 'Failed to delete category',
    })
  }
})
