<script setup lang="ts">
import { VisSingleContainer, VisDonut, VisDonutSelectors } from "@unovis/vue";
import type { HomeCategorySummary } from "~/types";

type DonutDataRecord = {
  label: string;
  amount: number;
  color: string;
};

const props = defineProps<{
  categories: HomeCategorySummary[];
}>();

const data = computed<DonutDataRecord[]>(() => props.categories || []);

const value = (d: DonutDataRecord) => d.amount;
const color = (d: DonutDataRecord) => d.color;

const total = computed(() =>
  data.value.reduce((sum, record) => sum + record.amount, 0),
);

const formatNumber = new Intl.NumberFormat("id-ID", {
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
