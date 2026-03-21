<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  layout: false,
});

const route = useRoute();
const toast = useToast();
const { fetch } = useUserSession();

const mode = ref<"login" | "register">("login");
const submitting = ref(false);
const demoSubmitting = ref(false);

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short"),
  email: z.string().trim().email("Email is invalid"),
  username: z.string().trim().min(3, "Username is too short"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginSchema = z.output<typeof loginSchema>;
type RegisterSchema = z.output<typeof registerSchema>;

const loginState = reactive<Partial<LoginSchema>>({
  identifier: "",
  password: "",
});

const registerState = reactive<Partial<RegisterSchema>>({
  name: "",
  email: "",
  username: "",
  password: "",
});

const redirectPath = computed(() => {
  const value = route.query.redirect;
  return typeof value === "string" && value.startsWith("/") ? value : "/";
});

watchEffect(() => {
  mode.value = route.query.mode === "register" ? "register" : "login";
});

async function onSubmitLogin(event: FormSubmitEvent<LoginSchema>) {
  submitting.value = true;
  try {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: event.data,
    });

    await navigateTo(redirectPath.value);
  } catch (error: any) {
    toast.add({
      title: "Login failed",
      description: error?.data?.statusMessage || "Invalid credentials",
      color: "error",
    });
  } finally {
    submitting.value = false;
  }
}

async function onSubmitRegister(event: FormSubmitEvent<RegisterSchema>) {
  submitting.value = true;
  try {
    await $fetch("/api/auth/register", {
      method: "POST",
      body: event.data,
    });

    await navigateTo(redirectPath.value);
  } catch (error: any) {
    toast.add({
      title: "Registration failed",
      description: error?.data?.statusMessage || "Please check your input",
      color: "error",
    });
  } finally {
    submitting.value = false;
  }
}

function openLogin() {
  navigateTo({
    path: "/login",
    query: route.query.redirect
      ? { redirect: String(route.query.redirect) }
      : undefined,
  });
}

function openRegister() {
  navigateTo({
    path: "/login",
    query: {
      ...(route.query.redirect
        ? { redirect: String(route.query.redirect) }
        : {}),
      mode: "register",
    },
  });
}

async function onTryDemo() {
  demoSubmitting.value = true;
  try {
    await $fetch("/api/auth/demo", {
      method: "POST",
    });
    await fetch();
    await navigateTo(redirectPath.value);
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
  <main
    class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#e2fbe8_100%)] px-4 py-6 transition-colors dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(180deg,_#07110d_0%,_#0f1f18_100%)] sm:px-6"
  >
    <section class="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
      <header class="flex items-center justify-between py-2">
        <NuxtLink to="/" class="flex items-center gap-3">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
          >
            <UIcon name="i-lucide-wallet-2" class="size-5" />
          </div>
          <div>
            <p
              class="text-sm font-medium tracking-[0.22em] text-emerald-700 dark:text-emerald-300"
            >
              EXPENSE TRACKER
            </p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Personal finance, simplified.
            </p>
          </div>
        </NuxtLink>

        <UButton to="/" color="neutral" variant="ghost">Back to home</UButton>
      </header>

      <div
        class="mt-6 grid flex-1 overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-2xl shadow-emerald-950/10 backdrop-blur transition-colors dark:border-white/10 dark:bg-slate-950/80 dark:shadow-black/30 lg:grid-cols-[minmax(0,1fr)_440px]"
      >
        <div
          class="relative hidden overflow-hidden bg-slate-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between dark:bg-[#020817]"
        >
          <div
            class="absolute -left-12 top-10 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl"
          />
          <div
            class="absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl"
          />

          <div class="relative z-10 max-w-md">
            <p class="text-xs uppercase tracking-[0.32em] text-emerald-300/80">
              Personal Finance OS
            </p>
            <h1 class="mt-6 text-4xl font-semibold leading-tight">
              Keep your money decisions clear and measurable.
            </h1>
            <p class="mt-5 text-base leading-7 text-slate-300">
              Expense Tracker helps you log spending, monitor budgets, and
              review your financial activity from one focused dashboard.
            </p>
          </div>

          <div class="relative z-10 space-y-4">
            <div class="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-slate-400">Monthly balance</p>
                  <p class="mt-2 text-3xl font-semibold">$12,480.00</p>
                </div>
                <div
                  class="rounded-2xl bg-emerald-500/12 px-4 py-3 text-sm text-emerald-200"
                >
                  On track
                </div>
              </div>
              <UProgress :model-value="68" color="primary" class="mt-4" />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p class="text-sm text-slate-400">Expense categories</p>
                <p class="mt-2 text-2xl font-semibold">12 active</p>
              </div>
              <div class="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p class="text-sm text-slate-400">Budget alerts</p>
                <p class="mt-2 text-2xl font-semibold">Smart thresholds</p>
              </div>
            </div>
          </div>
        </div>

        <div
          class="flex items-center bg-white/90 px-6 py-8 transition-colors dark:bg-slate-900/70 sm:px-10 lg:px-12"
        >
          <div class="w-full">
            <p
              class="text-sm font-medium uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300"
            >
              {{ mode === "login" ? "Welcome back" : "Create your account" }}
            </p>
            <h2 class="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
              {{
                mode === "login"
                  ? "Log in to your dashboard"
                  : "Start tracking your finances"
              }}
            </h2>
            <p class="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {{
                mode === "login"
                  ? "Use your registered account to continue where you left off."
                  : "Create a new account to manage expenses, balances, and monthly budgets."
              }}
            </p>

            <div
              class="mt-8 grid w-full grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-slate-800/70"
            >
              <UButton
                block
                color="neutral"
                variant="ghost"
                :class="
                  mode === 'login'
                    ? 'bg-slate-950 text-white hover:bg-slate-900 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100'
                    : 'bg-transparent text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700/70'
                "
                @click="openLogin"
              >
                Log in
              </UButton>
              <UButton
                block
                color="neutral"
                variant="ghost"
                :class="
                  mode === 'register'
                    ? 'bg-slate-950 text-white hover:bg-slate-900 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100'
                    : 'bg-transparent text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700/70'
                "
                @click="openRegister"
              >
                Register
              </UButton>
            </div>

            <UForm
              v-if="mode === 'login'"
              :schema="loginSchema"
              :state="loginState"
              class="mt-6 space-y-4"
              @submit="onSubmitLogin"
            >
              <UFormField label="Email or username" name="identifier">
                <UInput
                  v-model="loginState.identifier"
                  class="w-full"
                  autocomplete="username"
                  placeholder="you@example.com"
                />
              </UFormField>

              <UFormField label="Password" name="password">
                <UInput
                  v-model="loginState.password"
                  type="password"
                  class="w-full"
                  autocomplete="current-password"
                  placeholder="Enter your password"
                />
              </UFormField>

              <div
                class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400"
              >
                <span>Use the credentials linked to your account.</span>
                <button
                  type="button"
                  class="font-medium text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                >
                  Forgot password?
                </button>
              </div>

              <UButton type="submit" block :loading="submitting">
                Log in
              </UButton>
            </UForm>

            <UForm
              v-else
              :schema="registerSchema"
              :state="registerState"
              class="mt-6 space-y-4"
              @submit="onSubmitRegister"
            >
              <UFormField label="Full name" name="name">
                <UInput
                  v-model="registerState.name"
                  class="w-full"
                  autocomplete="name"
                  placeholder="Your full name"
                />
              </UFormField>

              <UFormField label="Email" name="email">
                <UInput
                  v-model="registerState.email"
                  type="email"
                  class="w-full"
                  autocomplete="email"
                  placeholder="you@example.com"
                />
              </UFormField>

              <UFormField label="Username" name="username">
                <UInput
                  v-model="registerState.username"
                  class="w-full"
                  autocomplete="username"
                  placeholder="Choose a username"
                />
              </UFormField>

              <UFormField label="Password" name="password">
                <UInput
                  v-model="registerState.password"
                  type="password"
                  class="w-full"
                  autocomplete="new-password"
                  placeholder="At least 8 characters"
                />
              </UFormField>

              <UButton type="submit" block :loading="submitting">
                Create account
              </UButton>
            </UForm>

            <div
              class="mt-6 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10"
            >
              <p class="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                Try the product with sample data
              </p>
              <p class="mt-1 text-sm leading-6 text-emerald-800/80 dark:text-emerald-100/75">
                Demo data is temporary, never saved to the database, and resets
                when you close the browser.
              </p>
              <UButton
                class="mt-4"
                color="primary"
                variant="soft"
                block
                :loading="demoSubmitting"
                @click="onTryDemo"
              >
                Try Demo
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
