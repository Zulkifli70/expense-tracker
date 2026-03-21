declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    username: string
    name: string
    isDemo?: boolean
  }

  interface UserSession {
    loggedInAt?: string
  }
}

export {}
