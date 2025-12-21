import React from 'react';
import { render, screen } from '@testing-library/react';
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

// Mock components
jest.mock('./AdBanner', () => ({
  __esModule: true,
  default: () => <div>Mock Ad Banner</div>
}));

const mockFunctions = jest.requireMock('firebase/database');

describe('MultiplayerLobby', () => {
  const mockOnJoinRoom = jest.fn();
  const mockOnBackToSinglePlayer = jest.fn();
  const mockUser = {
    uid: 'user-123',
    displayName: 'Test User',
    email: 'test@example.com'
  } as User;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock implementation
    mockFunctions.onValue.mockImplementation((ref: any, callback: any) => {
      callback({ val: () => null, exists: () => false });
      return () => {}; // unsubscribe
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

  test('shows no rooms message', () => {
    render(
      <MultiplayerLobby
        user={mockUser}
        onJoinRoom={mockOnJoinRoom}
        onBackToSinglePlayer={mockOnBackToSinglePlayer}
      />
    );
    expect(screen.getByText('No rooms available. Create one to start!')).toBeInTheDocument();
  });
});
