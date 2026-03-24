<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { HomeApiResponse, Period, Range } from "~/types";
import HomeBudgetLimit from "~/components/home/HomeBudgetLimit.vue";
import { formatIDRCurrency } from "~/composables/useHomeFinance";
import { mergeExpenseCategories } from "~~/shared/constants/expense-categories";

const {
  isNotificationsSlideoverOpen,
  unreadNotificationsCount,
  pushNotification,
} = useDashboard();
const toast = useToast();
const userProfile = useUserProfile();

const now = ref<Date | null>(null);
let clockTimer: ReturnType<typeof setInterval> | null = null;
let clockAlignTimer: ReturnType<typeof setTimeout> | null = null;

const currentTimeLabel = computed(() => {
  if (!now.value) return "--:--";
  return now.value.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
});

const greetingLabel = computed(() => {
  if (!now.value) return "Hi";
  const hour = now.value.getHours();
  if (hour < 11) return "Good Morning";
  if (hour < 15) return "Good Afternoon";
  if (hour < 19) return "Good Evening";
  return "Good Night";
});

const greetingText = computed(() => {
  const name = userProfile.value.name?.trim() || "User";
  return `${greetingLabel.value}, ${name}`;
});

function startMinuteClock() {
  now.value = new Date();

  const syncToMinute = () => {
    now.value = new Date();
    clockTimer = setInterval(() => {
      now.value = new Date();
    }, 60 * 1000);
  };

  const current = new Date();
  const msUntilNextMinute =
    (59 - current.getSeconds()) * 1000 + (1000 - current.getMilliseconds());

  clockAlignTimer = setTimeout(syncToMinute, msUntilNextMinute);
}

onMounted(() => {
  startMinuteClock();
});

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer);
  if (clockAlignTimer) clearTimeout(clockAlignTimer);
});

function getDefaultRangeByLocalNow() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  return {
    start: new Date(year, month, 1, 0, 0, 0, 0),
    end: new Date(year, month, day, 23, 59, 59, 999),
  };
}

