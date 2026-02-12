/**
 * Progress tracking store with localStorage persistence
 * Tracks which Bible readings have been completed
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { readingPlan } from '$lib/data/readingPlan.js';

const STORAGE_KEY = 'lifeOfWord_progress';
const STORAGE_VERSION = 1;

/**
 * Default progress structure
 * @typedef {Object} ProgressData
 * @property {number} version - Storage schema version
 * @property {Object<string, ReadingProgress>} readings - Completed readings by key
 * @property {string} lastUpdated - ISO timestamp of last update
 * @property {string} lastWeek - Last selected week
 * @property {string} lastDay - Last selected day
 * @property {boolean} esvEnabled - ESV translation toggle state
 */

/**
 * @typedef {Object} ReadingProgress
 * @property {boolean} completed - Whether reading is completed
 * @property {string} completedAt - ISO timestamp of completion
 * @property {string} week - Week identifier (e.g., "Week 1")
 * @property {string} day - Day reading reference (e.g., "Genesis 1-10")
 * @property {string} chapter - Chapter label (e.g., "1장")
 * @property {string} summary - One-line summary of the chapter
 */

/** Load progress from localStorage */
function loadProgress() {
  if (!browser) return createDefaultProgress();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return createDefaultProgress();

    const data = JSON.parse(stored);
    
    // Validate version and structure
    if (!data || data.version !== STORAGE_VERSION) {
      console.warn('Progress data version mismatch, resetting...');
      return createDefaultProgress();
    }

    return data;
  } catch (error) {
    console.error('Error loading progress:', error);
    return createDefaultProgress();
  }
}

/** Create default empty progress object */
function createDefaultProgress() {
  return {
    version: STORAGE_VERSION,
    readings: {},
    lastUpdated: new Date().toISOString(),
    lastWeek: 'Week 1',
    lastDay: '',
    esvEnabled: false,
  };
}

/** Save progress to localStorage */
function saveProgress(data) {
  if (!browser) return;

  try {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded. Please clear old data.');
      alert('Storage is full. Please reset progress or clear browser data.');
    } else {
      console.error('Error saving progress:', error);
    }
  }
}

/** Create reading key from week, day, and chapter */
function createReadingKey(week, day, chapter) {
  return `${week}|${day}|${chapter}`;
}

