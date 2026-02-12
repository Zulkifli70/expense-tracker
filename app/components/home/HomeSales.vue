<script setup lang="ts">
import { h } from "vue";
import type { TableColumn } from "@nuxt/ui";
import type { HomeExpenseRow } from "~/types";

defineProps<{
  rows: HomeExpenseRow[];
}>();

const columns: TableColumn<HomeExpenseRow>[] = [
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
        timeZone: "Asia/Jakarta",
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
    :data="rows"
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
