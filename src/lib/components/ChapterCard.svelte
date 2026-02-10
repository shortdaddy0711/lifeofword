<script>
  import { Card } from "$lib/components/ui/card";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";

  let {
    label = "",
    initialCollapsed = false,
    children,
  } = $props();

  let collapsed = $state(false);

  $effect(() => {
    collapsed = initialCollapsed;
  });
</script>

<div class="chapter-card-wrapper">
  <Card class="p-0 gap-0 overflow-hidden">
    <div
      class="chapter-card-header"
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
      <div class="accent-bar"></div>
      <span class="chapter-label">{label}</span>
      <span class="toggle-icon" class:rotated={collapsed}>
        <ChevronDownIcon class="h-5 w-5" />
      </span>
    </div>

    {#if !collapsed}
      <div class="chapter-card-content">
        {@render children()}
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
    transition: background-color 0.2s;
  }

  .chapter-card-header:hover {
    background: #f1f5f9;
  }

  .accent-bar {
    width: 4px;
    height: 18px;
    background: #2f80ed;
    border-radius: 2px;
    flex-shrink: 0;
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
</style>
