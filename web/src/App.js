import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { auth, provider, signInWithPopup, signOut } from './auth';
import { db } from './firebase';
import { collection, addDoc, Timestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import './App.css';

// function AdBanner() {
//   const adRef = useRef(null);
//   useEffect(() => {
//     if (window.adsbygoogle && adRef.current) {
//       window.adsbygoogle.push({});
//     }
//   }, []);
//   return (
//     <ins className="adsbygoogle"
//       style={{ display: 'block' }}
//       data-ad-client="ca-pub-1917839501702299"
//       data-ad-slot="8369048135"
//       data-ad-format="auto"
//       data-full-width-responsive="true"
//       ref={adRef}></ins>
//   );
// }

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
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${gridSize}, 60px)`,
      gap: '10px',
      justifyContent: 'center',
      marginTop: '20px'
    }}>
      {tiles.map((val, idx) => (
        <div
          key={idx}
          onClick={() => handleTileClick(idx)}
          style={{
            width: 60,
            height: 60,
            background: matched.includes(idx) || flipped.includes(idx) ? '#4caf50' : '#eee',
            color: matched.includes(idx) || flipped.includes(idx) ? '#fff' : '#eee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            borderRadius: 8,
            cursor: 'pointer',
            border: '2px solid #ccc',
            userSelect: 'none',
            overflow: 'hidden'
          }}
        >
          {(matched.includes(idx) || flipped.includes(idx)) ? (
            difficulty === 'easy' ? (
              <img src={val} alt="animal" style={{ width: '40px', height: '40px' }} />
            ) : (
              val
            )
          ) : '?'}
        </div>
      ))}
    </div>
  );

  function AdBanner() {
    const adRef = useRef(null);

    useEffect(() => {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({});
      }
    }, []);

    return (
      <ins className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-1917839501702299"
        data-ad-slot="8369048135"
        data-ad-format="auto"
        data-full-width-responsive="true"
        ref={adRef}></ins>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Puzzle Game</h1>
        {!user ? (
          <div style={{ margin: '20px 0' }}>
            <button onClick={handleLogin} style={{ fontSize: '1em', padding: '10px 20px', borderRadius: '8px', background: '#2196f3', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Sign in with Google to play
            </button>
          </div>
        ) : (
          <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img src={user.photoURL} alt="profile" style={{ width: 40, height: 40, borderRadius: '50%' }} />
            <span>Welcome, {user.displayName}</span>
            <button onClick={handleLogout} style={{ fontSize: '1em', padding: '6px 16px', borderRadius: '8px', background: '#f44336', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        )}
        <p>Choose your difficulty and layout to start playing.</p>
        <div style={{ margin: '20px 0' }}>
          <label>
            Difficulty:
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option value="easy">Kids - Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Adults - Hard</option>
            </select>
          </label>
        </div>
        <div style={{ margin: '20px 0' }}>
          <label>
            Layout:
            <select value={layout} onChange={e => setLayout(e.target.value)}>
              <option value="grid">Grid</option>
              <option value="jigsaw">Jigsaw</option>
              <option value="custom">Custom</option>
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '20px' }}>
          <div style={{ fontSize: '1.2em' }}>Score: {score}</div>
          <div style={{ fontSize: '1.2em' }}>Time: {timer}s</div>
        </div>
        <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', background: '#fff', color: '#333' }}>
          <h2>Puzzle Board</h2>
          {layout === 'grid' ? renderGrid() : <p>Other layouts coming soon!</p>}
          {matched.length === tiles.length && (
            <div style={{ marginTop: '20px', color: '#4caf50', fontWeight: 'bold' }}>
              🎉 Congratulations! You completed the puzzle.<br />Final Score: {score} | Time: {timer}s
            </div>
          )}
        </div>
        <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #2196f3', borderRadius: '8px', background: '#f5faff', color: '#333' }}>
          <AdBanner />
          <h2>Leaderboard</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#e3f2fd' }}>
                <th style={{ padding: '8px', border: '1px solid #2196f3' }}>Rank</th>
                <th style={{ padding: '8px', border: '1px solid #2196f3' }}>Score</th>
                <th style={{ padding: '8px', border: '1px solid #2196f3' }}>Time (s)</th>
                <th style={{ padding: '8px', border: '1px solid #2196f3' }}>Difficulty</th>
                <th style={{ padding: '8px', border: '1px solid #2196f3' }}>Layout</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '12px' }}>No scores yet.</td></tr>
              ) : (
                leaderboard.map((entry, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '8px', border: '1px solid #2196f3' }}>{idx + 1}</td>
                    <td style={{ padding: '8px', border: '1px solid #2196f3' }}>{entry.score}</td>
                    <td style={{ padding: '8px', border: '1px solid #2196f3' }}>{entry.time}</td>
                    <td style={{ padding: '8px', border: '1px solid #2196f3' }}>{entry.difficulty}</td>
                    <td style={{ padding: '8px', border: '1px solid #2196f3' }}>{entry.layout}</td>
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
