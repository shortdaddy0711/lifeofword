<script>
  import { goto } from '$app/navigation';
  import { Progress } from "$lib/components/ui/progress";
  import { Button } from "$lib/components/ui/button";
  import WeekDaySelector from "$lib/components/WeekDaySelector.svelte";
  import ChapterCard from "$lib/components/ChapterCard.svelte";
  import VerseRow from "$lib/components/VerseRow.svelte";
  import SegmentControls from "$lib/components/SegmentControls.svelte";
  import { BOOK_MAP } from "$lib/data/bookMap.js";
  import { readingPlan } from "$lib/data/readingPlan.js";
  import { buildReadingPlan } from "$lib/utils/nkrvLoader.js";
  import { fetchSegment } from "$lib/utils/esvParser.js";
  import { progressStore } from "$lib/stores/progressStore.js";
  import { Check, RotateCcw } from "@lucide/svelte";

  // Load last reading position and preferences
  const lastPosition = progressStore.getLastPosition();
  let selectedWeek = $state(lastPosition.week);
  let selectedDay = $state(lastPosition.day);
  let esvEnabled = $state(lastPosition.esvEnabled);

  /** @type {import('$lib/utils/nkrvLoader.js').ReadingPlan | null} */
  let currentPlan = $state(null);
  let currentSegmentIndex = $state(0);

  /** @type {{ title: string, query: string, items: any[] } | null} */
  let segmentResult = $state(null);
  let loading = $state(false);
  let error = $state("");

  let progress = $state($progressStore);

  // Subscribe to progress updates
  $effect(() => {
    const unsubscribe = progressStore.subscribe(value => {
      progress = value;
    });
    return unsubscribe;
  });

  // Save last position and preferences when they change (but not for 숙제보기)
  $effect(() => {
    if (selectedWeek && selectedDay && selectedDay !== "숙제보기") {
      progressStore.saveLastPosition(selectedWeek, selectedDay, esvEnabled);
    }
  });

  // Auto-load last reading on first visit (but not for 숙제보기)
  let hasAutoLoaded = $state(false);
  $effect(() => {
    if (!hasAutoLoaded && selectedDay && selectedDay !== "숙제보기" && !loading && !currentPlan) {
      hasAutoLoaded = true;
      // Small delay to ensure UI is ready
      setTimeout(() => {
        loadReading();
      }, 100);
    }
  });

  // Calculate total chapters in a reading reference
  function getTotalChaptersInReference(reference) {
    // Parse references like "Genesis 1-10" or "Acts 1-5"
    const match = reference.match(/(\d+)-(\d+)$/);
    if (match) {
      const start = parseInt(match[1]);
      const end = parseInt(match[2]);
      return end - start + 1;
    }
    // Single chapter references like "Ruth 1-4" (if it's a range)
    const singleMatch = reference.match(/(\d+)$/);
    if (singleMatch) {
      return 1; // Single chapter
    }
    return 0;
  }

  // Weekly progress (counts completed chapters for current week)
  let weeklyProgress = $derived.by(() => {
    if (!selectedWeek) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = Object.values(progress.readings).filter(
      reading => reading.week === selectedWeek && reading.completed
    ).length;

    // Calculate total chapters for this week
    const weekDays = readingPlan[selectedWeek] || [];
    const total = weekDays.reduce((sum, day) => {
      return sum + getTotalChaptersInReference(day);
    }, 0);

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  });

  /** Group items by chapter for card rendering */
  let chapters = $derived.by(() => {
    if (!segmentResult) return [];

    /** @type {Array<{ label: string, verses: any[], isLastInSegment: boolean }>} */
    const groups = [];
    let current = null;

    for (const item of segmentResult.items) {
      if (item.type === "chapter") {
        current = { label: item.label, verses: [], isLastInSegment: false };
        groups.push(current);
      } else if (item.type === "verse") {
        if (!current) {
          current = {
            label: `${item.chapter || "?"}장`,
            verses: [],
            isLastInSegment: false,
          };
          groups.push(current);
        }
        current.verses.push(item);
      }
    }

    // Mark the last chapter in this segment
    if (groups.length > 0) {
      groups[groups.length - 1].isLastInSegment = true;
    }

    return groups;
  });

  let totalSegments = $derived(currentPlan?.segments.length ?? 0);

  const bookKeys = Object.keys(BOOK_MAP).sort(
    (a, b) => b.length - a.length,
  );

  function toKoreanReading(reference) {
    if (!reference) return "";
    for (const key of bookKeys) {
      if (reference === key) return BOOK_MAP[key];
      if (reference.startsWith(`${key} `)) {
        return `${BOOK_MAP[key]} ${reference.slice(key.length + 1)}`;
      }
    }

    return reference;
  }

  let currentReferenceLabel = $derived.by(() =>
    currentPlan ? toKoreanReading(currentPlan.reference) : "",
  );

  async function loadReading() {
    if (!selectedDay) return;

    // Check if "숙제보기" is selected
    if (selectedDay === "숙제보기") {
      goto(`/homework/${selectedWeek}`);
      return;
    }

    loading = true;
    error = "";
    segmentResult = null;

    try {
      currentPlan = await buildReadingPlan(selectedDay);
      currentSegmentIndex = 0;
      await loadSegment();
    } catch (err) {
      error = "Error loading content. Please try again.";
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function loadSegment() {
    if (!currentPlan) return;

    loading = true;
    error = "";

    try {
      segmentResult = await fetchSegment(currentPlan, currentSegmentIndex);
    } catch (err) {
      error = "Error loading content. Please try again.";
      console.error(err);
    } finally {
      loading = false;
    }
  }

  function prevSegment() {
    if (currentSegmentIndex > 0) {
      currentSegmentIndex -= 1;
      loadSegment();
    }
  }

  function nextSegment() {
    if (currentPlan && currentSegmentIndex < currentPlan.segments.length - 1) {
      currentSegmentIndex += 1;
      loadSegment();
    }
  }

  function resetProgress() {
    progressStore.reset();
  }
</script>

<svelte:head>
  <title>말씀의 삶 — Daily Bible Reader</title>
</svelte:head>

<WeekDaySelector
  bind:selectedWeek
  bind:selectedDay
  bind:esvEnabled
  onload={loadReading}
/>

<div class="progress-summary">
  <div class="progress-info">
    <span class="progress-text">
      {selectedWeek} 진행: {weeklyProgress.completed}/{weeklyProgress.total}개 챕터 ({weeklyProgress.percentage}%)
    </span>
    <Button variant="outline" size="sm" onclick={resetProgress} class="reset-btn">
      <RotateCcw size={14} />
      <span>초기화</span>
    </Button>
  </div>
  <Progress value={weeklyProgress.percentage} class="progress-bar" />
</div>

{#if loading}
  <div class="loading">
    <Progress value={30} class="mt-2" />
    <p>Loading verses...</p>
  </div>
{/if}

{#if error}
  <div class="error">{error}</div>
{/if}

{#if currentPlan && segmentResult && !loading}
  <div class="reading-header">
    <h3>{currentReferenceLabel}</h3>
  </div>

  {#if currentPlan.totalVerses > currentPlan.maxVerses}
    <p class="limit-note">
      ESV API limits require paging: max {currentPlan.maxVerses} verses per request.
    </p>
  {/if}

  {#each chapters as chapter, i}
    <ChapterCard 
      label={chapter.label} 
      initialCollapsed={i > 0}
      week={selectedWeek}
      day={selectedDay}
      isLastInSegment={chapter.isLastInSegment}
      hasMoreSegments={currentSegmentIndex < totalSegments - 1}
    >
      {#each chapter.verses as verse (verse.ref + "-" + verse.chapter)}
        <VerseRow {verse} showEsv={esvEnabled} />
      {/each}
    </ChapterCard>
  {/each}

  {#if totalSegments > 1}
    <SegmentControls
      currentIndex={currentSegmentIndex}
      {totalSegments}
      onprev={prevSegment}
      onnext={nextSegment}
    />
  {/if}

  <div class="copyright-note">
    Scripture quotations are from the ESV&reg; Bible (The Holy Bible, English
    Standard Version&reg;), copyright &copy; 2001 by Crossway, a publishing
    ministry of Good News Publishers. Used by permission. All rights reserved.
  </div>
{/if}

{#if !currentPlan && !loading && !error}
  <div class="reading-header">
    <h3>주차와 일자를 선택하여 성경읽기 과제를 시작하세요.</h3>
  </div>
{/if}

<div class="note">
  <p>
    <strong>Note:</strong> ESV passages are loaded via a server proxy.
    NKRV text loads from local data. Use is intended for noncommercial church
    purposes and the ESV text is shown within API limits.
  </p>
</div>

<style>
  .progress-summary {
    margin: 5px 0;
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    color: white;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .progress-text {
    font-size: 0.9rem;
    font-weight: 500;
  }

  :global(.reset-btn) {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px !important;
    height: auto !important;
    font-size: 0.8rem !important;
    background: rgba(255, 255, 255, 0.2) !important;
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    color: white !important;
  }

  :global(.reset-btn:hover) {
    background: rgba(255, 255, 255, 0.3) !important;
  }

  :global(.progress-bar) {
    background: rgba(255, 255, 255, 0.2);
  }

  .reading-header {
    text-align: center;
    /* border-bottom: 1px solid #e5e7eb; */
    padding: .5rem 0;
  }

  .reading-header h3 {
    margin: 0;
    font-size: 1.2rem;
    color: #1f2d3d;
  }

  .loading {
    text-align: center;
    padding: 2rem;
  }

  .loading p {
    font-style: italic;
    color: #6b7280;
    margin-top: 1rem;
  }


  .error {
    text-align: center;
    padding: 2rem;
    color: #e74c3c;
    font-style: italic;
  }

  .limit-note {
    text-align: center;
    color: #6b7280;
    font-size: 0.85rem;
    margin: 0 0 1.5rem;
  }

  .copyright-note {
    font-size: 0.8rem;
    color: #6b7280;
    margin-top: 1.75rem;
    border-top: 1px dashed #e5e7eb;
    padding-top: 0.85rem;
    line-height: 1.5;
  }

  .note {
    font-size: 0.8rem;
    color: #777;
    text-align: center;
    margin-top: 3rem;
    border-top: 1px solid #eee;
    padding-top: 1rem;
  }
</style>
