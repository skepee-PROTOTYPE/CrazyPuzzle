import React, { useEffect, useState } from 'react';
import { db, realtimeDb } from './firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import styles from './Leaderboard.module.scss';

interface LeaderboardProps {
  mode?: 'singleplayer' | 'multiplayer';
  difficulty?: string;
  layout?: string;
  score?: number;
  timer?: number;
}

interface Score {
  id: string;
  userName: string;
  score: number;
  time: number;
  difficulty: string;
  layout: string;
  createdAt: any;
}

interface MultiplayerEntry {
  userId: string;
  displayName: string;
  points: number;
  wins: number;
  gamesPlayed: number;
  winRate: number;
}

function Leaderboard({ mode = 'singleplayer', difficulty = 'easy', layout = 'grid', score = 0, timer = 0 }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<Score[]>([]);
  const [multiplayerLeaderboard, setMultiplayerLeaderboard] = useState<MultiplayerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Singleplayer leaderboard effect
  useEffect(() => {
    if (mode !== 'singleplayer') return;

    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Only try the complex query for grid layout (which works)
        if (layout === 'grid') {
          const scoresRef = collection(db, 'scores');
          const q = query(
            scoresRef,
            where('difficulty', '==', difficulty),
            where('layout', '==', layout),
            orderBy('score', 'desc'),
            limit(10)
          );
          
          const querySnapshot = await getDocs(q);
          const scores = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Score[];
          
          setLeaderboard(scores);
        } else {
          // For non-grid layouts, show empty leaderboard since they're not implemented
          setLeaderboard([]);
        }
        
      } catch (error: any) {
        setError('Unable to load leaderboard. This may be due to missing database indexes.');
        
        // Fallback: try to get some scores without complex filtering
        try {
          const scoresRef = collection(db, 'scores');
          const simpleQuery = query(scoresRef, limit(5));
          const snapshot = await getDocs(simpleQuery);
          
          const allScores = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Score))
            .filter(scoreItem => scoreItem.difficulty === difficulty && scoreItem.layout === layout)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
            
          setLeaderboard(allScores);
          setError(''); // Clear error if fallback works
        } catch (fallbackError) {
          setLeaderboard([]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [mode, difficulty, layout, score, timer]);

  // Multiplayer leaderboard effect
  useEffect(() => {
    if (mode !== 'multiplayer') return;

    setLoading(true);
    const statsRef = ref(realtimeDb, 'userStats');
    
    const unsubscribe = onValue(statsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const entries: MultiplayerEntry[] = Object.entries(data)
          .map(([userId, stats]: [string, any]) => {
            const gamesPlayed = stats.multiplayerGamesPlayed || 0;
            const wins = stats.multiplayerWins || 0;
            const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
            
            return {
              userId,
              displayName: stats.displayName || `Player ${userId.slice(0, 8)}`,
              points: stats.multiplayerPoints || 0,
              wins: wins,
              gamesPlayed: gamesPlayed,
              winRate: winRate
            };
          })
          .filter(entry => entry.gamesPlayed > 0) // Only show players who have played
          .sort((a, b) => b.points - a.points)
          .slice(0, 10);
        setMultiplayerLeaderboard(entries);
      } else {
        setMultiplayerLeaderboard([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [mode]);

  if (loading) {
    return (
      <div className={styles.leaderboardCard}>
        <h3 className={styles.leaderboardTitle}>
          {mode === 'multiplayer' ? '🏆 Multiplayer Leaderboard' : 'Leaderboard'}
        </h3>
        <div className={styles.noScores}>Loading{mode === 'multiplayer' ? '...' : ' leaderboard...'}</div>
      </div>
    );
  }

  // Render multiplayer leaderboard
  if (mode === 'multiplayer') {
    return (
      <div className={styles.leaderboardCard}>
        <h3 className={styles.leaderboardTitle}>🏆 Multiplayer Leaderboard</h3>
        {multiplayerLeaderboard.length === 0 ? (
          <div className={styles.noScores}>No multiplayer games played yet</div>
        ) : (
          <div className={styles.scoresList}>
            {multiplayerLeaderboard.map((entry, index) => (
              <div key={entry.userId} className={styles.scoreItem}>
                <span className={styles.rank}>#{index + 1}</span>
                <div className={styles.playerInfo}>
                  <span className={styles.playerName}>{entry.displayName}</span>
                  <div className={styles.playerStats}>
                    <span className={styles.statBadge}>
                      🏆 {entry.wins}W/{entry.gamesPlayed}G
                    </span>
                    <span className={styles.statBadge}>
                      📊 {entry.winRate}%
                    </span>
                  </div>
                </div>
                <span className={styles.score}>{entry.points} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render singleplayer leaderboard
  return (
    <div className={styles.leaderboardCard}>
      <h3 className={styles.leaderboardTitle}>
        Leaderboard - {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ({layout})
      </h3>
      
      {error && (
        <div style={{ 
          background: '#fff3cd', 
          color: '#856404', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '15px',
          fontSize: '0.9rem'
        }}>
          ⚠️ {error}
        </div>
      )}
      
      {layout !== 'grid' ? (
        <div className={styles.noScores}>
          Leaderboard will be available when <strong>{layout}</strong> layout is implemented.
        </div>
      ) : leaderboard.length > 0 ? (
        <table className={styles.leaderboardTable}>
          <thead>
            <tr>
              <th className={styles.rank}>Rank</th>
              <th>Player</th>
              <th>Time</th>
              <th className={styles.score}>Score</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, index) => (
              <tr key={entry.id}>
                <td className={styles.rank}>{index + 1}</td>
                <td>{entry.userName.split(' ')[0]}</td>
                <td>{entry.time}s</td>
                <td className={styles.score}>{entry.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={styles.noScores}>
          No scores yet for this difficulty and layout. Be the first to play!
        </div>
      )}
    </div>
  );
}

export default Leaderboard;