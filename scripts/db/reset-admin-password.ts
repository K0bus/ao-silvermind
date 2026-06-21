import { prisma } from '@albion-tool/database'
import { randomBytes } from 'node:crypto'

async function main() {
  // Parse arguments. Accept either --email=email or as a positional arg
  const emailArg = process.argv.find((arg) => arg.startsWith('--email='))
  const email = emailArg 
    ? emailArg.split('=')[1]?.trim().toLowerCase() 
    : process.argv.slice(2).find((arg) => !arg.startsWith('--'))?.trim().toLowerCase()

  if (!email) {
    console.error('Error: Please specify an email address. Example: pnpm db:reset-admin-password admin@example.com')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    console.error(`Error: User with email "${email}" not found in database.`)
    process.exit(1)
  }

  if (user.role !== 'ADMIN') {
    console.error(`Error: User with email "${email}" is not an ADMIN (role: ${user.role}).`)
    process.exit(1)
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

  console.log(`
========================================================================
[ADMIN PASSWORD RESET TOKEN GENERATED]
For Admin Account: ${email}
Use the following link to reset the password:
${resetLink}
(This link is valid for 24 hours)
========================================================================
  `)
}

main()
  .catch((err) => {
    console.error('Fatal error running reset script:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
