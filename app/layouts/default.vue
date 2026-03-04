<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import type { TransactionsApiResponse } from "~/types";

const toast = useToast();
const isOnline = useOnline();
const { pendingCount, syncInProgress, flushQueuedExpenses } = useOfflineExpenses();
const { canInstall, isInstalled, shouldShowInstallCta, installHelpText, installInProgress, promptInstall } = usePwaInstall();
const showInstallBanner = ref(true);
const showOfflineBanner = ref(true);

const open = ref(false);
const searchOpen = ref(false);
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

  setTimeout(() => {
    showInstallBanner.value = false;
  }, 10000);

  setTimeout(() => {
    showOfflineBanner.value = false;
  }, 10000);
});

const offlineNoticeTitle = computed(() =>
  isOnline.value ? "Pending offline data" : "You're offline",
);

const offlineNoticeDescription = computed(() => {
  if (!isOnline.value) {
    return `Changes requiring internet will be saved locally. Pending queue: ${pendingCount.value}.`;
  }
  return `There are ${pendingCount.value} queued change(s) waiting to sync.`;
});

async function syncOfflineQueue() {
  const result = await flushQueuedExpenses();

  if (result.synced > 0) {
    toast.add({
      title: "Offline data synced",
      description: `${result.synced} item(s) uploaded successfully.`,
      color: "success",
    });
    await Promise.all([
      refreshNuxtData("home-data"),
      refreshNuxtData("transactions-data"),
    ]);
  }

  if (result.discarded > 0) {
    toast.add({
      title: "Some queued changes were skipped",
      description: `${result.discarded} item(s) were discarded due to server validation.`,
      color: "warning",
    });
  } else if (!isOnline.value) {
    toast.add({
      title: "Still offline",
      description: "Reconnect to internet to sync queued data.",
      color: "warning",
    });
  }
}

async function installPwa() {
  const result = await promptInstall();
  if (result.installed) {
    toast.add({
      title: "App installed",
      description: "Expense Tracker is now installed on your device.",
      color: "success",
    });
    return;
  }

  if (!result.promptAvailable) {
    toast.add({
      title: "Install manually",
      description: installHelpText.value,
      color: "info",
    });
  }
}
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

    <slot />

    <NotificationsSlideover />

    <div class="fixed bottom-4 right-4 z-50 w-[min(92vw,26rem)] space-y-2 md:hidden">
      <UBanner
        v-if="shouldShowInstallCta && showInstallBanner"
        icon="i-lucide-smartphone"
        color="primary"
        :title="canInstall ? 'Install app for faster access.' : 'Install manually from browser menu.'"
        :actions="[
          {
            label: 'Install app',
            color: 'primary',
            variant: 'outline',
            onClick: installPwa
          },
          {
            label: 'Hide',
            color: 'neutral',
            variant: 'ghost',
            onClick: () => {
              showInstallBanner = false;
            }
          }
        ]"
        class="rounded-md py-1.5 shadow-lg"
      />

      <UBanner
        v-if="(!isOnline || pendingCount > 0) && showOfflineBanner"
        icon="i-lucide-cloud-off"
        color="warning"
        :title="!isOnline ? `Offline mode active (${pendingCount} queued).` : `${pendingCount} queued change(s) pending sync.`"
        :actions="[
          {
            label: 'Sync now',
            color: 'warning',
            variant: 'outline',
            loading: syncInProgress,
            disabled: !isOnline || pendingCount === 0,
            onClick: syncOfflineQueue
          },
          {
            label: 'Hide',
            color: 'neutral',
            variant: 'ghost',
            onClick: () => {
              showOfflineBanner = false;
            }
          }
        ]"
        class="rounded-md py-1.5 shadow-lg"
      />
    </div>
  </UDashboardGroup>
</template>
