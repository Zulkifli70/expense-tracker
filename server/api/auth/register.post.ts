import * as z from 'zod'
import { createUserId, getUsersCollection, normalizeEmail, normalizeUsername, toAuthUser } from '../../utils/auth'

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9._-]+$/, 'Username may only contain letters, numbers, dot, underscore, and hyphen'),
  password: z.string().min(8).max(128)
})

export default eventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Invalid payload'
    })
  }

  const input = parsed.data
  const users = await getUsersCollection()
  const emailLower = normalizeEmail(input.email)
  const usernameLower = normalizeUsername(input.username)

  const existing = await users.findOne({
    $or: [
      { emailLower },
      { usernameLower }
    ]
  })

  if (existing) {
    const message = existing.emailLower === emailLower
      ? 'Email is already registered'
      : 'Username is already taken'

    throw createError({
      statusCode: 409,
      statusMessage: message
    })
  }

  const now = new Date()
  const user = {
    _id: createUserId(),
    email: emailLower,
    emailLower,
    username: input.username.trim(),
    usernameLower,
    name: input.name.trim(),
    passwordHash: await hashPassword(input.password),
    createdAt: now,
    updatedAt: now
  }

  await users.insertOne(user)

  await setUserSession(event, {
    user: toAuthUser(user),
    loggedInAt: now.toISOString()
  })

  setResponseStatus(event, 201)
  return {
    user: toAuthUser(user)
  }
})
