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

{#if totalSegments > 1}
  <div class="segment-controls">
    <Button variant="outline" disabled={!hasPrev} onclick={onprev}>
      Previous
    </Button>

    <span class="segment-info">
      Part {currentIndex + 1} of {totalSegments}
    </span>

    <Button variant="outline" disabled={!hasNext} onclick={onnext}>
      Next
    </Button>
  </div>
{/if}

<style>
  .segment-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin: 0.5rem 0 1.5rem;
    flex-wrap: wrap;
  }

  .segment-info {
    color: #6b7280;
    font-size: 0.9rem;
  }
</style>
