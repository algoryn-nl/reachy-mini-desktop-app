import React, { memo } from 'react';

/**
 * Ultra-optimized wheel item component
 * - No MUI components (raw DOM = faster)
 * - Rotation handled by CSS variable from parent (no re-render needed)
 * - Minimal props comparison
 */
const WheelItem = memo(({
  item,
  x,
  y,
  isSelected,
  isBusy,
  emojiSize,
  activeTab,
  onItemClick,
  listIndex,
}) => {
  const displayEmoji = item.emoji || (activeTab === 'emotions' ? '😐' : '🎵');

  return (
    <div
      role="option"
      aria-selected={isSelected}
      id={`wheel-item-${listIndex}`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onItemClick(e, item, listIndex);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: emojiSize + 40,
        height: emojiSize + 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isSelected ? 'pointer' : 'default',
        opacity: isBusy && !isSelected ? 0.3 : 1,
        filter: isBusy && !isSelected ? 'grayscale(50%)' : 'none',
        // Counter-rotation via CSS variable (set on parent) - no JS re-render!
        transform: `translate(-50%, -50%) rotate(var(--wheel-counter-rotation, 0deg)) ${isSelected ? 'scale(1.15)' : 'scale(1)'}`,
        transition: 'transform 0.15s ease-out, opacity 0.15s',
        willChange: 'transform',
        pointerEvents: 'auto',
      }}
    >
      <span
        aria-label={item.label}
        style={{
          fontSize: emojiSize,
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {displayEmoji}
      </span>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these change (rotation removed!)
  return (
    prevProps.x === nextProps.x &&
    prevProps.y === nextProps.y &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isBusy === nextProps.isBusy &&
    prevProps.emojiSize === nextProps.emojiSize &&
    prevProps.listIndex === nextProps.listIndex &&
    prevProps.item.emoji === nextProps.item.emoji
  );
});

WheelItem.displayName = 'WheelItem';

export default WheelItem;

