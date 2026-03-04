<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { TransactionDetail } from "~/types";
import { formatIDRCurrency } from "~/composables/useHomeFinance";

const route = useRoute();
const toast = useToast();
const { pushNotification } = useDashboard();

const openEditModal = ref(false);
const loadingUpdate = ref(false);
const loadingDelete = ref(false);

const transactionId = computed(() => String(route.params.id || ""));

const {
  data: transaction,
  status,
  refresh,
  error,
} = await useFetch<TransactionDetail>(() => `/api/transactions/${transactionId.value}`, {
  key: computed(() => `transaction-detail-${transactionId.value}`),
});

const updateSchema = z.object({
  accountName: z.string().min(2, "Account name is too short"),
  categoryName: z.string().min(2, "Category is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  note: z.string().max(200).optional(),
  occurredAt: z.string().min(1, "Date is required"),
});

type UpdateSchema = z.output<typeof updateSchema>;

function toDateTimeLocalInput(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

const state = reactive<Partial<UpdateSchema>>({
  accountName: "",
  categoryName: "",
  amount: undefined,
  note: "",
  occurredAt: "",
});

watch(
  transaction,
  (value) => {
    if (!value) return;
    state.accountName = value.accountName;
    state.categoryName = value.category;
    state.amount = Math.abs(value.amount);
    state.note = value.note || "";
    state.occurredAt = toDateTimeLocalInput(new Date(value.date));
  },
  { immediate: true },
);

const amountLabel = computed(() => {
  if (!transaction.value) return "-";
  const absolute = formatIDRCurrency(Math.abs(transaction.value.amount));
  return `${transaction.value.amount >= 0 ? "+" : "-"}${absolute}`;
});

const amountColorClass = computed(() =>
  (transaction.value?.amount || 0) >= 0 ? "text-success" : "text-error",
);

async function onSubmitUpdate(event: FormSubmitEvent<UpdateSchema>) {
  loadingUpdate.value = true;
  try {
    await $fetch(`/api/transactions/${transactionId.value}`, {
      method: "PATCH",
      body: {
        ...event.data,
        occurredAt: new Date(event.data.occurredAt).toISOString(),
      },
    });
    toast.add({
      title: "Transaction updated",
      description: "Transaction details have been updated.",
      color: "success",
    });
    pushNotification({
      body: `Transaction updated: ${formatIDRCurrency(event.data.amount)} in ${event.data.categoryName}.`,
      to: `/transactions/${transactionId.value}`,
    });
    openEditModal.value = false;
    await refresh();
    await refreshNuxtData("transactions-data");
    await refreshNuxtData("home-data");
  } catch (err: any) {
    toast.add({
      title: "Failed",
      description: err?.data?.statusMessage || "Failed to update transaction",
      color: "error",
    });
  } finally {
    loadingUpdate.value = false;
  }
}

async function onDelete() {
  if (!confirm("Delete this transaction?")) return;
  loadingDelete.value = true;
  try {
    await $fetch(`/api/transactions/${transactionId.value}`, {
      method: "DELETE",
    });
    toast.add({
      title: "Transaction deleted",
      description: "Transaction has been removed.",
      color: "success",
    });
    pushNotification({
      body: "Transaction deleted from detail page.",
      to: "/transactions",
    });
    await refreshNuxtData("transactions-data");
    await refreshNuxtData("home-data");
    await navigateTo("/transactions");
  } catch (err: any) {
    toast.add({
      title: "Failed",
      description: err?.data?.statusMessage || "Failed to delete transaction",
      color: "error",
    });
  } finally {
    loadingDelete.value = false;
  }
}
</script>

<template>
  <UDashboardPanel id="transaction-detail">
    <template #header>
      <UDashboardNavbar title="Transaction Detail">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              label="Back to list"
              color="neutral"
              variant="outline"
              icon="i-lucide-arrow-left"
              @click="navigateTo('/transactions')"
            />
            <UButton
              label="Edit"
              icon="i-lucide-pencil"
              color="primary"
              @click="openEditModal = true"
            />
            <UButton
              label="Delete"
              icon="i-lucide-trash"
              color="error"
              variant="subtle"
              :loading="loadingDelete"
              @click="onDelete"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="status === 'pending'" class="space-y-4">
        <USkeleton class="h-24 w-full rounded-lg" />
        <USkeleton class="h-56 w-full rounded-lg" />
      </div>

      <UAlert
        v-else-if="error"
        color="error"
        variant="soft"
        title="Unable to load transaction"
        :description="error.statusMessage || 'Transaction not found.'"
      />

      <div v-else-if="transaction" class="space-y-4">
        <UCard>
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.12em] text-muted">Transaction ID</p>
              <p class="mt-1 font-mono text-sm text-toned">
                {{ transaction.id }}
              </p>
            </div>

            <div class="text-right">
              <p class="text-xs uppercase tracking-[0.12em] text-muted">Amount</p>
              <p class="mt-1 text-3xl font-semibold" :class="amountColorClass">
                {{ amountLabel }}
              </p>
            </div>
          </div>
        </UCard>

        <div class="grid gap-4 md:grid-cols-2">
          <UCard variant="subtle">
            <template #header>
              <p class="text-sm font-medium text-highlighted">Transaction Meta</p>
            </template>
            <dl class="space-y-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <dt class="text-muted">Date</dt>
                <dd class="font-medium text-highlighted">
                  {{ new Date(transaction.date).toLocaleString("id-ID") }}
                </dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-muted">Type</dt>
                <dd class="font-medium capitalize text-highlighted">
                  {{ transaction.kind }}
                </dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-muted">Account</dt>
                <dd class="font-medium text-highlighted">{{ transaction.accountName }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-muted">Category</dt>
                <dd class="font-medium text-highlighted">{{ transaction.category }}</dd>
              </div>
            </dl>
          </UCard>

          <UCard variant="subtle">
            <template #header>
              <p class="text-sm font-medium text-highlighted">Description</p>
            </template>
            <p class="whitespace-pre-wrap text-sm text-toned">
              {{ transaction.description || "-" }}
            </p>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="openEditModal" title="Edit Transaction">
    <template #body>
      <UForm
        :schema="updateSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmitUpdate"
      >
        <UFormField label="Account" name="accountName">
          <UInput v-model="state.accountName" class="w-full" />
        </UFormField>
        <UFormField label="Category" name="categoryName">
          <UInput v-model="state.categoryName" class="w-full" />
        </UFormField>
        <UFormField label="Amount" name="amount">
          <UInput v-model.number="state.amount" type="number" min="1" class="w-full" />
        </UFormField>
        <UFormField label="Date" name="occurredAt">
          <UInput v-model="state.occurredAt" type="datetime-local" class="w-full" />
        </UFormField>
        <UFormField label="Description" name="note">
          <UInput v-model="state.note" class="w-full" />
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
