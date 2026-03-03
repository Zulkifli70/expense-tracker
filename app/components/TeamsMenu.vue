<script setup lang="ts">
defineProps<{
  collapsed?: boolean;
}>();
</script>

<template>
  <div
    class="flex items-center rounded-lg py-1.5"
    :class="collapsed ? 'w-full justify-center px-0 mx-auto' : 'gap-2 px-2'"
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
