<script setup lang="ts">
import type { HomeApiResponse } from "~/types";

const props = defineProps<{
  budget?: HomeApiResponse["budget"];
  currentSpending: number;
}>();

const emit = defineEmits<{
  editLimit: [];
}>();

const monthlyLimit = computed(() => props.budget?.limit || 0);
const currentSpending = computed(() => props.currentSpending || 0);

const progress = computed(() =>
  Math.min(
    Math.round((currentSpending.value / Math.max(monthlyLimit.value, 1)) * 100),
    100,
  ),
);

const spendingRatio = computed(() =>
  Math.min(
    Math.round((currentSpending.value / Math.max(monthlyLimit.value, 1)) * 100),
    100,
  ),
);

const status = computed(() => {
  if (progress.value >= 90) {
    return {
      label: "Critical Threshold",
      badgeClass: "threshold-badge threshold-badge-critical",
      progressStyle: {
        background:
          "linear-gradient(90deg, color-mix(in oklab, var(--ui-warning) 80%, var(--ui-error) 20%) 0%, color-mix(in oklab, var(--ui-error) 90%, black 10%) 100%)",
      },
      message:
        "Spending is very close to the monthly limit. Focus only on essential expenses.",
    };
  }

  if (progress.value >= 70) {
    return {
      label: "Warning Zone",
      badgeClass: "threshold-badge threshold-badge-warning",
      progressStyle: {
        background:
          "linear-gradient(90deg, color-mix(in oklab, var(--ui-warning) 75%, var(--ui-success) 25%) 0%, color-mix(in oklab, var(--ui-warning) 90%, var(--ui-error) 10%) 100%)",
      },
      message:
        "Spending is increasing faster than planned. Consider reducing non-priority categories.",
    };
  }

  return {
    label: "Healthy Zone",
    badgeClass: "threshold-badge threshold-badge-healthy",
    progressStyle: {
      background:
        "linear-gradient(90deg, color-mix(in oklab, var(--ui-success) 90%, white 10%) 0%, color-mix(in oklab, var(--ui-primary) 80%, var(--ui-success) 20%) 100%)",
    },
    message:
      "Budget usage is still healthy. You still have room for planned spending this month.",
  };
});

const formatCurrency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format;
</script>

<template>
  <UCard class="self-start" variant="subtle" :ui="{ body: 'p-6' }">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-2xl font-semibold text-highlighted">
          Monthly Budget Limit
        </p>
        <p class="mt-1 text-sm text-muted">
          You've spent {{ spendingRatio }}% of your
          {{ formatCurrency(monthlyLimit) }} limit
        </p>
      </div>

      <div class="text-right">
        <UButton
          label="Edit Limit"
          color="neutral"
          variant="outline"
          size="xs"
          class="mb-3"
          @click="emit('editLimit')"
        />

        <p class="text-4xl font-bold tracking-tight text-highlighted">
          {{ formatCurrency(currentSpending) }}
        </p>
        <p
          class="text-xs font-semibold tracking-[0.2em] text-primary uppercase"
        >
          CURRENT
        </p>
      </div>
    </div>

    <div class="mt-6">
      <div class="mb-2 flex items-center justify-between">
        <span
          :class="status.badgeClass"
          class="rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase"
        >
          {{ status.label }}
        </span>
        <span class="text-xs font-semibold text-toned">{{ progress }}%</span>
      </div>

      <div class="progress-track h-4 rounded-md p-0.5">
        <div
          class="h-full rounded-[5px]"
          :style="{ ...status.progressStyle, width: `${progress}%` }"
        />
      </div>
    </div>

    <p class="mt-4 text-sm italic text-muted">
      {{ status.message }}
    </p>
  </UCard>
</template>

<style scoped>
.progress-track {
  background-color: color-mix(
    in oklab,
    var(--ui-bg-inverted) 20%,
    var(--ui-bg)
  );
}

.threshold-badge {
  transition:
    background-color 0.25s ease,
    border-color 0.25s ease,
    color 0.25s ease;
}

.threshold-badge-healthy {
  border-color: color-mix(in oklab, var(--ui-success) 35%, transparent);
  background-color: color-mix(in oklab, var(--ui-success) 14%, transparent);
  color: color-mix(in oklab, var(--ui-success) 72%, var(--ui-text));
}

.threshold-badge-warning {
  border-color: color-mix(in oklab, var(--ui-warning) 35%, transparent);
  background-color: color-mix(in oklab, var(--ui-warning) 14%, transparent);
  color: color-mix(in oklab, var(--ui-warning) 78%, var(--ui-text));
}

.threshold-badge-critical {
  border-color: color-mix(in oklab, var(--ui-error) 35%, transparent);
  background-color: color-mix(in oklab, var(--ui-error) 14%, transparent);
  color: color-mix(in oklab, var(--ui-error) 72%, var(--ui-text));
}
</style>