function toDateTimeLocalInput(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

const openBalanceModal = ref(false);
const openExpenseModal = ref(false);
const openLimitModal = ref(false);
const loadingBalance = ref(false);
const loadingExpense = ref(false);
const loadingLimit = ref(false);

const range = shallowRef<Range>(getDefaultRangeByLocalNow());
const period = ref<Period>("daily");

const query = computed(() => ({
  period: period.value,
  start: range.value.start.toISOString(),
  end: range.value.end.toISOString(),
}));

const { data: homeData, refresh } = await useFetch<HomeApiResponse>(
  "/api/home",
  {
    query,
    key: "home-data",
  },
);

const balanceSchema = z.object({
  accountName: z.string().min(2, "Account name is too short"),
  accountType: z.string().min(2, "Account type is required"),
  amount: z.number().positive("Amount must be greater than 0"),
});
type BalanceSchema = z.output<typeof balanceSchema>;

const expenseSchema = z.object({
  accountName: z.string().min(2, "Account name is too short"),
  categoryName: z.string().min(2, "Category is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  note: z.string().max(200).optional(),
  occurredAt: z.string().min(1, "Date is required"),
});
type ExpenseSchema = z.output<typeof expenseSchema>;

const limitSchema = z.object({
  limitAmount: z.number().positive("Limit must be greater than 0"),
  warningThreshold: z.number().min(1).max(99),
  criticalThreshold: z.number().min(2).max(100),
});
type LimitSchema = z.output<typeof limitSchema>;

const balanceState = reactive<Partial<BalanceSchema>>({
  accountName: "Cash Wallet",
  accountType: "cash",
  amount: undefined,
});

const expenseState = reactive<Partial<ExpenseSchema>>({
  accountName: "Cash Wallet",
  categoryName: "Food",
  amount: undefined,
  note: "",
  occurredAt: toDateTimeLocalInput(new Date()),
});

const limitState = reactive<Partial<LimitSchema>>({
  limitAmount: undefined,
  warningThreshold: 70,
  criticalThreshold: 90,
});

watch(
  () => homeData.value?.budget,
  (budget) => {
    if (!budget) return;
    limitState.limitAmount = budget.limit || 0;
    limitState.warningThreshold = budget.thresholds.warning;
    limitState.criticalThreshold = budget.thresholds.critical;
  },
  { immediate: true },
);

const accountOptions = computed(() => {
  const names = homeData.value?.balance.accounts.map((item) => item.name) || [];
  return names.length ? names : ["Cash Wallet"];
});

const categoryOptions = computed(() => {
  const names = homeData.value?.categories.map((item) => item.label) || [];
  return mergeExpenseCategories(names);
});

const hasBalanceAccounts = computed(
  () => (homeData.value?.balance.accounts.length || 0) > 0,
);
const hasTransactions = computed(
  () => (homeData.value?.latestTransactions.length || 0) > 0,
);
const isEmptyState = computed(
  () => !hasBalanceAccounts.value && !hasTransactions.value,
);

const budgetMilestoneThresholds = [25, 50, 75, 90];
const notifiedBudgetMilestones = useState<Record<string, number[]>>(
  "budget-milestone-notifications",
  () => ({}),
);
const currentMonthKey = computed(() => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
});
const previousBudgetProgress = ref<number | null>(null);
const budgetProgress = computed(() => homeData.value?.budget.progress ?? 0);

watch(
  currentMonthKey,
  (monthKey) => {
    if (!notifiedBudgetMilestones.value[monthKey]) {
      notifiedBudgetMilestones.value[monthKey] = [];
    }
    previousBudgetProgress.value = null;
  },
  { immediate: true },
);

watch(
  budgetProgress,
  (progress) => {
    const monthKey = currentMonthKey.value;
    const alreadyNotified = notifiedBudgetMilestones.value[monthKey] || [];

    if (previousBudgetProgress.value === null) {
      previousBudgetProgress.value = progress;
      return;
    }

    if (progress <= previousBudgetProgress.value) {
      previousBudgetProgress.value = progress;
      return;
    }

    const crossed = budgetMilestoneThresholds.filter(
      (threshold) =>
        previousBudgetProgress.value! < threshold &&
        progress >= threshold &&
        !alreadyNotified.includes(threshold),
    );

    crossed.forEach((threshold) => {
      const body =
        threshold === 90
          ? `Budget usage reached ${threshold}%. You're close to the monthly limit.`
          : `Budget usage reached ${threshold}% this month.`;

      pushNotification({
        body,
        senderName: "Budget Guard",
        to: "/reports",
      });

      alreadyNotified.push(threshold);
    });

    notifiedBudgetMilestones.value[monthKey] = alreadyNotified;
    previousBudgetProgress.value = progress;
  },
  { immediate: true },
);

async function onSubmitAddBalance(event: FormSubmitEvent<BalanceSchema>) {
  loadingBalance.value = true;
  try {
    await $fetch("/api/home/balance", {
      method: "POST",
      body: event.data,
    });
    toast.add({
      title: "Balance updated",
      description: "Balance has been added successfully.",
      color: "success",
    });
    pushNotification({
      body: `Balance added: ${formatIDRCurrency(event.data.amount)} to ${event.data.accountName}.`,
    });
    openBalanceModal.value = false;
    balanceState.amount = undefined;
    await refresh();
  } catch (error: any) {
    toast.add({
      title: "Failed",
      description: error?.data?.statusMessage || "Failed to add balance",
      color: "error",
    });
  } finally {
    loadingBalance.value = false;
  }
}

async function onSubmitAddExpense(event: FormSubmitEvent<ExpenseSchema>) {
  loadingExpense.value = true;
  try {
    const created = await $fetch<{ ok: boolean; id?: string }>(
      "/api/home/expenses",
      {
        method: "POST",
        body: {
          ...event.data,
          occurredAt: new Date(event.data.occurredAt).toISOString(),
        },
      },
    );
    toast.add({
      title: "Expense saved",
      description: "Expense has been recorded.",
      color: "success",
    });
    pushNotification({
      body: `New expense: ${formatIDRCurrency(event.data.amount)} for ${event.data.categoryName}.`,
      to: created.id ? `/transactions/${created.id}` : "/transactions",
    });
    openExpenseModal.value = false;
    expenseState.amount = undefined;
    expenseState.note = "";
    expenseState.occurredAt = toDateTimeLocalInput(new Date());
    await refresh();
  } catch (error: any) {
    toast.add({
      title: "Failed",
      description: error?.data?.statusMessage || "Failed to save expense",
      color: "error",
    });
  } finally {
    loadingExpense.value = false;
  }
}

async function onSubmitEditLimit(event: FormSubmitEvent<LimitSchema>) {
  if (event.data.warningThreshold >= event.data.criticalThreshold) {
    toast.add({
      title: "Invalid threshold",
      description: "Warning threshold must be lower than critical threshold.",
      color: "error",
    });
    return;
  }

  loadingLimit.value = true;
  try {
    await $fetch("/api/home/budget-limit", {
      method: "PATCH",
      body: event.data,
    });
    toast.add({
      title: "Budget limit updated",
      description: "Monthly budget limit has been updated.",
      color: "success",
    });
    pushNotification({
      body: `Monthly limit updated to ${formatIDRCurrency(event.data.limitAmount)} (warn ${event.data.warningThreshold}%, critical ${event.data.criticalThreshold}%).`,
      to: "/reports",
    });
    openLimitModal.value = false;
    await refresh();
  } catch (error: any) {
    toast.add({
      title: "Failed",
      description:
        error?.data?.statusMessage || "Failed to update budget limit",
      color: "error",
    });
  } finally {
    loadingLimit.value = false;
  }
}
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Home" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UTooltip text="Notifications" :shortcuts="['N']">
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isNotificationsSlideoverOpen = true"
            >
              <UChip color="error" inset :show="unreadNotificationsCount > 0">
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <HomeDateRangePicker v-model="range" class="-ms-1" />
          <HomePeriodSelect v-model="period" :range="range" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div
        class="rounded-lg border border-default bg-elevated/40 px-4 py-3 flex items-center justify-between"
      >
        <div>
          <p class="text-xs uppercase text-muted tracking-[0.12em]">Greeting</p>
          <p class="text-base sm:text-lg font-semibold text-highlighted">
            {{ greetingText }}
          </p>
        </div>
        <div class="text-right">
          <p class="text-xs uppercase text-muted tracking-[0.12em]">
            Local Time
          </p>
          <p class="text-2xl font-semibold tabular-nums text-highlighted">
            {{ currentTimeLabel }}
          </p>
        </div>
      </div>
      <div
        v-if="isEmptyState"
        class="flex min-h-[calc(100vh-18rem)] items-center justify-center"
      >
        <div
          class="mx-auto flex w-full max-w-2xl flex-col items-center rounded-[2rem] border border-dashed border-primary/30 bg-gradient-to-br from-primary/8 via-elevated to-primary/5 px-6 py-12 text-center shadow-sm"
        >
          <div
            class="flex size-16 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-inset ring-primary/15"
          >
            <UIcon name="i-lucide-wallet-minimal" class="size-8" />
          </div>
          <h2 class="mt-6 text-2xl font-semibold text-highlighted sm:text-3xl">
            Start tracking your money from here
          </h2>
          <p class="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
            Add your first balance or record your first expense to build your
            home dashboard.
          </p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <UButton
              size="xl"
              icon="i-lucide-wallet"
              class="justify-center rounded-full px-6"
              @click="openBalanceModal = true"
            >
              Add First Balance
            </UButton>
            <UButton
              size="xl"
              color="neutral"
              variant="soft"
              icon="i-lucide-receipt"
              class="justify-center rounded-full px-6"
              @click="openExpenseModal = true"
            >
              Add New Expense
            </UButton>
          </div>
        </div>
      </div>

      <template v-else>
        <HomeStats :stats="homeData?.stats || []" />
        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <HomeChart
            :period="period"
            :chart="homeData?.chart || []"
            :total="homeData?.summary.currentSpending || 0"
          />
          <HomeBudgetLimit
            :budget="homeData?.budget"
            :current-spending="homeData?.summary.currentSpending || 0"
            @edit-limit="openLimitModal = true"
          />
        </div>
        <HomeSales :rows="homeData?.latestTransactions || []" />
      </template>
    </template>
  </UDashboardPanel>

  <div
    class="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3"
  >
    <UTooltip text="Add Balance">
      <UButton
        icon="i-lucide-wallet"
        color="neutral"
        variant="soft"
        size="lg"
        class="pointer-events-auto rounded-full shadow-lg shadow-black/10"
        @click="openBalanceModal = true"
      />
    </UTooltip>

    <UTooltip text="Add New Expense">
      <UButton
        icon="i-lucide-plus"
        size="xl"
        class="pointer-events-auto rounded-full shadow-xl shadow-primary/20"
        @click="openExpenseModal = true"
      />
    </UTooltip>
  </div>

  <UModal v-model:open="openBalanceModal" title="Add Balance">
    <template #body>
      <UForm
        :schema="balanceSchema"
        :state="balanceState"
        class="space-y-4"
        @submit="onSubmitAddBalance"
      >
        <UFormField label="Account Name" name="accountName">
          <UInput v-model="balanceState.accountName" class="w-full" />
        </UFormField>
        <UFormField label="Account Type" name="accountType">
          <USelect
            v-model="balanceState.accountType"
            :items="['cash', 'bank', 'ewallet']"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Amount" name="amount">
          <UInput
            v-model.number="balanceState.amount"
            type="number"
            min="1"
            class="w-full"
          />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="openBalanceModal = false"
          />
          <UButton label="Save" type="submit" :loading="loadingBalance" />
        </div>
      </UForm>
    </template>
  </UModal>

  <UModal v-model:open="openExpenseModal" title="Add Expense">
    <template #body>
      <UForm
        :schema="expenseSchema"
        :state="expenseState"
        class="space-y-4"
        @submit="onSubmitAddExpense"
      >
        <UFormField label="Account" name="accountName">
          <USelect
            v-model="expenseState.accountName"
            :items="accountOptions"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Category" name="categoryName">
          <USelect
            v-model="expenseState.categoryName"
            :items="categoryOptions"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Amount" name="amount">
          <UInput
            v-model.number="expenseState.amount"
            type="number"
            min="1"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Date" name="occurredAt">
          <UInput
            v-model="expenseState.occurredAt"
            type="datetime-local"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Note" name="note">
          <UInput v-model="expenseState.note" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="openExpenseModal = false"
          />
          <UButton label="Save" type="submit" :loading="loadingExpense" />
        </div>
      </UForm>
    </template>
  </UModal>

  <UModal v-model:open="openLimitModal" title="Edit Monthly Limit">
    <template #body>
      <UForm
        :schema="limitSchema"
        :state="limitState"
        class="space-y-4"
        @submit="onSubmitEditLimit"
      >
        <UFormField label="Limit Amount" name="limitAmount">
          <UInput
            v-model.number="limitState.limitAmount"
            type="number"
            min="1"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Warning Threshold (%)" name="warningThreshold">
          <UInput
            v-model.number="limitState.warningThreshold"
            type="number"
            min="1"
            max="99"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Critical Threshold (%)" name="criticalThreshold">
          <UInput
            v-model.number="limitState.criticalThreshold"
            type="number"
            min="2"
            max="100"
            class="w-full"
          />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="openLimitModal = false"
          />
          <UButton label="Update" type="submit" :loading="loadingLimit" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
