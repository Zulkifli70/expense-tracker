import { clearDemoSession, getDemoSessionId, isDemoUser } from '../../utils/demo'

export default eventHandler(async (event) => {
  const session = await getUserSession(event)
  if (isDemoUser(session.user)) {
    clearDemoSession(getDemoSessionId(session.user))
  }

  await clearUserSession(event)
  return {
    ok: true
  }
})
