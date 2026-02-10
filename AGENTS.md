# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Project Overview

- **Name**: Life of Word (말씀의 삶)
- **Type**: Bible Reading Web Application
- **Primary Language**: JavaScript
- **Framework**: SvelteKit 2.50+ with Svelte 5
- **Styling**: Tailwind CSS + shadcn-svelte (Bits UI) components
- **Description**: Daily Bible reading app for the Life of Word program at Maranatha Vision Church. Displays interlinear Bible passages with Korean (NKRV) and English (ESV) translations across a 12-week reading plan.

## Architecture & Structure

```
lifeOfWord/
├── src/
│   ├── routes/
│   │   ├── +page.svelte          ← Main reading UI
│   │   ├── +layout.svelte        ← Sticky header + shared layout
│   │   └── api/esv/+server.js    ← ESV proxy (rate-limited)
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ChapterCard.svelte
│   │   │   ├── VerseRow.svelte
│   │   │   ├── WeekDaySelector.svelte
│   │   │   └── SegmentControls.svelte
│   │   ├── data/
│   │   │   ├── readingPlan.js    ← 12-week plan data
│   │   │   └── bookMap.js        ← English→Korean book name mapping
│   │   └── utils/
│   │       ├── esvParser.js      ← ESV passage fetching + NKRV merge
│   │       ├── nkrvLoader.js     ← NKRV cache + index builder
│   │       └── rateLimit.js      ← Rate limiting logic
│   └── app.html                  ← HTML shell
├── static/
│   └── assets/bible.json         ← NKRV Bible text database
├── svelte.config.js
├── vite.config.js
├── package.json
├── .env                          ← ESV_API_KEY (gitignored)
└── .env.example                  ← Template for required env vars
```

## Technology Stack

### Frontend

- **SvelteKit**: Full-stack framework (routing, SSR, API routes)
- **Svelte 5**: Component framework with runes ($state, $derived, $effect)
- **Tailwind CSS**: Utility-first styling
- **shadcn-svelte**: Accessible UI components built on Bits UI

### UI Components Used (shadcn-svelte)

| UI Element         | Component                |
| ------------------ | ------------------------ |
| Sticky header      | Custom header (Tailwind) |
| Week/day dropdowns | `Select`                 |
| ESV toggle         | `Switch` + `Label`       |
| "Read" button      | `Button`                 |
| Chapter cards      | `Card` + icon            |
| Prev/Next nav      | `Button` (outline)       |
| Loading state      | `Progress`               |

### Backend

- **SvelteKit API routes**: `+server.js` endpoints
- **ESV API**: https://api.esv.org (proxied through server route)
- **Vercel**: Deployment via `@sveltejs/adapter-vercel`

### Key Dependencies

```
tailwindcss, tailwind-merge, tailwind-variants, tw-animate-css
bits-ui, clsx, @lucide/svelte
```

## Development Guidelines

### Styling & Theming

- Global styles live in `src/app.css`
- Theme colors are defined via CSS variables in `src/app.css`
- Tailwind utility classes are used for layout and component styling

### Svelte 5 Patterns

- Use **runes** for reactivity: `$state()`, `$derived()`, `$effect()`
- Use `$props()` for component inputs (not `export let`)
- Event handlers: `onclick={handler}` (not `on:click`)
- Svelte auto-escapes `{expressions}` — no manual `escapeHtml()` needed

### Code Style

- Components: PascalCase (`ChapterCard.svelte`)
- Utilities/data: camelCase (`readingPlan.js`)
- Use `$lib/` alias for imports from `src/lib/`
- Scoped CSS in components; global theme via `src/app.css`
- ESM modules (`"type": "module"` in package.json)

### Git Workflow

- No CI/CD configured — Vercel deploys on push to main
- Commit format: `feat:`, `fix:`, `refactor:`, `style:`

### Build & Deployment

- **Dev**: `npm run dev` (Vite dev server with HMR)
- **Build**: `npm run build`
- **Preview**: `npm run preview`
- **Deploy**: `git push` (Vercel auto-deploys)

## AI Agent Instructions

### Project Context

- **Working Style**: Production church app with active users — maintain reliability
- **Current Phase**: SvelteKit migration complete — maintenance and feature development
- **Focus Areas**: ESV API reliability, mobile UX, Korean text rendering

### Component Patterns (shadcn-svelte)

**Header + Controls (layout)**:

```svelte
<header class="sticky top-0 z-50 bg-primary text-primary-foreground">
  <div class="mx-auto max-w-[960px] px-4 py-3 text-center text-lg font-semibold">
    말씀의 삶 과제 성경구절
  </div>
</header>
<div class="controls">
  <Select type="single" bind:value={selectedWeek}>
    <SelectTrigger>Week 1</SelectTrigger>
    <SelectContent>
      <SelectItem value="Week 1">Week 1</SelectItem>
    </SelectContent>
  </Select>
  <Switch bind:checked={esvEnabled} />
  <Button onclick={loadReading}>Read</Button>
</div>
```

**ChapterCard (expandable)**:

```svelte
<Card class="chapter-card">
  <div class="chapter-card-header" onclick={() => collapsed = !collapsed}>
    <span>{label}</span>
    <ChevronDownIcon />
  </div>
  {#if !collapsed}
    <div class="chapter-card-content">
      {#each verses as verse}
        <VerseRow {verse} showEsv={$esvEnabled} />
      {/each}
    </div>
  {/if}
</Card>
```

### Best Practices

- Korean text: keep `font-family: "Malgun Gothic", Dotum` in component styles
- `word-break: keep-all` for Korean text wrapping
- Use shadcn-svelte components for consistent a11y and styling
- Test on mobile: verify Korean text at small widths

### Important File Locations

- **Reading Plan Data**: `src/lib/data/readingPlan.js`
- **Book Mapping**: `src/lib/data/bookMap.js`
- **ESV Proxy**: `src/routes/api/esv/+server.js`
- **NKRV Bible Data**: `static/assets/bible.json`

## Quick Reference

### Common Commands

- **Dev server**: `npm run dev`
- **Build**: `npm run build`
- **Preview build**: `npm run preview`

### Environment Variables

```
ESV_API_KEY=...          # Required — ESV Bible API token (server-only)
PUBLIC_APP_NAME=...      # Optional — app display name (client-safe)
```

Set in `.env` file (gitignored) or Vercel project settings.

## Notes & Context

### Why SvelteKit + shadcn-svelte?

- **SvelteKit**: Eliminates server duplication, built-in SSR, Vercel-native adapter
- **shadcn-svelte**: Accessible components with Tailwind customization
- **Svelte 5**: Smallest bundle size of any framework — critical for church WiFi

### shadcn-svelte Notes

- Components live in `src/lib/components/ui`
- Styles and tokens are driven by `src/app.css`
- Icons use `@lucide/svelte`

### Korean Text Rendering

- Font stack: `"Malgun Gothic", Dotum, sans-serif`
- `word-break: keep-all` preserves Korean word boundaries
- NKRV keys format: `"북명장:절"` (e.g., "마1:1" = Matthew 1:1)
- Always test Korean display when changing typography or layout

### Security

- ESV_API_KEY: server-only via `$env/dynamic/private` — never exposed to client
- CORS: SvelteKit handles this via hooks if needed
- Path traversal: no longer a concern (SvelteKit manages static serving)
- HTML escaping: Svelte auto-escapes expressions by default
