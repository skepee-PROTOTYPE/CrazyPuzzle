/// <reference types="jest" />
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SinglePlayerGame from './SinglePlayerGame';
import { User } from 'firebase/auth';

// Mock Firebase modules
jest.mock('./firebase', () => ({
  realtimeDb: {},
  auth: { 
    currentUser: null
  }
}));

// Mock components
jest.mock('./PuzzleBoard', () => ({
  __esModule: true,
  default: ({ difficulty, layout, user, onScore }: any) => (
    <div data-testid="puzzle-board">
      Mock Puzzle Board - {difficulty} - {layout}
    </div>
  )
}));

jest.mock('./Leaderboard', () => ({
  __esModule: true,
  default: ({ difficulty, layout, score, timer }: any) => (
    <div data-testid="leaderboard">
      Mock Leaderboard - {difficulty} - {layout} - Score: {score} - Time: {timer}
    </div>
  )
}));

jest.mock('./AdBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="ad-banner">Mock Ad Banner</div>
}));

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

describe('SinglePlayerGame', () => {
  const mockOnBackToMenu = jest.fn();
  const mockOnSignInWithGoogle = jest.fn();
  const mockOnSignOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    const { container } = render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    expect(container).toBeInTheDocument();
  });

  test('displays game title', () => {
    render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    expect(screen.getByText('🧩 CrazyPuzzle')).toBeInTheDocument();
  });

  test('displays back to menu button', () => {
    render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    const backButton = screen.getByText('← Back to Menu');
    expect(backButton).toBeInTheDocument();
  });

  test('calls onBackToMenu when back button is clicked', () => {
    render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    const backButton = screen.getByText('← Back to Menu');
    fireEvent.click(backButton);
    expect(mockOnBackToMenu).toHaveBeenCalledTimes(1);
  });

  test('displays game settings section', () => {
    render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    expect(screen.getByText('Game Settings')).toBeInTheDocument();
  });

  test('displays difficulty selector', () => {
    render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    expect(screen.getByTestId('difficulty-selector')).toBeInTheDocument();
  });

  test('displays puzzle board', () => {
    render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    expect(screen.getByTestId('puzzle-board')).toBeInTheDocument();
  });

  test('displays leaderboard', () => {
    render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    expect(screen.getByTestId('leaderboard')).toBeInTheDocument();
  });

  test('displays ad banner', () => {
    render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    expect(screen.getByTestId('ad-banner')).toBeInTheDocument();
  });

  test('displays initial score as 0', () => {
    render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    const scoreBoxes = screen.getAllByText(/Score: 0/);
    expect(scoreBoxes.length).toBeGreaterThan(0);
  });

  test('displays initial timer as 0', () => {
    render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    const timerBoxes = screen.getAllByText(/Time: 0/);
    expect(timerBoxes.length).toBeGreaterThan(0);
  });

  test('shows guest mode message when user is not logged in', () => {
    render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    expect(screen.getByText(/You can play as a guest!/)).toBeInTheDocument();
    expect(screen.getByText(/Sign in to save your high scores/)).toBeInTheDocument();
  });

  test('shows sign in button when user is not logged in', () => {
    render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  test('calls onSignInWithGoogle when sign in button is clicked', () => {
    render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    const signInButton = screen.getByText('Sign in with Google');
    fireEvent.click(signInButton);
    expect(mockOnSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  test('displays user info when logged in', () => {
    const mockUser = {
      uid: 'user-123',
      displayName: 'Test User',
      email: 'test@example.com',
      photoURL: 'https://example.com/photo.jpg'
    } as User;

    render(
      <SinglePlayerGame
        user={mockUser}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    
    expect(screen.getByText(/Logged in as Test User/)).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  test('shows sign out button when user is logged in', () => {
    const mockUser = {
      uid: 'user-123',
      displayName: 'Test User',
      email: 'test@example.com',
      photoURL: 'https://example.com/photo.jpg'
    } as User;

    render(
      <SinglePlayerGame
        user={mockUser}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  test('calls onSignOut when sign out button is clicked', () => {
    const mockUser = {
      uid: 'user-123',
      displayName: 'Test User',
      email: 'test@example.com',
      photoURL: 'https://example.com/photo.jpg'
    } as User;

    render(
      <SinglePlayerGame
        user={mockUser}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    
    const signOutButton = screen.getByText('Sign Out');
    fireEvent.click(signOutButton);
    expect(mockOnSignOut).toHaveBeenCalledTimes(1);
  });

  test('shows guest mode warning in score row when not logged in', () => {
    render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    
    expect(screen.getByText('Guest Mode - Sign in to save scores')).toBeInTheDocument();
  });

  test('does not show guest mode warning when logged in', () => {
    const mockUser = {
      uid: 'user-123',
      displayName: 'Test User',
      email: 'test@example.com',
      photoURL: 'https://example.com/photo.jpg'
    } as User;

    render(
      <SinglePlayerGame
        user={mockUser}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    
    expect(screen.queryByText('Guest Mode - Sign in to save scores')).not.toBeInTheDocument();
  });

  test('can change difficulty', () => {
    render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    
    const difficultySelect = screen.getByTestId('difficulty-select');
    fireEvent.change(difficultySelect, { target: { value: 'hard' } });
    
    expect(difficultySelect).toHaveValue('hard');
  });

  test('can change layout', () => {
    render(
      <SinglePlayerGame
        user={null}
        onBackToMenu={mockOnBackToMenu}
        onSignInWithGoogle={mockOnSignInWithGoogle}
        onSignOut={mockOnSignOut}
      />
    );
    
    const layoutSelect = screen.getByTestId('layout-select');
    fireEvent.change(layoutSelect, { target: { value: 'circle' } });
    
    expect(layoutSelect).toHaveValue('circle');
  });
});
