import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Box, Typography, Button, ButtonGroup, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import Viewer3D from './viewer3d';
import { getShortComponentName } from '../utils/componentNames';
import { HARDWARE_ERROR_CONFIGS, getErrorMeshes } from '../utils/hardwareErrors';
import useAppStore from '../store/useAppStore';

/**
 * Development page to test RobotViewer3D in isolation
 * Automatic access via http://localhost:5173/#dev
 */
export default function DevPlayground() {
  const { darkMode } = useAppStore();
  const [scanState, setScanState] = useState('idle'); // 'idle' | 'scanning' | 'complete' | 'error'
  const [errorType, setErrorType] = useState('none'); // 'none' | 'camera' | 'no_motors' | 'motor_communication'
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [currentComponent, setCurrentComponent] = useState(null);
  const [scanComplete, setScanComplete] = useState(false);
  const [allMeshes, setAllMeshes] = useState([]);
  const [errorMesh, setErrorMesh] = useState(null);
  const robotRefRef = useRef(null);
  const scanKeyRef = useRef(0); // Force re-render of scan effect

  // Get error configuration
  const errorConfig = useMemo(() => {
    if (errorType === 'none') return null;
    
    // Map error types to config keys
    const errorKeyMap = {
      'camera': 'CAMERA_ERROR',
      'no_motors': 'NO_MOTORS',
      'motor_communication': 'MOTOR_COMMUNICATION',
    };
    
    const configKey = errorKeyMap[errorType];
    return configKey ? HARDWARE_ERROR_CONFIGS[configKey] : null;
  }, [errorType]);

  // Find error meshes
  React.useEffect(() => {
    if (!errorConfig || !allMeshes.length || scanState !== 'error') {
      setErrorMesh(null);
      return;
    }
    
    const meshes = getErrorMeshes(errorConfig, robotRefRef.current, allMeshes);
    if (meshes && meshes.length > 0) {
      setErrorMesh(meshes[0]);
    } else {
      setErrorMesh(null);
    }
  }, [errorConfig, allMeshes, scanState]);

  const handleMeshesReady = useCallback((meshes) => {
    setAllMeshes(meshes);
  }, []);

  const handleScanMesh = useCallback((mesh, index, total) => {
    const componentName = getShortComponentName(mesh, index, total);
    setCurrentComponent(componentName);
    setScanProgress({ current: index, total });
  }, []);

  const handleScanComplete = useCallback(() => {
    setScanProgress(prev => ({ ...prev, current: prev.total }));
    setCurrentComponent(null);
    setScanComplete(true);
    setScanState('complete');
  }, []);

  const handleStartScan = useCallback(() => {
    setScanState('scanning');
    setScanComplete(false);
    setScanProgress({ current: 0, total: 0 });
    setCurrentComponent(null);
    setErrorMesh(null);
    scanKeyRef.current += 1; // Force re-render
  }, []);

  const handleReset = useCallback(() => {
    setScanState('idle');
    setScanComplete(false);
    setScanProgress({ current: 0, total: 0 });
    setCurrentComponent(null);
    setErrorMesh(null);
    setErrorType('none');
    scanKeyRef.current += 1;
  }, []);

  const handleSetError = useCallback((type) => {
    setErrorType(type);
    setScanState('error');
    setScanComplete(false);
    scanKeyRef.current += 1;
  }, []);

  const showScanEffect = scanState === 'scanning' && errorType === 'none';
  const startupError = scanState === 'error' && errorConfig ? {
    type: errorConfig.type,
    message: errorConfig.message.text 
      ? `${errorConfig.message.text} ${errorConfig.message.bold} ${errorConfig.message.suffix}`
      : 'Hardware error detected',
    messageParts: errorConfig.message,
    code: errorConfig.code || null,
  } : null;

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
        Dev Playground - Normal vs Scan Mode
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

        {/* Scan view */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}>
          <Typography variant="subtitle2" sx={{ textAlign: 'center' }}>
            Scan Mode (X-Ray + Scan Effect)
          </Typography>
          
          {/* Controls */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 1,
            p: 1,
            bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
            borderRadius: 1,
          }}>
            <ButtonGroup size="small" variant="outlined" fullWidth>
              <Button 
                onClick={handleStartScan}
                disabled={scanState === 'scanning'}
              >
                Start Scan
              </Button>
              <Button 
                onClick={handleReset}
              >
                Reset
              </Button>
            </ButtonGroup>
            
            <FormControl size="small" fullWidth>
              <InputLabel>Error Type</InputLabel>
              <Select
                value={errorType}
                label="Error Type"
                onChange={(e) => {
                  if (e.target.value === 'none') {
                    handleReset();
                  } else {
                    handleSetError(e.target.value);
                  }
                }}
              >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="camera">Camera Error</MenuItem>
                <MenuItem value="no_motors">No Motors</MenuItem>
                <MenuItem value="motor_communication">Motor Communication</MenuItem>
              </Select>
            </FormControl>

            {/* Scan status - simplified, no component name */}
            {scanState !== 'idle' && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                justifyContent: 'center',
                py: 0.5,
              }}>
                {scanComplete ? (
                  <CheckCircleOutlinedIcon sx={{ fontSize: 16, color: '#00ff88' }} />
                ) : scanState === 'scanning' ? (
                  <CircularProgress size={14} sx={{ color: '#00ff88' }} />
                ) : null}
                <Typography variant="caption" sx={{ 
                  fontSize: 11,
                  fontWeight: 600,
                  color: scanComplete ? '#00ff88' : scanState === 'error' ? '#ef4444' : '#666',
                }}>
                  {scanState === 'scanning' && !scanComplete && 'Scanning...'}
                  {scanComplete && 'Scan complete'}
                  {scanState === 'error' && 'Error detected'}
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ 
            flex: 1,
            border: '2px solid #16a34a',
            borderRadius: 2,
            overflow: 'hidden',
            position: 'relative',
          }}>
            <Viewer3D 
              key={`scan-${scanKeyRef.current}`}
              isActive={false}
              antennas={[-10, -10]}
              headPose={null}
              headJoints={null}
              yawBody={null}
              initialMode="xray" 
              hideControls={true}
              forceLoad={true}
              hideGrid={true}
              hideBorder={true}
              showScanEffect={showScanEffect}
              usePremiumScan={true}
              onScanComplete={handleScanComplete}
              onScanMesh={handleScanMesh}
              onMeshesReady={handleMeshesReady}
              cameraPreset={errorConfig?.cameraPreset || 'scan'}
              useCinematicCamera={true}
              errorFocusMesh={errorMesh}
              backgroundColor="transparent"
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}



