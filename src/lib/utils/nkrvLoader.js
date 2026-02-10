import { BOOK_MAP } from "$lib/data/bookMap.js";

/** @type {Promise<Record<string, string>> | null} */
let nkrvCachePromise = null;

/** @type {Promise<NkrvIndex> | null} */
let nkrvIndexPromise = null;

/**
 * @typedef {{ data: Record<string, string>, books: Record<string, BookData> }} NkrvIndex
 * @typedef {{ verseCount: number, chapters: Record<number, number[]> }} BookData
 */

/** Fetch and cache the raw NKRV JSON data */
export async function loadNkrvData() {
  if (nkrvCachePromise) return nkrvCachePromise;

  nkrvCachePromise = fetch("/assets/bible.json")
    .then((response) => {
      if (!response.ok) throw new Error("Failed to load NKRV data.");
      return response.json();
    })
    .catch((err) => {
      nkrvCachePromise = null;
      throw err;
    });

  return nkrvCachePromise;
}

/**
 * Build a lookup index from the raw NKRV data.
 * Groups verses by book → chapter for fast access.
 * @param {Record<string, string>} data
 * @returns {NkrvIndex}
 */
function buildNkrvIndex(data) {
  /** @type {Record<string, BookData>} */
  const books = {};

  for (const key of Object.keys(data)) {
    const match = key.match(/^([^\d]+)(\d+):(\d+)$/);
    if (!match) continue;

    const bookKey = match[1];
    const chapter = Number(match[2]);
    const verse = Number(match[3]);

    if (!books[bookKey]) {
      books[bookKey] = { verseCount: 0, chapters: {} };
    }

    const book = books[bookKey];
    book.verseCount += 1;

    if (!book.chapters[chapter]) {
      book.chapters[chapter] = [];
    }
    book.chapters[chapter].push(verse);
  }

  // Sort verses within each chapter
  for (const book of Object.values(books)) {
    for (const chapter of Object.keys(book.chapters)) {
      book.chapters[chapter].sort((a, b) => a - b);
    }
  }

  return { data, books };
}

/** Load NKRV data and build the index (cached) */
export async function loadNkrvIndex() {
  if (nkrvIndexPromise) return nkrvIndexPromise;

  nkrvIndexPromise = loadNkrvData()
    .then(buildNkrvIndex)
    .catch((err) => {
      nkrvIndexPromise = null;
      throw err;
    });

  return nkrvIndexPromise;
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

  const [startRaw, endRaw] = rangePart
    .split("-")
    .map((part) => part.trim());
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
 * Splits large readings into API-friendly chunks.
 * @param {string} reference
 * @returns {Promise<ReadingPlan>}
 */
export async function buildReadingPlan(reference) {
  const index = await loadNkrvIndex();
  const { bookName, startChapter, endChapter } =
    parseReadingReference(reference);
  const bookKey = BOOK_MAP[bookName];

  if (!bookKey) throw new Error(`Unsupported book name: ${bookName}`);

  const bookData = index.books[bookKey];
  if (!bookData) throw new Error(`Book not found in NKRV data: ${bookName}`);
  if (!startChapter || !endChapter) {
    throw new Error(`Invalid reference: ${reference}`);
  }

  const verses = [];
  for (let chapter = startChapter; chapter <= endChapter; chapter += 1) {
    const verseNumbers = bookData.chapters[chapter];
    if (!verseNumbers) continue;
    for (const verse of verseNumbers) {
      verses.push({ chapter, verse });
    }
  }

  if (!verses.length) throw new Error(`No verses found for: ${reference}`);

  const chapterCount = Object.keys(bookData.chapters).length;
  const isSingleChapter = chapterCount === 1;
  const halfBookLimit = isSingleChapter
    ? 500
    : Math.floor(bookData.verseCount / 2);
  const maxVerses = Math.min(500, halfBookLimit || 500);

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
    nkrvData: index.data,
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
