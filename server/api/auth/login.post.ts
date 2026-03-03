import * as z from 'zod'
import { getUsersCollection, normalizeEmail, normalizeUsername, toAuthUser } from '../../utils/auth'

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(128)
})

export default eventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Invalid payload'
    })
  }

  const users = await getUsersCollection()
  const identifier = parsed.data.identifier.trim()
  const identifierLower = identifier.includes('@')
    ? normalizeEmail(identifier)
    : normalizeUsername(identifier)

  const user = await users.findOne({
    $or: [
      { emailLower: identifierLower },
      { usernameLower: identifierLower }
    ]
  })

  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid credentials'
    })
  }

  await setUserSession(event, {
    user: toAuthUser(user),
    loggedInAt: new Date().toISOString()
  })

  return {
    user: toAuthUser(user)
  }
})
