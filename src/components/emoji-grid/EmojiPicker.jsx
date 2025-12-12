import React, { useMemo } from 'react';
import { EmojiGrid } from './EmojiGrid';
import { EMOTION_EMOJIS, DANCE_EMOJIS } from '@constants/choreographies';

/**
 * Emoji picker with two grids - Emotions and Dances
 * Simple grid layout, 3 rows visible with animated "show more" accordion
 */
export function EmojiPicker({
  emotions = [],
  dances = [],
  onAction,
  darkMode = false,
  disabled = false,
  searchQuery = '',
}) {
  // Prepare emotion items with emojis from constants
  const emotionItems = useMemo(() => {
    return emotions.map(item => {
      const name = typeof item === 'string' ? item : item.name;
      
      return {
        name,
        emoji: EMOTION_EMOJIS[name] || '😐',
        label: name.replace(/[0-9]+$/, '').replace(/_/g, ' '),
        originalAction: {
          name,
          type: 'emotion',
          label: name.replace(/[0-9]+$/, '').replace(/_/g, ' '),
        },
      };
    });
  }, [emotions]);
  
  // Prepare dance items with emojis from constants
  const danceItems = useMemo(() => {
    return dances.map(item => {
      const name = typeof item === 'string' ? item : item.name;
      
      return {
        name,
        emoji: DANCE_EMOJIS[name] || '🎵',
        label: name.replace(/_/g, ' '),
        originalAction: {
          name,
          type: 'dance',
          label: name.replace(/_/g, ' '),
        },
      };
    });
  }, [dances]);
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 28,
      width: '100%',
    }}>
      {/* Emotions grid */}
      {emotionItems.length > 0 && (
        <EmojiGrid
          items={emotionItems}
          title="Emotions"
          onAction={onAction}
          darkMode={darkMode}
          disabled={disabled}
          searchQuery={searchQuery}
        />
      )}
      
      {/* Dances grid */}
      {danceItems.length > 0 && (
        <EmojiGrid
          items={danceItems}
          title="Dances"
          onAction={onAction}
          darkMode={darkMode}
          disabled={disabled}
          searchQuery={searchQuery}
        />
      )}
    </div>
  );
}
