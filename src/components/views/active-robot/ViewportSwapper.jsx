import React, { useState, useCallback, useRef, useEffect, cloneElement } from 'react';
import { createPortal } from 'react-dom';
import { Box, IconButton } from '@mui/material';

/**
 * Composant ViewportSwapper
 * Gère l'affichage de deux vues (3D et Caméra) avec possibilité de swap
 * Utilise des Portals React pour éviter la duplication des composants
 * 
 * Architecture:
 * - Deux conteneurs DOM : mainViewport et smallViewport
 * - Les composants sont rendus une seule fois
 * - Les Portals les "téléportent" vers le bon conteneur selon l'état swapped
 */
export default function ViewportSwapper({
  view3D,           // ReactNode : le composant 3D (Viewer3D)
  viewCamera,       // ReactNode : le composant caméra (CameraFeed)
  onSwap,           // Callback optionnel quand le swap se produit
  initialSwapped = false, // État initial du swap
}) {
  const [isSwapped, setIsSwapped] = useState(initialSwapped);
  const mainViewportRef = useRef(null);
  const smallViewportRef = useRef(null);
  
  // Aspect ratio pour la caméra (640x480 = 4:3)
  const cameraAspectRatio = 640 / 480; // 1.333...
  
  // Gérer le swap
  const handleSwap = useCallback(() => {
    setIsSwapped(prev => !prev);
    if (onSwap) {
      onSwap(!isSwapped);
    }
  }, [isSwapped, onSwap]);
  
  // Props pour les vues selon leur taille
  const view3DSmallProps = {
    hideControls: true,
    showStatusTag: false,
    hideEffects: true,
    // On garde la même caméra que la vue principale
  };
  
  const viewCameraSmallProps = {
    isLarge: false,
    width: 120,
    height: 90,
  };
  
  // Cloner les composants avec les props appropriées
  const view3DMain = view3D;
  const view3DSmall = cloneElement(view3D, view3DSmallProps);
  const viewCameraMain = viewCamera;
  const viewCameraSmall = cloneElement(viewCamera, viewCameraSmallProps);
  
  // Les deux vues à afficher (décidées selon l'état swapped)
  const mainView = isSwapped ? viewCameraMain : view3DMain;
  const smallView = isSwapped ? view3DSmall : viewCameraSmall;
  
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        // Si c'est la caméra qui est affichée, utiliser l'aspect ratio 4:3
        // Sinon, laisser la hauteur s'adapter avec un minHeight pour le 3D viewer
        ...(isSwapped ? {
          aspectRatio: `${cameraAspectRatio}`,
        } : {
          height: '100%',
          minHeight: 280, // Hauteur minimale pour le 3D viewer
        }),
      }}
    >
      {/* Viewport principal (grand) */}
      <Box
        ref={mainViewportRef}
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: '16px',
          overflow: 'visible',
          position: 'relative',
        }}
      />
      
      {/* Viewport petit (en bas à droite, à cheval sur le visualiseur) */}
      <Box
        sx={{
          position: 'absolute',
          bottom: -45,
          right: 12,
          width: 120,
          height: 90,
          zIndex: 10,
        }}
      >
        <Box
          ref={smallViewportRef}
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            position: 'relative',
          }}
        />
        
        {/* Bouton swap sur le petit viewport */}
        <IconButton
          onClick={handleSwap}
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 20,
            height: 20,
            minWidth: 20,
            bgcolor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(4px)',
            color: '#fff',
            fontSize: '14px',
            padding: 0,
            zIndex: 10,
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              transform: 'scale(1.2)',
            },
          }}
          title="Swap video and 3D view"
        >
          ⇄
        </IconButton>
      </Box>
      
      {/* Portals : téléportent les vues vers les conteneurs */}
      {mainViewportRef.current && createPortal(
        <Box sx={{ width: '100%', height: '100%' }}>
          {mainView}
        </Box>,
        mainViewportRef.current
      )}
      
      {smallViewportRef.current && createPortal(
        <Box sx={{ width: '100%', height: '100%' }}>
          {smallView}
        </Box>,
        smallViewportRef.current
      )}
    </Box>
  );
}

