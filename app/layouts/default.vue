<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import type { TransactionsApiResponse } from "~/types";

const toast = useToast();

const open = ref(false);
const searchTerm = ref("");
const searchLoading = ref(false);
const transactionSearchItems = ref<NavigationMenuItem[]>([]);
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
      defaultOpen: true,
      type: "trigger",
      children: [
        {
          label: "General",
          to: "/settings",
          exact: true,
          onSelect: () => {
            open.value = false;
          },
        },
        {
          label: "Notifications",
          to: "/settings/notifications",
          onSelect: () => {
            open.value = false;
          },
        },
        {
          label: "Security",
          to: "/settings/security",
          onSelect: () => {
            open.value = false;
          },
        },
      ],
    },
  ],
] satisfies NavigationMenuItem[][];

const groups = computed(() => [
  {
    id: "links",
    label: "Go to",
    items: links.flat(),
  },
  ...(searchTerm.value.trim().length >= 2
    ? [
        {
          id: "transactions-search",
          label: "Transactions",
          ignoreFilter: true,
          items: transactionSearchItems.value,
        },
      ]
    : []),
]);

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

onMounted(async () => {
  const cookie = useCookie("cookie-consent");
  if (cookie.value === "accepted") {
    return;
  }

  toast.add({
    title:
      "We use first-party cookies to enhance your experience on our website.",
    duration: 0,
    close: false,
    actions: [
      {
        label: "Accept",
        color: "neutral",
        variant: "outline",
        onClick: () => {
          cookie.value = "accepted";
        },
      },
      {
        label: "Opt out",
        color: "neutral",
        variant: "ghost",
      },
    ],
  });
});
</script>

<template>
  <UDashboardGroup unit="rem">
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
      v-model:search-term="searchTerm"
      :loading="searchLoading"
      :groups="groups"
    />

    <slot />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>
