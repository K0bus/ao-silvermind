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
    })
    if (!guide) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `Guide with ID "${id}" not found`,
      })
    }

    await prisma.guide.delete({
      where: { id },
    })

    return {
      data: {
        success: true,
        message: 'Guide deleted successfully',
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: error.message || 'Failed to delete guide',
    })
  }
})
