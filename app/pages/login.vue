<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: false
})

const route = useRoute()
const toast = useToast()

const mode = ref<'login' | 'register'>('login')
const submitting = ref(false)

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required')
})

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short'),
  email: z.string().trim().email('Email is invalid'),
  username: z.string().trim().min(3, 'Username is too short'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

type LoginSchema = z.output<typeof loginSchema>
type RegisterSchema = z.output<typeof registerSchema>

const loginState = reactive<Partial<LoginSchema>>({
  identifier: '',
  password: ''
})

const registerState = reactive<Partial<RegisterSchema>>({
  name: '',
  email: '',
  username: '',
  password: ''
})

const redirectPath = computed(() => {
  const value = route.query.redirect
  return typeof value === 'string' && value.startsWith('/') ? value : '/'
})

async function onSubmitLogin(event: FormSubmitEvent<LoginSchema>) {
  submitting.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: event.data
    })

    await navigateTo(redirectPath.value)
  }
  catch (error: any) {
    toast.add({
      title: 'Login failed',
      description: error?.data?.statusMessage || 'Invalid credentials',
      color: 'error'
    })
  }
  finally {
    submitting.value = false
  }
}

async function onSubmitRegister(event: FormSubmitEvent<RegisterSchema>) {
  submitting.value = true
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: event.data
    })

    await navigateTo(redirectPath.value)
  }
  catch (error: any) {
    toast.add({
      title: 'Registration failed',
      description: error?.data?.statusMessage || 'Please check your input',
      color: 'error'
    })
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="space-y-2">
          <h1 class="text-xl font-semibold text-highlighted">
            Expense Tracker
          </h1>
          <p class="text-sm text-muted">
            Sign in to access your private financial dashboard.
          </p>
        </div>
      </template>

      <div class="space-y-4">
        <UButtonGroup class="w-full">
          <UButton
            block
            :variant="mode === 'login' ? 'solid' : 'outline'"
            color="neutral"
            @click="mode = 'login'"
          >
            Login
          </UButton>
          <UButton
            block
            :variant="mode === 'register' ? 'solid' : 'outline'"
            color="neutral"
            @click="mode = 'register'"
          >
            Register
          </UButton>
        </UButtonGroup>

        <UForm
          v-if="mode === 'login'"
          :schema="loginSchema"
          :state="loginState"
          class="space-y-4"
          @submit="onSubmitLogin"
        >
          <UFormField label="Email or Username" name="identifier">
            <UInput
              v-model="loginState.identifier"
              class="w-full"
              autocomplete="username"
            />
          </UFormField>

          <UFormField label="Password" name="password">
            <UInput
              v-model="loginState.password"
              type="password"
              class="w-full"
              autocomplete="current-password"
            />
          </UFormField>

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
          <UFormField label="Full Name" name="name">
            <UInput
              v-model="registerState.name"
              class="w-full"
              autocomplete="name"
            />
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput
              v-model="registerState.email"
              type="email"
              class="w-full"
              autocomplete="email"
            />
          </UFormField>

          <UFormField label="Username" name="username">
            <UInput
              v-model="registerState.username"
              class="w-full"
              autocomplete="username"
            />
          </UFormField>

          <UFormField label="Password" name="password">
            <UInput
              v-model="registerState.password"
              type="password"
              class="w-full"
              autocomplete="new-password"
            />
          </UFormField>

          <UButton type="submit" block :loading="submitting">
            Create account
          </UButton>
        </UForm>
      </div>
    </UCard>
  </main>
</template>
