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
  import { progressStore } from "$lib/stores/progressStore.js";

  let {
    selectedWeek = $bindable("Week 1"),
    selectedDay = $bindable(""),
    esvEnabled = $bindable(false),
    onload = () => {},
  } = $props();

  let days = $derived.by(() => getDays(selectedWeek));
  let progress = $state($progressStore);

  // Subscribe to progress updates
  $effect(() => {
    const unsubscribe = progressStore.subscribe(value => {
      progress = value;
    });
    return unsubscribe;
  });

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

  function getWeekChapterCount(week) {
    return Object.values(progress.readings).filter(
      reading => reading.week === week && reading.completed
    ).length;
  }

  function getTotalChaptersInReference(reference) {
    // Parse references like "Genesis 1-10" or "Acts 1-5"
    const match = reference.match(/(\d+)-(\d+)$/);
    if (match) {
      const start = parseInt(match[1]);
      const end = parseInt(match[2]);
      return end - start + 1;
    }
    return 1; // Default to 1 chapter if can't parse
  }

  function getWeekTotalChapters(week) {
    const weekDays = getDays(week);
    return weekDays.reduce((sum, day) => {
      return sum + getTotalChaptersInReference(day);
    }, 0);
  }

  let selectedDayLabel = $derived.by(() => {
    if (!selectedDay) return "일";
    if (selectedDay === "숙제보기") return "📝 숙제보기";
    const index = days.indexOf(selectedDay);
    const readingLabel = toKoreanReading(selectedDay);
    return index >= 0 ? `${index + 1}일: ${readingLabel}` : readingLabel;
  });

  let selectedWeekLabel = $derived.by(() => {
    if (!selectedWeek) return "주";
    return toKoreanWeekLabel(selectedWeek);
  });

  // Weekly progress indicator (chapter count)
  let weekProgress = $derived.by(() => {
    const completed = getWeekChapterCount(selectedWeek);
    const total = getWeekTotalChapters(selectedWeek);
    return total > 0 ? `${completed}/${total}` : "";
  });

  // Track previous week to detect actual week changes
  let previousWeek = $state(selectedWeek);

  // Auto-select first day ONLY when week actually changes (not on every render)
  $effect(() => {
    if (selectedWeek !== previousWeek) {
      // Week changed, select first day
      if (days.length > 0) {
        selectedDay = days[0];
      }
      previousWeek = selectedWeek;
    }
  });
</script>

<div class="controls">
  <div class="selectors-group">
    <div class="select-week">
      <Select type="single" bind:value={selectedWeek}>
        <SelectTrigger class="w-full" aria-label="Week">
          <span class="select-value">
            {selectedWeekLabel}
            {#if weekProgress}
              ({weekProgress})
            {/if}
          </span>
        </SelectTrigger>
        <SelectContent>
          {#each weeks as week}
            {@const completed = getWeekChapterCount(week)}
            {@const total = getWeekTotalChapters(week)}
            <SelectItem value={week}>
              {toKoreanWeekLabel(week)} ({completed}/{total})
            </SelectItem>
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
          <SelectItem value="숙제보기" class="homework-item">
            📝 숙제보기
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>

  <div class="actions-group">
    <div class="esv-toggle">
      <Switch id="esv-toggle" bind:checked={esvEnabled} />
      <Label for="esv-toggle">ESV</Label>
    </div>

    <Button onclick={onload}>읽기</Button>
  </div>
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

  .selectors-group {
    display: flex;
    gap: 8px;
    flex: 1 1 100%; /* Default to full width on mobile */
    min-width: 0;
  }

  .actions-group {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: flex-end; /* Align buttons to right on mobile? Or center? */
    flex: 1 1 100%; /* Default to full width on mobile */
    justify-content: center;
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

  @media (min-width: 438px) {
    .controls {
      flex-wrap: nowrap;
      justify-content: space-between;
    }

    .selectors-group {
      flex: 1 1 auto;
      width: auto;
    }

    .actions-group {
      flex: 0 0 auto;
      width: auto;
      justify-content: flex-start;
    }

    .select-week {
      flex: 0 0 auto;
      width: 140px;
    }

    .select-day {
      flex: 1 1 auto;
      width: auto;
    }
  }
</style>
