<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const userProfile = useUserProfile();
const toast = useToast();
const { user: sessionUser } = useUserSession();
const { resetNotifications } = useDashboard();

const isDemo = computed(() => !!sessionUser.value?.isDemo);
const resetConfirmation = ref("");
const resettingData = ref(false);

const profileSchema = z.object({
  name: z.string().min(2, "Too short"),
  email: z.string().email("Invalid email"),
  username: z.string().min(2, "Too short"),
});

type ProfileSchema = z.output<typeof profileSchema>;

const profile = reactive<Partial<ProfileSchema>>({
  name: userProfile.value.name,
  email: userProfile.value.email,
  username: userProfile.value.username,
});

watch(
  () => userProfile.value,
  (nextProfile) => {
    profile.name = nextProfile.name;
    profile.email = nextProfile.email;
    profile.username = nextProfile.username;
  },
  { deep: true, immediate: true },
);

async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {
  try {
    await $fetch("/api/auth/profile", {
      method: "PATCH",
      body: {
        name: event.data.name,
        email: event.data.email,
        username: event.data.username,
      },
    });

    userProfile.value = {
      ...userProfile.value,
      ...event.data,
    };

    toast.add({
      title: "Success",
      description: "Your profile has been updated.",
      icon: "i-lucide-check",
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Failed",
      description: error?.data?.statusMessage || "Failed to update profile",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  }
}

async function onResetData() {
  if (resetConfirmation.value !== "RESET") {
    toast.add({
      title: "Confirmation required",
      description: 'Type "RESET" before deleting all data.',
      color: "warning",
    });
    return;
  }

  if (!confirm("Delete all balances, transactions, budgets, notifications, and related user data?")) {
    return;
  }

  resettingData.value = true;

  try {
    await $fetch("/api/settings/reset-data", {
      method: "DELETE",
    });

    resetConfirmation.value = "";
    resetNotifications();
    await refreshNuxtData();
    await navigateTo("/settings");

    toast.add({
      title: "Data reset complete",
      description: "Your account data has been cleared and is now back to a fresh state.",
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Failed",
      description: error?.data?.statusMessage || "Failed to reset data",
      color: "error",
    });
  } finally {
    resettingData.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <UAlert
      v-if="isDemo"
      color="warning"
      variant="soft"
      title="Demo profile"
      description="Demo session stays temporary. Profile edits and reset data are disabled for demo users."
    />

    <UForm
      id="settings"
      :schema="profileSchema"
      :state="profile"
      @submit="onSubmit"
    >
      <UPageCard
        title="Profile"
        description="Manage the account identity used across this expense tracker."
        variant="naked"
        orientation="horizontal"
        class="mb-4"
      >
        <UButton
          form="settings"
          label="Save changes"
          color="neutral"
          type="submit"
          class="w-fit lg:ms-auto"
        />
      </UPageCard>

      <UPageCard variant="subtle">
        <UFormField
          name="name"
          label="Name"
          description="Displayed in the dashboard greeting and account profile."
          required
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput
            v-model="profile.name"
            autocomplete="off"
          />
        </UFormField>
        <USeparator />
        <UFormField
          name="email"
          label="Email"
          description="Used to sign in to your account."
          required
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput
            v-model="profile.email"
            type="email"
            autocomplete="off"
          />
        </UFormField>
        <USeparator />
        <UFormField
          name="username"
          label="Username"
          description="Your unique username for logging in."
          required
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput
            v-model="profile.username"
            type="username"
            autocomplete="off"
          />
        </UFormField>
      </UPageCard>
    </UForm>

    <UPageCard
      title="Data Management"
      description="Reset your finance data and return the dashboard to a fresh account state."
      variant="naked"
      class="mb-4"
    />

    <UPageCard class="border border-error/30 bg-gradient-to-br from-error/8 to-transparent">
      <div class="space-y-4">
        <div>
          <p class="text-sm font-semibold text-highlighted">Reset all account data</p>
          <p class="mt-1 text-sm text-muted">
            This permanently deletes balances, transactions, categories, budgets,
            notifications, and customer data for your account. Your login account
            stays active.
          </p>
        </div>

        <UFormField
          label='Type "RESET" to confirm'
          description="This action cannot be undone."
        >
          <UInput
            v-model="resetConfirmation"
            :disabled="isDemo || resettingData"
            placeholder="RESET"
            autocomplete="off"
          />
        </UFormField>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <UButton
            label="Reset Data"
            color="error"
            :disabled="isDemo || resetConfirmation !== 'RESET'"
            :loading="resettingData"
            @click="onResetData"
          />
        </div>
      </template>
    </UPageCard>
  </div>
</template>
