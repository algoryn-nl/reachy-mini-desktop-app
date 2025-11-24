import React from 'react';
import { Box, Typography } from '@mui/material';
import Viewer3D from './viewer3d';

/**
 * Development page to test RobotViewer3D in isolation
 * Automatic access via http://localhost:5173/#dev
 */
export default function DevPlayground() {
  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 2,
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        Comparaison Normal vs X-Ray
      </Typography>
      <Box
        sx={{
        width: '100%', 
        height: '100%',
          display: 'flex',
          gap: 2,
          alignItems: 'stretch',
        }}
      >
        {/* Normal view */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}>
          <Typography variant="subtitle2" sx={{ textAlign: 'center' }}>
            Normal (MeshStandardMaterial)
          </Typography>
          <Box sx={{ 
            flex: 1,
            border: '2px solid #1976d2',
            borderRadius: 2,
            overflow: 'hidden',
      }}>
            <Viewer3D 
              isActive={true}
              initialMode="normal"
              forceLoad={true}
              hideControls={false}
            />
          </Box>
        </Box>

        {/* X-ray view */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}>
          <Typography variant="subtitle2" sx={{ textAlign: 'center' }}>
            X-Ray (Shader custom)
          </Typography>
          <Box sx={{ 
            flex: 1,
            border: '2px solid #9c27b0',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <Viewer3D 
              isActive={true}
              initialMode="xray"
              forceLoad={true}
              hideControls={false}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}



