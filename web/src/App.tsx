import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import PuzzleBoard from './PuzzleBoard';
import Leaderboard from './Leaderboard';
import AdBanner from './AdBanner';
import MultiplayerLobby from './MultiplayerLobby';
import MultiplayerGame from './MultiplayerGame';
import styles from './App.module.scss';

// Version: 1.0.1 - Fixed mobile sign-in

type GameMode = 'menu' | 'singleplayer' | 'multiplayer-lobby' | 'multiplayer-game';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [layout, setLayout] = useState<string>('grid');
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Set auth persistence first
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log('Auth persistence set to LOCAL');
        // Check for redirect result FIRST before setting up listener
        return getRedirectResult(auth);
      })
      .then((result) => {
        if (result?.user) {
          console.log('✅ Redirect sign-in successful:', result.user.displayName);
          setUser(result.user);
        } else {
          console.log('No redirect result');
        }
      })
      .catch((error) => {
        console.error('❌ Error in auth setup:', error);
        if (error.code !== 'auth/popup-closed-by-user') {
          alert(`Sign in error: ${error.message}`);
        }
      })
      .finally(() => {
        setAuthLoading(false);
      });

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('Auth state changed:', currentUser?.displayName || 'No user');
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Force account selection
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      // Detect if mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      console.log('🔐 Sign in initiated, isMobile:', isMobile);
      
      // Set persistence before sign-in
      await setPersistence(auth, browserLocalPersistence);
      
      if (isMobile) {
        // Use redirect for mobile devices (works better on iOS)
        console.log('📱 Using signInWithRedirect for mobile');
        await signInWithRedirect(auth, provider);
      } else {
        // Use popup for desktop
        console.log('💻 Using signInWithPopup for desktop');
        await signInWithPopup(auth, provider);
      }
    } catch (error: any) {
      console.error('❌ Error signing in with Google:', error);
      alert(`Sign in failed: ${error.message || 'Please try again'}`);
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

  const handleJoinRoom = (roomId: string, roomDifficulty: 'easy' | 'medium' | 'hard') => {
    setCurrentRoomId(roomId);
    setDifficulty(roomDifficulty);
    setGameMode('multiplayer-game');
  };

  const handleLeaveRoom = () => {
    setCurrentRoomId(null);
    setGameMode('multiplayer-lobby');
  };

  // Menu view
  if (gameMode === 'menu') {
    return (
      <div className={styles.appBg}>
        <div className={styles.menuContainer}>
          <h1 className={styles.mainTitle}>🧩 CrazyPuzzle</h1>
          <p className={styles.subtitle}>Test your memory and compete with friends!</p>
          
          <div className={styles.authSection}>
            {user ? (
              <div className={styles.userWelcome}>
                <img src={user.photoURL || ''} alt="Avatar" className={styles.userAvatar} />
                <span>Welcome, {user.displayName}!</span>
                <button onClick={handleSignOut} className={styles.signOutBtn}>Sign Out</button>
              </div>
            ) : (
              <div className={styles.guestInfo}>
                <p>🎮 Play as guest or sign in for more features</p>
                <button onClick={signInWithGoogle} className={styles.signInBtn}>
                  Sign in with Google
                </button>
              </div>
            )}
          </div>

          <div className={styles.modeSelection}>
            <button 
              onClick={() => setGameMode('singleplayer')} 
              className={styles.modeBtn}
            >
              <span className={styles.modeIcon}>🎯</span>
              <span className={styles.modeTitle}>Single Player</span>
              <span className={styles.modeDesc}>Play solo and beat your best time</span>
            </button>

            <button 
              onClick={() => {
                if (!user) {
                  alert('Please sign in to play multiplayer!');
                  return;
                }
                setGameMode('multiplayer-lobby');
              }} 
              className={styles.modeBtn}
            >
              <span className={styles.modeIcon}>👥</span>
              <span className={styles.modeTitle}>Multiplayer</span>
              <span className={styles.modeDesc}>Compete with friends in real-time</span>
              {!user && <span className={styles.requiresAuth}>Requires sign in</span>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Multiplayer lobby
  if (gameMode === 'multiplayer-lobby' && user) {
    return (
      <div className={styles.appBg}>
        <MultiplayerLobby 
          user={user}
          onJoinRoom={handleJoinRoom}
          onBackToSinglePlayer={() => setGameMode('menu')}
        />
      </div>
    );
  }

  // Multiplayer game
  if (gameMode === 'multiplayer-game' && user && currentRoomId) {
    return (
      <div className={styles.appBg}>
        <MultiplayerGame 
          roomId={currentRoomId}
          user={user}
          difficulty={difficulty}
          onLeaveRoom={handleLeaveRoom}
        />
      </div>
    );
  }

  // Single player mode
  return (
    <div className={styles.appBg}>
      <div className={styles.appHeaderContainer}>
        <div className={styles.headerRow}>
          <h1 className={styles.appTitle}>🧩 CrazyPuzzle</h1>
          <button onClick={() => setGameMode('menu')} className={styles.menuBtn}>
            ← Back to Menu
          </button>
        </div>
        
        <div className={styles.controlsRow}>
          {/* Move authentication to a smaller, optional section */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Game Settings</h3>
            <div style={{ marginBottom: '15px' }}>
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
                <button onClick={handleSignOut} className={`${styles.btn} ${styles.logoutBtn}`}>
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
                <button onClick={signInWithGoogle} className={`${styles.btn} ${styles.signInBtn}`}>
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

export default App;

