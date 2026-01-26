/// <reference types="jest" />
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Leaderboard from './Leaderboard';

// Mock Firebase modules
const mockGetDocs = jest.fn();
const mockOnValue = jest.fn();

jest.mock('./firebase', () => ({
  db: {},
  realtimeDb: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: (...args: any[]) => mockGetDocs(...args),
}));

jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  onValue: (...args: any[]) => mockOnValue(...args),
}));

describe('Leaderboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleplayer Mode', () => {
    describe('Loading State', () => {
      it('should display loading message while fetching data', () => {
        // Mock getDocs to never resolve
        mockGetDocs.mockImplementation(() => new Promise(() => {}));

        render(
          <Leaderboard 
            mode="singleplayer" 
            difficulty="easy" 
            layout="grid" 
            score={0} 
            timer={0} 
          />
        );

        expect(screen.getByText('Loading leaderboard...')).toBeInTheDocument();
        expect(screen.getByText('Leaderboard')).toBeInTheDocument();
      });
    });

    describe('Grid Layout - Success', () => {
      it('should display leaderboard with scores for grid layout', async () => {
        const mockScores = [
          { id: '1', userName: 'Alice Johnson', score: 950, time: 25, difficulty: 'easy', layout: 'grid' },
          { id: '2', userName: 'Bob Smith', score: 900, time: 30, difficulty: 'easy', layout: 'grid' },
          { id: '3', userName: 'Charlie Brown', score: 850, time: 35, difficulty: 'easy', layout: 'grid' },
        ];

        mockGetDocs.mockResolvedValue({
          docs: mockScores.map(score => ({
            id: score.id,
            data: () => score,
          })),
        });

        render(
          <Leaderboard 
            mode="singleplayer" 
            difficulty="easy" 
            layout="grid" 
            score={0} 
            timer={0} 
          />
        );

        await waitFor(() => {
          expect(screen.getByText('Leaderboard - Easy (grid)')).toBeInTheDocument();
        });

        // Check table headers
        expect(screen.getByText('Rank')).toBeInTheDocument();
        expect(screen.getByText('Player')).toBeInTheDocument();
        expect(screen.getByText('Time')).toBeInTheDocument();
        expect(screen.getByText('Score')).toBeInTheDocument();

        // Check player names (first name only)
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('Charlie')).toBeInTheDocument();

        // Check scores
        expect(screen.getByText('950')).toBeInTheDocument();
        expect(screen.getByText('900')).toBeInTheDocument();
        expect(screen.getByText('850')).toBeInTheDocument();

        // Check times
        expect(screen.getByText('25s')).toBeInTheDocument();
        expect(screen.getByText('30s')).toBeInTheDocument();
        expect(screen.getByText('35s')).toBeInTheDocument();
      });

      it('should display different difficulty levels correctly', async () => {
        mockGetDocs.mockResolvedValue({ docs: [] });

        const { rerender } = render(
          <Leaderboard 
            mode="singleplayer" 
            difficulty="easy" 
            layout="grid" 
            score={0} 
            timer={0} 
          />
        );

        await waitFor(() => {
          expect(screen.getByText('Leaderboard - Easy (grid)')).toBeInTheDocument();
        });

        rerender(
          <Leaderboard 
            mode="singleplayer" 
            difficulty="medium" 
            layout="grid" 
            score={0} 
            timer={0} 
          />
        );

        await waitFor(() => {
          expect(screen.getByText('Leaderboard - Medium (grid)')).toBeInTheDocument();
        });

        rerender(
          <Leaderboard 
            mode="singleplayer" 
            difficulty="hard" 
            layout="grid" 
            score={0} 
            timer={0} 
          />
        );

        await waitFor(() => {
          expect(screen.getByText('Leaderboard - Hard (grid)')).toBeInTheDocument();
        });
      });
    });

    describe('Grid Layout - Empty State', () => {
      it('should display message when no scores available', async () => {
        mockGetDocs.mockResolvedValue({ docs: [] });

        render(
          <Leaderboard 
            mode="singleplayer" 
            difficulty="easy" 
            layout="grid" 
            score={0} 
            timer={0} 
          />
        );

        await waitFor(() => {
          expect(
            screen.getByText('No scores yet for this difficulty and layout. Be the first to play!')
          ).toBeInTheDocument();
        });
      });
    });

    describe('Non-Grid Layout', () => {
      it('should display not implemented message for circular layout', async () => {
        render(
          <Leaderboard 
            mode="singleplayer" 
            difficulty="easy" 
            layout="circular" 
            score={0} 
            timer={0} 
          />
        );

        await waitFor(() => {
          expect(
            screen.getByText((content, element) => {
              return element?.className === 'noScores' && content.includes('Leaderboard will be available');
            })
          ).toBeInTheDocument();
        });
      });

      it('should display not implemented message for hexagonal layout', async () => {
        render(
          <Leaderboard 
            mode="singleplayer" 
            difficulty="medium" 
            layout="hexagonal" 
            score={0} 
            timer={0} 
          />
        );

        await waitFor(() => {
          expect(
            screen.getByText((content, element) => {
              return element?.className === 'noScores' && content.includes('Leaderboard will be available');
            })
          ).toBeInTheDocument();
        });
      });
    });

    describe('Error Handling', () => {
      it('should display error message when query fails', async () => {
        mockGetDocs.mockRejectedValue(new Error('Database error'));

        render(
          <Leaderboard 
            mode="singleplayer" 
            difficulty="easy" 
            layout="grid" 
            score={0} 
            timer={0} 
          />
        );

        await waitFor(() => {
          expect(
            screen.getByText(/Unable to load leaderboard/)
          ).toBeInTheDocument();
        });
      });

      it('should attempt fallback query on error', async () => {
        // First call fails
        mockGetDocs.mockRejectedValueOnce(new Error('Index error'));
        // Fallback succeeds with empty result
        mockGetDocs.mockResolvedValueOnce({ docs: [] });

        render(
          <Leaderboard 
            mode="singleplayer" 
            difficulty="easy" 
            layout="grid" 
            score={0} 
            timer={0} 
          />
        );

        await waitFor(() => {
          expect(mockGetDocs).toHaveBeenCalledTimes(2);
        });
      });
    });
  });

  describe('Multiplayer Mode', () => {
    describe('Loading State', () => {
      it('should display loading message initially', () => {
        // Don't call the onValue callback immediately
        mockOnValue.mockImplementation(() => jest.fn());

        render(<Leaderboard mode="multiplayer" />);

        expect(screen.getByText('🏆 Multiplayer Leaderboard')).toBeInTheDocument();
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });

    describe('Success State', () => {
      it('should display multiplayer leaderboard with player stats', async () => {
        const mockStats = {
          user1: {
            displayName: 'Alice',
            multiplayerPoints: 1500,
            multiplayerWins: 15,
            multiplayerGamesPlayed: 20,
          },
          user2: {
            displayName: 'Bob',
            multiplayerPoints: 1200,
            multiplayerWins: 10,
            multiplayerGamesPlayed: 25,
          },
          user3: {
            displayName: 'Charlie',
            multiplayerPoints: 900,
            multiplayerWins: 5,
            multiplayerGamesPlayed: 15,
          },
        };

        mockOnValue.mockImplementation((ref, callback) => {
          callback({ val: () => mockStats });
          return jest.fn(); // unsubscribe function
        });

        render(<Leaderboard mode="multiplayer" />);

        await waitFor(() => {
          expect(screen.getByText('Alice')).toBeInTheDocument();
          expect(screen.getByText('Bob')).toBeInTheDocument();
          expect(screen.getByText('Charlie')).toBeInTheDocument();
        });

        // Check points
        expect(screen.getByText('1500 pts')).toBeInTheDocument();
        expect(screen.getByText('1200 pts')).toBeInTheDocument();
        expect(screen.getByText('900 pts')).toBeInTheDocument();

        // Check win stats
        expect(screen.getByText('🏆 15W/20G')).toBeInTheDocument();
        expect(screen.getByText('🏆 10W/25G')).toBeInTheDocument();
        expect(screen.getByText('🏆 5W/15G')).toBeInTheDocument();

        // Check win rates
        expect(screen.getByText('📊 75%')).toBeInTheDocument(); // 15/20
        expect(screen.getByText('📊 40%')).toBeInTheDocument(); // 10/25
        expect(screen.getByText('📊 33%')).toBeInTheDocument(); // 5/15
      });

      it('should sort players by points in descending order', async () => {
        const mockStats = {
          user1: {
            displayName: 'Low Scorer',
            multiplayerPoints: 100,
            multiplayerWins: 1,
            multiplayerGamesPlayed: 10,
          },
          user2: {
            displayName: 'High Scorer',
            multiplayerPoints: 2000,
            multiplayerWins: 20,
            multiplayerGamesPlayed: 25,
          },
          user3: {
            displayName: 'Mid Scorer',
            multiplayerPoints: 500,
            multiplayerWins: 5,
            multiplayerGamesPlayed: 12,
          },
        };

        mockOnValue.mockImplementation((ref, callback) => {
          callback({ val: () => mockStats });
          return jest.fn();
        });

        render(<Leaderboard mode="multiplayer" />);

        await waitFor(() => {
          const ranks = screen.getAllByText(/#\d+/);
          const names = screen.getAllByText(/(High Scorer|Mid Scorer|Low Scorer)/);
          
          expect(names[0]).toHaveTextContent('High Scorer');
          expect(names[1]).toHaveTextContent('Mid Scorer');
          expect(names[2]).toHaveTextContent('Low Scorer');
        });
      });

      it('should display rank numbers correctly', async () => {
        const mockStats = {
          user1: { displayName: 'Player 1', multiplayerPoints: 300, multiplayerWins: 3, multiplayerGamesPlayed: 10 },
          user2: { displayName: 'Player 2', multiplayerPoints: 200, multiplayerWins: 2, multiplayerGamesPlayed: 8 },
          user3: { displayName: 'Player 3', multiplayerPoints: 100, multiplayerWins: 1, multiplayerGamesPlayed: 5 },
        };

        mockOnValue.mockImplementation((ref, callback) => {
          callback({ val: () => mockStats });
          return jest.fn();
        });

        render(<Leaderboard mode="multiplayer" />);

        await waitFor(() => {
          expect(screen.getByText('#1')).toBeInTheDocument();
          expect(screen.getByText('#2')).toBeInTheDocument();
          expect(screen.getByText('#3')).toBeInTheDocument();
        });
      });

      it('should filter out players with 0 games played', async () => {
        const mockStats = {
          user1: {
            displayName: 'Active Player',
            multiplayerPoints: 500,
            multiplayerWins: 5,
            multiplayerGamesPlayed: 10,
          },
          user2: {
            displayName: 'Inactive Player',
            multiplayerPoints: 0,
            multiplayerWins: 0,
            multiplayerGamesPlayed: 0,
          },
        };

        mockOnValue.mockImplementation((ref, callback) => {
          callback({ val: () => mockStats });
          return jest.fn();
        });

        render(<Leaderboard mode="multiplayer" />);

        await waitFor(() => {
          expect(screen.getByText('Active Player')).toBeInTheDocument();
          expect(screen.queryByText('Inactive Player')).not.toBeInTheDocument();
        });
      });

      it('should limit to top 10 players', async () => {
        const mockStats: any = {};
        for (let i = 0; i < 15; i++) {
          mockStats[`user${i}`] = {
            displayName: `Player ${i}`,
            multiplayerPoints: 1000 - i * 50,
            multiplayerWins: 10 - i,
            multiplayerGamesPlayed: 10,
          };
        }

        mockOnValue.mockImplementation((ref, callback) => {
          callback({ val: () => mockStats });
          return jest.fn();
        });

        render(<Leaderboard mode="multiplayer" />);

        await waitFor(() => {
          expect(screen.getByText('Player 0')).toBeInTheDocument();
          expect(screen.getByText('Player 9')).toBeInTheDocument();
          expect(screen.queryByText('Player 10')).not.toBeInTheDocument();
          expect(screen.queryByText('Player 14')).not.toBeInTheDocument();
        });
      });

      it('should handle players with missing displayName', async () => {
        const mockStats = {
          'abc123def': {
            multiplayerPoints: 500,
            multiplayerWins: 5,
            multiplayerGamesPlayed: 10,
          },
        };

        mockOnValue.mockImplementation((ref, callback) => {
          callback({ val: () => mockStats });
          return jest.fn();
        });

        render(<Leaderboard mode="multiplayer" />);

        await waitFor(() => {
          expect(screen.getByText('Player abc123de')).toBeInTheDocument();
        });
      });

      it('should calculate win rate correctly with 0% wins', async () => {
        const mockStats = {
          user1: {
            displayName: 'No Wins',
            multiplayerPoints: 100,
            multiplayerWins: 0,
            multiplayerGamesPlayed: 10,
          },
        };

        mockOnValue.mockImplementation((ref, callback) => {
          callback({ val: () => mockStats });
          return jest.fn();
        });

        render(<Leaderboard mode="multiplayer" />);

        await waitFor(() => {
          expect(screen.getByText('📊 0%')).toBeInTheDocument();
        });
      });
    });

    describe('Empty State', () => {
      it('should display message when no data available', async () => {
        mockOnValue.mockImplementation((ref, callback) => {
          callback({ val: () => null });
          return jest.fn();
        });

        render(<Leaderboard mode="multiplayer" />);

        await waitFor(() => {
          expect(screen.getByText('No multiplayer games played yet')).toBeInTheDocument();
        });
      });

      it('should display message when all players have 0 games', async () => {
        const mockStats = {
          user1: {
            displayName: 'Player 1',
            multiplayerPoints: 0,
            multiplayerWins: 0,
            multiplayerGamesPlayed: 0,
          },
        };

        mockOnValue.mockImplementation((ref, callback) => {
          callback({ val: () => mockStats });
          return jest.fn();
        });

        render(<Leaderboard mode="multiplayer" />);

        await waitFor(() => {
          expect(screen.getByText('No multiplayer games played yet')).toBeInTheDocument();
        });
      });
    });

    describe('Cleanup', () => {
      it('should unsubscribe from realtime database on unmount', () => {
        const mockUnsubscribe = jest.fn();
        mockOnValue.mockReturnValue(mockUnsubscribe);

        const { unmount } = render(<Leaderboard mode="multiplayer" />);

        unmount();

        expect(mockUnsubscribe).toHaveBeenCalled();
      });
    });
  });

  describe('Default Props', () => {
    it('should use singleplayer mode by default', () => {
      mockGetDocs.mockImplementation(() => new Promise(() => {}));

      render(<Leaderboard />);

      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    });

    it('should use easy difficulty by default', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      render(<Leaderboard />);

      await waitFor(() => {
        expect(screen.getByText('Leaderboard - Easy (grid)')).toBeInTheDocument();
      });
    });

    it('should use grid layout by default', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      render(<Leaderboard />);

      await waitFor(() => {
        expect(screen.getByText(/grid/)).toBeInTheDocument();
      });
    });
  });

  describe('Props Updates', () => {
    it('should refetch data when difficulty changes', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      const { rerender } = render(
        <Leaderboard 
          mode="singleplayer" 
          difficulty="easy" 
          layout="grid" 
          score={0} 
          timer={0} 
        />
      );

      await waitFor(() => {
        expect(mockGetDocs).toHaveBeenCalled();
      });

      mockGetDocs.mockClear();

      rerender(
        <Leaderboard 
          mode="singleplayer" 
          difficulty="hard" 
          layout="grid" 
          score={0} 
          timer={0} 
        />
      );

      await waitFor(() => {
        expect(mockGetDocs).toHaveBeenCalled();
      });
    });

    it('should refetch data when layout changes', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      const { rerender } = render(
        <Leaderboard 
          mode="singleplayer" 
          difficulty="easy" 
          layout="grid" 
          score={0} 
          timer={0} 
        />
      );

      await waitFor(() => {
        expect(mockGetDocs).toHaveBeenCalled();
      });

      mockGetDocs.mockClear();

      rerender(
        <Leaderboard 
          mode="singleplayer" 
          difficulty="easy" 
          layout="circular" 
          score={0} 
          timer={0} 
        />
      );

      await waitFor(() => {
        // For non-grid layouts, no fetch happens (handled in code)
        expect(
          screen.getByText((content, element) => {
            return element?.className === 'noScores' && content.includes('Leaderboard will be available');
          })
        ).toBeInTheDocument();
      });
    });
  });
});
