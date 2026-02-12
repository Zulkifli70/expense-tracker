<script setup lang="ts">
import { h } from "vue";
import * as z from "zod";
import type { DropdownMenuItem, FormSubmitEvent, TableColumn } from "@nuxt/ui";
import type { TransactionListItem, TransactionsApiResponse } from "~/types";
import { formatIDRCurrency } from "~/composables/useHomeFinance";

const toast = useToast();
const { pushNotification } = useDashboard();

const page = ref(1);
const pageSize = ref(10);
const search = ref("");
const category = ref("all");
const period = ref<"this_month" | "all_time">("this_month");

const openExpenseModal = ref(false);
const openEditModal = ref(false);
const loadingExpense = ref(false);
const loadingUpdate = ref(false);
const loadingDeleteId = ref<string | null>(null);

function toDateTimeLocalInput(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

const query = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  search: search.value || undefined,
  category: category.value,
  period: period.value,
}));

const { data, status, refresh } = await useFetch<TransactionsApiResponse>(
  "/api/transactions",
  {
    query,
    key: "transactions-data",
  },
);

watch([search, category, period, pageSize], () => {
  page.value = 1;
});

watch(
  () => data.value?.page,
  (serverPage) => {
    if (serverPage && serverPage !== page.value) {
      page.value = serverPage;
    }
  },
);

const categoryOptions = computed(() => data.value?.categories || ["all"]);
const tableRows = computed(() => data.value?.items || []);

function openTransactionDetail(id: string) {
  navigateTo(`/transactions/${id}`);
}

function buildClickableCell(
  id: string,
  content: string,
  className?: string,
  textClassName?: string,
) {
  return h(
    "button",
    {
      type: "button",
      class: `w-full text-left transition hover:text-primary ${className || ""}`,
      onClick: () => openTransactionDetail(id),
    },
    [h("span", { class: textClassName || "" }, content)],
  );
}

const tableColumns: TableColumn<TransactionListItem>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => buildClickableCell(row.original.id, formatDateLabel(row.original.date)),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) =>
      buildClickableCell(
        row.original.id,
        row.original.category,
        undefined,
        "font-medium text-highlighted",
      ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => buildClickableCell(row.original.id, row.original.description || "-"),
  },
  {
    accessorKey: "amount",
    header: () => h("div", { class: "text-right" }, "Amount"),
    cell: ({ row }) => {
      const amount = Number(row.original.amount);
      const formatted = formatIDRCurrency(Math.abs(amount));
      return h(
        "button",
        {
          type: "button",
          class: "w-full text-right font-semibold transition hover:text-primary",
          onClick: () => openTransactionDetail(row.original.id),
        },
        [
          h(
            "span",
            { class: amount >= 0 ? "text-success" : "text-error" },
            `${amount >= 0 ? "+" : "-"}${formatted}`,
          ),
        ],
      );
    },
  },
  {
    id: "actions",
    header: () => h("div", { class: "text-right" }, "Actions"),
    cell: ({ row }) =>
      h("div", { class: "text-right" }, [
        h(
          resolveComponent("UDropdownMenu"),
          {
            items: getRowItems(row.original),
            content: { align: "end" },
          },
          {
            default: () =>
              h(resolveComponent("UButton"), {
                icon: "i-lucide-ellipsis-vertical",
                color: "neutral",
                variant: "ghost",
                size: "xs",
                loading: loadingDeleteId.value === row.original.id,
              }),
          },
        ),
      ]),
  },
];

const fromIndex = computed(() => {
  if (!data.value?.total) return 0;
  return (data.value.page - 1) * data.value.pageSize + 1;
});

const toIndex = computed(() => {
  if (!data.value?.total) return 0;
  return Math.min(data.value.page * data.value.pageSize, data.value.total);
});

