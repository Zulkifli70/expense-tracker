export async function requireAuthUserId(event: Parameters<typeof requireUserSession>[0]) {
  const session = await requireUserSession(event)
  const userId = session.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  return userId
}
