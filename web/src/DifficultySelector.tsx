import React from 'react';
import styles from './DifficultySelector.module.scss';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Layout = 'grid' | 'circle' | 'diamond';

interface DifficultySelectorProps {
  difficulty: Difficulty;
  layout?: Layout;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onLayoutChange?: (layout: Layout) => void;
  showLayout?: boolean;
  compact?: boolean;
}

function DifficultySelector({ 
  difficulty, 
  layout, 
  onDifficultyChange, 
  onLayoutChange,
  showLayout = true,
  compact = false
}: DifficultySelectorProps) {
  return (
    <div className={compact ? styles.compactContainer : styles.container}>
      <div className={styles.selectorGroup}>
        <label className={styles.label}>Difficulty:</label>
        <select 
          value={difficulty} 
          onChange={(e) => onDifficultyChange(e.target.value as Difficulty)}
          className={styles.select}
        >
          <option value="easy">Easy (4x4)</option>
          <option value="medium">Medium (6x6)</option>
          <option value="hard">Hard (8x8)</option>
        </select>
      </div>

      {showLayout && layout !== undefined && onLayoutChange && (
        <div className={styles.selectorGroup}>
          <label className={styles.label}>Layout:</label>
          <select 
            value={layout} 
            onChange={(e) => onLayoutChange(e.target.value as Layout)}
            className={styles.select}
          >
            <option value="grid">Grid</option>
            <option value="circle">Circle</option>
            <option value="diamond">Diamond</option>
          </select>
        </div>
      )}
    </div>
  );
}

export default DifficultySelector;
