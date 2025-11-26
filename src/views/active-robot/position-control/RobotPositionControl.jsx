import React from 'react';
import { Box, Chip, Typography, Divider } from '@mui/material';
import { Joystick2D, VerticalSlider, SimpleSlider } from './components';
import { useRobotPosition, useActiveMoves } from './hooks';

/**
 * Robot Position Control - Main component
 * Provides 5 controls for robot positioning (2 joysticks + 3 sliders)
 */
export default function RobotPositionControl({ isActive, darkMode }) {
  const {
    localValues,
    handleChange,
    handleBodyYawChange,
    handleAntennasChange,
    handleDragEnd,
    addFrontendLog,
  } = useRobotPosition(isActive);

  const { activeMoves } = useActiveMoves(isActive);
  const hasActiveMoves = activeMoves.length > 0;

  if (!isActive) return null;

  return (
    <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Active moves indicator */}
      {activeMoves.length > 0 && (
        <Box sx={{ mb: -0.5 }}>
          <Chip
            label={`${activeMoves.length} active`}
            size="small"
            sx={{
              height: 24,
              fontSize: '10px',
              fontWeight: 500,
              bgcolor: darkMode ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)',
              color: darkMode ? '#22c55e' : '#16a34a',
              border: `1px solid ${darkMode ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)'}`,
              '& .MuiChip-label': {
                px: 1.25,
              },
            }}
          />
        </Box>
      )}

      {/* HEAD SECTION */}
      <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography
            sx={{
              fontSize: '11px',
              fontWeight: 700,
              color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Head
          </Typography>
          <Divider 
            orientation="horizontal" 
            flexItem 
            sx={{ 
              flex: 1,
              borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            }} 
          />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Module 1: Position Z (vertical slider) + Position X/Y (joystick) - Unified card */}
          <Box sx={{ 
            display: 'flex', 
            gap: 1.5, 
            alignItems: 'flex-start',
            p: 1.5,
            borderRadius: '14px',
            bgcolor: darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
            border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: darkMode ? 'rgba(255, 149, 0, 0.25)' : 'rgba(255, 149, 0, 0.3)',
            }
          }}>
            <Box sx={{ 
              flex: '0 0 auto',
              width: 'auto',
              '& > *': {
                bgcolor: 'transparent !important',
                border: 'none !important',
                p: 0,
                '&:hover': {
                  bgcolor: 'transparent !important',
                  border: 'none !important',
                }
              }
            }}>
              <VerticalSlider
                label="Position Z"
                value={localValues.headPose.z}
                onChange={(z, continuous) => handleChange({ z }, continuous)}
                onReset={() => {
                  handleChange({ z: 0 }, false);
                  addFrontendLog(`↺ Reset Position Z to center`);
                }}
                min={-0.05}
                max={0.05}
                unit="m"
                darkMode={darkMode}
                disabled={hasActiveMoves}
              />
            </Box>
            <Box sx={{ 
              width: '1px',
              bgcolor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
              alignSelf: 'stretch',
              my: 0.5,
            }} />
            <Box sx={{ 
              flex: '1 1 auto',
              width: 'auto',
              '& > *': {
                bgcolor: 'transparent !important',
                border: 'none !important',
                p: 0,
                '&:hover': {
                  bgcolor: 'transparent !important',
                  border: 'none !important',
                }
              }
            }}>
              <Joystick2D
                label="Position X/Y"
                valueX={localValues.headPose.y}
                valueY={localValues.headPose.x}
                onChange={(x, y, continuous) => handleChange({ x: y, y: x }, continuous)}
                onDragEnd={handleDragEnd}
                minX={-0.05}
                maxX={0.05}
                minY={-0.05}
                maxY={0.05}
                size={100}
                darkMode={darkMode}
                disabled={hasActiveMoves}
              />
            </Box>
          </Box>

          {/* Module 2: Pitch/Yaw (joystick) + Roll (horizontal slider) - Unified card */}
          <Box sx={{ 
            display: 'flex', 
            gap: 1.5, 
            alignItems: 'flex-start',
            p: 1.5,
            borderRadius: '14px',
            bgcolor: darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
            border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: darkMode ? 'rgba(255, 149, 0, 0.25)' : 'rgba(255, 149, 0, 0.3)',
            }
          }}>
            <Box sx={{ 
              flex: '1 1 auto',
              width: 'auto',
              '& > *': {
                bgcolor: 'transparent !important',
                border: 'none !important',
                p: 0,
                '&:hover': {
                  bgcolor: 'transparent !important',
                  border: 'none !important',
                }
              }
            }}>
              <Joystick2D
                label="Pitch / Yaw"
                valueX={localValues.headPose.yaw}
                valueY={localValues.headPose.pitch}
                onChange={(yaw, pitch, continuous) => handleChange({ yaw, pitch }, continuous)}
                onDragEnd={handleDragEnd}
                minX={-1.2}
                maxX={1.2}
                minY={-0.8}
                maxY={0.8}
                size={100}
                darkMode={darkMode}
                disabled={hasActiveMoves}
              />
            </Box>
            <Box sx={{ 
              width: '1px',
              bgcolor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
              alignSelf: 'stretch',
              my: 0.5,
            }} />
            <Box sx={{ 
              flex: '1 1 auto',
              width: 'auto',
              '& > *': {
                bgcolor: 'transparent !important',
                border: 'none !important',
                p: 0,
                '&:hover': {
                  bgcolor: 'transparent !important',
                  border: 'none !important',
                }
              }
            }}>
              <SimpleSlider
                label="Roll"
                value={localValues.headPose.roll}
                onChange={(roll, continuous) => handleChange({ roll }, continuous)}
                onReset={() => {
                  handleChange({ roll: 0 }, false);
                  addFrontendLog(`↺ Reset Roll to center`);
                }}
                min={-0.5}
                max={0.5}
                darkMode={darkMode}
                disabled={hasActiveMoves}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ANTENNAS SECTION */}
      <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography
            sx={{
              fontSize: '11px',
              fontWeight: 700,
              color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Antennas
          </Typography>
          <Divider 
            orientation="horizontal" 
            flexItem 
            sx={{ 
              flex: 1,
              borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            }} 
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <SimpleSlider
            label="Left Antenna"
            value={(localValues.antennas?.[0] || 0) * (180 / Math.PI)} // Convert rad to deg for display
            onChange={(valueDeg, continuous) => {
              const valueRad = valueDeg * (Math.PI / 180); // Convert deg to rad for API
              handleAntennasChange('left', valueRad, continuous);
            }}
            onReset={() => {
              handleAntennasChange('left', 0, false);
              addFrontendLog(`↺ Reset Left Antenna to center`);
            }}
            min={-180} // Degrees: -180° to 180°
            max={180}
            unit="deg" // Display in degrees
            darkMode={darkMode}
            disabled={hasActiveMoves}
          />

          <SimpleSlider
            label="Right Antenna"
            value={(localValues.antennas?.[1] || 0) * (180 / Math.PI)} // Convert rad to deg for display
            onChange={(valueDeg, continuous) => {
              const valueRad = valueDeg * (Math.PI / 180); // Convert deg to rad for API
              handleAntennasChange('right', valueRad, continuous);
            }}
            onReset={() => {
              handleAntennasChange('right', 0, false);
              addFrontendLog(`↺ Reset Right Antenna to center`);
            }}
            min={-180} // Degrees: -180° to 180°
            max={180}
            unit="deg" // Display in degrees
            darkMode={darkMode}
            disabled={hasActiveMoves}
          />
        </Box>
      </Box>

      {/* BODY SECTION */}
      <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography
            sx={{
              fontSize: '11px',
              fontWeight: 700,
              color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Body
          </Typography>
          <Divider 
            orientation="horizontal" 
            flexItem 
            sx={{ 
              flex: 1,
              borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            }} 
          />
        </Box>

        <SimpleSlider
          label="Body Yaw"
          value={localValues.bodyYaw * (180 / Math.PI)} // Convert rad to deg for display
          onChange={(valueDeg, continuous) => {
            const valueRad = valueDeg * (Math.PI / 180); // Convert deg to rad for API
            handleBodyYawChange(valueRad, continuous);
          }}
          onReset={() => {
            handleBodyYawChange(0, false);
            addFrontendLog(`↺ Reset Body Yaw to center`);
          }}
          min={-160} // Degrees: -160° to 160°
          max={160}
          unit="deg" // Display in degrees
          darkMode={darkMode}
          apiEndpoint="/api/move/set_target"
          disabled={hasActiveMoves}
        />
      </Box>
    </Box>
  );
}

