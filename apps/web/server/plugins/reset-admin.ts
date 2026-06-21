import { prisma } from '~/server/utils/prisma'
import { randomBytes } from 'node:crypto'

export default defineNitroPlugin(() => {
  const resetEmail = process.env.RESET_ADMIN_EMAIL
  if (!resetEmail) return

  // Run asynchronously after server starts to avoid blocking Nitro initialization
  process.nextTick(async () => {
    try {
      const email = resetEmail.trim().toLowerCase()
      const user = await prisma.user.findUnique({
        where: { email },
      })

      if (!user) {
        console.warn(`\n[RESET-PASSWORD] WARNING: User with email "${email}" was not found in the database.`)
        return
      }

      if (user.role !== 'ADMIN') {
        console.warn(`\n[RESET-PASSWORD] WARNING: User with email "${email}" is not an ADMIN (current role: ${user.role}).`)
        return
      }

      const token = randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: token,
          resetPasswordExpires: expires,
        },
      })

      const appUrl = process.env.APP_URL || 'http://localhost:3000'
      const resetLink = `${appUrl}/auth/reset-password?token=${token}`

      console.warn(`
========================================================================
[ADMIN PASSWORD RESET REQUESTED via RESET_ADMIN_EMAIL]
For Admin Account: ${email}
Use the following link to reset the password:
${resetLink}
(This link is valid for 24 hours. Remove RESET_ADMIN_EMAIL from environment
once the reset has been performed to prevent regenerating this on reboot.)
========================================================================
      `)
    } catch (err) {
      console.error('[RESET-PASSWORD] Error during admin reset-password token generation:', err)
    }
  })
})
