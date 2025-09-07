import React, { useState, useEffect } from 'react';
import { auth, provider, signInWithPopup, signOut } from './auth';
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import './App.module.scss';
import AdBanner from './AdBanner';
import PuzzleBoard from './PuzzleBoard';
import Leaderboard from './Leaderboard';

function App() {
  const [user, setUser] = useState<import('firebase/auth').User | null>(null);
  const [difficulty, setDifficulty] = useState('easy');
  const [layout, setLayout] = useState('grid');
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(u => setUser(u));
    return () => unsubscribe();
  }, []);

  // Login handler
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      alert('Login failed: ' + msg);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      alert('Logout failed: ' + msg);
    }
  };

  // Save score to Firestore when puzzle is completed
  const handleScore = async (score: number, timer: number): Promise<void> => {
    if (user) {
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
      } catch (error: unknown) {
        console.error('Error saving score:', error);
      }
    }
    setScore(score);
    setTimer(timer);
  };

  return (
    <div className="app-bg">
      <header className="app-header">
        <h1 className="app-title animated-bounce">Crazy Puzzle</h1>
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
                <img src={user.photoURL ?? undefined} alt="profile" className="user-avatar" />
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
        <PuzzleBoard
          difficulty={difficulty}
          layout={layout}
          user={user}
          onScore={handleScore} onComplete={undefined}        />
        <Leaderboard
          score={score}
          timer={timer}
          difficulty={difficulty}
          layout={layout}
        />
        <AdBanner />
      </header>
    </div>
  );
}

export default App;

