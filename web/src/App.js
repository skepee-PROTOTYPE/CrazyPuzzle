import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { auth, provider, signInWithPopup, signOut } from './auth';
import { db } from './firebase';
import { collection, addDoc, Timestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import './App.css';
import AdBanner from './AdBanner';

function App() {
  const [user, setUser] = useState(null);
  const [difficulty, setDifficulty] = useState('easy');
  const [layout, setLayout] = useState('grid');
  const [tiles, setTiles] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(u => setUser(u));
    return () => unsubscribe();
  }, []);

  // Login handler
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      alert('Logout failed: ' + error.message);
    }
  };

  // Grid size based on difficulty
  const gridSizes = { easy: 4, medium: 6, hard: 8 };
  const gridSize = gridSizes[difficulty];

  // Animal images for kids (easy)
  const animalImages = useMemo(() => [
    'https://cdn-icons-png.flaticon.com/512/616/616408.png', // Cat
    'https://cdn-icons-png.flaticon.com/512/616/616430.png', // Dog
    'https://cdn-icons-png.flaticon.com/512/616/616415.png', // Lion
    'https://cdn-icons-png.flaticon.com/512/616/616426.png', // Elephant
    'https://cdn-icons-png.flaticon.com/512/616/616418.png', // Monkey
    'https://cdn-icons-png.flaticon.com/512/616/616420.png', // Rabbit
    'https://cdn-icons-png.flaticon.com/512/616/616424.png', // Bear
    'https://cdn-icons-png.flaticon.com/512/616/616422.png', // Fox
  ], []);

  // Generate tiles (images for kids, numbers for adults)
  const generateTiles = useCallback(() => {
    const totalTiles = gridSize * gridSize;
    let values = [];
    if (difficulty === 'easy') {
      // Use unique animal images for each pair, minimize duplication
      let pairsNeeded = totalTiles / 2;
      let selectedImages = [];
      // If not enough images, repeat after all are used
      for (let i = 0; i < pairsNeeded; i++) {
        selectedImages.push(animalImages[i % animalImages.length]);
      }
      selectedImages.forEach(img => {
        values.push(img, img);
      });
    } else {
      // Use numbers for adults
      for (let i = 1; i <= totalTiles / 2; i++) {
        values.push(i, i);
      }
    }
    // Shuffle
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
  }, [difficulty, gridSize, animalImages]);

  // Reset board when difficulty/layout changes
  useEffect(() => {
    setTiles(generateTiles());
    setFlipped([]);
    setMatched([]);
    setScore(0);
    setTimer(0);
    setIsActive(true);
  }, [difficulty, layout, generateTiles]);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (isActive && matched.length < tiles.length) {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    } else if (!isActive || matched.length === tiles.length) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, matched, tiles.length]);

  // Save score to Firestore when puzzle is completed
  useEffect(() => {
    if (matched.length === tiles.length && matched.length > 0 && user) {
      const saveScore = async () => {
        try {
          await addDoc(collection(db, 'scores'), {
            score,
            time: timer,
            difficulty,
            layout,
            userId: user.uid,
            userName: user.displayName,
            createdAt: Timestamp.now()
          });
        } catch (error) {
          console.error('Error saving score:', error);
        }
      };
      saveScore();
    }
  }, [matched, tiles.length, score, timer, difficulty, layout, user]);

  // Fetch leaderboard from Firestore
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
  }, [matched]);

  // Handle tile click
  const handleTileClick = idx => {
    if (flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return;
    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);
    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      if (tiles[first] === tiles[second]) {
        setTimeout(() => {
          setMatched([...matched, first, second]);
          setFlipped([]);
          setScore(s => s + 10); // Increase score for a match
        }, 700);
      } else {
        setTimeout(() => setFlipped([]), 700);
      }
    }
  };

  // Render grid
  const renderGrid = () => (
    <div className="puzzle-grid">
      {tiles.map((val, idx) => (
        <div
          key={idx}
          onClick={() => handleTileClick(idx)}
          className={`tile${flipped.includes(idx) || matched.includes(idx) ? ' flipped' : ''}`}
        >
          {(matched.includes(idx) || flipped.includes(idx)) ? (
            difficulty === 'easy' ? (
              <img src={val} alt="animal" className="tile-img" />
            ) : (
              val
            )
          ) : '?'}
        </div>
      ))}
    </div>
  );

  return (
    <div className="app-bg">
      <header className="app-header">
        <h1 className="app-title">Puzzle Game</h1>
        <AdBanner />
        <div className="controls-row">
          <div className="card sign-in-card">
            <h3 className="card-title">Sign In</h3>
            {!user ? (
              <button onClick={handleLogin} className="btn sign-in-btn">
                Sign in with Google
              </button>
            ) : (
              <div className="user-info">
                <img src={user.photoURL} alt="profile" className="user-avatar" />
                <span className="user-name">{user.displayName}</span>
                <button onClick={handleLogout} className="btn logout-btn">
                  Logout
                </button>
              </div>
            )}
          </div>
          <div className="card difficulty-card">
            <h3 className="card-title">Difficulty</h3>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="select">
              <option value="easy">Kids - Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Adults - Hard</option>
            </select>
          </div>
          <div className="card layout-card">
            <h3 className="card-title">Layout</h3>
            <select value={layout} onChange={e => setLayout(e.target.value)} className="select">
              <option value="grid">Grid</option>
              <option value="hex">Hexagonal</option>
            </select>
          </div>
        </div>
        <div className="score-row">
          <div className="score-box">Score: {score}</div>
          <div className="score-box">Time: {timer}s</div>
        </div>
        <div className="board-card">
          <h2 className="board-title">Puzzle Board</h2>
          {layout === 'grid' ? renderGrid() : <p>Other layouts coming soon!</p>}
          {matched.length === tiles.length && (
            <div className="congrats-msg">
              🎉 Congratulations! You completed the puzzle.<br />Final Score: {score} | Time: {timer}s
            </div>
          )}
        </div>
        <div className="leaderboard-card">
          <AdBanner />
          <h2 className="leaderboard-title">Leaderboard</h2>
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
        <AdBanner />
      </header>
    </div>
  );
}

export default App;

