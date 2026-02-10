<script>
  import { Button } from "$lib/components/ui/button";

  let {
    currentIndex = 0,
    totalSegments = 1,
    onprev = () => {},
    onnext = () => {},
  } = $props();

  let hasPrev = $derived(currentIndex > 0);
  let hasNext = $derived(currentIndex < totalSegments - 1);
</script>

<div class="segment-controls">
  <Button variant="outline" disabled={!hasPrev} onclick={onprev} class="nav-btn">
    ← Previous
  </Button>

  <span class="segment-info">
    Page {currentIndex + 1} / {totalSegments}
  </span>

  <Button variant="outline" disabled={!hasNext} onclick={onnext} class="nav-btn">
    Next →
  </Button>
</div>

<style>
  .segment-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin: 2rem 0 1.5rem;
    padding: 1.5rem;
    background: linear-gradient(to right, #f8fafc, #f1f5f9);
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    flex-wrap: wrap;
  }

  .segment-info {
    color: #374151;
    font-size: 1rem;
    font-weight: 600;
    min-width: 100px;
    text-align: center;
  }

  :global(.nav-btn) {
    min-width: 120px;
    font-weight: 500;
  }

  @media (max-width: 640px) {
    .segment-controls {
      margin: 1.5rem 0 1rem;
      padding: 1rem;
      gap: 12px;
    }

    :global(.nav-btn) {
      min-width: 100px;
      font-size: 0.9rem;
    }

    .segment-info {
      font-size: 0.9rem;
      min-width: 80px;
    }
  }
</style>
