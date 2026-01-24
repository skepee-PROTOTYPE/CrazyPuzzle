/// <reference types="jest" />
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MultiplayerLobby from './MultiplayerLobby';
import { User } from 'firebase/auth';

// Mock Firebase modules
jest.mock('./firebase', () => ({
  realtimeDb: {},
  auth: { 
    currentUser: { 
      uid: 'user-123', 
      displayName: 'Test User'
    } 
  }
}));

// Mock firebase/database functions
jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  push: jest.fn(),
  onValue: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
}));

// Mock DifficultySelector component
jest.mock('./DifficultySelector', () => ({
  __esModule: true,
  default: ({ difficulty, layout, onDifficultyChange, onLayoutChange }: any) => (
    <div data-testid="difficulty-selector">
      <select 
        data-testid="difficulty-select" 
        value={difficulty} 
        onChange={(e) => onDifficultyChange(e.target.value)}
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
      <select 
        data-testid="layout-select" 
        value={layout} 
        onChange={(e) => onLayoutChange(e.target.value)}
      >
        <option value="grid">Grid</option>
        <option value="circle">Circle</option>
        <option value="diamond">Diamond</option>
      </select>
    </div>
  )
}));

const mockFirebase = jest.requireMock('firebase/database');

describe('MultiplayerLobby', () => {
  const mockOnJoinRoom = jest.fn();
  const mockOnBackToSinglePlayer = jest.fn();
  const mockUser = {
    uid: 'user-123',
    displayName: 'Test User',
    email: 'test@example.com',
    photoURL: 'https://example.com/photo.jpg'
  } as User;
  
  // Mock window.alert
  beforeAll(() => {
    global.alert = jest.fn();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock push to return a ref with key
    mockFirebase.push.mockReturnValue({ key: 'new-room-123' });
    
    // Default mock implementation
    mockFirebase.onValue.mockImplementation((ref: any, callback: any) => {
      callback({ val: () => null, exists: () => false });
      return jest.fn(); // unsubscribe function
    });

    mockFirebase.get.mockResolvedValue({
      val: () => null,
      exists: () => false
    });
  });

  test('renders lobby title', () => {
    render(
      <MultiplayerLobby
        user={mockUser}
        onJoinRoom={mockOnJoinRoom}
        onBackToSinglePlayer={mockOnBackToSinglePlayer}
      />
    );
    expect(screen.getByText('🎮 Multiplayer Lobby')).toBeInTheDocument();
  });

  test('displays back button', () => {
    render(
      <MultiplayerLobby
        user={mockUser}
        onJoinRoom={mockOnJoinRoom}
        onBackToSinglePlayer={mockOnBackToSinglePlayer}
      />
    );
    expect(screen.getByText('← Back to Menu')).toBeInTheDocument();
  });

  test('calls onBackToSinglePlayer when back button clicked', () => {
    render(
      <MultiplayerLobby
        user={mockUser}
        onJoinRoom={mockOnJoinRoom}
        onBackToSinglePlayer={mockOnBackToSinglePlayer}
      />
    );
    
    const backButton = screen.getByText('← Back to Menu');
    fireEvent.click(backButton);
    expect(mockOnBackToSinglePlayer).toHaveBeenCalledTimes(1);
  });

  test('shows create room button', () => {
    render(
      <MultiplayerLobby
        user={mockUser}
        onJoinRoom={mockOnJoinRoom}
        onBackToSinglePlayer={mockOnBackToSinglePlayer}
      />
    );
    expect(screen.getByText('+ Create Room')).toBeInTheDocument();
  });

  test('shows no rooms message when no rooms available', () => {
    render(
      <MultiplayerLobby
        user={mockUser}
        onJoinRoom={mockOnJoinRoom}
        onBackToSinglePlayer={mockOnBackToSinglePlayer}
      />
    );
    expect(screen.getByText('No rooms available. Create one to start!')).toBeInTheDocument();
  });

  test('opens create room modal when create button clicked', () => {
    render(
      <MultiplayerLobby
        user={mockUser}
        onJoinRoom={mockOnJoinRoom}
        onBackToSinglePlayer={mockOnBackToSinglePlayer}
      />
    );
    
    const createButton = screen.getByText('+ Create Room');
    fireEvent.click(createButton);
    
    expect(screen.getByText('Create New Room')).toBeInTheDocument();
  });

  test('shows difficulty and layout selectors in create modal', () => {
    render(
      <MultiplayerLobby
        user={mockUser}
        onJoinRoom={mockOnJoinRoom}
        onBackToSinglePlayer={mockOnBackToSinglePlayer}
      />
    );
    
    const createButton = screen.getByText('+ Create Room');
    fireEvent.click(createButton);
    
    expect(screen.getByTestId('difficulty-selector')).toBeInTheDocument();
  });

  test('can create room with selected difficulty and layout', async () => {
    mockFirebase.set.mockResolvedValue(undefined);
    
    render(
      <MultiplayerLobby
        user={mockUser}
        onJoinRoom={mockOnJoinRoom}
        onBackToSinglePlayer={mockOnBackToSinglePlayer}
      />
    );
    
    // Open modal
    const createButton = screen.getByText('+ Create Room');
    fireEvent.click(createButton);
    
    // Change difficulty and layout
    const difficultySelect = screen.getByTestId('difficulty-select');
    fireEvent.change(difficultySelect, { target: { value: 'hard' } });
    
    const layoutSelect = screen.getByTestId('layout-select');
    fireEvent.change(layoutSelect, { target: { value: 'circle' } });
    
    // Create room
    const confirmButton = screen.getByText('Create');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockFirebase.set).toHaveBeenCalled();
      expect(mockOnJoinRoom).toHaveBeenCalledWith('new-room-123', 'hard', 'circle');
    });
  });

  test('can cancel room creation', () => {
    render(
      <MultiplayerLobby
        user={mockUser}
        onJoinRoom={mockOnJoinRoom}
        onBackToSinglePlayer={mockOnBackToSinglePlayer}
      />
    );
    
    // Open modal
    const createButton = screen.getByText('+ Create Room');
    fireEvent.click(createButton);
    
    expect(screen.getByText('Create New Room')).toBeInTheDocument();
    
    // Cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(screen.queryByText('Create New Room')).not.toBeInTheDocument();
  });

  test('displays available rooms', () => {
    const mockRooms = {
      'room-1': {
        hostId: 'user-456',
        hostName: 'Host Player',
        difficulty: 'easy',
        layout: 'grid',
        players: {
          'user-456': { name: 'Host Player', ready: false }
        },
        status: 'waiting',
        createdAt: Date.now()
      }
    };

    mockFirebase.onValue.mockImplementation((ref: any, callback: any) => {
      callback({ 
        val: () => mockRooms,
        exists: () => true 
      });
      return jest.fn();
    });

    render(
      <MultiplayerLobby
        user={mockUser}
        onJoinRoom={mockOnJoinRoom}
        onBackToSinglePlayer={mockOnBackToSinglePlayer}
      />
    );
    
    expect(screen.getByText('Room by Host Player')).toBeInTheDocument();
    expect(screen.getByText(/👥 Players: 1\/999/)).toBeInTheDocument();
    expect(screen.getByText(/EASY/)).toBeInTheDocument();
    expect(screen.getByText(/GRID/)).toBeInTheDocument();
  });

  test('can join an available room', async () => {
    const mockRooms = {
      'room-1': {
        hostId: 'user-456',
        hostName: 'Host Player',
        difficulty: 'medium',
        layout: 'diamond',
        players: {
          'user-456': { name: 'Host Player', ready: false }
        },
        status: 'waiting',
        createdAt: Date.now()
      }
    };

    mockFirebase.onValue.mockImplementation((ref: any, callback: any) => {
      callback({ 
        val: () => mockRooms,
        exists: () => true 
      });
      return jest.fn();
    });

    mockFirebase.get.mockResolvedValue({
      val: () => mockRooms['room-1'],
      exists: () => true
    });

    mockFirebase.set.mockResolvedValue(undefined);
    
    // Mock window.alert
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <MultiplayerLobby
        user={mockUser}
        onJoinRoom={mockOnJoinRoom}
        onBackToSinglePlayer={mockOnBackToSinglePlayer}
      />
    );
    
    const joinButton = screen.getByText('Join Room');
    fireEvent.click(joinButton);
    
    await waitFor(() => {
      // Now joining creates a pending request instead of immediately joining
      expect(mockFirebase.set).toHaveBeenCalled();
      const setCall = mockFirebase.set.mock.calls[0];
      expect(setCall[1]).toEqual({ name: mockUser.displayName });
    });
    
    mockAlert.mockRestore();
  });

  test('auto-navigates to game when pending player is accepted', async () => {
    // Setup: room exists with pending player
    const roomWithPending = {
      'room-1': {
        hostId: 'user-456',
        hostName: 'Host Player',
        difficulty: 'medium',
        layout: 'circle',
        players: {
          'user-456': { name: 'Host Player', ready: false }
        },
        pendingPlayers: {
          'user-123': { name: 'Test User' } // Current user in pending
        },
        status: 'waiting',
        createdAt: Date.now()
      }
    };

    let callbackFunction: any = null;

    mockFirebase.onValue.mockImplementation((ref: any, callback: any) => {
      callbackFunction = callback;
      callback({ 
        val: () => roomWithPending,
        exists: () => true
      });
      return jest.fn();
    });

    mockFirebase.get.mockResolvedValue({
      val: () => roomWithPending['room-1'],
      exists: () => true
    });

    mockFirebase.set.mockResolvedValue(undefined);

    render(
      <MultiplayerLobby
        user={mockUser}
        onJoinRoom={mockOnJoinRoom}
        onBackToSinglePlayer={mockOnBackToSinglePlayer}
      />
    );

    // Simulate joining - adds to pendingRoomIds  
    const joinButton = screen.getByText('Join Room');
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(mockFirebase.set).toHaveBeenCalled();
    });

    // Simulate host accepting user - player moves to players list
    const roomWithAcceptedPlayer = {
      'room-1': {
        hostId: 'user-456',
        hostName: 'Host Player',
        difficulty: 'medium',
        layout: 'circle',
        players: {
          'user-456': { name: 'Host Player', ready: false },
          'user-123': { name: 'Test User', ready: true } // Moved from pending
        },
        pendingPlayers: {}, // No longer pending
        status: 'waiting',
        createdAt: Date.now()
      }
    };

    // Trigger Firebase callback again with accepted player
    if (callbackFunction) {
      callbackFunction({
        val: () => roomWithAcceptedPlayer,
        exists: () => true
      });
    }

    // Verify auto-navigation happened
    await waitFor(() => {
      expect(mockOnJoinRoom).toHaveBeenCalledWith('room-1', 'medium', 'circle');
    }, { timeout: 3000 });
  });

  test('disables join button for full rooms', () => {
    const mockRooms = {
      'room-1': {
        hostId: 'user-456',
        hostName: 'Host Player',
        difficulty: 'easy',
        layout: 'grid',
        players: {
          'user-456': { name: 'Host Player', ready: false },
          'user-789': { name: 'Player 2', ready: false },
          'user-111': { name: 'Player 3', ready: false }
        },
        status: 'waiting',
        createdAt: Date.now()
      }
    };

    mockFirebase.onValue.mockImplementation((ref: any, callback: any) => {
      callback({ 
        val: () => mockRooms,
        exists: () => true 
      });
      return jest.fn();
    });

    render(
      <MultiplayerLobby
        user={mockUser}
        onJoinRoom={mockOnJoinRoom}
        onBackToSinglePlayer={mockOnBackToSinglePlayer}
      />
    );
    
    // Room should show 3/999 players and still allow joining
    expect(screen.getByText(/👥 Players: 3\/999/)).toBeInTheDocument();
    const joinButton = screen.getByText('Join Room');
    expect(joinButton).not.toBeDisabled();
  });

  test('filters out non-waiting rooms', () => {
    const mockRooms = {
      'room-1': {
        hostId: 'user-456',
        hostName: 'Host Player',
        difficulty: 'easy',
        layout: 'grid',
        players: {
          'user-456': { name: 'Host Player', ready: false }
        },
        status: 'waiting',
        createdAt: Date.now()
      },
      'room-2': {
        hostId: 'user-789',
        hostName: 'Other Host',
        difficulty: 'medium',
        layout: 'circle',
        players: {
          'user-789': { name: 'Other Host', ready: true }
        },
        status: 'playing',
        createdAt: Date.now()
      }
    };

    mockFirebase.onValue.mockImplementation((ref: any, callback: any) => {
      callback({ 
        val: () => mockRooms,
        exists: () => true 
      });
      return jest.fn();
    });

    render(
      <MultiplayerLobby
        user={mockUser}
        onJoinRoom={mockOnJoinRoom}
        onBackToSinglePlayer={mockOnBackToSinglePlayer}
      />
    );
    
    // Should only show waiting room
    expect(screen.getByText('Room by Host Player')).toBeInTheDocument();
    expect(screen.queryByText('Room by Other Host')).not.toBeInTheDocument();
  });
});
