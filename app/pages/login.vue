<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  layout: false,
});

const route = useRoute();
const toast = useToast();

const mode = ref<"login" | "register">("login");
const submitting = ref(false);

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
</script>

<template>
  <main
    class="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6"
  >
    <section
      class="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-200/60 dark:bg-slate-900 dark:shadow-black/40"
    >
      <div class="grid grid-cols-1 lg:grid-cols-2">
        <div class="p-8 sm:p-12">
          <div class="flex items-center gap-3">
            <div
              class="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold"
            >
              ET
            </div>
            <div>
              <p class="text-sm text-muted">ExpenseTracker</p>
              <h1 class="text-lg font-semibold text-highlighted">
                Welcome back!
              </h1>
            </div>
          </div>

          <p class="mt-4 text-sm text-muted leading-relaxed">
            Masuk untuk melanjutkan pemantauan cashflow, anggaran, dan laporan
            bulananmu.
          </p>

          <div class="mt-8 space-y-4">
            <UButtonGroup class="w-full">
              <UButton
                block
                :variant="mode === 'login' ? 'solid' : 'outline'"
                color="neutral"
                @click="mode = 'login'"
                class="mb-2"
              >
                Login
              </UButton>
              <UButton
                block
                :variant="mode === 'register' ? 'solid' : 'outline'"
                color="neutral"
                @click="mode = 'register'"
              >
                Daftar
              </UButton>
            </UButtonGroup>

            <UForm
              v-if="mode === 'login'"
              :schema="loginSchema"
              :state="loginState"
              class="space-y-4 mt-4"
              @submit="onSubmitLogin"
            >
              <UFormField label="Email atau Username" name="identifier">
                <UInput
                  v-model="loginState.identifier"
                  class="w-full"
                  autocomplete="username"
                  placeholder="nama@contoh.com"
                />
              </UFormField>

              <UFormField label="Password" name="password">
                <UInput
                  v-model="loginState.password"
                  type="password"
                  class="w-full"
                  autocomplete="current-password"
                  placeholder="Masukkan password"
                />
              </UFormField>

              <div class="flex items-center justify-between text-xs text-muted">
                <span>Gunakan data akun yang sudah terdaftar.</span>
                <button
                  type="button"
                  class="text-emerald-700 hover:text-emerald-800"
                >
                  Lupa password?
                </button>
              </div>

              <UButton type="submit" block :loading="submitting">
                Sign in
              </UButton>
            </UForm>

            <UForm
              v-else
              :schema="registerSchema"
              :state="registerState"
              class="space-y-4"
              @submit="onSubmitRegister"
            >
              <p class="text-sm text-muted leading-relaxed">
                Buat akun baru untuk mulai mencatat pengeluaran dan target
                tabunganmu.
              </p>
              <UFormField label="Nama Lengkap" name="name">
                <UInput
                  v-model="registerState.name"
                  class="w-full"
                  autocomplete="name"
                  placeholder="Nama lengkap"
                />
              </UFormField>

              <UFormField label="Email" name="email">
                <UInput
                  v-model="registerState.email"
                  type="email"
                  class="w-full"
                  autocomplete="email"
                  placeholder="nama@contoh.com"
                />
              </UFormField>

              <UFormField label="Username" name="username">
                <UInput
                  v-model="registerState.username"
                  class="w-full"
                  autocomplete="username"
                  placeholder="username"
                />
              </UFormField>

              <UFormField label="Password" name="password">
                <UInput
                  v-model="registerState.password"
                  type="password"
                  class="w-full"
                  autocomplete="new-password"
                  placeholder="Min 8 karakter"
                />
              </UFormField>

              <UButton type="submit" block :loading="submitting">
                Buat akun
              </UButton>
            </UForm>
          </div>
        </div>

        <div
          class="relative hidden lg:flex flex-col justify-between p-10 text-white overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900"
        >
          <div
            class="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"
          ></div>
          <div
            class="absolute -left-20 bottom-0 h-52 w-52 rounded-full bg-teal-400/20 blur-3xl"
          ></div>

          <div class="relative z-10 space-y-6">
            <p class="text-xs uppercase tracking-[0.3em] text-emerald-200/80">
              Personal Finance OS
            </p>
            <h2 class="text-3xl font-semibold leading-snug">
              Kelola keuangan harian dengan insight yang lebih pintar
            </h2>
            <p class="text-sm text-emerald-100/80 leading-relaxed max-w-sm">
              ExpenseTracker membantu kamu memantau pengeluaran, menetapkan
              target tabungan, dan melihat laporan ringkas dalam satu dashboard.
            </p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
