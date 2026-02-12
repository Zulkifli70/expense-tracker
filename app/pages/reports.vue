<script setup lang="ts">
import {
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

const topCategoryShare = computed(() => {
  if (!topCategory.value || !summary.value.currentSpending) return 0;
  return Math.round(
    (topCategory.value.amount / summary.value.currentSpending) * 100,
  );
});

const estimatedRunwayDays = computed(() => {
  if (!averageDailySpend.value) return 0;
  return Math.max(Math.floor(budget.value.remaining / averageDailySpend.value), 0);
});

const insights = computed(() => {
  const notes = [];

  if (budget.value.status === "critical") {
      notes.push({
        color: "error" as const,
        iconClass: "text-error",
        icon: "i-lucide-alert-triangle",
        title: "Budget is in the critical zone",
        description: "Limit non-essential spending to avoid going over budget.",
      });
  } else if (budget.value.status === "warning") {
      notes.push({
        color: "warning" as const,
        iconClass: "text-warning",
        icon: "i-lucide-alert-circle",
        title: "Spending is approaching the warning threshold",
        description: "Reserve remaining budget for essential needs through month-end.",
      });
  } else {
      notes.push({
        color: "success" as const,
        iconClass: "text-success",
        icon: "i-lucide-badge-check",
        title: "Budget remains healthy",
        description: "Current spending pace is still within a safe range.",
      });
  }

  if (topCategory.value && topCategoryShare.value >= 35) {
    notes.push({
      color: "warning" as const,
      iconClass: "text-warning",
      icon: "i-lucide-pie-chart",
      title: `${topCategory.value.label} is dominant (${topCategoryShare.value}%)`,
      description: "Consider setting a weekly cap for this category.",
    });
  }

  if (projectedGap.value < 0) {
    notes.push({
      color: "error" as const,
      iconClass: "text-error",
      icon: "i-lucide-trending-up",
      title: "Month-end projection exceeds budget limit",
      description: `Potential overspend of ${formatIDRCurrency(Math.abs(projectedGap.value))}.`,
    });
  } else {
    notes.push({
      color: "success" as const,
      iconClass: "text-success",
      icon: "i-lucide-shield-check",
      title: "Projection is still within budget",
      description: `Remaining buffer: ${formatIDRCurrency(projectedGap.value)}.`,
    });
  }

  return notes.slice(0, 3);
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
    title: "Forecast Gap",
    value: `${projectedGap.value >= 0 ? "+" : "-"}${formatIDRCurrency(Math.abs(projectedGap.value))}`,
    note: "Projection gap vs this month's budget",
    icon: "i-lucide-radar",
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
            <UButton
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
            />
          </div>

          <UButton label="Export PDF" icon="i-lucide-download" size="sm" />
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

        <h1 class="text-3xl font-semibold text-highlighted">Analytics Overview</h1>

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
                  Runway Insight
                </p>
                <p class="mt-1 text-sm text-muted">
                  Estimated budget runway based on the current spending pace
                </p>
              </div>
            </template>

            <div>
              <p class="text-4xl font-semibold text-highlighted">
                {{ estimatedRunwayDays }}
                <span class="text-xl text-muted font-medium">days</span>
              </p>
              <p class="mt-1 text-sm text-muted">
                Remaining budget {{ formatIDRCurrency(budget.remaining) }}
              </p>
            </div>

            <div class="space-y-3">
              <div
                v-for="item in insights"
                :key="item.title"
                class="rounded-lg border border-default/60 p-3"
              >
                <div class="flex items-start gap-2">
                  <UIcon :name="item.icon" class="size-4 mt-0.5" :class="item.iconClass" />
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
