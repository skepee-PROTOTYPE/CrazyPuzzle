import React, { useState } from 'react';
import { User } from 'firebase/auth';
import DifficultySelector, { Difficulty, Layout } from './DifficultySelector';
import PuzzleBoard from './PuzzleBoard';
import Leaderboard from './Leaderboard';
import AdBanner from './AdBanner';
import styles from './App.module.scss';

interface SinglePlayerGameProps {
  user: User | null;
  onBackToMenu: () => void;
  onSignInWithGoogle: () => void;
  onSignOut: () => void;
}

function SinglePlayerGame({ user, onBackToMenu, onSignInWithGoogle, onSignOut }: SinglePlayerGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [layout, setLayout] = useState<Layout>('grid');
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);

  const handleScoreUpdate = (newScore: number, newTimer: number) => {
    setScore(newScore);
    setTimer(newTimer);
  };

  return (
    <div className={styles.appBg}>
      <div className={styles.appHeaderContainer}>
        <div className={styles.headerRow}>
          <h1 className={styles.appTitle}>🧩 CrazyPuzzle</h1>
          <div className={styles.headerRight}>
            {user && (
              <div className={styles.userInfoHeader}>
                <img src={user.photoURL || ''} alt="Avatar" className={styles.userAvatarSmall} />
                <span className={styles.userNameSmall}>Logged in as {user.displayName}</span>
              </div>
            )}
            <button onClick={onBackToMenu} className={styles.menuBtn}>
              ← Back to Menu
            </button>
          </div>
        </div>

        <div className={styles.controlsRow}>
          {/* Move authentication to a smaller, optional section */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Game Settings</h3>
            <DifficultySelector 
              difficulty={difficulty}
              layout={layout}
              onDifficultyChange={setDifficulty}
              onLayoutChange={setLayout}
              showLayout={true}
            />
          </div>

          {/* Optional login section - smaller and less prominent */}
          <div className={`${styles.card} ${styles.optionalCard}`}>
            <h3 className={styles.cardTitle}>
              {user ? 'Player Account' : 'Save Your Progress'} 
              <span className={styles.optionalBadge}>Optional</span>
            </h3>
            {user ? (
              <div className={styles.userInfo}>
                <img src={user.photoURL || ''} alt="Avatar" className={styles.userAvatar} />
                <span className={styles.userName}>{user.displayName}</span>
                <button onClick={onSignOut} className={`${styles.btn} ${styles.logoutBtn}`}>
                  Sign Out
                </button>
              </div>
            ) : (
              <div>
                <p className={styles.guestModeText}>
                  🎮 You can play as a guest! 
                  <br />
                  <small>Sign in to save your high scores</small>
                </p>
                <button onClick={onSignInWithGoogle} className={`${styles.btn} ${styles.signInBtn}`}>
                  Sign in with Google
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.scoreRow}>
          <div className={styles.scoreBox}>Score: {score}</div>
          <div className={styles.scoreBox}>Time: {timer}s</div>
          {!user && (
            <div className={styles.scoreBox} style={{ background: '#fff3cd', color: '#856404' }}>
              Guest Mode - Sign in to save scores
            </div>
          )}
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

export default SinglePlayerGame;
