<script>
  import { Progress } from "$lib/components/ui/progress";
  import WeekDaySelector from "$lib/components/WeekDaySelector.svelte";
  import ChapterCard from "$lib/components/ChapterCard.svelte";
  import VerseRow from "$lib/components/VerseRow.svelte";
  import SegmentControls from "$lib/components/SegmentControls.svelte";
  import { BOOK_MAP } from "$lib/data/bookMap.js";
  import { buildReadingPlan } from "$lib/utils/nkrvLoader.js";
  import { fetchSegment } from "$lib/utils/esvParser.js";

  let selectedWeek = $state("Week 1");
  let selectedDay = $state("");
  let esvEnabled = $state(false);

  /** @type {import('$lib/utils/nkrvLoader.js').ReadingPlan | null} */
  let currentPlan = $state(null);
  let currentSegmentIndex = $state(0);

  /** @type {{ title: string, query: string, items: any[] } | null} */
  let segmentResult = $state(null);
  let loading = $state(false);
  let error = $state("");

  /** Group items by chapter for card rendering */
  let chapters = $derived.by(() => {
    if (!segmentResult) return [];

    /** @type {Array<{ label: string, verses: any[] }>} */
    const groups = [];
    let current = null;

    for (const item of segmentResult.items) {
      if (item.type === "chapter") {
        current = { label: item.label, verses: [] };
        groups.push(current);
      } else if (item.type === "verse") {
        if (!current) {
          current = {
            label: `${item.chapter || "?"}장`,
            verses: [],
          };
          groups.push(current);
        }
        current.verses.push(item);
      }
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
    <h3>현재 읽는 구절: {currentReferenceLabel}</h3>
  </div>

  <SegmentControls
    currentIndex={currentSegmentIndex}
    {totalSegments}
    onprev={prevSegment}
    onnext={nextSegment}
  />

  {#if currentPlan.totalVerses > currentPlan.maxVerses}
    <p class="limit-note">
      ESV API limits require paging: max {currentPlan.maxVerses} verses per request.
    </p>
  {/if}

  {#each chapters as chapter, i}
    <ChapterCard label={chapter.label} initialCollapsed={i > 0}>
      {#each chapter.verses as verse (verse.ref + "-" + verse.chapter)}
        <VerseRow {verse} showEsv={esvEnabled} />
      {/each}
    </ChapterCard>
  {/each}

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
  .reading-header {
    text-align: center;
    border-bottom: 1px solid #e5e7eb;
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
