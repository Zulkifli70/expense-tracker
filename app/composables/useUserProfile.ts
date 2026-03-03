export interface UserProfile {
  name: string
  email: string
  username: string
  avatar?: string
  bio?: string
}

export const useUserProfile = () =>
{
  const state = useState<UserProfile>('user-profile', () => ({
    name: 'Zulkifli Firdausi',
    email: 'zulkifli@example.com',
    username: 'zulkifli70',
    avatar: 'https://github.com/zulkifli70.png',
    bio: undefined
  }))

  const { user } = useUserSession()

  watch(
    () => user.value,
    (sessionUser) => {
      if (!sessionUser) return

      state.value = {
        ...state.value,
        name: sessionUser.name || state.value.name,
        email: sessionUser.email || state.value.email,
        username: sessionUser.username || state.value.username
      }
    },
    { immediate: true }
  )

  return state
}
