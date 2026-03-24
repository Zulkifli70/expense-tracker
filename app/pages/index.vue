<script setup lang="ts">
const toast = useToast();
const { loggedIn, fetch } = useUserSession();
const demoSubmitting = ref(false);

const featureItems = [
  {
    title: "See spending clearly",
    description:
      "Track income, expenses, and balances in one place with a clean daily overview.",
    icon: "i-lucide-chart-column",
  },
  {
    title: "Stay inside budget",
    description:
      "Set monthly budget limits and get progress visibility before spending gets out of control.",
    icon: "i-lucide-badge-dollar-sign",
  },
  {
    title: "Review every transaction",
    description:
      "Search, filter, and inspect transactions quickly when you need more detail.",
    icon: "i-lucide-receipt-text",
  },
];

const stats = [
  { label: "Monthly budget tracking", value: "Real-time" },
  { label: "Transaction visibility", value: "Instant" },
  { label: "Setup complexity", value: "Simple" },
];

useSeoMeta({
  title: loggedIn.value
    ? "Expense Tracker Dashboard"
    : "Expense Tracker | Smart Personal Finance Tracking",
  description: loggedIn.value
    ? "Monitor your balance, expenses, and monthly budget from a single dashboard."
    : "Track expenses, monitor monthly budgets, and review your cash flow with a focused personal finance dashboard.",
});

async function startDemo() {
  demoSubmitting.value = true;
  try {
    await $fetch("/api/auth/demo", {
      method: "POST",
    });
    await fetch();
    await navigateTo("/");
  } catch (error: any) {
    toast.add({
      title: "Demo unavailable",
      description: error?.data?.statusMessage || "Failed to start demo session",
      color: "error",
    });
  } finally {
    demoSubmitting.value = false;
  }
}
</script>

<template>
  <HomeDashboard v-if="loggedIn" />

  <main
    v-else
    class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#ecfdf5_100%)] text-slate-950"
  >
    <section class="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6">
      <header
        class="flex items-center justify-between rounded-full border border-white/70 bg-white/80 px-5 py-3 shadow-sm shadow-emerald-950/5 backdrop-blur"
      >
        <NuxtLink to="/" class="flex items-center gap-3">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
          >
            <UIcon name="i-lucide-wallet-2" class="size-5" />
          </div>
          <div>
            <p class="text-sm font-medium tracking-[0.22em] text-emerald-700">
              EXPENSE TRACKER
            </p>
            <p class="text-sm text-slate-500">
              Personal finance, without the clutter.
            </p>
          </div>
        </NuxtLink>

        <div class="flex items-center gap-3">
          <UButton
            color="neutral"
            variant="soft"
            class="hidden rounded-full px-5 sm:inline-flex"
            :loading="demoSubmitting"
            @click="startDemo"
          >
            Try Demo
          </UButton>
          <UButton
            to="/login"
            color="primary"
            variant="ghost"
            class="hidden sm:inline-flex"
          >
            Log in
          </UButton>
          <UButton
            to="/login?mode=register"
            color="primary"
            class="rounded-full px-5"
          >
            Start for free
          </UButton>
        </div>
      </header>

      <div
        class="grid flex-1 items-center gap-16 py-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)] lg:py-20"
      >
        <div class="max-w-3xl">
          <div
            class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-sm text-emerald-800 shadow-sm"
          >
            <UIcon name="i-lucide-sparkles" class="size-4" />
            Built for focused personal money management
          </div>

          <h1
            class="mt-8 max-w-3xl text-5xl font-semibold leading-none tracking-tight text-slate-950 sm:text-6xl lg:text-7xl"
          >
            A calmer way to manage your money every day.
          </h1>

          <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Track expenses, watch your monthly budget, and understand your cash
            flow from one clean dashboard designed for daily use.
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-4">
            <UButton
              to="/login?mode=register"
              size="xl"
              class="rounded-full px-7"
            >
              Create account
            </UButton>
            <UButton
              size="xl"
              color="neutral"
              variant="soft"
              class="rounded-full px-7"
              :loading="demoSubmitting"
              @click="startDemo"
            >
              Try Demo
            </UButton>
            <UButton
              to="/login"
              size="xl"
              color="primary"
              variant="outline"
              class="rounded-full px-7"
            >
              Log in
            </UButton>
          </div>

          <div class="mt-10 grid gap-4 sm:grid-cols-3">
            <div
              v-for="item in stats"
              :key="item.label"
              class="rounded-2xl border border-white/70 bg-white/75 px-4 py-5 shadow-sm"
            >
              <p class="text-2xl font-semibold text-slate-950">
                {{ item.value }}
              </p>
              <p class="mt-1 text-sm text-slate-500">{{ item.label }}</p>
            </div>
          </div>
        </div>

        <div class="relative">
          <div
            class="absolute inset-x-8 top-8 -z-10 h-64 rounded-full bg-emerald-300/35 blur-3xl"
          />
          <div
            class="overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 p-5 shadow-2xl shadow-emerald-950/15"
          >
            <div class="rounded-[1.5rem] bg-slate-900 p-5 text-white">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p
                    class="text-sm uppercase tracking-[0.28em] text-emerald-300"
                  >
                    Overview
                  </p>
                  <h2 class="mt-3 text-3xl font-semibold">$12,480.00</h2>
                  <p class="mt-1 text-sm text-slate-400">
                    Available balance across your main accounts
                  </p>
                </div>
                <div
                  class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right"
                >
                  <p class="text-xs text-slate-400">Budget used</p>
                  <p class="mt-1 text-xl font-semibold text-amber-300">64%</p>
                </div>
              </div>

              <div class="mt-8 space-y-4">
                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="rounded-2xl bg-emerald-500/12 p-4">
                    <p
                      class="text-xs uppercase tracking-[0.2em] text-emerald-200"
                    >
                      Income
                    </p>
                    <p class="mt-3 text-2xl font-semibold">$4,800</p>
                    <p class="mt-1 text-sm text-emerald-100/80">
                      Salary and side projects
                    </p>
                  </div>
                  <div class="rounded-2xl bg-rose-500/12 p-4">
                    <p class="text-xs uppercase tracking-[0.2em] text-rose-200">
                      Expenses
                    </p>
                    <p class="mt-3 text-2xl font-semibold">$3,070</p>
                    <p class="mt-1 text-sm text-rose-100/80">
                      Food, transport, and bills
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section class="pb-10">
        <div class="grid gap-5 lg:grid-cols-3">
          <article
            v-for="feature in featureItems"
            :key="feature.title"
            class="rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-sm shadow-emerald-950/5"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"
            >
              <UIcon :name="feature.icon" class="size-5" />
            </div>
            <h3 class="mt-5 text-xl font-semibold text-slate-950">
              {{ feature.title }}
            </h3>
            <p class="mt-3 text-sm leading-6 text-slate-600">
              {{ feature.description }}
            </p>
          </article>
        </div>
      </section>
    </section>
  </main>
</template>
