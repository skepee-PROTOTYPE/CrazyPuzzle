/**
 * Firebase Data Cleanup Script
 * Removes duplicate entries from Firestore and Realtime Database
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { getDatabase, ref, get, remove } from 'firebase/database';

// Firebase config - replace with your actual config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);

interface ScoreEntry {
  id: string;
  userName: string;
  userId: string;
  score: number;
  time: number;
  difficulty: string;
  layout: string;
  createdAt: any;
}

async function cleanDuplicateScores() {
  console.log('🔍 Checking for duplicate scores in Firestore...');
  
  const scoresRef = collection(db, 'scores');
  const q = query(scoresRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  const scores: ScoreEntry[] = [];
  snapshot.forEach(doc => {
    scores.push({
      id: doc.id,
      ...doc.data()
    } as ScoreEntry);
  });

  console.log(`📊 Total scores found: ${scores.length}`);

  // Group by userId + difficulty + layout + score + time to find exact duplicates
  const scoreMap = new Map<string, ScoreEntry[]>();
  
  scores.forEach(score => {
    const key = `${score.userId}_${score.difficulty}_${score.layout}_${score.score}_${score.time}`;
    if (!scoreMap.has(key)) {
      scoreMap.set(key, []);
    }
    scoreMap.get(key)!.push(score);
  });

  // Find duplicates
  let duplicateCount = 0;
  const toDelete: string[] = [];

  scoreMap.forEach((entries, key) => {
    if (entries.length > 1) {
      console.log(`\n🔄 Found ${entries.length} duplicates for: ${key}`);
      // Keep the most recent one, delete the rest
      entries.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      
      // Add all except the first (most recent) to delete list
      for (let i = 1; i < entries.length; i++) {
        toDelete.push(entries[i].id);
        duplicateCount++;
        console.log(`  ❌ Marking for deletion: ${entries[i].id} (${new Date(entries[i].createdAt?.seconds * 1000 || 0).toLocaleString()})`);
      }
      console.log(`  ✅ Keeping: ${entries[0].id} (${new Date(entries[0].createdAt?.seconds * 1000 || 0).toLocaleString()})`);
    }
  });

  if (toDelete.length === 0) {
    console.log('\n✨ No duplicates found! Database is clean.');
    return;
  }

  console.log(`\n⚠️  Found ${duplicateCount} duplicate entries to delete.`);
  console.log('🗑️  Deleting duplicates...');

  // Delete duplicates
  for (const id of toDelete) {
    await deleteDoc(doc(db, 'scores', id));
    console.log(`  ✅ Deleted: ${id}`);
  }

  console.log(`\n✅ Cleanup complete! Deleted ${duplicateCount} duplicate scores.`);
}

async function cleanOldRooms() {
  console.log('\n🔍 Checking for old/stale multiplayer rooms...');
  
  const roomsRef = ref(realtimeDb, 'rooms');
  const snapshot = await get(roomsRef);
  
  if (!snapshot.exists()) {
    console.log('📭 No rooms found.');
    return;
  }

  const rooms = snapshot.val();
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  for (const [roomId, room] of Object.entries(rooms as any)) {
    const createdAt = room.createdAt || 0;
    const age = now - createdAt;

    // Delete rooms older than 1 day
    if (age > ONE_DAY) {
      console.log(`  🗑️  Deleting old room: ${roomId} (${Math.floor(age / ONE_DAY)} days old)`);
      await remove(ref(realtimeDb, `rooms/${roomId}`));
      deletedCount++;
    }
  }

  if (deletedCount === 0) {
    console.log('✨ No old rooms to clean.');
  } else {
    console.log(`✅ Deleted ${deletedCount} old rooms.`);
  }
}

async function cleanEmptyUserStats() {
  console.log('\n🔍 Checking for empty user stats...');
  
  const statsRef = ref(realtimeDb, 'userStats');
  const snapshot = await get(statsRef);
  
  if (!snapshot.exists()) {
    console.log('📭 No user stats found.');
    return;
  }

  const stats = snapshot.val();
  let deletedCount = 0;

  for (const [userId, userStats] of Object.entries(stats as any)) {
    const singlePlayerPoints = userStats.singlePlayerPoints || 0;
    const multiplayerPoints = userStats.multiplayerPoints || 0;
    const multiplayerGamesPlayed = userStats.multiplayerGamesPlayed || 0;

    // Delete user stats with no activity
    if (singlePlayerPoints === 0 && multiplayerPoints === 0 && multiplayerGamesPlayed === 0) {
      console.log(`  🗑️  Deleting empty stats for: ${userId} (${userStats.displayName || 'Unknown'})`);
      await remove(ref(realtimeDb, `userStats/${userId}`));
      deletedCount++;
    }
  }

  if (deletedCount === 0) {
    console.log('✨ No empty user stats to clean.');
  } else {
    console.log(`✅ Deleted ${deletedCount} empty user stat entries.`);
  }
}

async function showStats() {
  console.log('\n📊 Database Statistics:');
  
  // Firestore scores
  const scoresSnapshot = await getDocs(collection(db, 'scores'));
  console.log(`  Scores (Firestore): ${scoresSnapshot.size}`);
  
  // Realtime DB rooms
  const roomsSnapshot = await get(ref(realtimeDb, 'rooms'));
  const roomsCount = roomsSnapshot.exists() ? Object.keys(roomsSnapshot.val()).length : 0;
  console.log(`  Rooms (Realtime DB): ${roomsCount}`);
  
  // Realtime DB user stats
  const statsSnapshot = await get(ref(realtimeDb, 'userStats'));
  const statsCount = statsSnapshot.exists() ? Object.keys(statsSnapshot.val()).length : 0;
  console.log(`  User Stats (Realtime DB): ${statsCount}`);
}

async function main() {
  console.log('🚀 Firebase Data Cleanup Tool\n');
  console.log('================================\n');

  try {
    // Show initial stats
    await showStats();

    // Run cleanup operations
    await cleanDuplicateScores();
    await cleanOldRooms();
    await cleanEmptyUserStats();

    // Show final stats
    console.log('\n================================\n');
    await showStats();

    console.log('\n✅ All cleanup operations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
main();
