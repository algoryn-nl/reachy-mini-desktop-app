import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography } from '@mui/material';

/**
 * 2D Joystick Component - Compact
 * Follows mouse directly for intuitive control
 */
export default function Joystick2D({ label, valueX, valueY, onChange, onDragEnd, minX = -1, maxX = 1, minY = -1, maxY = 1, size = 100, darkMode, disabled = false }) {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localStickX, setLocalStickX] = useState(size / 2);
  const [localStickY, setLocalStickY] = useState(size / 2);

  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size / 2 - 16;
  const stickRadius = 8;

  // Track last drag end time to prevent immediate repositioning
  const lastDragEndTimeRef = useRef(0);
  
  // Update local stick position when values change (from external updates)
  // But only if we're not dragging and enough time has passed since last drag
  useEffect(() => {
    if (!isDragging) {
      const timeSinceDragEnd = Date.now() - lastDragEndTimeRef.current;
      // Don't reposition stick immediately after drag end (wait 2 seconds)
      // This prevents the stick from jumping when robot state syncs
      if (timeSinceDragEnd >= 2000) {
        const normalizedX = ((valueX - minX) / (maxX - minX)) * 2 - 1;
        const normalizedY = 1 - ((valueY - minY) / (maxY - minY)) * 2; // Inverted Y
        setLocalStickX(centerX + normalizedX * maxRadius);
        setLocalStickY(centerY - normalizedY * maxRadius);
      }
    }
  }, [valueX, valueY, minX, maxX, minY, maxY, centerX, centerY, maxRadius, isDragging]);

  // Convert mouse coordinates to joystick values
  const getValuesFromMouse = useCallback((clientX, clientY) => {
    if (!containerRef.current) return { x: valueX, y: valueY };
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    // Calculate offset from center
    let dx = mouseX - centerX;
    let dy = mouseY - centerY;
    
    // Calculate distance from center
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Clamp mouse position to circle for visual feedback
    let displayX = mouseX;
    let displayY = mouseY;
    if (distance > maxRadius) {
      const angle = Math.atan2(dy, dx);
      displayX = centerX + Math.cos(angle) * maxRadius;
      displayY = centerY + Math.sin(angle) * maxRadius;
      dx = Math.cos(angle) * maxRadius;
      dy = Math.sin(angle) * maxRadius;
    }
    
    // Update local stick position for immediate visual feedback (clamped to circle)
    setLocalStickX(displayX);
    setLocalStickY(displayY);
    
    // Normalize to -1 to 1 range
    const normalizedX = dx / maxRadius; // Left is negative, right is positive
    const normalizedY = dy / maxRadius; // Top is negative, bottom is positive
    
    // Apply sensitivity reduction (reduce by 50% to make it less sensitive)
    const sensitivity = 0.5;
    const scaledX = normalizedX * sensitivity;
    const scaledY = normalizedY * sensitivity;
    
    // Convert normalized values (-1 to 1) to actual value range
    // X: left is min, right is max (corrected)
    // Y: top is min, bottom is max
    const newX = minX + (scaledX + 1) / 2 * (maxX - minX);
    const newY = minY + (scaledY + 1) / 2 * (maxY - minY);
    
    return { x: newX, y: newY };
  }, [centerX, centerY, maxRadius, minX, maxX, minY, maxY, valueX, valueY]);

  const handleMouseDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const { x, y } = getValuesFromMouse(e.clientX, e.clientY);
    onChange(x, y, true);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = getValuesFromMouse(e.clientX, e.clientY);
    onChange(x, y, true);
  }, [isDragging, getValuesFromMouse, onChange]);

  const handleMouseUp = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    lastDragEndTimeRef.current = Date.now(); // Mark drag end time
    if (onDragEnd) onDragEnd();
  }, [isDragging, onDragEnd]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const displayX = typeof valueX === 'number' ? valueX.toFixed(3) : '0.000';
  const displayY = typeof valueY === 'number' ? valueY.toFixed(3) : '0.000';

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: 0.75,
      p: 1,
      borderRadius: '12px',
      bgcolor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.01)',
      border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}`,
      transition: 'all 0.2s ease',
      opacity: disabled ? 0.5 : 1,
      pointerEvents: disabled ? 'none' : 'auto',
      '&:hover': {
        bgcolor: disabled ? (darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.01)') : (darkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.02)'),
        borderColor: disabled ? (darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)') : 'rgba(255, 149, 0, 0.4)',
      }
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: darkMode ? '#f5f5f5' : '#333', letterSpacing: '-0.2px' }}>
          {label}
        </Typography>
      </Box>
      <Box
        ref={containerRef}
        sx={{
          width: size,
          height: size,
          borderRadius: '10px',
          bgcolor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.02)',
          border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          overflow: 'hidden',
          cursor: disabled ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab'),
          opacity: disabled ? 0.5 : 1,
          position: 'relative',
          userSelect: 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'rgba(255, 149, 0, 0.5)',
            boxShadow: darkMode ? '0 0 16px rgba(255, 149, 0, 0.3)' : '0 0 12px rgba(255, 149, 0, 0.2)',
          }
        }}
        onMouseDown={handleMouseDown}
      >
        <svg width={size} height={size} style={{ display: 'block' }}>
          <defs>
            <radialGradient id={`stickGrad-${label}`}>
              <stop offset="0%" stopColor="#FF9500" stopOpacity="1" />
              <stop offset="100%" stopColor="#FF9500" stopOpacity="0.7" />
            </radialGradient>
            <pattern id={`grid-${label}`} width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke={darkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'} strokeWidth="0.5"/>
            </pattern>
          </defs>
          
          {/* Grid pattern overlay */}
          <rect 
            width={size} 
            height={size} 
            fill={`url(#grid-${label})`}
            rx="10"
          />
          
          {/* Center crosshair - primary color */}
          <g opacity={0.25}>
            <line x1={centerX} y1={0} x2={centerX} y2={size} stroke="#FF9500" strokeWidth={1} />
            <line x1={0} y1={centerY} x2={size} y2={centerY} stroke="#FF9500" strokeWidth={1} />
          </g>

          {/* Boundary circle - primary color */}
          <circle cx={centerX} cy={centerY} r={maxRadius} fill="none" stroke="rgba(255, 149, 0, 0.3)" strokeWidth={1.5} strokeDasharray="2 2" />
          {/* Connection line - primary color */}
          <line x1={centerX} y1={centerY} x2={localStickX} y2={localStickY} stroke="#FF9500" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
          {/* Joystick stick - primary color */}
          <circle cx={localStickX} cy={localStickY} r={stickRadius} fill={`url(#stickGrad-${label})`} stroke={darkMode ? 'rgba(26, 26, 26, 0.8)' : '#fff'} strokeWidth={2} />
        </svg>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5, width: '100%', justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
          <Typography sx={{ fontSize: 8, color: darkMode ? '#888' : '#999', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            X
          </Typography>
          <Typography sx={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: darkMode ? '#f5f5f5' : '#333' }}>
            {displayX}
          </Typography>
        </Box>
        <Box sx={{ width: '1px', bgcolor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
          <Typography sx={{ fontSize: 8, color: darkMode ? '#888' : '#999', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Y
          </Typography>
          <Typography sx={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: darkMode ? '#f5f5f5' : '#333' }}>
            {displayY}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

