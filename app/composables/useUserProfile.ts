export interface UserProfile {
  name: string
  email: string
  username: string
  avatar?: string
  bio?: string
}

export const useUserProfile = () =>
  useState<UserProfile>('user-profile', () => ({
    name: 'Zulkifli Firdausi',
    email: 'zulkifli@example.com',
    username: 'zulkifli70',
    avatar: 'https://github.com/zulkifli70.png',
    bio: undefined
  }))
