# Progress Tracking Feature

## Overview

The Life of Word app now includes localStorage-based progress tracking to help users monitor their Bible reading journey across the 12-week program.

## Features

### 1. **Visual Progress Indicators**
- ✅ Checkmarks appear next to completed readings in dropdown menus
- Progress counts shown in week selector (e.g., "1주 (3/5)")
- Overall progress bar at top of page

### 2. **Mark as Complete**
- Button to mark current reading as completed
- Toggle functionality (can mark/unmark)
- Green checkmark icon indicates completion

### 3. **Weekly Progress Summary**
- See completion status for each week
- Track which days you've finished
- Visual indicators in selection dropdowns

### 4. **Overall Progress**
- Total completion percentage across all 12 weeks
- Shows completed/total readings (e.g., "12/60 (20%)")
- Gradient progress bar

### 5. **Reset Functionality**
- Reset button to clear all progress
- Confirmation dialog before resetting
- Useful for starting over or testing

## Technical Implementation

### Storage
- **Method**: Browser localStorage
- **Key**: `lifeOfWord_progress`
- **Size**: ~1-5KB (very small)
- **Persistence**: Indefinite (until manually cleared)

### Data Structure
```json
{
  "version": 1,
  "readings": {
    "Week 1|Genesis 1-10": {
      "completed": true,
      "completedAt": "2026-02-10T10:30:00.000Z",
      "week": "Week 1",
      "day": "Genesis 1-10"
    }
  },
  "lastUpdated": "2026-02-10T10:30:00.000Z"
}
```

### Files Added/Modified

**New Files:**
- `src/lib/stores/progressStore.js` - Progress tracking store with localStorage sync

**Modified Files:**
- `src/lib/components/WeekDaySelector.svelte` - Added checkmarks and progress counts
- `src/routes/+page.svelte` - Added progress bar and completion button

## Usage

### For Users

1. **Track Progress**: After reading a passage, click "완료 표시" (Mark Complete)
2. **View Progress**: See checkmarks (✓) next to completed readings in dropdowns
3. **Monitor Overall Progress**: Check the progress bar at the top
4. **Reset**: Click "초기화" (Reset) button to start over

### For Developers

#### Access Progress Store
```javascript
import { progressStore } from '$lib/stores/progressStore.js';

// Mark reading as complete
progressStore.markComplete('Week 1', 'Genesis 1-10');

// Check if completed
const isCompleted = progressStore.isCompleted('Week 1', 'Genesis 1-10');

// Get weekly progress
const weekProgress = progressStore.getWeekProgress('Week 1', days);
// Returns: { completed: 3, total: 5, percentage: 60 }

// Get overall progress
const overallProgress = progressStore.getOverallProgress(readingPlan);
// Returns: { completed: 12, total: 60, percentage: 20 }

// Toggle completion
progressStore.toggle('Week 1', 'Genesis 1-10');

// Reset all progress
progressStore.reset();

// Export/Import (for backup/restore)
const json = progressStore.export();
progressStore.import(json);
```

## Data Persistence

### How Long Does Data Last?
- **Forever** (until manually deleted)
- Survives browser restarts
- Survives computer restarts
- **Does NOT sync** across devices (localStorage is per-browser)

### When Data Gets Cleared
1. User clears browser data
2. User clicks "초기화" (Reset) button
3. Storage quota exceeded (~10MB limit, very unlikely)
4. Private/Incognito mode (cleared when window closes)

### Manual Cleanup (Users)
**Via Browser DevTools:**
1. Press F12 to open DevTools
2. Go to Application/Storage tab
3. Find Local Storage → your domain
4. Right-click → Clear

**Via Browser Settings:**
- Chrome: Settings → Privacy → Clear browsing data → Cookies and site data
- Firefox: Settings → Privacy → Clear Data → Cookies and Site Data

## Future Enhancements

Potential improvements:
- [ ] Export progress as JSON file (backup)
- [ ] Import progress from file (restore)
- [ ] Cloud sync (requires backend + auth)
- [ ] Reading streaks ("5 days in a row!")
- [ ] Reading history/calendar view
- [ ] Reading time estimates
- [ ] Notifications/reminders

## Troubleshooting

### Progress Not Saving
1. Check if browser allows localStorage (some privacy modes block it)
2. Check browser console for errors
3. Verify storage quota not exceeded

### Progress Lost
- If user cleared browser data, progress cannot be recovered
- Consider implementing export/import for backup

### Cross-Device Sync
- localStorage is per-browser, not cloud-synced
- For cross-device sync, need backend database + user accounts
- Alternative: Use export/import to manually transfer data

## Browser Compatibility

✅ **Supported:**
- Chrome/Edge 4+
- Firefox 3.5+
- Safari 4+
- All modern mobile browsers

✅ **Storage Limits:**
- Chrome: ~10MB
- Firefox: ~10MB
- Safari: ~5MB
- More than enough for reading progress (~1-5KB)

## Security & Privacy

- Data stored **locally only** (never sent to server)
- No personal information collected
- No tracking or analytics
- Users can clear data anytime
- GDPR/Privacy compliant (local-only storage)
