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
  // normalize grid sizes to even totals (pairs) to avoid missing tiles
  const gridSizes: Record<'easy' | 'medium' | 'hard', number> = { easy: 4, medium: 6, hard: 8 };
  // use the mapping (fallback to 4)
  const gridSize = (gridSizes[(difficulty as 'easy' | 'medium' | 'hard')] || 4);
  const difficultyClass = (difficulty || 'easy').toLowerCase(); // 'easy' | 'medium' | 'hard'
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
    
    // ensure totalTiles is even (pairs). If odd, reduce by 1 to make it even
    const safeTotal = totalTiles % 2 === 0 ? totalTiles : totalTiles - 1;
    const pairCount = safeTotal / 2;
    const numbers = Array.from({ length: pairCount }, (_, i) => i + 1);
    const shuffledTiles = [...numbers, ...numbers].sort(() => Math.random() - 0.5);

    // if grid has an extra cell (odd), fill with a placeholder (0) — though mapping above uses even totals
    if (shuffledTiles.length < totalTiles) shuffledTiles.push(0);

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

  // Inline CSS variable for SCSS --grid-size
  const gridStyle: React.CSSProperties = {
    ['--grid-size' as any]: gridSize
  };
 // debug mapped class names
  // Also log actual DOM classes after render if needed

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
          <div
            // apply both module classes: puzzleGrid + difficulty (module lookup ensures hashed name)
            className={`${styles.puzzleGrid} ${styles[difficultyClass] || ''}`}
            style={gridStyle}
            role="grid"
            aria-label={`Puzzle grid ${difficulty}`}
          >
            {tiles.map((tile, i) => {
              const isFlipped = flippedTiles.includes(i) || matchedTiles.includes(i);
              return (
                <div
                  key={i}
                  className={styles.tile}
                  onClick={() => handleTileClick(i)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTileClick(i); }}
                >
                  <div className={styles.tileInner} style={{ width: '100%', height: '100%' }}>
                    {isFlipped ? (
                      <div className={styles.tileBack}>{tile !== 0 ? tile : ''}</div>
                    ) : (
                      <div className={styles.tileFront} />
                    )}
                  </div>
                </div>
              );
            })}
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