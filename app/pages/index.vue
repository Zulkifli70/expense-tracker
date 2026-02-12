<script setup lang="ts">
import { endOfDay, startOfMonth } from "date-fns";
import * as z from "zod";
import type { DropdownMenuItem, FormSubmitEvent } from "@nuxt/ui";
import type { HomeApiResponse, Period, Range } from "~/types";
import HomeBudgetLimit from "~/components/home/HomeBudgetLimit.vue";
import { formatIDRCurrency } from "~/composables/useHomeFinance";

const { isNotificationsSlideoverOpen, unreadNotificationsCount, pushNotification } =
  useDashboard();
const toast = useToast();

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

const range = shallowRef<Range>({
  start: startOfMonth(new Date()),
  end: endOfDay(new Date()),
});
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
  return names.length ? names : ["Food", "Transport", "Utilities", "Other"];
});

const items = [
  [
    {
      label: "Add Balance",
      icon: "i-lucide-wallet",
      onSelect() {
        openBalanceModal.value = true;
      },
    },
    {
      label: "Add Expense",
      icon: "i-lucide-receipt",
      onSelect() {
        openExpenseModal.value = true;
      },
    },
  ],
] satisfies DropdownMenuItem[][];

const budgetMilestoneThresholds = [25, 50, 75, 90];
const notifiedBudgetMilestones = useState<Record<string, number[]>>(
  "budget-milestone-notifications",
  () => ({}),
);
const currentMonthKey = computed(() => new Date().toISOString().slice(0, 7));
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
    const created = await $fetch<{ ok: boolean; id?: string }>("/api/home/expenses", {
      method: "POST",
      body: {
        ...event.data,
        occurredAt: new Date(event.data.occurredAt).toISOString(),
      },
    });
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

          <UDropdownMenu :items="items">
            <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
          </UDropdownMenu>
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
  </UDashboardPanel>

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
