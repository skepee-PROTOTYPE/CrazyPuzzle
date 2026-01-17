import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth, db, realtimeDb } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import SinglePlayerGame from './SinglePlayerGame';
import MultiplayerLobby from './MultiplayerLobby';
import MultiplayerGame from './MultiplayerGame';
import { Difficulty, Layout } from './DifficultySelector';
import { isFacebookInstantGame } from './platform';
import { platformAuth, PlatformUser } from './platformAuth';
import { facebookAds } from './facebookAds';
import styles from './App.module.scss';

// Version: 1.0.2 - Added Facebook Instant Games support

type GameMode = 'menu' | 'singleplayer' | 'multiplayer-lobby' | 'multiplayer-game';
type StatusTone = 'info' | 'success' | 'error';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoomDifficulty, setCurrentRoomDifficulty] = useState<Difficulty>('easy');
  const [currentRoomLayout, setCurrentRoomLayout] = useState<Layout>('grid');
  const [authLoading, setAuthLoading] = useState(true);
  const [platformLoading, setPlatformLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; tone: StatusTone } | null>(null);
  const [userStats, setUserStats] = useState<{ singlePlayerPoints: number; multiplayerPoints: number }>({ singlePlayerPoints: 0, multiplayerPoints: 0 });

  // Initialize Facebook Instant Games if on that platform
  useEffect(() => {
    const initPlatform = async () => {
      if (isFacebookInstantGame()) {
        try {
          await window.FBInstant!.initializeAsync();
          
          // Initialize Facebook ads
          await facebookAds.initialize();
          
          // Get Facebook player info
          const fbUser = await platformAuth.fromFacebookPlayer();
          if (fbUser) {
            setPlatformUser(fbUser);
            setStatusMessage({
              text: `Welcome ${fbUser.displayName}!`,
              tone: 'success'
            });
          }
          
          // Start the game (removes loading screen)
          await window.FBInstant!.startGameAsync();
          
          setPlatformLoading(false);
        } catch (error: any) {
          setStatusMessage({
            text: `Facebook Instant Games initialization failed: ${error.message}`,
            tone: 'error'
          });
          setPlatformLoading(false);
        }
      } else {
        // Web platform - no special initialization needed
        setPlatformLoading(false);
      }
    };

    initPlatform();
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const initAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hasOAuthParams = ['code', 'state', 'error'].some((key) => urlParams.has(key));
        await setPersistence(auth, browserLocalPersistence);
        try {
          const result = await getRedirectResult(auth);
          if (result) {
            setUser(result.user);
            setStatusMessage({
              text: `Signed in as ${result.user.displayName || result.user.email}`,
              tone: 'success'
            });
            setAuthLoading(false);
          } else if (hasOAuthParams) {
            setStatusMessage({
              text: 'We could not complete Google sign-in. Please try again.',
              tone: 'error'
            });
          }
        } catch (redirectError: any) {
          setStatusMessage({
            text: `Sign-in redirect failed: ${redirectError.message}`,
            tone: 'error'
          });
        }
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
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
  // Fetch user stats
  useEffect(() => {
    const currentUserId = platformUser?.uid || user?.uid;
    
    if (!currentUserId) {
      setUserStats({ singlePlayerPoints: 0, multiplayerPoints: 0 });
      return;
    }

    const fetchStats = async () => {
      try {
        // Get single player points from Firestore
        const scoresRef = collection(db, 'scores');
        const q = query(scoresRef, where('userId', '==', currentUserId));
        const snapshot = await getDocs(q);
        const singlePlayerPoints = snapshot.docs.reduce((sum, doc) => sum + (doc.data().score || 0), 0);
        // Get multiplayer points from Realtime Database
        const userStatsRef = ref(realtimeDb, `userStats/${currentUserId}`);
        onValue(userStatsRef, (snapshot) => {
          const data = snapshot.val();
          const multiplayerPoints = data?.multiplayerPoints || 0;
          setUserStats({ singlePlayerPoints, multiplayerPoints });
        });
      } catch (error) {
      }
    };
    fetchStats();
  }, [user, platformUser]);
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    try {
      await setPersistence(auth, browserLocalPersistence);
      setStatusMessage({ text: 'Opening Google sign-in…', tone: 'info' });
      try {
        await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        const fallbackErrors = ['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/operation-not-supported-in-this-environment'];
        const shouldFallbackToRedirect = isMobile || fallbackErrors.includes(popupError.code);
        if (!shouldFallbackToRedirect) {
          throw popupError;
        }
        await signInWithRedirect(auth, provider);
      }
    } catch (error: any) {
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
  // Show loading while checking auth state or platform
  if (authLoading || platformLoading) {
    return (
      <div className={styles.appBg}>
        <div className={styles.menuContainer}>
          <h1 className={styles.mainTitle}>🧩 CrazyPuzzle</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Get the current active user (Facebook or Google)
  const activeUser = platformUser || (user ? {
    uid: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL,
    platform: 'web' as const
  } : null);

  // Menu view
  if (gameMode === 'menu') {
    return (
      <div className={styles.appBg}>
        <div className={styles.menuContainer}>
          <h1 className={styles.mainTitle}>🧩 CrazyPuzzle</h1>
          <p className={styles.subtitle}>Test your memory and compete with friends!</p>
          <div className={styles.authSection}>
            {activeUser ? (
              <div className={styles.userWelcome}>
                <img src={activeUser.photoURL || ''} alt="Avatar" className={styles.userAvatar} />
                <div className={styles.userInfo}>
                  <span className={styles.userName}>Welcome, {activeUser.displayName}!</span>
                  <div className={styles.userPoints}>
                    <span className={styles.pointsBadge}>
                      🎯 Single: {userStats.singlePlayerPoints} pts
                    </span>
                    <span className={styles.pointsBadge}>
                      👥 Multi: {userStats.multiplayerPoints} pts
                    </span>
                  </div>
                </div>
                {!isFacebookInstantGame() && (
                  <button onClick={handleSignOut} className={styles.signOutBtn}>Sign Out</button>
                )}
              </div>
            ) : (
              !isFacebookInstantGame() && (
                <div className={styles.guestInfo}>
                  <p>🎮 Play as guest or sign in for more features</p>
                  <button onClick={signInWithGoogle} className={styles.signInBtn}>
                    Sign in with Google
                  </button>
                </div>
              )
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
                if (!activeUser) {
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
              {!activeUser && <span className={styles.requiresAuth}>Requires sign in</span>}
            </button>
          </div>
        </div>
      </div>
    );
  }
  // Multiplayer lobby view
  if (gameMode === 'multiplayer-lobby' && activeUser) {
    // Convert platform user to User-like object for compatibility
    const compatUser = user || {
      uid: activeUser.uid,
      displayName: activeUser.displayName,
      email: null,
      photoURL: activeUser.photoURL,
      emailVerified: false,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => '',
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
      phoneNumber: null,
      providerId: 'facebook.com'
    } as any;

    return (
      <div className={styles.appBg}>
        <MultiplayerLobby 
          user={compatUser}
          onJoinRoom={handleJoinRoom}
          onBackToSinglePlayer={() => setGameMode('menu')}
        />
      </div>
    );
  }
  // Multiplayer game view
  if (gameMode === 'multiplayer-game' && activeUser && currentRoomId) {
    // Convert platform user to User-like object for compatibility
    const compatUser = user || {
      uid: activeUser.uid,
      displayName: activeUser.displayName,
      email: null,
      photoURL: activeUser.photoURL,
      emailVerified: false,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => '',
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
      phoneNumber: null,
      providerId: 'facebook.com'
    } as any;

    return (
      <div className={styles.appBg}>
        <MultiplayerGame 
          roomId={currentRoomId}
          user={compatUser}
          difficulty={currentRoomDifficulty}
          layout={currentRoomLayout}
          onLeaveRoom={handleLeaveRoom}
          onBackToMenu={() => setGameMode('menu')}
        />
      </div>
    );
  }
  // Single player mode
  return (
    <SinglePlayerGame 
      user={user || (activeUser ? {
        uid: activeUser.uid,
        displayName: activeUser.displayName,
        email: null,
        photoURL: activeUser.photoURL,
        emailVerified: false,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => '',
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({}),
        phoneNumber: null,
        providerId: 'facebook.com'
      } as any : null)}
      onBackToMenu={() => setGameMode('menu')}
      onSignInWithGoogle={signInWithGoogle}
      onSignOut={handleSignOut}
    />
  );
}
export default App;
