<script setup lang="ts">
defineProps<{
  collapsed?: boolean;
}>();
</script>

<template>
  <div
    class="flex items-center rounded-lg px-2 py-1.5"
    :class="collapsed ? 'justify-center' : 'gap-2'"
  >
    <UAvatar
      src="https://github.com/nuxt.png"
      alt="Expense Tracker"
      size="sm"
    />

    <span
      v-if="!collapsed"
      class="truncate text-sm font-medium text-highlighted"
    >
      Expense Tracker
    </span>
  </div>
</template>
