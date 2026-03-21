import { getDemoSessionId, isDemoUser } from './demo'

export async function requireAuthContext(event: Parameters<typeof requireUserSession>[0]) {
  const session = await requireUserSession(event)
  const userId = session.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  return {
    session,
    userId,
    isDemo: isDemoUser(session.user),
    demoSessionId: getDemoSessionId(session.user)
  }
}

export async function requireAuthUserId(event: Parameters<typeof requireUserSession>[0]) {
  const context = await requireAuthContext(event)
  return context.userId
}
