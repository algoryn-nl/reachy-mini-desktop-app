import { useMemo } from 'react';
import { TOP_ANGLE } from '@utils/wheel/constants';
import { normalizeIndex } from '@utils/wheel/normalization';

/**
 * Hook to calculate visible items for virtualization
 * PERFORMANCE OPTIMIZED: Only renders ~240° of items (visible arc + buffer)
 * 
 * @param {Array} displayItems - All available items
 * @param {number} rotation - Current rotation in degrees
 * @param {number} gap - Gap between items in degrees
 * @returns {Array} Array of visible items with angle, listIndex, rawIndex
 */
export const useWheelVirtualization = (displayItems, rotation, gap) => {
  const itemCount = displayItems.length;
  
  return useMemo(() => {
    // Validation
    if (!gap || gap <= 0 || !itemCount || !displayItems?.length) {
      return [];
    }
    
    // Calculate center item (at top of wheel)
    const rotationOffset = rotation / gap;
    const centerItemIndex = Math.round(rotationOffset);
    
    // Only render 240° arc (120° each side) - enough for visible area + gradient buffer
    // With gap=30°, this is about 8 items total instead of 12+
    const visibleArcDegrees = 240;
    const itemsInArc = Math.ceil(visibleArcDegrees / gap / 2) + 1;
    
    const visible = [];
    const seenAngles = new Set();
    
    for (let offset = -itemsInArc; offset <= itemsInArc; offset++) {
      const rawIndex = centerItemIndex + offset;
      const listIndex = normalizeIndex(rawIndex, itemCount);
      const item = displayItems[listIndex];
      if (!item) continue;
      
      const itemAngle = TOP_ANGLE + (rawIndex * gap);
      const angleKey = Math.round(itemAngle);
      
      // Skip duplicates at same position
      if (seenAngles.has(angleKey)) continue;
      seenAngles.add(angleKey);
      
      visible.push({ item, angle: itemAngle, listIndex, rawIndex });
    }
    
    return visible;
  }, [rotation, displayItems, itemCount, gap]);
};

