import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, LinearProgress, CircularProgress } from '@mui/material';
import { getAppWindow } from '../utils/windowUtils';
import reachyUpdateBoxSvg from '../assets/reachy-update-box.svg';
import useAppStore from '../store/useAppStore';
import { DAEMON_CONFIG } from '../config/daemon';

/**
 * Vue dédiée pour les mises à jour
 * Affiche "Checking for updates..." pendant au moins 2-3 secondes
 * Installe automatiquement si une mise à jour est disponible
 */
export default function UpdateView({
  isChecking,
  isDownloading,
  downloadProgress,
  updateAvailable,
  updateError,
  onInstallUpdate,
}) {
  const appWindow = getAppWindow();
  const { darkMode } = useAppStore();
  const [minDisplayTimeElapsed, setMinDisplayTimeElapsed] = useState(false);
  const checkStartTimeRef = useRef(Date.now());

  // Timer pour garantir l'affichage minimum (utilise config centralisée)
  useEffect(() => {
    checkStartTimeRef.current = Date.now();
    setMinDisplayTimeElapsed(false);
    
    const timer = setTimeout(() => {
      setMinDisplayTimeElapsed(true);
    }, DAEMON_CONFIG.MIN_DISPLAY_TIMES.UPDATE_CHECK);

    return () => clearTimeout(timer);
  }, []); // Se déclenche une seule fois au montage du composant

  // Installation automatique si mise à jour disponible et temps minimum écoulé
  useEffect(() => {
    if (updateAvailable && !isDownloading && !updateError && minDisplayTimeElapsed && onInstallUpdate) {
      // Petit délai pour que l'UI se mette à jour
      const installTimer = setTimeout(() => {
        onInstallUpdate();
      }, 300);
      return () => clearTimeout(installTimer);
    }
  }, [updateAvailable, isDownloading, updateError, minDisplayTimeElapsed, onInstallUpdate]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        background: darkMode ? 'rgba(26, 26, 26, 0.95)' : 'rgba(253, 252, 250, 0.85)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh', // TopBar is fixed, doesn't take space
          px: 4,
        }}
      >
        {isChecking && !updateAvailable ? (
          // État: Vérification en cours - design subtil et centré
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress
              size={28}
              thickness={2.5}
              sx={{
                color: darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
                mb: 1.5,
              }}
            />

            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 400,
                color: darkMode ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.35)',
                textAlign: 'center',
                letterSpacing: '0.2px',
              }}
            >
              Looking for updates...
            </Typography>
          </Box>
        ) : updateAvailable ? (
          // État: Mise à jour disponible (installation automatique)
          <>
            <Box sx={{ mb: 4 }}>
              <img
                src={reachyUpdateBoxSvg}
                alt="Reachy Update"
                style={{
                  width: '220px',
                  height: '220px',
                  mb: 0,
                }}
              />
            </Box>

            <Typography
              sx={{
                fontSize: 24,
                fontWeight: 600,
                color: darkMode ? '#f5f5f5' : '#333',
                mb: 1,
                mt: 0,
                textAlign: 'center',
              }}
            >
              Update Available
            </Typography>

            <Typography
              sx={{
                fontSize: 14,
                color: darkMode ? '#aaa' : '#666',
                textAlign: 'center',
                maxWidth: 360,
                lineHeight: 1.6,
                mb: 3,
              }}
            >
              Version {updateAvailable.version} • {formatDate(updateAvailable.date)}
            </Typography>

            {/* Progress bar */}
            {(isDownloading || isChecking) && (
              <Box sx={{ width: '100%', maxWidth: 300, mb: 3 }}>
                <LinearProgress
                  variant={isDownloading ? 'determinate' : 'indeterminate'}
                  value={isDownloading ? downloadProgress : undefined}
                  color="primary"
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                  }}
                />
                {isDownloading && (
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: darkMode ? '#888' : '#666',
                      textAlign: 'center',
                      mt: 1,
                    }}
                  >
                    Installing... {downloadProgress}%
                  </Typography>
                )}
              </Box>
            )}

            {/* Error message */}
            {updateError && (
              <Box
                sx={{
                  mb: 3,
                  maxWidth: 360,
                  textAlign: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontSize: 13,
                    color: '#ef4444',
                    fontWeight: 500,
                    mb: 1,
                  }}
                >
                  {updateError}
                </Typography>
              </Box>
            )}

            {/* Status text */}
            {!isDownloading && !updateError && (
              <Typography
                sx={{
                  fontSize: 13,
                  color: darkMode ? '#888' : '#666',
                  textAlign: 'center',
                  mt: 2,
                }}
              >
                Installing update automatically...
              </Typography>
            )}
          </>
        ) : updateError ? (
          // État: Erreur (non-bloquant, continue après minimum time)
          // En dev, on affiche juste "Looking for updates..." même en cas d'erreur
          <>
            <CircularProgress
              size={28}
              thickness={2.5}
              sx={{
                color: darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
                mb: 1.5,
              }}
            />

            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 400,
                color: darkMode ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.35)',
                textAlign: 'center',
                letterSpacing: '0.2px',
              }}
            >
              Looking for updates...
            </Typography>
          </>
        ) : null}
      </Box>
    </Box>
  );
}

