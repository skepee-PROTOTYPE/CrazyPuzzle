# Firebase Data Cleanup Script

This script cleans up duplicate and stale data from your Firebase databases.

## What it does:

### 1. **Removes Duplicate Scores** (Firestore)
- Finds exact duplicate scores (same user, difficulty, layout, score, and time)
- Keeps the most recent entry
- Deletes older duplicates

### 2. **Removes Old Multiplayer Rooms** (Realtime Database)
- Deletes rooms older than 24 hours
- Prevents database bloat from abandoned games

### 3. **Removes Empty User Stats** (Realtime Database)
- Deletes user stat entries with no activity
- Cleans up test accounts or inactive users

## Usage:

```bash
# From the web directory
npm run clean-db
```

## What you'll see:

```
🚀 Firebase Data Cleanup Tool

================================

📊 Database Statistics:
  Scores (Firestore): 45
  Rooms (Realtime DB): 3
  User Stats (Realtime DB): 12

🔍 Checking for duplicate scores in Firestore...
📊 Total scores found: 45

🔄 Found 3 duplicates for: abc123_easy_grid_1000_30
  ❌ Marking for deletion: xyz789 (1/25/2026, 10:30:00 AM)
  ❌ Marking for deletion: def456 (1/24/2026, 3:15:00 PM)
  ✅ Keeping: ghi012 (1/26/2026, 2:45:00 PM)

✅ Cleanup complete! Deleted 2 duplicate scores.

...
```

## Safety Features:

- Shows what will be deleted before deleting
- Keeps the most recent entries
- Only deletes exact duplicates
- Shows before/after statistics

## Requirements:

- Node.js
- Firebase configuration in `.env` file
- Appropriate Firebase permissions

## Notes:

- Run this periodically to keep your database clean
- Review the output before running in production
- Can be added to a scheduled job for automatic cleanup
