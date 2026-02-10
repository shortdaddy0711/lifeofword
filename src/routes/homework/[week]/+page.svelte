<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";
  import { progressStore } from "$lib/stores/progressStore.js";
  import { readingPlan } from "$lib/data/readingPlan.js";
  import { BOOK_FULL_NAMES } from "$lib/data/bookFullNames.js";
  import { ArrowLeft } from "@lucide/svelte";

  const week = $page.params.week;
  
  // Get all summaries for this week
  const summaries = progressStore.getWeekSummaries(week);
  
  // Get week days from reading plan
  const weekDays = readingPlan[week] || [];

  // Group summaries by book
  const groupedSummaries = $derived.by(() => {
    const groups = {};
    
    summaries.forEach(summary => {
      const { day, chapter, summary: text, completedAt } = summary;
      
      // Extract book name from day (e.g., "Genesis 1-10" -> "Genesis")
      const bookMatch = day.match(/^([^\d]+)/);
      const bookName = bookMatch ? bookMatch[1].trim() : day;
      
      if (!groups[bookName]) {
        groups[bookName] = [];
      }
      
      groups[bookName].push({
        day,
        chapter,
        summary: text,
        completedAt,
      });
    });
    
    return groups;
  });

  function toKoreanWeekLabel(week) {
    const match = week.match(/^Week\s+(\d+)$/);
    return match ? `${match[1]}주차` : week;
  }

  function toKoreanBookName(bookName) {
    // Find matching book in BOOK_FULL_NAMES for full Korean name
    for (const [englishName, koreanFullName] of Object.entries(BOOK_FULL_NAMES)) {
      if (bookName.includes(englishName) || englishName.includes(bookName)) {
        return koreanFullName;
      }
    }
    return bookName;
  }

  function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('ko-KR', { 
      month: 'short', 
      day: 'numeric'
    });
  }

  function goBack() {
    goto('/');
  }
</script>

<svelte:head>
  <title>{toKoreanWeekLabel(week)} 숙제보기 — 말씀의 삶</title>
</svelte:head>

<div class="homework-container">
  <div class="header">
    <Button variant="outline" size="sm" onclick={goBack} class="back-btn">
      <ArrowLeft size={16} />
      <span>돌아가기</span>
    </Button>
    <h1 class="title">{toKoreanWeekLabel(week)} 숙제 — 챕터별 요약</h1>
  </div>

  {#if summaries.length === 0}
    <Card class="empty-state">
      <div class="empty-content">
        <p class="empty-icon">📝</p>
        <p class="empty-text">아직 작성된 요약이 없습니다.</p>
        <p class="empty-hint">성경을 읽고 각 챕터를 요약한 후 완료 표시를 하면 여기에 나타납니다.</p>
        <Button onclick={goBack} class="mt-4">성경 읽으러 가기</Button>
      </div>
    </Card>
  {:else}
    <div class="summary-stats">
      <p>총 <strong>{summaries.length}개</strong>의 챕터를 완료했습니다.</p>
    </div>

    <div class="books-container">
      {#each Object.entries(groupedSummaries) as [bookName, bookSummaries]}
        <Card class="book-card">
          <div class="book-header">
            <h2 class="book-title">{toKoreanBookName(bookName)}</h2>
            <span class="chapter-count">{bookSummaries.length}개 챕터</span>
          </div>
          
          <div class="chapters-list">
            {#each bookSummaries as item}
              <div class="chapter-item">
                <div class="chapter-row">
                  <span class="chapter-label">{item.chapter}</span>
                  {#if item.summary}
                    <p class="chapter-summary">{item.summary}</p>
                  {/if}
                  <span class="completion-date">{formatDate(item.completedAt)}</span>
                </div>
              </div>
            {/each}
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<style>
  .homework-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 1rem;
  }

  .header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  :global(.back-btn) {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .title {
    font-size: 1.8rem;
    font-weight: 700;
    color: #1f2d3d;
    text-align: center;
    margin: 0;
  }

  .summary-stats {
    text-align: center;
    margin-bottom: 1.5rem;
    font-size: 1rem;
    color: #6b7280;
  }

  .summary-stats strong {
    color: #2f80ed;
    font-weight: 700;
  }

  :global(.empty-state) {
    padding: 3rem 2rem;
  }

  .empty-content {
    text-align: center;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .empty-text {
    font-size: 1.2rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .empty-hint {
    font-size: 0.95rem;
    color: #6b7280;
    margin-bottom: 1.5rem;
  }

  .books-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  :global(.book-card) {
    padding: 0;
    overflow: hidden;
    gap: 0;
  }

  .book-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem 1rem;
    background: linear-gradient(to right, #667eea, #764ba2);
    color: white;
  }

  .book-title {
    font-size: 1.3rem;
    font-weight: 700;
    margin: 0;
  }

  .chapter-count {
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .chapters-list {
    padding: 0.5rem;
  }

  .chapter-item {
    padding: 0.6rem 1rem;
    border-bottom: 1px solid #e5e7eb;
    transition: background-color 0.2s;
  }

  .chapter-item:last-child {
    border-bottom: none;
  }

  .chapter-item:hover {
    background-color: #f9fafb;
  }

  .chapter-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .chapter-label {
    font-weight: 700;
    color: #2f80ed;
    font-size: 0.9rem;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .completion-date {
    font-size: 0.7rem;
    color: #9ca3af;
    white-space: nowrap;
    flex-shrink: 0;
    margin-left: auto;
  }

  .chapter-summary {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.4;
    color: #374151;
    font-family: "Malgun Gothic", Dotum, sans-serif;
    word-break: keep-all;
    flex: 1;
  }

  @media (max-width: 640px) {
    .title {
      font-size: 1.4rem;
    }

    .book-title {
      font-size: 1.1rem;
    }

    .chapter-row {
      flex-wrap: wrap;
    }

    .completion-date {
      margin-left: 0;
      order: 3;
    }

    .chapter-summary {
      order: 2;
      width: 100%;
    }

    .chapter-label {
      order: 1;
    }
  }
</style>
