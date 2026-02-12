import type { Period } from "~/types";

export const formatIDRCurrency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format;

export function useHomeFinance() {
  const totalBalance = useState<number>("home-total-balance", () => 8500000);

  const monthlyLimit = computed(() => Math.round(totalBalance.value * 0.65));
  const currentSpending = computed(() => Math.round(totalBalance.value * 0.48));
  const remainingBalance = computed(() =>
    Math.max(totalBalance.value - currentSpending.value, 0),
  );
  const largestExpense = computed(() => Math.round(currentSpending.value * 0.24));

  const categories = computed(() => {
    const split = [
      { label: "Food", ratio: 0.34, color: "#0EA5E9" },
      { label: "Transport", ratio: 0.22, color: "#22C55E" },
      { label: "Utilities", ratio: 0.28, color: "#F59E0B" },
      { label: "Other", ratio: 0.16, color: "#A855F7" },
    ];

    let used = 0;

    return split.map((item, index) => {
      const amount =
        index === split.length - 1
          ? Math.max(currentSpending.value - used, 0)
          : Math.round(currentSpending.value * item.ratio);

      used += amount;

      return {
        label: item.label,
        amount,
        color: item.color,
      };
    });
  });

  const variationByPeriod: Record<Period, number> = {
    daily: 3,
    weekly: 6,
    monthly: 12,
  };

  const buildStats = (period: Period) => {
    const trend = variationByPeriod[period];

    return [
      {
        title: "Total Balance",
        icon: "i-lucide-wallet",
        value: formatIDRCurrency(totalBalance.value),
        variation: trend,
      },
      {
        title: "Current Spending",
        icon: "i-lucide-shopping-cart",
        value: formatIDRCurrency(currentSpending.value),
        variation: -Math.max(trend - 2, 1),
      },
      {
        title: "Largest Expense (Today)",
        icon: "i-lucide-circle-dollar-sign",
        value: formatIDRCurrency(largestExpense.value),
        variation: trend - 1,
      },
    ];
  };

  return {
    totalBalance,
    monthlyLimit,
    currentSpending,
    remainingBalance,
    largestExpense,
    categories,
    buildStats,
  };
}
