<script>
  import "../app.css";
  let { children } = $props();
</script>

<header class="sticky top-0 z-50 bg-primary text-primary-foreground shadow-sm">
  <div class="mx-auto max-w-[960px] px-4 py-3 text-center text-lg font-semibold">
    말씀의 삶 성경읽기 과제
  </div>
</header>

<div class="mx-auto max-w-[960px] px-4 pb-6 pt-4">
  {@render children()}
</div>
