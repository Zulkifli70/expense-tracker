<script setup lang="ts">
import {
  addDays,
  endOfMonth,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";
import type { HomeApiResponse, Period, Range } from "~/types";
import { formatIDRCurrency } from "~/composables/useHomeFinance";

type Preset = "month" | "quarter" | "year";

const preset = ref<Preset>("month");

const range = shallowRef<Range>({
  start: startOfMonth(new Date()),
  end: new Date(),
});

const period = computed<Period>(() => {
  if (preset.value === "year") return "monthly";
  if (preset.value === "quarter") return "weekly";
  return "daily";
});

watch(
  preset,
  (value) => {
    const now = new Date();

    if (value === "year") {
      range.value = {
        start: startOfYear(now),
        end: now,
      };
      return;
    }

    if (value === "quarter") {
      range.value = {
        start: startOfMonth(subMonths(now, 2)),
        end: now,
      };
      return;
    }

    range.value = {
      start: startOfMonth(now),
      end: now,
    };
  },
  { immediate: true },
);

const query = computed(() => ({
  period: period.value,
  start: range.value.start.toISOString(),
  end: range.value.end.toISOString(),
}));

const { data: homeData } = await useFetch<HomeApiResponse>("/api/home", {
  query,
  key: "reports-data",
});

const now = new Date();
const previousMonthStart = startOfMonth(subMonths(now, 1));
const previousMonthComparableEnd = new Date(
  Math.min(
    addDays(previousMonthStart, now.getDate() - 1).getTime(),
    endOfMonth(previousMonthStart).getTime(),
  ),
);

const previousMonthQuery = computed(() => ({
  period: "daily" as const,
  start: previousMonthStart.toISOString(),
  end: previousMonthComparableEnd.toISOString(),
}));

const { data: previousMonthData } = await useFetch<HomeApiResponse>(
  "/api/home",
  {
    query: previousMonthQuery,
    key: "reports-last-month-data",
  },
);

const summary = computed(() => ({
  totalBalance: homeData.value?.summary.totalBalance || 0,
  currentSpending: homeData.value?.summary.currentSpending || 0,
}));

const budget = computed(() => ({
  limit: homeData.value?.budget.limit || 0,
  remaining: homeData.value?.budget.remaining || 0,
  progress: homeData.value?.budget.progress || 0,
  status: homeData.value?.budget.status || "healthy",
}));

const categories = computed(() =>
  [...(homeData.value?.categories || [])].sort((a, b) => b.amount - a.amount),
);

const topCategory = computed(() => categories.value[0]);

const averageDailySpend = computed(() => {
  const days = Math.max(
    Math.round(
      (range.value.end.getTime() - range.value.start.getTime()) /
        (24 * 60 * 60 * 1000),
    ) + 1,
    1,
  );

  return Math.round(summary.value.currentSpending / days);
});

const projectedMonthEndSpend = computed(() => {
  const daysInMonth = endOfMonth(new Date()).getDate();
  return averageDailySpend.value * daysInMonth;
});

const projectedGap = computed(
  () => budget.value.limit - projectedMonthEndSpend.value,
);

const lastMonthSpending = computed(
  () => previousMonthData.value?.summary.currentSpending || 0,
);

const vsLastMonthDifference = computed(
  () => summary.value.currentSpending - lastMonthSpending.value,
);

const vsLastMonthPercent = computed(() => {
  if (!lastMonthSpending.value) return summary.value.currentSpending ? 100 : 0;
  return Math.round(
    (vsLastMonthDifference.value / lastMonthSpending.value) * 100,
  );
});

const topCategoryShare = computed(() => {
  if (!topCategory.value || !summary.value.currentSpending) return 0;
  return Math.round(
    (topCategory.value.amount / summary.value.currentSpending) * 100,
  );
});

const overBudgetRisk = computed(() => {
  if (!budget.value.limit) {
    return {
      level: "No budget set",
      icon: "i-lucide-circle-help",
      iconClass: "text-muted",
      description: "Set a monthly budget to calculate risk.",
      dailyCap: 0,
      color: "neutral",
    };
  }

  const ratio = projectedMonthEndSpend.value / budget.value.limit;
  const remainingDays = Math.max(
    endOfMonth(new Date()).getDate() - new Date().getDate(),
    0,
  );
  const dailyCap = remainingDays
    ? Math.max(Math.floor(budget.value.remaining / remainingDays), 0)
    : 0;

  if (ratio >= 1.1) {
    return {
      level: "High Risk",
      icon: "i-lucide-alert-triangle",
      iconClass: "text-error",
      description: `Projected over by ${formatIDRCurrency(Math.abs(projectedGap.value))}.`,
      dailyCap,
      color: "error",
    };
  }

  if (ratio >= 1) {
    return {
      level: "Medium Risk",
      icon: "i-lucide-alert-circle",
      iconClass: "text-warning",
      description: "Very close to budget limit this month.",
      dailyCap,
      color: "warning",
    };
  }

  return {
    level: "Low Risk",
    icon: "i-lucide-shield-check",
    iconClass: "text-success",
    description: "Current pace is still within budget.",
    dailyCap,
    color: "success",
  };
});

const categoryEfficiency = computed(() => {
  if (!topCategory.value || !summary.value.currentSpending) {
    return {
      label: "No category data",
      icon: "i-lucide-layers-3",
      iconClass: "text-muted",
      description: "Add more expense records to analyze category efficiency.",
      reallocation: 0,
    };
  }

  const targetShare = 35;
  const excessShare = Math.max(topCategoryShare.value - targetShare, 0);
  const reallocation = Math.round(
    (summary.value.currentSpending * excessShare) / 100,
  );

  if (topCategoryShare.value > 50) {
    return {
      label: "Needs Rebalance",
      icon: "i-lucide-scale",
      iconClass: "text-error",
      description: `${topCategory.value.label} takes ${topCategoryShare.value}% of spending.`,
      reallocation,
    };
  }

  if (topCategoryShare.value > 35) {
    return {
      label: "Watch Category Mix",
      icon: "i-lucide-scale",
      iconClass: "text-warning",
      description: `${topCategory.value.label} is slightly dominant at ${topCategoryShare.value}%.`,
      reallocation,
    };
  }

  return {
    label: "Efficient Mix",
    icon: "i-lucide-scale",
    iconClass: "text-success",
    description: "Category distribution is still balanced.",
    reallocation: 0,
  };
});

const insights = computed(() => {
  return [
    {
      icon: "i-lucide-calendar-days",
      iconClass: "text-primary",
      title: "Average Daily Spending",
      description: `${formatIDRCurrency(averageDailySpend.value)}/day in selected period.`,
    },
    {
      icon: overBudgetRisk.value.icon,
      iconClass: overBudgetRisk.value.iconClass,
      title: `Over-Budget Risk: ${overBudgetRisk.value.level}`,
      description: overBudgetRisk.value.dailyCap
        ? `${overBudgetRisk.value.description} Daily cap: ${formatIDRCurrency(overBudgetRisk.value.dailyCap)}.`
        : overBudgetRisk.value.description,
    },
    {
      icon: categoryEfficiency.value.icon,
      iconClass: categoryEfficiency.value.iconClass,
      title: `Category Efficiency: ${categoryEfficiency.value.label}`,
      description: categoryEfficiency.value.reallocation
        ? `${categoryEfficiency.value.description} Reallocate around ${formatIDRCurrency(categoryEfficiency.value.reallocation)}.`
        : categoryEfficiency.value.description,
    },
  ];
});

const stats = computed(() => [
  {
    title: "Total Spent",
    value: formatIDRCurrency(summary.value.currentSpending),
    note: `${Math.min(budget.value.progress, 100)}% of budget limit`,
    icon: "i-lucide-receipt",
  },
  {
    title: "Avg. Daily Spend",
    value: formatIDRCurrency(averageDailySpend.value),
    note: "Average daily spending",
    icon: "i-lucide-calendar-days",
  },
  {
    title: "Top Category",
    value: topCategory.value?.label || "No Data",
    note: `${topCategoryShare.value}% of total spending`,
    icon: "i-lucide-layers-3",
  },
  {
    title: "VS Last Month",
    value: `${vsLastMonthDifference.value >= 0 ? "+" : "-"}${formatIDRCurrency(Math.abs(vsLastMonthDifference.value))}`,
    note: `${vsLastMonthPercent.value >= 0 ? "+" : ""}${vsLastMonthPercent.value}% vs previous month`,
    icon: "i-lucide-arrow-left-right",
  },
]);
</script>

<template>
  <UDashboardPanel id="reports">
    <template #header>
      <UDashboardNavbar title="Reports" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              label="This Month"
              size="xs"
              :variant="preset === 'month' ? 'solid' : 'ghost'"
              :color="preset === 'month' ? 'primary' : 'neutral'"
              @click="preset = 'month'"
            />
            <!-- <UButton
              label="Quarterly"
              size="xs"
              :variant="preset === 'quarter' ? 'solid' : 'ghost'"
              :color="preset === 'quarter' ? 'primary' : 'neutral'"
              @click="preset = 'quarter'"
            />
            <UButton
              label="Yearly"
              size="xs"
              :variant="preset === 'year' ? 'solid' : 'ghost'"
              :color="preset === 'year' ? 'primary' : 'neutral'"
              @click="preset = 'year'"
            /> -->
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="flex items-center gap-2 text-xs text-muted">
          <span>Reports</span>
          <UIcon name="i-lucide-chevron-right" class="size-3.5" />
          <span class="text-primary">Detailed Analytics</span>
        </div>

        <h1 class="text-3xl font-semibold text-highlighted">
          Analytics Overview
        </h1>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UCard
            v-for="item in stats"
            :key="item.title"
            variant="subtle"
            :ui="{ body: 'space-y-2' }"
          >
            <div class="flex items-start justify-between gap-3">
              <p class="text-xs text-muted uppercase tracking-[0.12em]">
                {{ item.title }}
              </p>
              <UIcon :name="item.icon" class="size-4 text-primary" />
            </div>
            <p class="text-2xl font-semibold text-highlighted">
              {{ item.value }}
            </p>
            <p class="text-xs text-muted">
              {{ item.note }}
            </p>
          </UCard>
        </div>

        <HomeChart
          :period="period"
          :chart="homeData?.chart || []"
          :total="summary.currentSpending"
        />

        <div class="grid gap-4 xl:grid-cols-3">
          <div class="grid gap-4 xl:col-span-2 lg:grid-cols-2">
            <HomeDonut :categories="categories" />

            <UCard variant="subtle">
              <template #header>
                <div>
                  <p class="text-xs text-muted uppercase tracking-[0.12em]">
                    Spending Distribution
                  </p>
                  <p class="mt-1 text-sm text-muted">
                    Category breakdown for the selected period
                  </p>
                </div>
              </template>

              <div class="space-y-4">
                <div
                  v-for="item in categories"
                  :key="item.label"
                  class="space-y-1.5"
                >
                  <div class="flex items-center justify-between text-sm">
                    <div class="flex items-center gap-2">
                      <span
                        class="size-2.5 rounded-full"
                        :style="{ backgroundColor: item.color }"
                      />
                      <span>{{ item.label }}</span>
                    </div>
                    <span class="font-semibold text-highlighted">
                      {{ formatIDRCurrency(item.amount) }}
                    </span>
                  </div>
                  <UProgress
                    :model-value="
                      summary.currentSpending
                        ? (item.amount / summary.currentSpending) * 100
                        : 0
                    "
                    color="primary"
                  />
                </div>
              </div>
            </UCard>
          </div>

          <UCard variant="subtle" :ui="{ body: 'space-y-5' }">
            <template #header>
              <div>
                <p class="text-xs text-muted uppercase tracking-[0.12em]">
                  Insights
                </p>
                <p class="mt-1 text-sm text-muted">
                  Key spending signals for this period
                </p>
              </div>
            </template>

            <div class="space-y-3">
              <div
                v-for="item in insights"
                :key="item.title"
                class="rounded-lg border border-default/60 p-3"
              >
                <div class="flex items-start gap-2">
                  <UIcon
                    :name="item.icon"
                    class="size-4 mt-0.5"
                    :class="item.iconClass"
                  />
                  <div>
                    <p class="text-sm font-medium text-highlighted">
                      {{ item.title }}
                    </p>
                    <p class="text-xs text-muted">
                      {{ item.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
