<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { env } from '$env/dynamic/public';
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";
  import { progressStore } from "$lib/stores/progressStore.js";
  import { BOOK_FULL_NAMES } from "$lib/data/bookFullNames.js";
  import { ArrowLeft, Download, Mail } from "@lucide/svelte";

  const week = $page.params.week;
  const homeworkSubmitEmail = env.PUBLIC_HOMEWORK_SUBMIT_EMAIL || "";
  let studentName = $state("");
  let studentEmail = $state("");
  let submitError = $state("");
  let pdfError = $state("");
  let downloadingPdf = $state(false);
  
  // Get all summaries for this week
  const summaries = progressStore.getWeekSummaries(week);

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

  function normalizeSummary(text) {
    return (text ?? "").replace(/\s+/g, " ").trim();
  }

  function buildEmailSubject(name) {
    return `[말씀의 삶 숙제제출] ${toKoreanWeekLabel(week)} - ${name}`;
  }

  function buildEmailBody(name, email) {
    const lines = [
      "안녕하세요. 말씀의 삶 숙제를 제출합니다.",
      "",
      `이름: ${name}`,
      `주차: ${toKoreanWeekLabel(week)}`,
      `제출일: ${new Date().toLocaleDateString('ko-KR')}`,
      `완료 챕터: ${summaries.length}개`,
      "",
      "===== 챕터별 요약 =====",
    ];

    for (const [bookName, items] of Object.entries(groupedSummaries)) {
      lines.push("", `[${toKoreanBookName(bookName)}]`);
      for (const item of items) {
        const summaryText = normalizeSummary(item.summary) || "(요약 없음)";
        lines.push(`- ${item.chapter}: ${summaryText}`);
      }
    }

    lines.push("", "감사합니다.");
    return lines.join("\n");
  }

  async function submitHomeworkByEmail() {
    const trimmedName = studentName.trim();
    const trimmedEmail = studentEmail.trim();

    if (!trimmedName) {
      submitError = "이름을 입력해 주세요.";
      return;
    }

    if (!homeworkSubmitEmail) {
      submitError = "제출 이메일이 설정되지 않았습니다. 관리자에게 문의해 주세요.";
      return;
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      submitError = "이메일 형식이 올바르지 않습니다.";
      return;
    }

    submitError = "";

    const subject = encodeURIComponent(buildEmailSubject(trimmedName));
    const bodyText = buildEmailBody(trimmedName, trimmedEmail);
    const body = encodeURIComponent(bodyText);
    const to = encodeURIComponent(homeworkSubmitEmail);
    const baseMailto = `mailto:${to}?subject=${subject}`;
    const fullMailto = `${baseMailto}&body=${body}`;

    if (fullMailto.length > 1800 && navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(bodyText);
        alert("내용이 길어서 본문을 클립보드에 복사했습니다. 메일 앱에서 붙여넣어 제출해 주세요.");
      } catch (error) {
        console.warn("Clipboard copy failed:", error);
      }
      window.location.href = baseMailto;
      return;
    }

    window.location.href = fullMailto;
  }

  function sanitizeFileName(name) {
    return name.replace(/[\\/:*?"<>|]/g, "_");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isIOSDevice() {
    if (typeof navigator === "undefined") return false;
    return /iPad|iPhone|iPod/i.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  async function presentPdfBlob(pdfBlob, filename) {
    const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });

    // Best UX on iOS: open native share sheet.
    if (navigator?.canShare?.({ files: [pdfFile] })) {
      try {
        await navigator.share({ files: [pdfFile], title: filename });
        return;
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.warn("Share failed, falling back to browser open:", error);
        }
      }
    }

    const blobUrl = URL.createObjectURL(pdfBlob);

    if (isIOSDevice()) {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      return;
    }

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }

  async function downloadHomeworkPdf() {
    const trimmedName = studentName.trim() || "이름미입력";
    const trimmedEmail = studentEmail.trim();

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      pdfError = "이메일 형식이 올바르지 않습니다.";
      return;
    }

    pdfError = "";
    downloadingPdf = true;

    try {
      const reportText = buildEmailBody(trimmedName, trimmedEmail);
      const filename = sanitizeFileName(
        `${toKoreanWeekLabel(week)}_숙제_${trimmedName}.pdf`,
      );
      const reportHtml = `
        <section style="width: 820px; padding: 32px; background: #ffffff; color: #111827; font-family: 'Malgun Gothic', Dotum, sans-serif; font-size: 14px; line-height: 1.6;">
          <h1 style="margin: 0 0 16px 0; font-size: 24px;">${escapeHtml(toKoreanWeekLabel(week))} 숙제 제출본</h1>
          <pre style="margin: 0; white-space: pre-wrap; word-break: break-word;">${escapeHtml(reportText)}</pre>
        </section>
      `;

      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default ?? html2pdfModule;
      const worker = html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            onclone: (clonedDoc) => {
              // html2canvas does not support oklch() yet.
              // Force safe sRGB colors in the cloned document before rendering.
              const safeColorStyle = clonedDoc.createElement("style");
              safeColorStyle.textContent = `
                :root, html, body {
                  background: #ffffff !important;
                  color: #111827 !important;
                  --background: #ffffff !important;
                  --foreground: #111827 !important;
                  --card: #ffffff !important;
                  --card-foreground: #111827 !important;
                  --popover: #ffffff !important;
                  --popover-foreground: #111827 !important;
                  --primary: #1f2937 !important;
                  --primary-foreground: #ffffff !important;
                  --secondary: #f3f4f6 !important;
                  --secondary-foreground: #111827 !important;
                  --muted: #f3f4f6 !important;
                  --muted-foreground: #4b5563 !important;
                  --accent: #f3f4f6 !important;
                  --accent-foreground: #111827 !important;
                  --destructive: #dc2626 !important;
                  --border: #e5e7eb !important;
                  --input: #e5e7eb !important;
                  --ring: #94a3b8 !important;
                }
                *, *::before, *::after {
                  border-color: #e5e7eb !important;
                  outline-color: #94a3b8 !important;
                }
              `;
              clonedDoc.head.appendChild(safeColorStyle);
            },
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(reportHtml, "string")
        .toPdf();

      const pdfBlob = await worker.outputPdf("blob");
      await presentPdfBlob(pdfBlob, filename);
    } catch (error) {
      console.error("PDF download failed:", error);
      pdfError = "PDF 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    } finally {
      downloadingPdf = false;
    }
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

    <div class="submit-actions">
      <div class="submit-form">
        <input
          type="text"
          class="text-input"
          placeholder="이름을 입력하세요"
          bind:value={studentName}
          maxlength="40"
          onkeydown={(event) => event.key === "Enter" && submitHomeworkByEmail()}
        />
        <!-- <input
          type="email"
          class="text-input"
          placeholder="내 이메일 (선택)"
          bind:value={studentEmail}
          maxlength="120"
          onkeydown={(event) => event.key === "Enter" && submitHomeworkByEmail()}
        /> -->
        <Button onclick={submitHomeworkByEmail} class="submit-btn">
          <Mail size={16} />
          <span>메일 앱으로 제출</span>
        </Button>
        <Button
          variant="outline"
          onclick={downloadHomeworkPdf}
          class="submit-btn"
          disabled={downloadingPdf}
        >
          <Download size={16} />
          <span>{downloadingPdf ? "PDF 생성 중..." : "PDF 다운로드"}</span>
        </Button>
      </div>
      <p class="submit-hint">
        {#if homeworkSubmitEmail}
          메일 앱이 열리며, 설정된 계정(본인 이메일)으로 전송됩니다.
        {:else}
          `.env`에 `PUBLIC_HOMEWORK_SUBMIT_EMAIL` 설정이 필요합니다.
        {/if}
      </p>
      {#if submitError}
        <p class="submit-error">{submitError}</p>
      {/if}
      {#if pdfError}
        <p class="submit-error">{pdfError}</p>
      {/if}
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

  .submit-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .submit-form {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    flex-wrap: wrap;
  }

  .text-input {
    width: min(360px, 100%);
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 0.55rem 0.7rem;
    font-size: 0.95rem;
    font-family: "Malgun Gothic", Dotum, sans-serif;
    color: #1f2937;
    background: white;
  }

  .text-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
  }

  :global(.submit-btn) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .submit-hint {
    margin: 0;
    font-size: 0.85rem;
    color: #6b7280;
    text-align: center;
    word-break: break-all;
  }

  .submit-error {
    margin: 0;
    font-size: 0.85rem;
    color: #dc2626;
    text-align: center;
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

    .submit-form {
      align-items: stretch;
    }

    .text-input {
      width: 100%;
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
