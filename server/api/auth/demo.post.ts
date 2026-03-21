import { createDemoSession } from '../../utils/demo'

export default eventHandler(async (event) => {
  const demo = createDemoSession()

  await setUserSession(event, {
    user: demo.user,
    loggedInAt: new Date().toISOString()
  })

  return {
    user: demo.user
  }
})
