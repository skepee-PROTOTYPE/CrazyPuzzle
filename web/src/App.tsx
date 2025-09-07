import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import PuzzleBoard from './PuzzleBoard';
import Leaderboard from './Leaderboard';
import AdBanner from './AdBanner';
import styles from './App.module.scss';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [layout, setLayout] = useState<string>('grid');
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleScoreUpdate = (newScore: number, newTimer: number) => {
    setScore(newScore);
    setTimer(newTimer);
  };

  return (
    <div className={styles.appBg}>
      <div className={styles.appHeaderContainer}>
        <h1 className={styles.appTitle}>🧩 CrazyPuzzle</h1>
        
        <div className={styles.controlsRow}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Authentication</h3>
            {user ? (
              <div className={styles.userInfo}>
                <img src={user.photoURL || ''} alt="Avatar" className={styles.userAvatar} />
                <span className={styles.userName}>{user.displayName}</span>
                <button onClick={handleSignOut} className={`${styles.btn} ${styles.logoutBtn}`}>
                  Sign Out
                </button>
              </div>
            ) : (
              <button onClick={signInWithGoogle} className={`${styles.btn} ${styles.signInBtn}`}>
                Sign in with Google
              </button>
            )}
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Game Settings</h3>
            <div>
              <label>Difficulty:</label>
              <select 
                value={difficulty} 
                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                className={styles.select}
              >
                <option value="easy">Easy (4x4)</option>
                <option value="medium">Medium (6x6)</option>
                <option value="hard">Hard (8x8)</option>
              </select>
            </div>
            <div>
              <label>Layout:</label>
              <select 
                value={layout} 
                onChange={(e) => setLayout(e.target.value)}
                className={styles.select}
              >
                <option value="grid">Grid</option>
                <option value="circle">Circle</option>
                <option value="diamond">Diamond</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.scoreRow}>
          <div className={styles.scoreBox}>Score: {score}</div>
          <div className={styles.scoreBox}>Time: {timer}s</div>
        </div>

        <AdBanner />

        <PuzzleBoard 
          difficulty={difficulty} 
          layout={layout} 
          user={user}
          onScore={handleScoreUpdate}
        />

        <Leaderboard difficulty={difficulty} layout={layout} score={score} timer={timer} />
      </div>
    </div>
  );
}

export default App;

