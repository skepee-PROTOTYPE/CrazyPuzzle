import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import AdBanner from './AdBanner';

function Leaderboard({ score, timer, difficulty, layout }) {
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const q = query(
          collection(db, 'scores'),
          orderBy('score', 'desc'),
          orderBy('time', 'asc'),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        const scores = querySnapshot.docs.map(doc => doc.data());
        setLeaderboard(scores);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    };
    fetchLeaderboard();
  }, [score, timer, difficulty, layout]);

  return (
    <div className="leaderboard-card">
      <AdBanner />
      <h2 className="leaderboard-title">CrazyPuzzle Leaderboard</h2>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Score</th>
            <th>Time (s)</th>
            <th>Difficulty</th>
            <th>Layout</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.length === 0 ? (
            <tr><td colSpan={5} className="no-scores">No scores yet.</td></tr>
          ) : (
            leaderboard.map((entry, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{entry.score}</td>
                <td>{entry.time}</td>
                <td>{entry.difficulty}</td>
                <td>{entry.layout}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard;