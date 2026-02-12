<script setup lang="ts">
import { h } from "vue";
import type { TableColumn } from "@nuxt/ui";
import type { Period, Range } from "~/types";

defineProps<{
  period: Period;
  range: Range;
}>();

type ExpenseRow = {
  id: string;
  date: string;
  expenseType: string;
  amount: number;
  description: string;
};

const { currentSpending } = useHomeFinance();

const data = computed<ExpenseRow[]>(() => {
  const dateNow = new Date("2026-02-12T10:00:00.000Z");
  const types = [
    { label: "Food", ratio: 0.17, description: "Meals and beverages" },
    {
      label: "Transportation",
      ratio: 0.12,
      description: "Ride and daily commute",
    },
    {
      label: "Groceries",
      ratio: 0.26,
      description: "Household and daily needs",
    },
    {
      label: "Utilities",
      ratio: 0.29,
      description: "Internet and monthly utilities",
    },
    { label: "Other", ratio: 0.16, description: "Other operational spending" },
  ];

  let used = 0;

  return types.map((item, index) => {
    const amount =
      index === types.length - 1
        ? Math.max(currentSpending.value - used, 0)
        : Math.round(currentSpending.value * item.ratio);

    used += amount;

    return {
      id: `EX-${String(index + 1).padStart(3, "0")}`,
      date: new Date(
        dateNow.getTime() - index * 24 * 60 * 60 * 1000,
      ).toISOString(),
      expenseType: item.label,
      amount,
      description: item.description,
    };
  });
});

const columns: TableColumn<ExpenseRow>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      return new Date(row.getValue("date")).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    },
  },
  {
    accessorKey: "expenseType",
    header: "Expense Type",
  },
  {
    accessorKey: "amount",
    header: () => h("div", { class: "text-right" }, "Amount"),
    cell: ({ row }) => {
      const amount = Number(row.getValue("amount"));

      const formatted = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount);

      return h("div", { class: "text-right font-medium" }, formatted);
    },
  },
  {
    accessorKey: "description",
    header: "Description",
  },
];
</script>

<template>
  <UTable
    :data="data"
    :columns="columns"
    class="shrink-0"
    :ui="{
      base: 'table-fixed border-separate border-spacing-0',
      thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
      tbody: '[&>tr]:last:[&>td]:border-b-0',
      th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
      td: 'border-b border-default',
    }"
  />
</template>
