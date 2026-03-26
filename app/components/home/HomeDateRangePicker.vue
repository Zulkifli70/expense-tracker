<script setup lang="ts">
import { DateFormatter, getLocalTimeZone, CalendarDate, today } from '@internationalized/date'
import { endOfDay, startOfDay } from 'date-fns'
import type { Range } from '~/types'

const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
})

const selected = defineModel<Range>({ required: true })

type PresetRange = {
  key: string
  label: string
  days?: number
  months?: number
  years?: number
  thisMonth?: boolean
  custom?: boolean
}

const ranges: PresetRange[] = [
  { key: 'this-month', label: 'This month', thisMonth: true },
  { key: 'last-7-days', label: 'Last 7 days', days: 7 },
  { key: 'last-14-days', label: 'Last 14 days', days: 14 },
  { key: 'last-30-days', label: 'Last 30 days', days: 30 },
  { key: 'last-3-months', label: 'Last 3 months', months: 3 },
  { key: 'last-6-months', label: 'Last 6 months', months: 6 },
  { key: 'last-year', label: 'Last year', years: 1 },
  { key: 'custom', label: 'Custom range', custom: true }
]

const toCalendarDate = (date: Date) => {
  return new CalendarDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  )
}

const calendarRange = ref<any>({
  start: toCalendarDate(selected.value.start),
  end: toCalendarDate(selected.value.end)
})

watch(
  selected,
  (value) => {
    calendarRange.value = {
      start: value.start ? toCalendarDate(value.start) : undefined,
      end: value.end ? toCalendarDate(value.end) : undefined
    }
  },
  { immediate: true, deep: true }
)

watch(calendarRange, (newValue) => {
  if (!newValue.start || !newValue.end) return

  selected.value = {
    start: startOfDay(newValue.start.toDate(getLocalTimeZone())),
    end: endOfDay(newValue.end.toDate(getLocalTimeZone()))
  }
}, { deep: true })

const matchesPresetRange = (range: PresetRange) => {
  if (!selected.value.start || !selected.value.end) return false

  const currentDate = today(getLocalTimeZone())
  let startDate = currentDate.copy()

  if (range.custom) return false

  if (range.thisMonth) {
    const now = new Date()
    const start = toCalendarDate(new Date(now.getFullYear(), now.getMonth(), 1))
    const end = toCalendarDate(now)
    const selectedStart = toCalendarDate(selected.value.start)
    const selectedEnd = toCalendarDate(selected.value.end)
    return selectedStart.compare(start) === 0 && selectedEnd.compare(end) === 0
  } else if (range.days) {
    startDate = startDate.subtract({ days: range.days })
  } else if (range.months) {
    startDate = startDate.subtract({ months: range.months })
  } else if (range.years) {
    startDate = startDate.subtract({ years: range.years })
  }

  const selectedStart = toCalendarDate(selected.value.start)
  const selectedEnd = toCalendarDate(selected.value.end)

  return selectedStart.compare(startDate) === 0 && selectedEnd.compare(currentDate) === 0
}

const activePresetKey = computed(() => {
  const matchedPreset = ranges.find(range => !range.custom && matchesPresetRange(range))
  return matchedPreset?.key || 'custom'
})

const isRangeSelected = (range: PresetRange) => activePresetKey.value === range.key

const selectRange = (range: PresetRange) => {
  if (range.custom) return

  if (range.thisMonth) {
    const now = new Date()
    selected.value = {
      start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      end: endOfDay(now)
    }
    return
  }

  const endDate = today(getLocalTimeZone())
  let startDate = endDate.copy()

  if (range.days) {
    startDate = startDate.subtract({ days: range.days })
  } else if (range.months) {
    startDate = startDate.subtract({ months: range.months })
  } else if (range.years) {
    startDate = startDate.subtract({ years: range.years })
  }

  selected.value = {
    start: startOfDay(startDate.toDate(getLocalTimeZone())),
    end: endOfDay(endDate.toDate(getLocalTimeZone()))
  }
}
</script>

<template>
  <UPopover :content="{ align: 'start' }" :modal="true">
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-calendar"
      class="data-[state=open]:bg-elevated group"
    >
      <span class="truncate">
        <template v-if="selected.start">
          <template v-if="selected.end">
            {{ df.format(selected.start) }} - {{ df.format(selected.end) }}
          </template>
          <template v-else>
            {{ df.format(selected.start) }}
          </template>
        </template>
        <template v-else>
          Pick a date
        </template>
      </span>

      <template #trailing>
        <UIcon name="i-lucide-chevron-down" class="shrink-0 text-dimmed size-5 group-data-[state=open]:rotate-180 transition-transform duration-200" />
      </template>
    </UButton>

    <template #content>
      <div class="flex items-stretch sm:divide-x divide-default">
        <div class="hidden sm:flex flex-col justify-center">
          <UButton
            v-for="(range, index) in ranges"
            :key="index"
            :label="range.label"
            color="neutral"
            variant="ghost"
            class="rounded-none px-4"
            :class="[isRangeSelected(range) ? 'bg-elevated' : 'hover:bg-elevated/50']"
            truncate
            @click="selectRange(range)"
          />
        </div>

        <div class="p-2 space-y-3">
          <div class="px-1">
            <p class="text-sm font-medium text-highlighted">
              {{ activePresetKey === 'custom' ? 'Custom date range' : 'Preset date range' }}
            </p>
            <p class="text-xs text-muted">
              Pick any start and end date from the calendar.
            </p>
          </div>

          <UCalendar
            v-model="calendarRange"
            :number-of-months="2"
            range
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>
