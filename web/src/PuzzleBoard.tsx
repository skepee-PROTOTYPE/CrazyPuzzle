import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import styles from './PuzzleBoard.module.scss';

interface PuzzleBoardProps {
  difficulty: 'easy' | 'medium' | 'hard' | string;
  layout: string;
  user?: User | null;
  onScore?: (score: number, timer: number) => void;
  onComplete?: () => void;
}

function PuzzleBoard({ difficulty, layout, user, onScore, onComplete }: PuzzleBoardProps) {
  const gridSizes: Record<'easy' | 'medium' | 'hard', number> = { easy: 4, medium: 6, hard: 8 };
  const gridSize = gridSizes[difficulty as 'easy' | 'medium' | 'hard'] || 4;
  const totalTiles = gridSize * gridSize;
  
  const [tiles, setTiles] = useState<number[]>([]);
  const [flippedTiles, setFlippedTiles] = useState<number[]>([]);
  const [matchedTiles, setMatchedTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);

  // Check if current layout is implemented
  const isLayoutImplemented = layout === 'grid';

  // Initialize game
  useEffect(() => {
    if (!isLayoutImplemented) return;
    
    const numbers = Array.from({ length: totalTiles / 2 }, (_, i) => i + 1);
    const shuffledTiles = [...numbers, ...numbers].sort(() => Math.random() - 0.5);
    setTiles(shuffledTiles);
    setFlippedTiles([]);
    setMatchedTiles([]);
    setMoves(0);
    setTimer(0);
    setGameStarted(false);
    setGameCompleted(false);
  }, [difficulty, layout, totalTiles, isLayoutImplemented]);

  // Timer effect
  useEffect(() => {
    if (gameStarted && !gameCompleted && isLayoutImplemented) {
      const interval = setInterval(() => setTimer(prev => prev + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [gameStarted, gameCompleted, isLayoutImplemented]);

  // Check for matches
  useEffect(() => {
    if (!isLayoutImplemented) return;
    
    if (flippedTiles.length === 2) {
      const [first, second] = flippedTiles;
      if (tiles[first] === tiles[second]) {
        setMatchedTiles(prev => [...prev, first, second]);
        setFlippedTiles([]);
      } else {
        setTimeout(() => setFlippedTiles([]), 1000);
      }
    }
  }, [flippedTiles, tiles, isLayoutImplemented]);

  const saveScore = useCallback(async (score: number, time: number) => {
    if (!user) return;
    
    try {
      await addDoc(collection(db, 'scores'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        score,
        time,
        difficulty,
        layout,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error saving score:', error);
    }
  }, [user, difficulty, layout]);

  // Check game completion
  useEffect(() => {
    if (!isLayoutImplemented) return;
    
    if (matchedTiles.length === totalTiles && totalTiles > 0) {
      setGameCompleted(true);
      const score = Math.max(1000 - moves * 10 - timer, 100);
      
      if (user && onScore) {
        onScore(score, timer);
        saveScore(score, timer);
      }
      
      if (onComplete) {
        onComplete();
      }
    }
  }, [matchedTiles.length, totalTiles, moves, timer, user, onScore, onComplete, saveScore, isLayoutImplemented]);

  const handleTileClick = (index: number) => {
    if (!isLayoutImplemented) return;
    
    if (!gameStarted) setGameStarted(true);
    
    if (flippedTiles.length === 2 || flippedTiles.includes(index) || matchedTiles.includes(index)) {
      return;
    }

    setFlippedTiles(prev => [...prev, index]);
    setMoves(prev => prev + 1);
  };

  const resetGame = () => {
    if (!isLayoutImplemented) return;
    
    const numbers = Array.from({ length: totalTiles / 2 }, (_, i) => i + 1);
    const shuffledTiles = [...numbers, ...numbers].sort(() => Math.random() - 0.5);
    setTiles(shuffledTiles);
    setFlippedTiles([]);
    setMatchedTiles([]);
    setMoves(0);
    setTimer(0);
    setGameStarted(false);
    setGameCompleted(false);
  };

  return (
    <div className={styles.boardCard}>
      <h3 className={styles.boardTitle}>
        Puzzle Board - {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ({gridSize}x{gridSize}) - {layout.charAt(0).toUpperCase() + layout.slice(1)} Layout
      </h3>
      
      {!isLayoutImplemented ? (
        // Show "Coming Soon" message for unimplemented layouts
        <div className={styles.comingSoon}>
          <div className={styles.comingSoonIcon}>🚧</div>
          <h4 className={styles.comingSoonTitle}>Coming Soon!</h4>
          <p className={styles.comingSoonText}>
            The <strong>{layout.charAt(0).toUpperCase() + layout.slice(1)}</strong> layout is under development.
          </p>
          <p className={styles.comingSoonSubtext}>
            Please select <strong>Grid</strong> layout to play the game.
          </p>
        </div>
      ) : (
        // Show the actual game for implemented layouts (grid)
        <>
          <div style={{ '--grid-size': gridSize } as React.CSSProperties} className={styles.puzzleGrid}>
            {tiles.map((number, index) => (
              <div
                key={index}
                className={`${styles.tile} ${flippedTiles.includes(index) || matchedTiles.includes(index) ? styles.flipped : ''} ${matchedTiles.includes(index) ? styles.matched : ''}`}
                onClick={() => handleTileClick(index)}
              >
                <div className={styles.tileInner}>
                  <div className={styles.tileFront}></div>
                  <div className={styles.tileBack}>{number}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p>Moves: {moves} | Time: {timer}s</p>
            <button onClick={resetGame} className={styles.btn}>New Game</button>
          </div>

          {gameCompleted && (
            <div className={styles.congratsMsg}>
              🎉 Congratulations! You completed the puzzle in {moves} moves and {timer} seconds!
              {user ? (
                <p>Score: {Math.max(1000 - moves * 10 - timer, 100)} (Saved to leaderboard!)</p>
              ) : (
                <div>
                  <p>Score: {Math.max(1000 - moves * 10 - timer, 100)}</p>
                  <p className={styles.guestHint}>
                    💡 Sign in with Google to save your high scores to the leaderboard!
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PuzzleBoard;