const expenseSchema = z.object({
  accountName: z.string().min(2, "Account name is too short"),
  categoryName: z.string().min(2, "Category is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  note: z.string().max(200).optional(),
  occurredAt: z.string().min(1, "Date is required"),
});

type ExpenseSchema = z.output<typeof expenseSchema>;

const expenseState = reactive<Partial<ExpenseSchema>>({
  accountName: "Cash Wallet",
  categoryName: "Food",
  amount: undefined,
  note: "",
  occurredAt: toDateTimeLocalInput(new Date()),
});

const editState = reactive<Partial<ExpenseSchema> & { id?: string }>({
  id: undefined,
  accountName: "Cash Wallet",
  categoryName: "Food",
  amount: undefined,
  note: "",
  occurredAt: toDateTimeLocalInput(new Date()),
});

const addExpenseCategories = computed(() => {
  const items = categoryOptions.value.filter((item) => item !== "all");
  return items.length ? items : ["Food", "Transport", "Utilities", "Other"];
});

function openEditTransaction(row: TransactionListItem) {
  editState.id = row.id;
  editState.accountName = row.accountName || "Cash Wallet";
  editState.categoryName = row.category;
  editState.amount = Math.abs(row.amount);
  editState.note = row.note === "-" ? "" : row.note;
  editState.occurredAt = toDateTimeLocalInput(new Date(row.date));
  openEditModal.value = true;
}

function getRowItems(row: TransactionListItem): DropdownMenuItem[][] {
  return [
    [
      {
        label: "View details",
        icon: "i-lucide-eye",
        onSelect: () => openTransactionDetail(row.id),
      },
      {
        label: "Edit",
        icon: "i-lucide-pencil",
        onSelect: () => openEditTransaction(row),
      },
      {
        label: "Delete",
        icon: "i-lucide-trash",
        color: "error",
        onSelect: () => onDeleteTransaction(row),
      },
    ],
  ];
}

function resetFilters() {
  search.value = "";
  category.value = "all";
  period.value = "this_month";
}

function exportCSV() {
  const rows = tableRows.value;
  if (!rows.length) {
    toast.add({
      title: "No data",
      description: "There are no transactions to export on this page.",
      color: "warning",
    });
    return;
  }

  const csvRows = [
    ["date", "account", "category", "description", "type", "amount"],
    ...rows.map((row) => [
      row.date,
      row.accountName,
      row.category,
      row.description,
      row.kind,
      row.amount.toString(),
    ]),
  ];
  const csv = csvRows
    .map((columns) =>
      columns.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `transactions-page-${page.value}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
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
      description: "Transaction has been added.",
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
    await refreshNuxtData("home-data");
  } catch (error: any) {
    toast.add({
      title: "Failed",
      description: error?.data?.statusMessage || "Failed to add expense",
      color: "error",
    });
  } finally {
    loadingExpense.value = false;
  }
}

async function onSubmitUpdateExpense(event: FormSubmitEvent<ExpenseSchema>) {
  if (!editState.id) return;
  loadingUpdate.value = true;
  try {
    await $fetch(`/api/transactions/${editState.id}`, {
      method: "PATCH",
      body: {
        ...event.data,
        occurredAt: new Date(event.data.occurredAt).toISOString(),
      },
    });
    toast.add({
      title: "Transaction updated",
      description: "Transaction has been updated successfully.",
      color: "success",
    });
    pushNotification({
      body: `Transaction updated: ${formatIDRCurrency(event.data.amount)} in ${event.data.categoryName}.`,
      to: `/transactions/${editState.id}`,
    });
    openEditModal.value = false;
    await refresh();
    await refreshNuxtData("home-data");
  } catch (error: any) {
    toast.add({
      title: "Failed",
      description: error?.data?.statusMessage || "Failed to update transaction",
      color: "error",
    });
  } finally {
    loadingUpdate.value = false;
  }
}

async function onDeleteTransaction(row: TransactionListItem) {
  if (!confirm("Delete this transaction?")) return;
  loadingDeleteId.value = row.id;
  try {
    await $fetch(`/api/transactions/${row.id}`, {
      method: "DELETE",
    });
    toast.add({
      title: "Transaction deleted",
      description: "Transaction has been removed.",
      color: "success",
    });
    pushNotification({
      body: `Transaction deleted: ${row.category} (${formatIDRCurrency(Math.abs(row.amount))}).`,
      to: "/transactions",
    });
    await refresh();
    await refreshNuxtData("home-data");
  } catch (error: any) {
    toast.add({
      title: "Failed",
      description: error?.data?.statusMessage || "Failed to delete transaction",
      color: "error",
    });
  } finally {
    loadingDeleteId.value = null;
  }
}
</script>

<template>
  <UDashboardPanel id="transactions">
    <template #header>
      <UDashboardNavbar title="Transaction History">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              label="Export CSV"
              icon="i-lucide-download"
              color="neutral"
              variant="outline"
              @click="exportCSV"
            />
            <UButton
              label="Add Transaction"
              icon="i-lucide-circle-plus"
              color="primary"
              @click="openExpenseModal = true"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="rounded-lg border border-default p-3 sm:p-4 space-y-3">
        <div class="grid grid-cols-1 gap-2 lg:grid-cols-4">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            class="lg:col-span-2"
            placeholder="Search descriptions and categories..."
          />
          <USelect v-model="category" :items="categoryOptions" />
          <USelect
            v-model="period"
            :items="[
              { label: 'This Month', value: 'this_month' },
              { label: 'All Time', value: 'all_time' },
            ]"
          />
        </div>
        <div class="flex items-center justify-between">
          <p class="text-xs text-muted">
            Click date/category/description/amount to open transaction details.
          </p>
          <UButton
            label="Reset Filters"
            color="neutral"
            variant="ghost"
            @click="resetFilters"
          />
        </div>
      </div>

      <UTable
        :loading="status === 'pending'"
        :data="tableRows"
        :columns="tableColumns"
        class="shrink-0"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
        }"
      />

      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-default pt-4"
      >
        <div class="text-sm text-muted">
          Showing {{ fromIndex }} to {{ toIndex }} of {{ data?.total || 0 }} transactions
        </div>
        <div class="flex items-center gap-3">
          <USelect v-model="pageSize" :items="[10, 20, 30]" class="w-20" />
          <UPagination
            :default-page="page"
            :items-per-page="data?.pageSize || pageSize"
            :total="data?.total || 0"
            @update:page="(p: number) => page = p"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="openExpenseModal" title="Add Expense">
    <template #body>
      <UForm
        :schema="expenseSchema"
        :state="expenseState"
        class="space-y-4"
        @submit="onSubmitAddExpense"
      >
        <UFormField label="Account" name="accountName">
          <UInput v-model="expenseState.accountName" class="w-full" />
        </UFormField>
        <UFormField label="Category" name="categoryName">
          <USelect
            v-model="expenseState.categoryName"
            :items="addExpenseCategories"
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
        <UFormField label="Description" name="note">
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

  <UModal v-model:open="openEditModal" title="Edit Transaction">
    <template #body>
      <UForm
        :schema="expenseSchema"
        :state="editState"
        class="space-y-4"
        @submit="onSubmitUpdateExpense"
      >
        <UFormField label="Account" name="accountName">
          <UInput v-model="editState.accountName" class="w-full" />
        </UFormField>
        <UFormField label="Category" name="categoryName">
          <USelect
            v-model="editState.categoryName"
            :items="addExpenseCategories"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Amount" name="amount">
          <UInput
            v-model.number="editState.amount"
            type="number"
            min="1"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Date" name="occurredAt">
          <UInput
            v-model="editState.occurredAt"
            type="datetime-local"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Description" name="note">
          <UInput v-model="editState.note" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="openEditModal = false"
          />
          <UButton label="Update" type="submit" :loading="loadingUpdate" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
