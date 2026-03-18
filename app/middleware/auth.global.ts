export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, fetch } = useUserSession()
  const publicPaths = new Set(['/', '/login'])

  if (!loggedIn.value) {
    await fetch()
  }

  if (to.path === '/login') {
    if (loggedIn.value) {
      return navigateTo('/')
    }
    return
  }

  if (publicPaths.has(to.path)) {
    return
  }

  if (!loggedIn.value) {
    return navigateTo({
      path: '/login',
      query: to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : undefined
    })
  }
})
