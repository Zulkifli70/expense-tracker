export const DEFAULT_EXPENSE_CATEGORIES = [
  'Food',
  'Utilities',
  'Transport',
  'Entertainment',
  'Investment',
  'Housing',
  'Other'
] as const

export function mergeExpenseCategories(categories: string[] = []) {
  const unique = new Set<string>(DEFAULT_EXPENSE_CATEGORIES)

  for (const item of categories) {
    const name = item?.trim()
    if (!name) continue
    unique.add(name)
  }

  return [...unique]
}
