<script setup lang="ts">
import { formatTimeAgo } from "@vueuse/core";

const {
  isNotificationsSlideoverOpen,
  notifications,
  markNotificationAsRead,
} = useDashboard();

function onNotificationClick(notification: { id: string; to?: string }) {
  if (!notification.to) return;
  void markNotificationAsRead(notification.id);
  isNotificationsSlideoverOpen.value = false;
}
</script>

<template>
  <USlideover
    v-model:open="isNotificationsSlideoverOpen"
    title="Notifications"
  >
    <template #body>
      <div
        v-if="!notifications.length"
        class="rounded-md border border-default px-4 py-6 text-center text-sm text-muted"
      >
        No notifications yet.
      </div>

      <template v-for="notification in notifications" :key="notification.id">
        <NuxtLink
          v-if="notification.to"
          :to="notification.to"
          class="px-3 py-2.5 rounded-md hover:bg-elevated/50 flex items-center gap-3 relative -mx-3 first:-mt-3 last:-mb-3"
          @click="onNotificationClick(notification)"
        >
          <UChip
            color="error"
            :show="!!notification.unread"
            inset
          >
            <UAvatar
              v-bind="notification.sender.avatar"
              :alt="notification.sender.name"
              size="md"
            />
          </UChip>

          <div class="text-sm flex-1">
            <p class="flex items-center justify-between">
              <span class="text-highlighted font-medium">{{ notification.sender.name }}</span>

              <time
                :datetime="notification.date"
                class="text-muted text-xs"
                v-text="formatTimeAgo(new Date(notification.date))"
              />
            </p>

            <p class="text-dimmed">
              {{ notification.body }}
            </p>
          </div>
        </NuxtLink>

        <div
          v-else
          class="px-3 py-2.5 rounded-md bg-elevated/20 flex items-center gap-3 relative -mx-3 first:-mt-3 last:-mb-3"
        >
          <UChip
            color="neutral"
            :show="!!notification.unread"
            inset
          >
            <UAvatar
              v-bind="notification.sender.avatar"
              :alt="notification.sender.name"
              size="md"
            />
          </UChip>

          <div class="text-sm flex-1">
            <p class="flex items-center justify-between">
              <span class="text-highlighted font-medium">{{ notification.sender.name }}</span>

              <time
                :datetime="notification.date"
                class="text-muted text-xs"
                v-text="formatTimeAgo(new Date(notification.date))"
              />
            </p>

            <p class="text-dimmed">
              {{ notification.body }}
            </p>
          </div>
        </div>
      </template>
    </template>
  </USlideover>
</template>
