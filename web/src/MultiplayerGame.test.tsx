import React from 'react';
import { render, screen } from '@testing-library/react';
import MultiplayerGame from './MultiplayerGame';

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
jest.mock('./PuzzleBoard', () => ({
  __esModule: true,
  default: () => <div>Mock Puzzle Board</div>
}));

jest.mock('./AdBanner', () => ({
  __esModule: true,
  default: () => <div>Mock Ad Banner</div>
}));

const mockFunctions = jest.requireMock('firebase/database');

describe('MultiplayerGame', () => {
  const mockOnLeaveRoom = jest.fn();
  const mockUser = {
    uid: 'user-123',
    displayName: 'Test User',
    email: 'test@example.com'
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock implementation for onValue
    mockFunctions.onValue.mockImplementation((ref: any, callback: any) => {
      callback({
        val: () => ({
          hostId: 'user-123',
          difficulty: 'easy',
          players: {
            'user-123': { name: 'Test User', ready: false }
          },
          gameStarted: false
        }),
        exists: () => true
      });
      return () => {}; // unsubscribe
    });
  });

  test('renders without crashing', () => {
    const { container } = render(<MultiplayerGame roomId="room-123" user={mockUser as any} difficulty="easy" onLeaveRoom={mockOnLeaveRoom} />);
    expect(container).toBeInTheDocument();
  });

  test('displays game content', () => {
    const { container } = render(<MultiplayerGame roomId="room-123" user={mockUser as any} difficulty="easy" onLeaveRoom={mockOnLeaveRoom} />);
    // Just check that something rendered
    expect(container.firstChild).toBeTruthy();
  });
});
