/**
 * 12-week Bible reading plan for the Life of Word program.
 * Each week has 5 daily readings (Monday–Friday).
 * Values are ESV-compatible Bible references.
 */
export const readingPlan = {
  "Week 1": [
    "Genesis 1-10",
    "Genesis 11-20",
    "Genesis 21-30",
    "Genesis 31-40",
    "Genesis 41-50",
  ],
  "Week 2": [
    "Exodus 1-5",
    "Exodus 6-10",
    "Exodus 11-15",
    "Exodus 16-20",
    "Exodus 32-34",
  ],
  "Week 3": [
    "Numbers 11-14",
    "Numbers 16-17",
    "Numbers 20-25",
    "Deuteronomy 1-3",
    "Deuteronomy 29-34",
  ],
  "Week 4": [
    "Joshua 1-3",
    "Joshua 4-6",
    "Joshua 7-9",
    "Joshua 10-11",
    "Joshua 23-24",
  ],
  "Week 5": [
    "Judges 1-5",
    "Judges 6-10",
    "Judges 11-15",
    "Judges 16-21",
    "Ruth 1-4",
  ],
  "Week 6": [
    "1 Samuel 1-6",
    "1 Samuel 7-12",
    "1 Samuel 13-18",
    "1 Samuel 19-24",
    "1 Samuel 25-31",
  ],
  "Week 7": [
    "2 Samuel 1-5",
    "2 Samuel 6-10",
    "2 Samuel 11-15",
    "2 Samuel 16-20",
    "2 Samuel 21-24",
  ],
  "Week 8": [
    "1 Kings 1-5",
    "1 Kings 6-10",
    "1 Kings 11-15",
    "1 Kings 16-20",
    "1 Kings 21-22",
  ],
  "Week 9": [
    "2 Kings 1-5",
    "2 Kings 6-10",
    "2 Kings 11-15",
    "2 Kings 16-20",
    "2 Kings 21-25",
  ],
  "Week 10": [
    "Ezra 1-5",
    "Ezra 6-10",
    "Nehemiah 1-6",
    "Nehemiah 7-13",
    "Esther 1-10",
  ],
  "Week 11": [
    "Matthew 1-6",
    "Matthew 7-12",
    "Matthew 13-18",
    "Matthew 19-24",
    "Matthew 25-28",
  ],
  "Week 12": [
    "Acts 1-5",
    "Acts 6-10",
    "Acts 11-16",
    "Acts 17-22",
    "Acts 23-28",
  ],
};

/** Ordered list of week keys */
export const weeks = Object.keys(readingPlan);

/** Get the day readings for a given week */
export function getDays(week) {
  return readingPlan[week] || [];
}
