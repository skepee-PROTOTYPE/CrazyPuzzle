import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { User } from 'firebase/auth';
import './PuzzleBoard.scss';

// Add this props interface
interface PuzzleBoardProps {
  difficulty: 'easy' | 'medium' | 'hard' | string;
  layout: string;
  user?: User | null;
  onScore?: (score: number, timer: number) => void;
  onComplete?: () => void;
}

// Use the typed props here
function PuzzleBoard({ difficulty, layout, user, onScore, onComplete }: PuzzleBoardProps) {
  const gridSizes: Record<'easy' | 'medium' | 'hard', number> = { easy: 4, medium: 6, hard: 8 };
  const gridSize = gridSizes[difficulty as 'easy' | 'medium' | 'hard'] ?? 4;

  const animalImages = useMemo(() => [
    'https://cdn-icons-png.flaticon.com/512/616/616408.png',
    'https://cdn-icons-png.flaticon.com/512/616/616430.png',
    'https://cdn-icons-png.flaticon.com/512/616/616415.png',
    'https://cdn-icons-png.flaticon.com/512/616/616426.png',
    'https://cdn-icons-png.flaticon.com/512/616/616418.png',
    'https://cdn-icons-png.flaticon.com/512/616/616420.png',
    'https://cdn-icons-png.flaticon.com/512/616/616424.png',
    'https://cdn-icons-png.flaticon.com/512/616/616422.png',
  ], []);

  const generateTiles = useCallback(() => {
    const totalTiles = gridSize * gridSize;
    let values: (string | number)[] = [];
    if (difficulty === 'easy') {
      let pairsNeeded = totalTiles / 2;
      let selectedImages: string[] = [];
      for (let i = 0; i < pairsNeeded; i++) {
        selectedImages.push(animalImages[i % animalImages.length]);
      }
      selectedImages.forEach(img => {
        return values.push(img, img);
      });
    } else {
      for (let i = 1; i <= totalTiles / 2; i++) {
        values.push(i, i);
      }
    }
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
  }, [difficulty, gridSize, animalImages]);

  const [tiles, setTiles] = useState<(string | number)[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setTiles(generateTiles());
    setFlipped([]);
    setMatched([]);
    setScore(0);
    setTimer(0);
    setIsActive(true);
  }, [difficulty, layout, generateTiles]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && matched.length < tiles.length) {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    } else if (!isActive || matched.length === tiles.length) {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, matched, tiles.length]);

  useEffect(() => {
    if (matched.length === tiles.length && matched.length > 0 && user) {
      if (onScore) onScore(score, timer);
      if (onComplete) onComplete();
    }
  }, [matched, tiles.length, score, timer, user, onScore, onComplete]);

  const handleTileClick = (idx: number) => {
    if (flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return;
    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);
    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      if (tiles[first] === tiles[second]) {
        setTimeout(() => {
          setMatched([...matched, first, second]);
          setFlipped([]);
          setScore(s => s + 10);
        }, 700);
      } else {
        setTimeout(() => setFlipped([]), 700);
      }
    }
  };

  return (
    <div className="board-card">
      <h2 className="board-title">Crazy Puzzle Board</h2>
      {layout === 'grid' ? (
        <div
          className="puzzle-grid"
          style={{ ['--grid-size' as string]: gridSize } as React.CSSProperties}
        >
          {tiles.map((val, idx) => (
            <div
              key={idx}
              onClick={() => handleTileClick(idx)}
              className={`tile${flipped.includes(idx) || matched.includes(idx) ? ' flipped' : ''}`}
            >
              {(matched.includes(idx) || flipped.includes(idx)) ? (
                difficulty === 'easy' ? (
                  <img src={typeof val === 'string' ? val : ''} alt="animal" className="tile-img" />
                ) : (
                  val
                )
              ) : '?'}
            </div>
          ))}
        </div>
      ) : (
        <p>Other layouts coming soon!</p>
      )}
      {matched.length === tiles.length && (
        <div className="congrats-msg">
          🎉 Congratulations! You completed the puzzle.<br />Final Score: {score} | Time: {timer}s
        </div>
      )}
    </div>
  );
}

export default PuzzleBoard;