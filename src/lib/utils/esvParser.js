/**
 * ESV API client and passage parser.
 * Handles fetching from the local proxy and parsing verse tokens.
 */

const ESV_API_URL = "/api/esv";

/**
 * Get the starting chapter number from a reference string.
 * @param {string} reference
 * @returns {number | null}
 */
function getStartChapter(reference) {
  const match = reference.match(
    /(\d+)(?::\d+)?(?:\s*[-–]\s*\d+(?::\d+)?)?\s*$/,
  );
  return match ? Number(match[1]) : null;
}

/**
 * Format an ESV API query from a book name and segment.
 * @param {string} bookName
 * @param {import('./nkrvLoader.js').Segment} segment
 * @returns {string}
 */
export function formatEsvQuery(bookName, segment) {
  const startRef = `${segment.start.chapter}:${segment.start.verse}`;
  const endRef = `${segment.end.chapter}:${segment.end.verse}`;
  const range = startRef === endRef ? startRef : `${startRef}-${endRef}`;
  return `${bookName} ${range}`;
}

/**
 * Fetch a passage from the ESV API proxy.
 * @param {string} query  e.g. "Genesis 1:1-10:32"
 * @returns {Promise<{ passages: string[], canonical: string }>}
 */
export async function fetchEsv(query) {
  const params = new URLSearchParams({
    q: query,
    "include-passage-references": "false",
    "include-verse-numbers": "true",
    "include-first-verse-numbers": "true",
    "include-footnotes": "false",
    "include-headings": "false",
    "include-short-copyright": "true",
    "line-length": "0",
  });

  const response = await fetch(`${ESV_API_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`ESV API error (${response.status})`);
  }
  return response.json();
}

/**
 * @typedef {object} ParsedItem
 * @property {'chapter' | 'verse'} type
 * @property {string} [label]
 * @property {string} [ref]
 * @property {string} [esv]
 * @property {number | null} [chapter]
 * @property {number | null} [verse]
 */

/**
 * Parse ESV API passages into structured verse/chapter items.
 * @param {string[]} passages
 * @param {string} fallbackReference
 * @returns {{ items: ParsedItem[] }}
 */
export function parseEsvPassages(passages, fallbackReference) {
  const raw = Array.isArray(passages) ? passages.join("\n").trim() : "";
  const startChapter = getStartChapter(fallbackReference);

  if (!raw) {
    return {
      items: [
        {
          type: "verse",
          ref: fallbackReference,
          esv: "No passage returned from the API.",
        },
      ],
    };
  }

  const tokenRegex = /\[(\d+(?::\d+)?)\]/g;
  const verses = [];
  let match;
  let lastLabel = null;
  let lastIndex = 0;

  while ((match = tokenRegex.exec(raw)) !== null) {
    if (lastLabel !== null) {
      const text = raw
        .slice(lastIndex, match.index)
        .replace(/\s+/g, " ")
        .trim();
      if (text) verses.push({ label: lastLabel, esv: text });
    }
    lastLabel = match[1];
    lastIndex = match.index + match[0].length;
  }

  if (lastLabel !== null) {
    const text = raw.slice(lastIndex).replace(/\s+/g, " ").trim();
    if (text) verses.push({ label: lastLabel, esv: text });
  }

  if (!verses.length) {
    return {
      items: [
        {
          type: "verse",
          ref: fallbackReference,
          esv: raw.replace(/\s+/g, " ").trim(),
          chapter: startChapter,
          verse: null,
        },
      ],
    };
  }

  /** @type {ParsedItem[]} */
  const items = [];
  let currentChapter = startChapter;
  let verseCount = 0;

  if (currentChapter) {
    items.push({ type: "chapter", label: `${currentChapter}장` });
  }

  for (const v of verses) {
    let verseNumber = null;
    let chapterNumber = null;

    if (v.label.includes(":")) {
      const [ch, vs] = v.label.split(":");
      chapterNumber = Number(ch);
      verseNumber = Number(vs);
    } else {
      verseNumber = Number(v.label);
    }

    if (Number.isFinite(chapterNumber)) {
      if (chapterNumber !== currentChapter) {
        currentChapter = chapterNumber;
        items.push({ type: "chapter", label: `${currentChapter}장` });
      }
    } else if (verseNumber === 1 && verseCount > 0 && currentChapter) {
      currentChapter += 1;
      items.push({ type: "chapter", label: `${currentChapter}장` });
    }

    items.push({
      type: "verse",
      ref: v.label,
      esv: v.esv,
      chapter: currentChapter,
      verse: Number.isFinite(verseNumber) ? verseNumber : null,
    });
    verseCount += 1;
  }

  return { items };
}

/**
 * Fetch and parse a segment, merging ESV + NKRV data.
 * Falls back to NKRV-only if ESV fails.
 * @param {import('./nkrvLoader.js').ReadingPlan} plan
 * @param {number} segmentIndex
 * @returns {Promise<{ title: string, query: string, items: ParsedItem[] }>}
 */
export async function fetchSegment(plan, segmentIndex) {
  const segment = plan.segments[segmentIndex];
  const query = formatEsvQuery(plan.bookName, segment);

  let data = null;
  let esvError = null;

  try {
    data = await fetchEsv(query);
  } catch (err) {
    console.warn("ESV fetch failed, using fallback mode:", err);
    esvError = err;
  }

  // ESV succeeded — merge with NKRV
  if (data) {
    const parsed = parseEsvPassages(
      data.passages,
      data.canonical || query,
    );

    return {
      title: plan.reference,
      query: data.canonical || query,
      items: parsed.items.map((item) => {
        if (item.type !== "verse") return item;

        const nkrvKey =
          plan.bookKey && item.chapter && item.verse
            ? `${plan.bookKey}${item.chapter}:${item.verse}`
            : null;
        const nkrvText =
          nkrvKey && plan.nkrvData[nkrvKey]
            ? plan.nkrvData[nkrvKey].trim()
            : "";

        return { ...item, nkrv: nkrvText };
      }),
    };
  }

  // Fallback: NKRV-only rendering
  const items = [];
  let currentChapter = null;

  for (const v of segment.verses) {
    if (v.chapter !== currentChapter) {
      currentChapter = v.chapter;
      items.push({ type: "chapter", label: `${currentChapter}장` });
    }

    const nkrvKey = `${plan.bookKey}${v.chapter}:${v.verse}`;
    const nkrvText = plan.nkrvData[nkrvKey]
      ? plan.nkrvData[nkrvKey].trim()
      : "";

    items.push({
      type: "verse",
      ref: `${v.verse}`,
      esv: "ESV text unavailable (API error)",
      chapter: v.chapter,
      verse: v.verse,
      nkrv: nkrvText,
      isFallback: true,
    });
  }

  return { title: plan.reference, query, items };
}

