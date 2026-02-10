<script>
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from "$lib/components/ui/select";
  import { Button } from "$lib/components/ui/button";
  import { Switch } from "$lib/components/ui/switch";
  import { Label } from "$lib/components/ui/label";
  import { BOOK_MAP } from "$lib/data/bookMap.js";
  import { weeks, getDays } from "$lib/data/readingPlan.js";

  let {
    selectedWeek = $bindable("Week 1"),
    selectedDay = $bindable(""),
    esvEnabled = $bindable(false),
    onload = () => {},
  } = $props();

  let days = $derived.by(() => getDays(selectedWeek));

  const bookKeys = Object.keys(BOOK_MAP).sort(
    (a, b) => b.length - a.length,
  );

  function toKoreanReading(reading) {
    for (const key of bookKeys) {
      if (reading === key) return BOOK_MAP[key];
      if (reading.startsWith(`${key} `)) {
        return `${BOOK_MAP[key]} ${reading.slice(key.length + 1)}`;
      }
    }

    return reading;
  }

  function toKoreanWeekLabel(week) {
    const match = week.match(/^Week\s+(\d+)$/);
    return match ? `${match[1]}주` : week;
  }

  let selectedDayLabel = $derived.by(() => {
    if (!selectedDay) return "일";
    const index = days.indexOf(selectedDay);
    const readingLabel = toKoreanReading(selectedDay);
    return index >= 0 ? `${index + 1}일: ${readingLabel}` : readingLabel;
  });

  let selectedWeekLabel = $derived.by(() => {
    if (!selectedWeek) return "주";
    return toKoreanWeekLabel(selectedWeek);
  });

  // Auto-select first day when week changes
  $effect(() => {
    if (days.length > 0) {
      selectedDay = days[0];
    }
  });
</script>

<div class="controls">
  <div class="select-week">
    <Select type="single" bind:value={selectedWeek}>
      <SelectTrigger class="w-full" aria-label="Week">
        <span class="select-value">{selectedWeekLabel}</span>
      </SelectTrigger>
      <SelectContent>
        {#each weeks as week}
          <SelectItem value={week}>{toKoreanWeekLabel(week)}</SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>

  <div class="select-day">
    <Select type="single" bind:value={selectedDay}>
      <SelectTrigger class="w-full" aria-label="Day">
        <span class="select-value">{selectedDayLabel}</span>
      </SelectTrigger>
      <SelectContent>
        {#each days as reading, index}
          <SelectItem value={reading}>
            {index + 1}일: {toKoreanReading(reading)}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>

  <div class="esv-toggle">
    <Switch id="esv-toggle" bind:checked={esvEnabled} />
    <Label for="esv-toggle">ESV</Label>
  </div>

  <Button onclick={onload}>Read</Button>
</div>

<style>
  .controls {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    padding: 8px 0;
  }

  /* Default mobile-first flexible styles */
  .select-week {
    flex: 2 1 70px;
    min-width: 60px;
  }

  .select-day {
    flex: 2 1 150px;
    min-width: 120px;
  }

  .select-value {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .esv-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  @media (min-width: 391px) {
    .controls {
      flex-wrap: nowrap;
      justify-content: space-between;
    }

    .select-week {
      flex: 0 0 auto;
      width: 110px;
    }

    .select-day {
      flex: 1 1 auto;
      width: auto;
    }
  }
</style>
