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
    name: '',
    email: '',
    username: '',
    avatar: undefined,
    bio: undefined
  }))

  const { user } = useUserSession()

  watch(
    () => user.value,
    (sessionUser) => {
      if (!sessionUser) {
        state.value = {
          name: '',
          email: '',
          username: '',
          avatar: undefined,
          bio: undefined
        }
        return
      }

      state.value = {
        ...state.value,
        name: sessionUser.name || '',
        email: sessionUser.email || '',
        username: sessionUser.username || '',
        avatar: undefined
      }
    },
    { immediate: true }
  )

  return state
}
