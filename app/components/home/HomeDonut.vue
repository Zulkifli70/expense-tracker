<script setup lang="ts">
import { VisSingleContainer, VisDonut, VisDonutSelectors } from "@unovis/vue";

type DonutDataRecord = {
  label: string;
  amount: number;
  color: string;
};

const data: DonutDataRecord[] = [
  { label: "Food", amount: 320, color: "#0EA5E9" },
  { label: "Transport", amount: 180, color: "#22C55E" },
  { label: "Utilities", amount: 140, color: "#F59E0B" },
  { label: "Other", amount: 90, color: "#A855F7" },
];

const value = (d: DonutDataRecord) => d.amount;
const color = (d: DonutDataRecord) => d.color;

const total = computed(() =>
  data.reduce((sum, record) => sum + record.amount, 0),
);

const hoveredSlice = ref<DonutDataRecord | null>(null);

const centerLabel = computed(() =>
  hoveredSlice.value ? hoveredSlice.value.label : "Current Monthly Spending",
);

const centerSubLabel = computed(() =>
  hoveredSlice.value ? String(hoveredSlice.value.amount) : `Total: ${total.value}`,
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
        <p class="text-3xl text-highlighted font-semibold">{{ total }}</p>
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
