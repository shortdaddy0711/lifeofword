<script>
  import { Card } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import { Check } from "@lucide/svelte";
  import { progressStore } from "$lib/stores/progressStore.js";

  let {
    label = "",
    initialCollapsed = false,
    week = "",
    day = "",
    isLastInSegment = false,
    hasMoreSegments = false,
    children,
  } = $props();

  let collapsed = $state(false);
  let progress = $state($progressStore);
  let summary = $state('');
  let lastSummary = $state('');

  $effect(() => {
    collapsed = initialCollapsed;
  });

  // Subscribe to progress updates
  $effect(() => {
    const unsubscribe = progressStore.subscribe(value => {
      progress = value;
    });
    return unsubscribe;
  });

  // Load existing summary
  $effect(() => {
    if (week && day && label) {
      const loadedSummary = progressStore.getSummary(week, day, label);
      summary = loadedSummary;
      lastSummary = loadedSummary;
    }
  });

  // Auto-save summary when it changes (only if already completed)
  $effect(() => {
    if (week && day && label && isCompleted && summary !== lastSummary && lastSummary !== '') {
      progressStore.updateSummary(week, day, label, summary);
      lastSummary = summary;
    }
  });

  let isCompleted = $derived.by(() => {
    if (!week || !day || !label) return false;
    const key = `${week}|${day}|${label}`;
    return progress.readings[key]?.completed ?? false;
  });

  function toggleCompletion() {
    if (week && day && label) {
      if (isCompleted) {
        // Uncomplete
        progressStore.toggle(week, day, label, summary);
      } else {
        // Complete with summary
        progressStore.toggle(week, day, label, summary);
      }
    }
  }
</script>

<div class="chapter-card-wrapper">
  <Card class="p-0 gap-0 overflow-hidden">
    <div
      class="chapter-card-header"
      class:completed={isCompleted}
      role="button"
      tabindex="0"
      onclick={() => (collapsed = !collapsed)}
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          collapsed = !collapsed;
        }
      }}
    >
      <div class="accent-bar" class:completed={isCompleted}></div>
      <span class="chapter-label">{label}</span>
      {#if isCompleted}
        <span class="completed-badge">✓</span>
      {/if}
      <span class="toggle-icon" class:rotated={collapsed}>
        <ChevronDownIcon class="h-5 w-5" />
      </span>
    </div>

    {#if !collapsed}
      <div class="chapter-card-content">
        {@render children()}
      </div>
      <div class="chapter-footer" class:completed={isCompleted}>
        {#if isLastInSegment && hasMoreSegments}
          <!-- Chapter continues on next page -->
          <div class="continue-notice">
            <span class="continue-icon">→</span>
            <span class="continue-text">다음 페이지에 계속</span>
          </div>
        {:else}
          <!-- Normal completion controls -->
          <div class="summary-input-wrapper">
            <input
              type="text"
              bind:value={summary}
              placeholder="이 챕터를 한 줄로 요약해보세요..."
              class="summary-input"
              disabled={isCompleted}
            />
          </div>
          <Button 
            variant={isCompleted ? "outline" : "default"} 
            size="sm" 
            onclick={toggleCompletion}
            class="complete-chapter-btn"
          >
            <Check size={16} />
            <span>{isCompleted ? "완료 취소" : "완료 표시"}</span>
          </Button>
        {/if}
      </div>
    {/if}
  </Card>
</div>

<style>
  .chapter-card-wrapper {
    margin-bottom: 1rem;
  }

  .chapter-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    cursor: pointer;
    user-select: none;
    background: linear-gradient(to right, #f8fafc, #ffffff);
    border-bottom: 1px solid #e5e7eb;
    transition: all 0.3s ease;
  }

  .chapter-card-header:hover {
    background: #f1f5f9;
  }

  .chapter-card-header.completed {
    background: linear-gradient(to right, #d1fae5, #ecfdf5);
    border-bottom: 1px solid #86efac;
  }

  .chapter-card-header.completed:hover {
    background: linear-gradient(to right, #bbf7d0, #d1fae5);
  }

  .accent-bar {
    width: 4px;
    height: 18px;
    background: #2f80ed;
    border-radius: 2px;
    flex-shrink: 0;
    transition: background-color 0.3s ease;
  }

  .accent-bar.completed {
    background: #22c55e;
  }

  .completed-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: #22c55e;
    color: white;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: bold;
    margin-left: auto;
  }

  .chapter-label {
    font-weight: 700;
    color: #1f2d3d;
    font-size: 1.1rem;
    flex: 1;
  }

  .toggle-icon {
    transition: transform 0.3s ease;
    display: inline-flex;
    align-items: center;
  }

  .toggle-icon.rotated {
    transform: rotate(-90deg);
  }

  .chapter-card-content {
    padding: 0;
  }

  .chapter-footer {
    padding: 12px 16px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
    display: flex;
    gap: 12px;
    align-items: center;
    transition: all 0.3s ease;
  }

  .chapter-footer.completed {
    background: #f0fdf4;
    border-top: 1px solid #86efac;
  }

  .summary-input-wrapper {
    flex: 1;
  }

  .summary-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.9rem;
    font-family: "Malgun Gothic", Dotum, sans-serif;
    transition: all 0.2s ease;
  }

  .summary-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .summary-input:disabled {
    background: #f3f4f6;
    color: #6b7280;
    cursor: not-allowed;
  }

  .summary-input::placeholder {
    color: #9ca3af;
  }

  .continue-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: linear-gradient(to right, #fef3c7, #fef9c3);
    border: 1px solid #fbbf24;
    border-radius: 6px;
    width: 100%;
    justify-content: center;
  }

  .continue-icon {
    font-size: 1.2rem;
    color: #d97706;
    font-weight: bold;
    animation: slide 1.5s ease-in-out infinite;
  }

  @keyframes slide {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(4px); }
  }

  .continue-text {
    font-size: 0.95rem;
    font-weight: 600;
    color: #92400e;
    font-family: "Malgun Gothic", Dotum, sans-serif;
  }

  :global(.complete-chapter-btn) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    flex-shrink: 0;
  }
</style>
