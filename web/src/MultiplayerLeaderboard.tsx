import React, { useEffect, useState } from 'react';
import { realtimeDb } from './firebase';
import { ref, onValue } from 'firebase/database';
import styles from './Leaderboard.module.scss';

interface LeaderboardEntry {
  userId: string;
  points: number;
}

function MultiplayerLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const statsRef = ref(realtimeDb, 'userStats');
    
    const unsubscribe = onValue(statsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const entries: LeaderboardEntry[] = Object.entries(data)
          .map(([userId, stats]: [string, any]) => ({
            userId,
            points: stats.multiplayerPoints || 0
          }))
          .sort((a, b) => b.points - a.points)
          .slice(0, 10);
        setLeaderboard(entries);
      } else {
        setLeaderboard([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className={styles.leaderboardCard}>
        <h3 className={styles.leaderboardTitle}>🏆 Multiplayer Leaderboard</h3>
        <div className={styles.noScores}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.leaderboardCard}>
      <h3 className={styles.leaderboardTitle}>🏆 Multiplayer Leaderboard</h3>
      {leaderboard.length === 0 ? (
        <div className={styles.noScores}>No multiplayer games played yet</div>
      ) : (
        <div className={styles.scoresList}>
          {leaderboard.map((entry, index) => (
            <div key={entry.userId} className={styles.scoreItem}>
              <span className={styles.rank}>#{index + 1}</span>
              <span className={styles.playerName}>Player {entry.userId.slice(0, 8)}</span>
              <span className={styles.score}>{entry.points} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MultiplayerLeaderboard;
