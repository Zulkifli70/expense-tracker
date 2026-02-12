import type { AvatarProps } from '@nuxt/ui'

export type UserStatus = 'subscribed' | 'unsubscribed' | 'bounced'
export type SaleStatus = 'paid' | 'failed' | 'refunded'

export interface User {
  id: number
  name: string
  email: string
  avatar?: AvatarProps
  status: UserStatus
  location: string
}

export interface Mail {
  id: number
  unread?: boolean
  from: User
  subject: string
  body: string
  date: string
}

export interface Member {
  name: string
  username: string
  role: 'member' | 'owner'
  avatar: AvatarProps
}

export interface Stat {
  title: string
  icon: string
  value: number | string
  variation: number
  formatter?: (value: number) => string
}

export interface Sale {
  id: string
  date: string
  status: SaleStatus
  email: string
  amount: number
}

export interface Notification {
  id: number
  unread?: boolean
  sender: {
    name: string
    avatar?: AvatarProps
  }
  body: string
  date: string
  to?: string
}

export type Period = 'daily' | 'weekly' | 'monthly'

export interface Range {
  start: Date
  end: Date
}

export interface HomeBalanceAccount {
  id: string
  name: string
  type: string
  balance: number
}

export interface HomeStat {
  title: string
  icon: string
  value: number
  variation: number
}

export interface HomeChartPoint {
  date: string
  amount: number
}

export interface HomeCategorySummary {
  label: string
  amount: number
  color: string
}

export interface HomeExpenseRow {
  id: string
  date: string
  expenseType: string
  amount: number
  description: string
}

export interface HomeApiResponse {
  userId: string
  range: {
    start: string
    end: string
  }
  period: Period
  summary: {
    totalBalance: number
    currentSpending: number
    largestExpenseToday: number
  }
  stats: HomeStat[]
  balance: {
    total: number
    accounts: HomeBalanceAccount[]
  }
  budget: {
    limit: number
    spent: number
    remaining: number
    progress: number
    status: 'healthy' | 'warning' | 'critical'
    thresholds: {
      warning: number
      critical: number
    }
  }
  chart: HomeChartPoint[]
  categories: HomeCategorySummary[]
  latestTransactions: HomeExpenseRow[]
}

export interface TransactionListItem {
  id: string
  date: string
  accountName: string
  category: string
  description: string
  note: string
  kind: 'expense' | 'income'
  amount: number
}

export interface TransactionsApiResponse {
  page: number
  pageSize: number
  total: number
  totalPages: number
  categories: string[]
  items: TransactionListItem[]
}

export interface TransactionDetail {
  id: string
  date: string
  accountName: string
  category: string
  description: string
  note: string
  kind: 'expense' | 'income'
  amount: number
}
