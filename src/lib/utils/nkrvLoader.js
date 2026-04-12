import { BOOK_FULL_NAMES } from "$lib/data/bookFullNames.js";

/**
 * @typedef {{ verse_start: number, verse_end: number, text: string, book: string, chapter: number }} VerseData
 * @typedef {{ data: Record<string, string>, books: Record<string, BookData> }} NkrvIndex
 * @typedef {{ verseCount: number, chapters: Record<number, number[]> }} BookData
 */

const NKRV_API_URL = "/api/nkrv";

/**
 * Range-level cache to avoid redundant API calls within a session.
 * Key: "<bookFullName>:<chapterStart>:<chapterEnd>" → Promise<VerseData[]>
 * @type {Map<string, Promise<VerseData[]>>}
 */
const rangeCache = new Map();

/**
 * Fetch all verses for a chapter range from the NKRV backend API (via SvelteKit proxy).
 * Uses the /api/bible/chapters endpoint — a single network call for the entire range.
 * Results are cached per range for the session lifetime.
 * @param {string} bookFullName - Korean full book name (e.g. "창세기")
 * @param {number} chapterStart
 * @param {number} chapterEnd
 * @returns {Promise<VerseData[]>}
 */
async function fetchNkrvChapters(bookFullName, chapterStart, chapterEnd) {
  const cacheKey = `${bookFullName}:${chapterStart}:${chapterEnd}`;

  if (rangeCache.has(cacheKey)) {
    // @ts-ignore
    return rangeCache.get(cacheKey);
  }

  const promise = (async () => {
    const params = new URLSearchParams({
      book: bookFullName,
      chapter_start: String(chapterStart),
      chapter_end: String(chapterEnd),
    });

    const response = await fetch(`${NKRV_API_URL}?${params}`);

    if (!response.ok) {
      throw new Error(
        `NKRV API error for ${bookFullName} chapters ${chapterStart}-${chapterEnd} (${response.status})`,
      );
    }

    /** @type {VerseData[]} */
    const data = await response.json();
    return data;
  })();

  rangeCache.set(cacheKey, promise);

  // Evict failed entries so the next attempt can retry
  promise.catch(() => rangeCache.delete(cacheKey));

  return promise;
}

/**
 * Parse a reading reference like "Genesis 1-10" into structured data.
 * @param {string} reference
 * @returns {{ bookName: string, startChapter: number | null, endChapter: number | null }}
 */
export function parseReadingReference(reference) {
  const bookName = reference.replace(/\s+\d.*$/, "").trim();
  const rangePart = reference.slice(bookName.length).trim();

  if (!rangePart) {
    return { bookName, startChapter: 1, endChapter: 1 };
  }

  const [startRaw, endRaw] = rangePart.split("-").map((part) => part.trim());
  const startChapter = Number(startRaw.split(":")[0]);
  const endChapter = Number((endRaw || startRaw).split(":")[0]);

  return {
    bookName,
    startChapter: startChapter || null,
    endChapter: endChapter || startChapter || null,
  };
}

/**
 * Build segmented reading plan for a reference.
 * Fetches NKRV verse data from the backend API and splits large readings
 * into API-friendly chunks for the ESV fetcher.
 * @param {string} reference
 * @returns {Promise<ReadingPlan>}
 */
export async function buildReadingPlan(reference) {
  const { bookName, startChapter, endChapter } =
    parseReadingReference(reference);
  const bookKey = BOOK_FULL_NAMES[bookName];

  if (!bookKey) throw new Error(`Unsupported book name: ${bookName}`);
  if (!startChapter || !endChapter) {
    throw new Error(`Invalid reference: ${reference}`);
  }

  // Fetch the entire chapter range in a single API call
  const allVerseData = await fetchNkrvChapters(bookKey, startChapter, endChapter);

  // Build nkrvData lookup map (key format: "창세기1:1")
  // and collect verse numbers per chapter for segmentation
  /** @type {Record<string, string>} */
  const nkrvData = {};
  /** @type {Record<number, number[]>} */
  const chaptersMap = {};
  let totalVerseCount = 0;

  for (const v of allVerseData) {
    const key = `${v.book}${v.chapter}:${v.verse_start}`;
    nkrvData[key] = v.text;

    if (!chaptersMap[v.chapter]) {
      chaptersMap[v.chapter] = [];
    }
    chaptersMap[v.chapter].push(v.verse_start);
    totalVerseCount += 1;
  }

  // Flatten into an ordered verse list for segmentation
  // API returns rows ordered by chapter then verse_start, so no re-sort needed
  /** @type {Array<{ chapter: number, verse: number }>} */
  const verses = [];
  for (let ch = startChapter; ch <= endChapter; ch++) {
    for (const v of chaptersMap[ch] ?? []) {
      verses.push({ chapter: ch, verse: v });
    }
  }

  if (!verses.length) throw new Error(`No verses found for: ${reference}`);

  // Segmentation: mirror the original logic using the fetched range size
  const chapterCount = Object.keys(chaptersMap).length;
  const isSingleChapter = chapterCount === 1;
  const halfRangeLimit = isSingleChapter
    ? 500
    : Math.floor(totalVerseCount / 2);
  const maxVerses = Math.min(500, halfRangeLimit || 500);

  const segments = [];
  for (let i = 0; i < verses.length; i += maxVerses) {
    const chunk = verses.slice(i, i + maxVerses);
    segments.push({
      start: chunk[0],
      end: chunk[chunk.length - 1],
      length: chunk.length,
      verses: chunk,
    });
  }

  return {
    reference,
    bookName,
    bookKey,
    totalVerses: verses.length,
    maxVerses,
    segments,
    nkrvData,
  };
}

/**
 * @typedef {object} ReadingPlan
 * @property {string} reference
 * @property {string} bookName
 * @property {string} bookKey
 * @property {number} totalVerses
 * @property {number} maxVerses
 * @property {Array<Segment>} segments
 * @property {Record<string, string>} nkrvData
 */

/**
 * @typedef {object} Segment
 * @property {{ chapter: number, verse: number }} start
 * @property {{ chapter: number, verse: number }} end
 * @property {number} length
 * @property {Array<{ chapter: number, verse: number }>} verses
 */
