import * as z from 'zod'
import { getUsersCollection, normalizeEmail, normalizeUsername, toAuthUser, type UserDocument } from '../../utils/auth'
import { getDemoStateForUser, updateDemoProfile } from '../../utils/demo'
import { requireAuthContext } from '../../utils/session'

const payloadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9._-]+$/, 'Username may only contain letters, numbers, dot, underscore, and hyphen')
})

export default eventHandler(async (event) => {
  const { userId, session, isDemo, demoSessionId } = await requireAuthContext(event)
  const body = await readBody(event)
  const parsed = payloadSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Invalid payload'
    })
  }

  if (isDemo) {
    if (!demoSessionId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const state = await getDemoStateForUser(session.user)
    if (!state) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const result = await updateDemoProfile(demoSessionId, state, parsed.data)
    await setUserSession(event, {
      user: result.user,
      loggedInAt: session.loggedInAt
    })

    return result
  }

  const users = await getUsersCollection()
  const input = parsed.data
  const emailLower = normalizeEmail(input.email)
  const usernameLower = normalizeUsername(input.username)

  const existing = await users.findOne({
    _id: { $ne: userId },
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
  await users.updateOne(
    { _id: userId },
    {
      $set: {
        name: input.name.trim(),
        email: emailLower,
        emailLower,
        username: input.username.trim(),
        usernameLower,
        updatedAt: now
      }
    }
  )

  const updated = await users.findOne({ _id: userId }) as UserDocument | null
  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  await setUserSession(event, {
    user: toAuthUser(updated)
  })

  return {
    user: toAuthUser(updated)
  }
})
