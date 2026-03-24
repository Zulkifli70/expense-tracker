<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import type { TransactionsApiResponse } from "~/types";

const { loggedIn, user } = useUserSession();
const isDemo = computed(() => !!user.value?.isDemo);

const open = ref(false);
const searchOpen = ref(false);
const searchTerm = ref("");
const searchLoading = ref(false);
const transactionSearchItems = ref<any[]>([]);
let searchRequestId = 0;
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const links = [
  [
    {
      label: "Home",
      icon: "i-lucide-house",
      to: "/",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Transactions",
      icon: "i-lucide-receipt-text",
      to: "/transactions",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Reports",
      icon: "i-lucide-file-chart-column-increasing",
      to: "/reports",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Settings",
      to: "/settings",
      icon: "i-lucide-settings",
      onSelect: () => {
        open.value = false;
      },
    },
  ],
] satisfies NavigationMenuItem[][];

const groups = computed(() => {
  const baseGroups: any[] = [
    {
      id: "links",
      label: "Go to",
      items: links.flat(),
    },
  ];

  if (searchTerm.value.trim().length >= 2) {
    baseGroups.push({
      id: "transactions-search",
      label: "Transactions",
      ignoreFilter: true,
      items: transactionSearchItems.value,
    });
  }

  return baseGroups;
});

function formatAmountIDR(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

function formatTransactionDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

watch(searchTerm, (value) => {
  const keyword = value.trim();

  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  if (keyword.length < 2) {
    transactionSearchItems.value = [];
    searchLoading.value = false;
    return;
  }

  searchDebounceTimer = setTimeout(async () => {
    const requestId = ++searchRequestId;
    searchLoading.value = true;

    try {
      const response = await $fetch<TransactionsApiResponse>(
        "/api/transactions",
        {
          query: {
            page: 1,
            pageSize: 10,
            search: keyword,
            category: "all",
            period: "all_time",
          },
        },
      );

      if (requestId !== searchRequestId) return;

      transactionSearchItems.value = response.items.slice(0, 8).map((item) => ({
        id: item.id,
        label:
          item.description && item.description !== "-"
            ? item.description
            : item.category,
        description: item.category,
        suffix: `${item.amount >= 0 ? "+" : "-"}${formatAmountIDR(item.amount)} | ${formatTransactionDate(item.date)}`,
        icon: "i-lucide-receipt-text",
        to: `/transactions/${item.id}`,
      }));
    } catch {
      if (requestId !== searchRequestId) return;
      transactionSearchItems.value = [];
    } finally {
      if (requestId === searchRequestId) {
        searchLoading.value = false;
      }
    }
  }, 300);
});

onBeforeUnmount(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
});
</script>

<template>
  <div class="contents">
    <slot v-if="!loggedIn" />

    <UDashboardGroup v-else unit="rem">
      <UDashboardSidebar
        id="default"
        v-model:open="open"
        collapsible
        resizable
        class="bg-elevated/25"
        :ui="{ footer: 'lg:border-t lg:border-default' }"
      >
        <template #header="{ collapsed }">
          <TeamsMenu :collapsed="collapsed" />
        </template>

        <template #default="{ collapsed }">
          <UDashboardSearchButton
            :collapsed="collapsed"
            :kbds="['ctrl', 'k']"
            class="bg-transparent ring-default"
          />

          <UNavigationMenu
            :collapsed="collapsed"
            :items="links[0]"
            orientation="vertical"
            tooltip
            popover
          />

          <UNavigationMenu
            :collapsed="collapsed"
            :items="links[1]"
            orientation="vertical"
            tooltip
            class="mt-auto"
          />
        </template>

        <template #footer="{ collapsed }">
          <UserMenu :collapsed="collapsed" />
        </template>
      </UDashboardSidebar>

      <UDashboardSearch
        v-model:open="searchOpen"
        v-model:search-term="searchTerm"
        :loading="searchLoading"
        :groups="groups"
        shortcut="ctrl_k"
      />

      <div class="flex min-w-0 flex-1 flex-col">
        <UBanner
          v-if="isDemo"
          color="warning"
          icon="i-lucide-flask-conical"
          title="Demo mode is active. Changes stay temporary and reset when the browser is closed."
          :ui="{
            root: 'rounded-none border-x-0 border-t-0 border-b',
            container: 'min-h-10 py-2 px-4 lg:px-6',
            title: 'text-sm font-medium',
          }"
          close
        />

        <slot />
      </div>

      <NotificationsSlideover />
    </UDashboardGroup>
  </div>
</template>
