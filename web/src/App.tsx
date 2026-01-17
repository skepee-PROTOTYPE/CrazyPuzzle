import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import SinglePlayerGame from './SinglePlayerGame';
import MultiplayerLobby from './MultiplayerLobby';
import MultiplayerGame from './MultiplayerGame';
import { Difficulty, Layout } from './DifficultySelector';
import styles from './App.module.scss';

// Version: 1.0.1 - Fixed mobile sign-in

type GameMode = 'menu' | 'singleplayer' | 'multiplayer-lobby' | 'multiplayer-game';
type StatusTone = 'info' | 'success' | 'error';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoomDifficulty, setCurrentRoomDifficulty] = useState<Difficulty>('easy');
  const [currentRoomLayout, setCurrentRoomLayout] = useState<Layout>('grid');
  const [authLoading, setAuthLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; tone: StatusTone } | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hasOAuthParams = ['code', 'state', 'error'].some((key) => urlParams.has(key));

        await setPersistence(auth, browserLocalPersistence);
        console.log('✅ Auth persistence set to LOCAL');

        try {
          const result = await getRedirectResult(auth);
          console.log('getRedirectResult returned:', result);
          if (result) {
            setUser(result.user);
            setStatusMessage({
              text: `Signed in as ${result.user.displayName || result.user.email}`,
              tone: 'success'
            });
            setAuthLoading(false);
          } else if (hasOAuthParams) {
            console.warn('Redirect completed but no user returned', window.location.href);
            setStatusMessage({
              text: 'We could not complete Google sign-in. Please try again.',
              tone: 'error'
            });
          }
        } catch (redirectError: any) {
          console.error('❌ Redirect error:', redirectError);
          setStatusMessage({
            text: `Sign-in redirect failed: ${redirectError.message}`,
            tone: 'error'
          });
        }

        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          console.log('👤 Auth state changed:', currentUser?.displayName || 'No user', currentUser?.email || '');

          if (currentUser) {
            setUser(currentUser);
            setStatusMessage({
              text: `Signed in as ${currentUser.displayName || currentUser.email}`,
              tone: 'success'
            });
          } else {
            setUser(null);
            setStatusMessage((prev) => (prev?.tone === 'error' ? prev : null));
          }
          setAuthLoading(false);
        });
      } catch (error: any) {
        console.error('❌ Error in auth init:', error);
        setStatusMessage({
          text: `Auth initialization failed: ${error.message}`,
          tone: 'error'
        });
        setAuthLoading(false);
      }
    };

    initAuth();

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    console.log('🔐 Sign in initiated, isMobile:', isMobile);

    try {
      await setPersistence(auth, browserLocalPersistence);
      setStatusMessage({ text: 'Opening Google sign-in…', tone: 'info' });
      console.log('✅ Persistence set');

      try {
        console.log('✨ Trying signInWithPopup first');
        await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        const fallbackErrors = ['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/operation-not-supported-in-this-environment'];
        const shouldFallbackToRedirect = isMobile || fallbackErrors.includes(popupError.code);
        console.warn('⚠️ Popup sign-in failed:', popupError.code, 'fallback?', shouldFallbackToRedirect);

        if (!shouldFallbackToRedirect) {
          throw popupError;
        }

        console.log('📱 Falling back to signInWithRedirect');
        await signInWithRedirect(auth, provider);
      }
    } catch (error: any) {
      console.error('❌ Error signing in with Google:', error);
      setStatusMessage({
        text: error.code === 'auth/unauthorized-domain'
          ? 'Domain not authorized for Google sign-in. Please add crazypuzzlecrazy.web.app in Firebase Console.'
          : `Sign in failed: ${error.message}`,
        tone: 'error'
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setStatusMessage({ text: 'Signed out successfully.', tone: 'info' });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleJoinRoom = (roomId: string, roomDifficulty: Difficulty, roomLayout: Layout) => {
    setCurrentRoomId(roomId);
    setCurrentRoomDifficulty(roomDifficulty);
    setCurrentRoomLayout(roomLayout);
    setGameMode('multiplayer-game');
  };

  const handleLeaveRoom = () => {
    setCurrentRoomId(null);
    setGameMode('multiplayer-lobby');
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className={styles.appBg}>
        <div className={styles.menuContainer}>
          <h1 className={styles.mainTitle}>🧩 CrazyPuzzle</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

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
            {statusMessage && (
              <div
                className={`${styles.statusMessage} ${
                  statusMessage.tone === 'success'
                    ? styles.statusSuccess
                    : statusMessage.tone === 'error'
                    ? styles.statusError
                    : styles.statusInfo
                }`}
              >
                {statusMessage.text}
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
                  setStatusMessage({ text: 'Please sign in to play multiplayer.', tone: 'info' });
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

  // Multiplayer lobby view
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

  // Multiplayer game view
  if (gameMode === 'multiplayer-game' && user && currentRoomId) {
    return (
      <div className={styles.appBg}>
        <MultiplayerGame 
          roomId={currentRoomId}
          user={user}
          difficulty={currentRoomDifficulty}
          layout={currentRoomLayout}
          onLeaveRoom={handleLeaveRoom}
        />
      </div>
    );
  }

  // Single player mode
  return (
    <SinglePlayerGame 
      user={user}
      onBackToMenu={() => setGameMode('menu')}
      onSignInWithGoogle={signInWithGoogle}
      onSignOut={handleSignOut}
    />
  );
}

export default App;

