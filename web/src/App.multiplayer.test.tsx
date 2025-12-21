import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Mock Firebase modules
jest.mock('./firebase', () => ({
  auth: { currentUser: null },
  db: {},
  realtimeDb: {}
}));

// Mock components
jest.mock('./PuzzleBoard', () => ({
  __esModule: true,
  default: () => <div>Mock Puzzle Board</div>
}));

jest.mock('./Leaderboard', () => ({
  __esModule: true,
  default: () => <div>Mock Leaderboard</div>
}));

jest.mock('./AdBanner', () => ({
  __esModule: true,
  default: () => <div>Mock Ad Banner</div>
}));

jest.mock('./MultiplayerLobby', () => ({
  __esModule: true,
  default: () => <div>Mock Multiplayer Lobby</div>
}));

jest.mock('./MultiplayerGame', () => ({
  __esModule: true,
  default: () => <div>Mock Multiplayer Game</div>
}));

describe('App', () => {
  test('renders main menu', () => {
    render(<App />);
    expect(screen.getByText('🧩 CrazyPuzzle')).toBeInTheDocument();
  });

  test('shows single and multiplayer options', () => {
    render(<App />);
    expect(screen.getByText('Single Player')).toBeInTheDocument();
    expect(screen.getByText('Multiplayer')).toBeInTheDocument();
  });
});
