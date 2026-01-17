import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { realtimeDb } from './firebase';
import { ref, push, onValue, set, get, remove } from 'firebase/database';
import DifficultySelector, { Difficulty, Layout } from './DifficultySelector';
import MultiplayerLeaderboard from './MultiplayerLeaderboard';
import styles from './MultiplayerLobby.module.scss';

interface Room {
  id: string;
  hostId: string;
  hostName: string;
  difficulty: Difficulty;
  layout: Layout;
  players: { [key: string]: { name: string; ready: boolean } };
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

interface MultiplayerLobbyProps {
  user: User;
  onJoinRoom: (roomId: string, difficulty: Difficulty, layout: Layout) => void;
  onBackToSinglePlayer: () => void;
}

function MultiplayerLobby({ user, onJoinRoom, onBackToSinglePlayer }: MultiplayerLobbyProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [layout, setLayout] = useState<Layout>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Player limits based on difficulty
  const getMaxPlayers = (diff: Difficulty): number => {
    const limits = { easy: 2, medium: 3, hard: 4 };
    return limits[diff];
  };

  useEffect(() => {
    const roomsRef = ref(realtimeDb, 'rooms');
    
    // Add error listener
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      console.log('Rooms data:', JSON.stringify(data, null, 2));
      
      if (data) {
        const allRooms = Object.entries(data).map(([id, room]: [string, any]) => ({
          id,
          ...room
        }));
        
        const waitingRooms = allRooms.filter(room => room.status === 'waiting');
        console.log('Waiting rooms (filtered):', waitingRooms);
        
        setRooms(waitingRooms);
      } else {
        setRooms([]);
      }
    }, (error: any) => {
    });

    return () => unsubscribe();
  }, []);

  const createRoom = async () => {
    try {
      
      const roomsRef = ref(realtimeDb, 'rooms');
      
      const newRoomRef = push(roomsRef);
      
      const room = {
        hostId: user.uid,
        hostName: user.displayName || 'Anonymous',
        difficulty,
        layout,
        players: {
          [user.uid]: {
            name: user.displayName || 'Anonymous',
            ready: false
          }
        },
        status: 'waiting',
        createdAt: Date.now()
      };
      await set(newRoomRef, room);
      setShowCreateModal(false);
      onJoinRoom(newRoomRef.key!, difficulty, layout);
    } catch (error: any) {
      console.error('Full error:', JSON.stringify(error, null, 2));
      
      const errorMsg = error.code === 'PERMISSION_DENIED' 
        ? 'Permission denied. Your Firebase Realtime Database security rules may have expired. Please update them in the Firebase Console.'
        : `Failed to create room: ${error.message}`;
      
      alert(errorMsg);
    }
  };

  const joinRoom = async (roomId: string, roomDifficulty: Difficulty, roomLayout: Layout) => {
    const roomRef = ref(realtimeDb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (snapshot.exists()) {
      const room = snapshot.val();
      const playerCount = Object.keys(room.players || {}).length;
      const pendingCount = Object.keys(room.pendingPlayers || {}).length;
      const maxPlayers = getMaxPlayers(roomDifficulty);
      
      if (playerCount + pendingCount < maxPlayers) {
        // Send join request to pending instead of directly joining
        await set(ref(realtimeDb, `rooms/${roomId}/pendingPlayers/${user.uid}`), {
          name: user.displayName || 'Anonymous'
        });
        alert('Join request sent! Waiting for host approval...');
      } else {
        alert('Room is full!');
      }
    }
  };

  const deleteRoom = async (roomId: string, roomName: string) => {
    if (window.confirm(`Are you sure you want to delete "${roomName}"?`)) {
      try {
        await remove(ref(realtimeDb, `rooms/${roomId}`));
      } catch (error) {
        alert('Failed to delete room');
      }
    }
  };

  const deleteOldRooms = async () => {
    // Only run cleanup if user has created rooms before
    // This prevents permission errors for users just viewing the lobby
    try {
      const roomsRef = ref(realtimeDb, 'rooms');
      const snapshot = await get(roomsRef);
      
      if (snapshot && snapshot.exists()) {
        const data = snapshot.val();
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
      
        // Only delete rooms created by current user
        const userRooms = Object.entries(data).filter(([id, room]: [string, any]) => 
          room.hostId === user.uid && now - room.createdAt > thirtyMinutes
        );

        if (userRooms.length > 0) {
          for (const [id] of userRooms) {
            try {
              await remove(ref(realtimeDb, `rooms/${id}`));
            } catch (deleteError) {
              // Skip rooms we can't delete
            }
          }
        }
      }
    } catch (error) {
      // Silently fail - this is not critical functionality
      // Most likely a permission error for users who haven't created rooms
    }
  };

  useEffect(() => {
    // Only attempt cleanup, don't wait for it
    deleteOldRooms().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.lobbyContainer}>
      <div className={styles.lobbyHeader}>
        <h1>🎮 Multiplayer Lobby</h1>
        <button onClick={onBackToSinglePlayer} className={styles.backBtn}>
          ← Back to Menu
        </button>
      </div>

      <div className={styles.lobbyActions}>
        <button 
          onClick={() => {
            setShowCreateModal(true);
          }} 
          className={styles.createRoomBtn}
        >
          + Create Room
        </button>
      </div>

      {showCreateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Create New Room</h2>
            <div className={styles.formGroup}>
              <DifficultySelector 
                difficulty={difficulty}
                layout={layout}
                onDifficultyChange={setDifficulty}
                onLayoutChange={setLayout}
                showLayout={true}
              />
            </div>
            <div className={styles.modalActions}>
              <button onClick={createRoom} className={styles.confirmBtn}>Create</button>
              <button onClick={() => setShowCreateModal(false)} className={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.roomsList}>
        <h2>Available Rooms</h2>
        {rooms.length === 0 ? (
          <p className={styles.noRooms}>No rooms available. Create one to start!</p>
        ) : (
          <div className={styles.roomsGrid}>
            {rooms.map(room => {
              const playerCount = Object.keys(room.players || {}).length;
              const maxPlayers = getMaxPlayers(room.difficulty);
              const isFull = playerCount >= maxPlayers;
              const isHost = room.hostId === user.uid;
              
              return (
                <div key={room.id} className={styles.roomCard}>
                  <div className={styles.roomHeader}>
                    <h3>Room by {room.hostName}</h3>
                    <span className={styles.difficultyBadge}>{room.difficulty}</span>
                  </div>
                  <div className={styles.roomInfo}>
                    <p>👥 Players: {playerCount}/{maxPlayers}</p>
                    <p>⏱️ Difficulty: {room.difficulty.toUpperCase()}</p>
                    <p>🎨 Layout: {room.layout?.toUpperCase() || 'GRID'}</p>
                  </div>
                  <div className={styles.roomActions}>
                    <button 
                      onClick={() => joinRoom(room.id, room.difficulty, room.layout || 'grid')} 
                      className={styles.joinBtn}
                      disabled={isFull}
                    >
                      {isFull ? 'Full' : 'Join Room'}
                    </button>
                    {isHost && (
                      <button 
                        onClick={() => deleteRoom(room.id, `Room by ${room.hostName}`)} 
                        className={styles.deleteBtn}
                        title="Delete this room"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MultiplayerLeaderboard />
    </div>
  );
}

export default MultiplayerLobby;