/** Create the progress store */
function createProgressStore() {
  const { subscribe, set, update } = writable(loadProgress());

  return {
    subscribe,

    /**
     * Mark a chapter as completed with summary
     * @param {string} week - Week identifier (e.g., "Week 1")
     * @param {string} day - Day reading reference (e.g., "Genesis 1-10")
     * @param {string} chapter - Chapter label (e.g., "1장")
     * @param {string} summary - One-line summary
     */
    markComplete(week, day, chapter, summary = '') {
      update(data => {
        const key = createReadingKey(week, day, chapter);
        data.readings[key] = {
          completed: true,
          completedAt: new Date().toISOString(),
          week,
          day,
          chapter,
          summary,
        };
        saveProgress(data);
        return data;
      });
    },

    /**
     * Mark a chapter as incomplete
     * @param {string} week - Week identifier
     * @param {string} day - Day reading reference
     * @param {string} chapter - Chapter label
     */
    markIncomplete(week, day, chapter) {
      update(data => {
        const key = createReadingKey(week, day, chapter);
        delete data.readings[key];
        saveProgress(data);
        return data;
      });
    },

    /**
     * Toggle completion status
     * @param {string} week - Week identifier
     * @param {string} day - Day reading reference
     * @param {string} chapter - Chapter label
     * @param {string} summary - One-line summary
     */
    toggle(week, day, chapter, summary = '') {
      update(data => {
        const key = createReadingKey(week, day, chapter);
        if (data.readings[key]?.completed) {
          delete data.readings[key];
        } else {
          data.readings[key] = {
            completed: true,
            completedAt: new Date().toISOString(),
            week,
            day,
            chapter,
            summary,
          };
        }
        saveProgress(data);
        return data;
      });
    },

    /**
     * Check if a chapter is completed
     * @param {string} week - Week identifier
     * @param {string} day - Day reading reference
     * @param {string} chapter - Chapter label
     * @returns {boolean}
     */
    isCompleted(week, day, chapter) {
      const data = loadProgress();
      const key = createReadingKey(week, day, chapter);
      return data.readings[key]?.completed ?? false;
    },

    /**
     * Get summary for a chapter
     * @param {string} week - Week identifier
     * @param {string} day - Day reading reference
     * @param {string} chapter - Chapter label
     * @returns {string}
     */
    getSummary(week, day, chapter) {
      const data = loadProgress();
      const key = createReadingKey(week, day, chapter);
      return data.readings[key]?.summary ?? '';
    },

    /**
     * Update summary for a chapter (keeps completion status)
     * @param {string} week - Week identifier
     * @param {string} day - Day reading reference
     * @param {string} chapter - Chapter label
     * @param {string} summary - Updated summary text
     */
    updateSummary(week, day, chapter, summary) {
      update(data => {
        const key = createReadingKey(week, day, chapter);
        if (data.readings[key]) {
          data.readings[key].summary = summary;
          saveProgress(data);
        }
        return data;
      });
    },

    /**
     * Get all summaries for a week
     * @param {string} week - Week identifier
     * @returns {Array<ReadingProgress>}
     */
    getWeekSummaries(week) {
      const data = loadProgress();
      const weekDays = readingPlan[week] || [];

      return Object.values(data.readings)
        .filter(reading => reading.week === week && reading.completed)
        .sort((a, b) => {
          // Sort by day using readingPlan order
          if (a.day !== b.day) {
            const indexA = weekDays.indexOf(a.day);
            const indexB = weekDays.indexOf(b.day);
            
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1; // A is valid, B is not -> A comes first
            if (indexB !== -1) return 1;  // B is valid, A is not -> B comes first
            return a.day.localeCompare(b.day);
          }

          // Sort by chapter number
          const numA = parseInt(a.chapter) || 0;
          const numB = parseInt(b.chapter) || 0;
          return numA - numB;
        });
    },

    /**
     * Get weekly progress summary (counts completed chapters)
     * @param {string} week - Week identifier
     * @returns {{ completed: number }}
     */
    getWeekProgress(week) {
      const data = loadProgress();
      const completed = Object.values(data.readings).filter(
        reading => reading.week === week && reading.completed
      ).length;

      return { completed };
    },

    /**
     * Get overall progress across all weeks (counts completed chapters)
     * @returns {{ completed: number }}
     */
    getOverallProgress() {
      const data = loadProgress();
      const completed = Object.values(data.readings).filter(
        reading => reading.completed
      ).length;

      return { completed };
    },

    /**
     * Save last reading position and preferences
     * @param {string} week - Week identifier
     * @param {string} day - Day reading reference
     * @param {boolean} esvEnabled - ESV toggle state
     */
    saveLastPosition(week, day, esvEnabled = false) {
      update(data => {
        data.lastWeek = week;
        data.lastDay = day;
        data.esvEnabled = esvEnabled;
        saveProgress(data);
        return data;
      });
    },

    /**
     * Get last reading position and preferences
     * @returns {{ week: string, day: string, esvEnabled: boolean }}
     */
    getLastPosition() {
      const data = loadProgress();
      return {
        week: data.lastWeek || 'Week 1',
        day: data.lastDay || '',
        esvEnabled: data.esvEnabled ?? false,
      };
    },

    /**
     * Reset all progress
     * @returns {boolean} - True if confirmed and reset
     */
    reset() {
      if (!browser) return false;

      const confirmed = confirm(
        '모든 읽기 진행 상황을 초기화하시겠습니까?\n\nReset all reading progress? This cannot be undone.'
      );

      if (confirmed) {
        const fresh = createDefaultProgress();
        set(fresh);
        saveProgress(fresh);
        return true;
      }
      return false;
    },

    /**
     * Export progress data as JSON
     * @returns {string} - JSON string of progress data
     */
    export() {
      const data = loadProgress();
      return JSON.stringify(data, null, 2);
    },

    /**
     * Import progress data from JSON
     * @param {string} jsonString - JSON string to import
     */
    import(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (data.version !== STORAGE_VERSION) {
          throw new Error('Version mismatch');
        }
        set(data);
        saveProgress(data);
        return true;
      } catch (error) {
        console.error('Import failed:', error);
        alert('Import failed. Invalid data format.');
        return false;
      }
    },
  };
}

export const progressStore = createProgressStore();
