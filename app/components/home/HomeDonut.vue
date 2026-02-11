<script setup lang="ts">
import { VisSingleContainer, VisDonut, VisDonutSelectors } from "@unovis/vue";

type DonutDataRecord = {
  label: string;
  amount: number;
  color: string;
};

const data: DonutDataRecord[] = [
  { label: "Food", amount: 320000, color: "#0EA5E9" },
  { label: "Transport", amount: 180000, color: "#22C55E" },
  { label: "Utilities", amount: 240000, color: "#F59E0B" },
  { label: "Other", amount: 90000, color: "#A855F7" },
];

const value = (d: DonutDataRecord) => d.amount;
const color = (d: DonutDataRecord) => d.color;

const total = computed(() =>
  data.reduce((sum, record) => sum + record.amount, 0),
);

const formatNumber = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format;

const hoveredSlice = ref<DonutDataRecord | null>(null);

const centerLabel = computed(() =>
  hoveredSlice.value ? hoveredSlice.value.label : "Current Monthly Spending",
);

const centerSubLabel = computed(() =>
  hoveredSlice.value
    ? formatNumber(hoveredSlice.value.amount)
    : `Total: ${formatNumber(total.value)}`,
);

const events = {
  [VisDonutSelectors.segment]: {
    mouseenter: (arcData: { data?: DonutDataRecord }) => {
      hoveredSlice.value = arcData?.data ?? null;
    },
    mouseleave: () => {
      hoveredSlice.value = null;
    },
  },
};
</script>

<template>
  <UCard class="shrink-0" :ui="{ body: 'flex flex-col gap-4' }">
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1.5">Category Split</p>
        <p class="text-3xl text-highlighted font-semibold">
          {{ formatNumber(total) }}
        </p>
      </div>
    </template>

    <div class="flex justify-center">
      <VisSingleContainer :data="data" class="h-72 w-72">
        <VisDonut
          :value="value"
          :color="color"
          :central-label="centerLabel"
          :central-sub-label="centerSubLabel"
          :events="events"
        />
      </VisSingleContainer>
    </div>
  </UCard>
</template>

<style scoped>
.unovis-single-container {
  --vis-donut-background-color: var(--ui-bg-elevated);
}
</style>
