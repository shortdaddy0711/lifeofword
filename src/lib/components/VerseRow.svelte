<script>
  /**
   * Renders a single verse with Korean (NKRV) and optional English (ESV) text.
   */
  let { verse, showEsv = false } = $props();

  let nkrvText = $derived(verse.nkrv || "NKRV text not found for this verse.");
  let hasNkrv = $derived(!!verse.nkrv);
</script>

<div class="verse-container">
  <div class="verse-number">{verse.ref}</div>
  <div class="verse-text">
    <div class="text-nkrv" class:placeholder={!hasNkrv}>
      {nkrvText}
    </div>
    {#if showEsv && !verse.isFallback}
      <div class="text-esv">{verse.esv}</div>
    {/if}
  </div>
</div>

<style>
  .verse-container {
    padding: 10px;
    border-bottom: 1px solid #f1f5f9;
    display: grid;
    grid-template-columns: 48px 1fr;
    gap: 18px;
  }

  .verse-container:last-child {
    border-bottom: none;
  }

  .verse-container:hover {
    background-color: #fcfdff;
  }

  .verse-number {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #f1f5f9;
    color: #6b7280;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    margin-top: 2px;
  }

  .verse-text {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .text-nkrv {
    font-size: 1.05rem;
    color: #1f2d3d;
    font-weight: 600;
    font-family: "Malgun Gothic", Dotum, sans-serif;
    word-break: keep-all;
    line-height: 1.6;
  }

  .text-nkrv.placeholder {
    color: #9ca3af;
    font-style: italic;
  }

  .text-esv {
    font-size: 0.95rem;
    color: #6b7280;
    font-weight: 400;
    margin-top: 4px;
  }

  @media (max-width: 640px) {
    .verse-container {
      grid-template-columns: 32px 1fr;
      gap: 12px;
      padding: 8px;
    }

    .verse-number {
      width: 32px;
      height: 32px;
      font-size: 0.8rem;
      margin-top: 0;
    }
  }
</style>
