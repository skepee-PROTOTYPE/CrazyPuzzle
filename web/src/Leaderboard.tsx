import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import styles from './Leaderboard.module.scss';

interface LeaderboardProps {
  difficulty: string;
  layout: string;
  score: number;
  timer: number;
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

function Leaderboard({ difficulty, layout, score, timer }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        console.log('Fetching leaderboard for:', { difficulty, layout });
        
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
        
        console.log('Leaderboard fetched:', scores);
        setLeaderboard(scores);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        // Fallback: get all scores and sort client-side
        try {
          const allScoresRef = collection(db, 'scores');
          const simpleQuery = query(allScoresRef, limit(50));
          const snapshot = await getDocs(simpleQuery);
          
          const allScores = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Score))
            .filter(score => score.difficulty === difficulty && score.layout === layout)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
            
          setLeaderboard(allScores);
        } catch (fallbackError) {
          console.error('Fallback query failed:', fallbackError);
          setLeaderboard([]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [difficulty, layout, score, timer]);

  if (loading) {
    return (
      <div className={styles.leaderboardCard}>
        <h3 className={styles.leaderboardTitle}>Leaderboard</h3>
        <div className={styles.noScores}>Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className={styles.leaderboardCard}>
      <h3 className={styles.leaderboardTitle}>
        Leaderboard - {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ({layout})
      </h3>
      
      {leaderboard.length > 0 ? (
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
                <td>{entry.userName}</td>
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