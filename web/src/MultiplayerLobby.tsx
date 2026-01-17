import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { realtimeDb } from './firebase';
import { ref, push, onValue, set, get, remove } from 'firebase/database';
import DifficultySelector, { Difficulty, Layout } from './DifficultySelector';
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
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomList = Object.entries(data).map(([id, room]: [string, any]) => ({
          id,
          ...room
        })).filter(room => room.status === 'waiting');
        setRooms(roomList);
      } else {
        setRooms([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const createRoom = async () => {
    try {
      console.log('Creating room with difficulty:', difficulty, 'layout:', layout);
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
      console.log('Room created successfully:', newRoomRef.key);
      console.log('Calling onJoinRoom with roomId:', newRoomRef.key, 'difficulty:', difficulty, 'layout:', layout);
      setShowCreateModal(false);
      onJoinRoom(newRoomRef.key!, difficulty, layout);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please check your Firebase configuration.');
    }
  };

  const joinRoom = async (roomId: string, roomDifficulty: Difficulty, roomLayout: Layout) => {
    const roomRef = ref(realtimeDb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (snapshot.exists()) {
      const room = snapshot.val();
      const playerCount = Object.keys(room.players || {}).length;
      const maxPlayers = getMaxPlayers(roomDifficulty);
      
      if (playerCount < maxPlayers) {
        await set(ref(realtimeDb, `rooms/${roomId}/players/${user.uid}`), {
          name: user.displayName || 'Anonymous',
          ready: false
        });
        onJoinRoom(roomId, roomDifficulty, roomLayout);
      } else {
        alert('Room is full!');
      }
    }
  };

  const deleteOldRooms = async () => {
    try {
      const roomsRef = ref(realtimeDb, 'rooms');
      const snapshot = await get(roomsRef);
      
      if (snapshot && snapshot.exists()) {
        const data = snapshot.val();
        const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;
      
      Object.entries(data).forEach(async ([id, room]: [string, any]) => {
        if (now - room.createdAt > thirtyMinutes) {
          await remove(ref(realtimeDb, `rooms/${id}`));
        }
      });
    }
    } catch (error) {
      // Ignore errors in test environment
      console.log('Error cleaning old rooms:', error);
    }
  };

  useEffect(() => {
    deleteOldRooms();
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
            console.log('Create Room button clicked');
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
                  <button 
                    onClick={() => joinRoom(room.id, room.difficulty, room.layout || 'grid')} 
                    className={styles.joinBtn}
                    disabled={isFull}
                  >
                    {isFull ? 'Full' : 'Join Room'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MultiplayerLobby;
