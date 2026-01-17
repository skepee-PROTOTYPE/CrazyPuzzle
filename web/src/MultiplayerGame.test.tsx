/// <reference types="jest" />
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MultiplayerGame from './MultiplayerGame';
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
  onValue: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}));

const mockFirebase = jest.requireMock('firebase/database');

describe('MultiplayerGame', () => {
  const mockOnLeaveRoom = jest.fn();
  const mockUser = {
    uid: 'user-123',
    displayName: 'Test User',
    email: 'test@example.com',
    photoURL: 'https://example.com/photo.jpg'
  } as User;

  const mockGameStateWaiting = {
    hostId: 'user-123',
    difficulty: 'easy',
    layout: 'grid',
    players: {
      'user-123': { name: 'Test User', ready: false, score: 0, matchedTiles: [] }
    },
    status: 'waiting',
    currentTurn: 'user-123',
    tiles: []
  };

  const mockGameStatePlaying = {
    hostId: 'user-123',
    difficulty: 'easy',
    layout: 'grid',
    players: {
      'user-123': { name: 'Test User', ready: true, score: 10, matchedTiles: [0, 1] },
      'user-456': { name: 'Player 2', ready: true, score: 5, matchedTiles: [2, 3] }
    },
    status: 'playing',
    currentTurn: 'user-123',
    tiles: [1, 2, 3, 4, 1, 2, 3, 4, 5, 6, 5, 6, 7, 8, 7, 8],
    startTime: Date.now(),
    flippedTiles: []
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation for onValue
    mockFirebase.onValue.mockImplementation((ref: any, callback: any) => {
      callback({
        val: () => mockGameStateWaiting,
        exists: () => true
      });
      return jest.fn(); // unsubscribe function
    });

    // Default mock for get
    mockFirebase.get.mockResolvedValue({
      val: () => mockGameStateWaiting,
      exists: () => true
    });
  });

  test('renders without crashing', () => {
    const { container } = render(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="easy" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    expect(container).toBeInTheDocument();
  });

  test('displays game title', () => {
    render(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="easy" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    expect(screen.getByText('🎮 Multiplayer Game')).toBeInTheDocument();
  });

  test('displays difficulty and layout in game settings', () => {
    render(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="medium" 
        layout="circle"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    expect(screen.getByText(/MEDIUM.*6x6.*CIRCLE Layout/)).toBeInTheDocument();
  });

  test('displays leave room button', () => {
    render(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="easy" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    expect(screen.getByText('Leave Room')).toBeInTheDocument();
  });

  test('shows waiting room when status is waiting', () => {
    render(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="easy" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    expect(screen.getByText('Waiting for players...')).toBeInTheDocument();
  });

  test('shows ready button in waiting room', () => {
    render(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="easy" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    expect(screen.getByText("I'm Ready!")).toBeInTheDocument();
  });

  test('displays player list', () => {
    render(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="easy" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    expect(screen.getByText('Players')).toBeInTheDocument();
    expect(screen.getByText(/Test User.*\(You\)/)).toBeInTheDocument();
  });

  test('shows player ready status in waiting room', () => {
    render(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="easy" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    expect(screen.getByText('○ Not Ready')).toBeInTheDocument();
  });

  test('displays timer', () => {
    render(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="easy" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    expect(screen.getByText(/⏱️/)).toBeInTheDocument();
  });

  test('shows playing state when game is active', () => {
    mockFirebase.onValue.mockImplementation((ref: any, callback: any) => {
      callback({
        val: () => mockGameStatePlaying,
        exists: () => true
      });
      return jest.fn();
    });

    render(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="easy" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    
    expect(screen.getByText("🎯 Your Turn!")).toBeInTheDocument();
  });

  test('displays player scores during game', () => {
    mockFirebase.onValue.mockImplementation((ref: any, callback: any) => {
      callback({
        val: () => mockGameStatePlaying,
        exists: () => true
      });
      return jest.fn();
    });

    render(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="easy" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    
    expect(screen.getByText(/Score: 10/)).toBeInTheDocument();
  });

  test('calls onLeaveRoom when leave button is clicked', async () => {
    mockFirebase.get.mockResolvedValue({
      val: () => null,
      exists: () => false
    });

    render(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="easy" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    
    const leaveButton = screen.getByText('Leave Room');
    fireEvent.click(leaveButton);

    await waitFor(() => {
      expect(mockFirebase.remove).toHaveBeenCalled();
    });
  });

  test('shows finished state with final scores', () => {
    const mockGameStateFinished = {
      ...mockGameStatePlaying,
      status: 'finished'
    };

    mockFirebase.onValue.mockImplementation((ref: any, callback: any) => {
      callback({
        val: () => mockGameStateFinished,
        exists: () => true
      });
      return jest.fn();
    });

    render(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="easy" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    
    expect(screen.getByText('🎉 Game Over!')).toBeInTheDocument();
    expect(screen.getByText('Final Scores:')).toBeInTheDocument();
  });

  test('displays different grid sizes based on difficulty', () => {
    const { rerender } = render(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="easy" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    expect(screen.getByText(/EASY.*4x4/)).toBeInTheDocument();

    rerender(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="medium" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    expect(screen.getByText(/MEDIUM.*6x6/)).toBeInTheDocument();

    rerender(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="hard" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    expect(screen.getByText(/HARD.*8x8/)).toBeInTheDocument();
  });

  test('redirects when user is removed from game', () => {
    const mockGameStateNoUser = {
      ...mockGameStateWaiting,
      players: {
        'user-456': { name: 'Other Player', ready: false, score: 0, matchedTiles: [] }
      }
    };

    mockFirebase.onValue.mockImplementation((ref: any, callback: any) => {
      callback({
        val: () => mockGameStateNoUser,
        exists: () => true
      });
      return jest.fn();
    });

    render(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="easy" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    
    expect(mockOnLeaveRoom).toHaveBeenCalled();
  });

  test('redirects when room is deleted', () => {
    mockFirebase.onValue.mockImplementation((ref: any, callback: any) => {
      callback({
        val: () => null,
        exists: () => false
      });
      return jest.fn();
    });

    render(
      <MultiplayerGame 
        roomId="room-123" 
        user={mockUser} 
        difficulty="easy" 
        layout="grid"
        onLeaveRoom={mockOnLeaveRoom} 
      />
    );
    
    expect(mockOnLeaveRoom).toHaveBeenCalled();
  });
});
