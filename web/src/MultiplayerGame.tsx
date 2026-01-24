import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { realtimeDb } from './firebase';
import { ref, onValue, set, get, update, remove, runTransaction } from 'firebase/database';
import { Difficulty, Layout } from './DifficultySelector';
import MultiplayerLeaderboard from './MultiplayerLeaderboard';
import { facebookAds } from './facebookAds';
import { isFacebookInstantGame } from './platform';
import styles from './MultiplayerGame.module.scss';

interface Player {
  name: string;
  ready: boolean;
  score: number;
  matchedTiles: number[];
}

interface GameState {
  hostId: string;
  tiles: number[];
  currentTurn: string;
  players: { [key: string]: Player };
  pendingPlayers?: { [key: string]: { name: string } };
  status: 'waiting' | 'playing' | 'finished';
  difficulty: Difficulty;
  layout: Layout;
  startTime?: number;
  flippedTiles?: number[];
}

interface MultiplayerGameProps {
  roomId: string;
  user: User;
  difficulty: Difficulty;
  layout: Layout;
  onLeaveRoom: () => void;
  onBackToMenu?: () => void;
}

function MultiplayerGame({ roomId, user, difficulty, layout, onLeaveRoom, onBackToMenu }: MultiplayerGameProps) {
  const gridSizes: Record<Difficulty, number> = { easy: 4, medium: 6, hard: 8 };
  
  // Get max players based on difficulty
  const getMaxPlayers = (diff: Difficulty): number => {
    const limits = { easy: 2, medium: 3, hard: 4 };
    return limits[diff];
  };

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [timer, setTimer] = useState(0);

  // Use flipped tiles from Firebase instead of local state
  const flippedTiles = gameState?.flippedTiles || [];

  useEffect(() => {
    const roomRef = ref(realtimeDb, `rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setGameState(data);
        setIsMyTurn(data.currentTurn === user.uid);
        
        if (data.startTime && data.status === 'playing') {
          const elapsed = Math.floor((Date.now() - data.startTime) / 1000);
          setTimer(elapsed);
        }
        
        // If current user is no longer in players, go back to menu
        if (data.players && !data.players[user.uid]) {
          onLeaveRoom();
        }
      } else {
        // Room was deleted, go back to menu
        onLeaveRoom();
      }
    });

    return () => unsubscribe();
  }, [roomId, user.uid, onLeaveRoom]);

  useEffect(() => {
    if (gameState?.status === 'playing' && gameState.startTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - gameState.startTime!) / 1000);
        setTimer(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState?.status, gameState?.startTime]);

  const handleReady = async () => {
    await set(ref(realtimeDb, `rooms/${roomId}/players/${user.uid}/ready`), true);
  };

  const startGame = useCallback(async () => {
    // Get current game state to determine grid size
    const snapshot = await get(ref(realtimeDb, `rooms/${roomId}`));
    if (!snapshot.exists()) return;
    
    const room = snapshot.val();
    const gridSizes: Record<Difficulty, number> = { easy: 4, medium: 6, hard: 8 };
    const gridSize = gridSizes[room.difficulty as Difficulty] || 4;
    const totalTiles = gridSize * gridSize;
    const safeTotal = totalTiles % 2 === 0 ? totalTiles : totalTiles - 1;
    const pairCount = safeTotal / 2;
    const numbers = Array.from({ length: pairCount }, (_, i) => i + 1);
    const shuffledTiles = [...numbers, ...numbers].sort(() => Math.random() - 0.5);

    const players = room.players;
    const playerIds = Object.keys(players);

    // Initialize player scores
    const updatedPlayers: any = {};
    playerIds.forEach(id => {
      updatedPlayers[id] = {
        ...players[id],
        score: 0,
        matchedTiles: []
      };
    });

    await update(ref(realtimeDb, `rooms/${roomId}`), {
      tiles: shuffledTiles,
      currentTurn: playerIds[0],
      players: updatedPlayers,
      status: 'playing',
      startTime: Date.now(),
      flippedTiles: []
    });
  }, [roomId]);

  // Auto-start game when all players are ready
  useEffect(() => {
    if (gameState?.status === 'waiting' && gameState.players) {
      const players = Object.values(gameState.players);
      const allReady = players.every((p: any) => p.ready);
      const enoughPlayers = players.length >= 2;
      
      // Only the host should trigger the game start to avoid race conditions
      if (allReady && enoughPlayers && gameState.hostId === user.uid) {
        startGame();
      }
    }
  }, [gameState?.status, gameState?.players, gameState?.hostId, user.uid, startGame]);

  const handleTileClick = async (index: number) => {
    if (!gameState || !isMyTurn || gameState.status !== 'playing') return;
    if (flippedTiles.includes(index)) return;
    
    const playerMatchedTiles = gameState.players[user.uid]?.matchedTiles || [];
    if (playerMatchedTiles.includes(index)) return;

    const newFlipped = [...flippedTiles, index];
    
    // Sync flipped tiles to Firebase so all players see them
    await update(ref(realtimeDb, `rooms/${roomId}`), {
      flippedTiles: newFlipped
    });

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      
      if (gameState.tiles[first] === gameState.tiles[second]) {
        // Match found!
        const currentPlayer = gameState.players[user.uid];
        const newMatchedTiles = [...(currentPlayer.matchedTiles || []), first, second];
        const newScore = (currentPlayer.score || 0) + 10;

        await update(ref(realtimeDb, `rooms/${roomId}/players/${user.uid}`), {
          score: newScore,
          matchedTiles: newMatchedTiles
        });

        // Check if game is complete
        const allMatched = Object.values(gameState.players).reduce(
          (sum, p) => sum + (p.matchedTiles?.length || 0), 
          0
        ) + 2 >= gameState.tiles.length;

        if (allMatched) {
          // Update user stats for all players
          const playerEntries = Object.entries(gameState.players);
          for (const [playerId, player] of playerEntries) {
            const finalScore = playerId === user.uid ? newScore : player.score;
            await runTransaction(ref(realtimeDb, `userStats/${playerId}`), (current) => {
              const currentPoints = current?.multiplayerPoints || 0;
              return {
                multiplayerPoints: currentPoints + finalScore
              };
            });
          }
          
          await update(ref(realtimeDb, `rooms/${roomId}`), {
            status: 'finished',
            flippedTiles: []
          });
        } else {
          // Clear flipped tiles after match
          await update(ref(realtimeDb, `rooms/${roomId}`), {
            flippedTiles: []
          });
        }
      } else {
        // No match - switch turn after delay
        setTimeout(async () => {
          const playerIds = Object.keys(gameState.players);
          const currentIndex = playerIds.indexOf(gameState.currentTurn);
          const nextIndex = (currentIndex + 1) % playerIds.length;
          
          await update(ref(realtimeDb, `rooms/${roomId}`), {
            currentTurn: playerIds[nextIndex],
            flippedTiles: []
          });
        }, 1000);
      }
    }
  };

  const handleLeaveRoom = async () => {
    await remove(ref(realtimeDb, `rooms/${roomId}/players/${user.uid}`));
    
    // Check if any players remain
    const snapshot = await get(ref(realtimeDb, `rooms/${roomId}/players`));
    if (!snapshot.exists() || Object.keys(snapshot.val()).length === 0) {
      // Delete room if empty
      await remove(ref(realtimeDb, `rooms/${roomId}`));
    }
    
    onLeaveRoom();
  };

  const handleApprovePlayer = async (playerId: string) => {
    const pendingPlayer = gameState?.pendingPlayers?.[playerId];
    if (!pendingPlayer || !gameState) return;

    // Check if room is full based on actual room difficulty
    const currentPlayerCount = Object.keys(gameState.players || {}).length;
    const maxPlayers = getMaxPlayers(gameState.difficulty);
    
    if (currentPlayerCount >= maxPlayers) {
      alert(`Room is full! Maximum ${maxPlayers} players allowed for ${gameState.difficulty} difficulty.`);
      await remove(ref(realtimeDb, `rooms/${roomId}/pendingPlayers/${playerId}`));
      return;
    }

    // Move from pending to players
    await set(ref(realtimeDb, `rooms/${roomId}/players/${playerId}`), {
      name: pendingPlayer.name,
      ready: true,
      score: 0,
      matchedTiles: []
    });

    // Remove from pending
    await remove(ref(realtimeDb, `rooms/${roomId}/pendingPlayers/${playerId}`));
  };

  const handleRejectPlayer = async (playerId: string) => {
    await remove(ref(realtimeDb, `rooms/${roomId}/pendingPlayers/${playerId}`));
  };

  if (!gameState || !gameState.players) {
    return <div className={styles.loading}>Loading game...</div>;
  }

  // Use the actual difficulty from gameState
  const actualDifficulty = gameState.difficulty || difficulty;
  const gridSize = gridSizes[actualDifficulty] || 4;
  const maxPlayers = getMaxPlayers(actualDifficulty);

  const players = Object.entries(gameState.players || {});
  const isReady = gameState.players[user.uid]?.ready;

  // If current user is not in the game anymore, redirect back
  if (!gameState.players[user.uid]) {
    return <div className={styles.loading}>Returning to lobby...</div>;
  }

  return (
    <div className={styles.gameContainer}>
      <div className={styles.gameHeader}>
        <div>
          <h1>🎮 Multiplayer Game</h1>
          <p className={styles.gameSettings}>
            {actualDifficulty.toUpperCase()} ({gridSize}x{gridSize}) - {(gameState.layout || layout).toUpperCase()} Layout
          </p>
        </div>
        <div className={styles.headerButtons}>
          {onBackToMenu && (
            <button onClick={onBackToMenu} className={styles.menuBtn}>
              🏠 Home
            </button>
          )}
          <button onClick={handleLeaveRoom} className={styles.leaveBtn}>Leave Room</button>
        </div>
      </div>

      <div className={styles.gameInfo}>
        <div className={styles.timer}>⏱️ {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</div>
        {gameState.status === 'playing' && (
          <div className={isMyTurn ? styles.yourTurn : styles.opponentTurn}>
            {isMyTurn ? "🎯 Your Turn!" : `⏳ ${gameState.players[gameState.currentTurn]?.name}'s Turn`}
          </div>
        )}
      </div>

      <div className={styles.playersPanel}>
        <h3>Players</h3>
        {players.map(([id, player]) => {
          const isCurrentUser = id === user.uid;
          const isHost = gameState.hostId === user.uid;
          const isWaiting = gameState.status === 'waiting';
          const showRemoveButton = !isCurrentUser && isHost && isWaiting;
          
          return (
            <div key={id} className={`${styles.playerCard} ${isCurrentUser ? styles.currentUser : ''} ${gameState.currentTurn === id ? styles.activeTurn : ''}`}>
              <div className={styles.playerInfo}>
                <div className={styles.playerName}>
                  {player.name} {isCurrentUser && '(You)'}
                  {gameState.hostId === id && ' 👑'}
                </div>
                <div className={styles.playerStats}>
                  {gameState.status === 'waiting' ? (
                    <span className={player.ready ? styles.ready : styles.notReady}>
                      {player.ready ? '✓ Ready' : '○ Not Ready'}
                    </span>
                  ) : (
                    <span className={styles.score}>Score: {player.score || 0}</span>
                  )}
                </div>
              </div>
              {showRemoveButton && (
                <button 
                  onClick={async () => {
                    if (window.confirm(`Remove ${player.name} from the room?`)) {
                      await remove(ref(realtimeDb, `rooms/${roomId}/players/${id}`));
                    }
                  }}
                  className={styles.removePlayerBtn}
                  title="Remove player"
                >
                  ✕
                </button>
              )}
              {isCurrentUser && !isHost && isWaiting && (
                <button 
                  onClick={handleLeaveRoom}
                  className={styles.leaveRoomBtn}
                >
                  Leave
                </button>
              )}
            </div>
          );
        })}
      </div>

      {gameState.status === 'waiting' && gameState.hostId === user.uid && gameState.pendingPlayers && Object.keys(gameState.pendingPlayers).length > 0 && (
        <div className={styles.pendingPanel}>
          <h3>Pending Join Requests</h3>
          {Object.entries(gameState.pendingPlayers).map(([id, pendingPlayer]) => (
            <div key={id} className={styles.pendingCard}>
              <span className={styles.pendingName}>{pendingPlayer.name}</span>
              <div className={styles.pendingActions}>
                <button 
                  onClick={() => handleApprovePlayer(id)}
                  className={styles.approveBtn}
                >
                  ✓ Accept
                </button>
                <button 
                  onClick={() => handleRejectPlayer(id)}
                  className={styles.rejectBtn}
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {gameState.status === 'waiting' && (
        <>
          <div className={styles.waitingRoom}>
            <h2>Waiting for players...</h2>
            <p>Players: {players.length}/{maxPlayers}</p>
            {!isReady ? (
              <button onClick={handleReady} className={styles.readyBtn}>I'm Ready!</button>
            ) : (
              <p className={styles.readyMessage}>Waiting for other players to ready up...</p>
            )}
          </div>
          <MultiplayerLeaderboard />
        </>
      )}

      {gameState.status === 'playing' && gameState.tiles && (
        <>
          <div className={styles.boardContainer}>
            <div 
              className={`${styles.puzzleGrid} ${styles[`grid${gridSize}`]}`}
            >
              {gameState.tiles.map((value, index) => {
                const allMatchedTiles = Object.values(gameState.players).flatMap(p => p.matchedTiles || []);
                const isMatched = allMatchedTiles.includes(index);
                const isFlipped = flippedTiles.includes(index);
                const matchedBy = Object.entries(gameState.players).find(([_, p]) => 
                  (p.matchedTiles || []).includes(index)
                );

                return (
                  <div
                    key={index}
                    className={`${styles.tile} ${isFlipped || isMatched ? styles.flipped : ''} ${
                      isMatched ? styles.matched : ''
                    }`}
                    onClick={() => handleTileClick(index)}
                    style={isMatched && matchedBy ? { borderColor: getPlayerColor(matchedBy[0]) } : {}}
                  >
                    <div className={styles.tileFront}>?</div>
                    <div className={styles.tileBack}>{value}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <MultiplayerLeaderboard />
        </>
      )}

      {gameState.status === 'finished' && (
        <div className={styles.gameOver}>
          <h2>🎉 Game Over!</h2>
          <div className={styles.finalScores}>
            <h3>Final Scores:</h3>
            {players
              .sort(([, a], [, b]) => (b.score || 0) - (a.score || 0))
              .map(([id, player], idx) => (
                <div key={id} className={styles.finalScore}>
                  <span className={styles.rank}>{idx + 1}.</span>
                  <span className={styles.playerName}>{player.name}</span>
                  <span className={styles.score}>{player.score || 0} points</span>
                  {idx === 0 && <span className={styles.winner}>👑</span>}
                </div>
              ))}
          </div>
          <button 
            onClick={async () => {
              // Show interstitial ad when leaving (Facebook only)
              if (isFacebookInstantGame()) {
                await facebookAds.showInterstitialAd();
              }
              handleLeaveRoom();
            }} 
            className={styles.playAgainBtn}
          >
            Back to Menu
          </button>
        </div>
      )}
    </div>
  );
}

// Helper function to assign colors to players
function getPlayerColor(playerId: string): string {
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63'];
  const hash = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export default MultiplayerGame;
