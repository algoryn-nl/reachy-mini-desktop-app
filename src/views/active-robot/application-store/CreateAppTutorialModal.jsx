import React, { useState } from 'react';
import { Box, Typography, Button, IconButton, Chip, Divider, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import CodeIcon from '@mui/icons-material/Code';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TerminalIcon from '@mui/icons-material/Terminal';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ApiIcon from '@mui/icons-material/Api';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { open } from '@tauri-apps/plugin-shell';
import FullscreenOverlay from '../../../components/FullscreenOverlay';
import HowToCreateApp from '../../../assets/reachy-how-to-create-app.svg';
import JoystickIcon from '../../../assets/joystick.svg';
import BlueprintIcon from '../../../assets/blueprint.svg';
import RocketIcon from '../../../assets/rocket.svg';

/**
 * Modal overlay for tutorial on creating your own Reachy Mini app
 * Design style Apple with grid cards
 */
export default function CreateAppTutorialModal({
  open: isOpen,
  onClose,
  darkMode,
}) {
  const [expanded, setExpanded] = useState(null);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : null);
  };

  const consoleExamples = [
    {
      title: 'Get robot state',
      description: 'Check the current state of all joints, motors, and sensors',
      code: `curl http://localhost:8000/api/state/full`,
      explanation: 'Returns complete robot state including joint positions, velocities, and motor status',
    },
    {
      title: 'Enable motors',
      description: 'Power on all robot motors (required before movement)',
      code: `curl -X POST http://localhost:8000/api/motors/enable`,
      explanation: 'Motors must be enabled before sending movement commands. Use disable to turn them off.',
    },
    {
      title: 'Move head',
      description: 'Control the robot head position in 3D space',
      code: `curl -X POST http://localhost:8000/api/goto \\
  -H "Content-Type: application/json" \\
  -d '{"head": {"x": 0, "y": -10, "z": 0}}'`,
      explanation: 'x=left/right, y=up/down, z=forward/backward. Values in degrees. Use goto_target for smooth interpolation.',
    },
    {
      title: 'Get joint positions',
      description: 'Read current joint angles for all motors',
      code: `curl http://localhost:8000/api/state/joints`,
      explanation: 'Returns an array of joint positions. Useful for monitoring or saving poses.',
    },
  ];

  const createSteps = [
    {
      number: 1,
      icon: <TerminalIcon sx={{ fontSize: 20 }} />,
      title: 'Generate App Scaffold',
      description: 'Start by using the official scaffolding tool to create your app\'s folder structure and boilerplate files.',
      details: [
        'Execute: reachy-mini-make-app <app_name> --path <destination>',
        'Generates a proper Python package layout',
        'Includes all necessary files: pyproject.toml, main.py, README, etc.',
        'Automatically replaces placeholders with your app name',
      ],
      code: `# Create your app in your home directory
reachy-mini-make-app my_app --path ~/

# Generated structure:
# ~/my_app/
# ├── index.html
# ├── pyproject.toml
# ├── my_app/
# │   ├── __init__.py
# │   └── main.py
# ├── README.md
# └── style.css`,
      action: 'View Example App',
      actionUrl: 'https://huggingface.co/spaces/pollen-robotics/hand_tracker_app',
      tip: 'This generates a complete, installable Python package structure',
    },
    {
      number: 2,
      icon: <CodeIcon sx={{ fontSize: 20 }} />,
      title: 'Implement Your Logic',
      description: 'Write your app\'s behavior in the main.py file. Your class should extend ReachyMiniApp and define the run method.',
      details: [
        'Extend the ReachyMiniApp base class',
        'Define run(reachy_mini, stop_event) method',
        'Always check stop_event.is_set() in your loops',
        'You can optionally add a custom_app_url for a settings page',
      ],
      code: `import threading
import time
import numpy as np
from reachy_mini import ReachyMini, ReachyMiniApp
from reachy_mini.utils import create_head_pose

class MyApp(ReachyMiniApp):
    # Optional: add a custom settings page URL
    # custom_app_url: str | None = None
    
    def run(self, reachy_mini: ReachyMini, stop_event: threading.Event):
        # The robot connection is already established
        t0 = time.time()
        
        while not stop_event.is_set():
            t = time.time() - t0
            yaw = 30 * np.sin(2 * np.pi * 0.5 * t)
            head_pose = create_head_pose(yaw=yaw, degrees=True)
            reachy_mini.set_target(head=head_pose)
            time.sleep(0.01)`,
      tip: 'The ReachyMini instance is already connected - don\'t instantiate a new one in run()',
    },
    {
      number: 3,
      icon: <CheckCircleIcon sx={{ fontSize: 20 }} />,
      title: 'Test Your App',
      description: 'Verify everything works before publishing. You have two ways to test: run the script directly or install it as a package.',
      details: [
        'Direct execution: python my_app/my_app/main.py',
        'Or install as package: pip install -e my_app/',
        'Installed apps show up in the dashboard automatically',
        'Make sure the daemon is running (use --sim flag for simulation)',
      ],
      code: `# Method 1: Direct execution
cd my_app
python my_app/main.py

# Method 2: Install and run from dashboard
pip install -e my_app/

# Run daemon in simulation mode for testing
reachy-mini-daemon --sim`,
      tip: 'Installing with pip install -e makes your app available in the dashboard',
    },
  ];

  const deploySteps = [
    {
      number: 1,
      icon: <CloudUploadIcon sx={{ fontSize: 20 }} />,
      title: 'Set Up Hugging Face Space',
      description: 'Create a new Space on your Hugging Face account. Choose the Static SDK framework with a blank template.',
      details: [
        'Navigate to huggingface.co/new-space',
        'Pick "Static SDK" from the framework options',
        'Select the "Blank static" template',
        'Start with private visibility to test, switch to public later',
        'Save the Git repository URL provided (HTTP or SSH format)',
      ],
      code: `# You'll receive a Git URL after creation:
# https://huggingface.co/spaces/your-username/your-app-name
# or SSH format:
# git@hf.co:spaces/your-username/your-app-name`,
      action: 'Create Space',
      actionUrl: 'https://huggingface.co/new-space',
      tip: 'Be careful: choose "Static SDK", not the regular SDK option or other frameworks',
    },
    {
      number: 2,
      icon: <RocketLaunchIcon sx={{ fontSize: 20 }} />,
      title: 'Upload Your Code',
      description: 'Set up git in your app folder, connect it to your Space, and upload all your files.',
      details: [
        'Run git init in your app directory',
        'Link your Space: git remote add space <space-url>',
        'Stage all files: git add .',
        'Create initial commit: git commit -m "first commit!"',
        'Upload everything: git push -f space main:main',
      ],
      code: `# Navigate to your app folder first
git init
git remote add space git@hf.co:spaces/your-username/your-app-name
git add .
git commit -m "first commit!"
git push -f space main:main

# Alternative with HTTP authentication:
git remote add space https://huggingface.co/spaces/your-username/your-app-name
git push -f space main:main`,
      tip: 'The -f flag is needed on the first push to replace the template files',
    },
    {
      number: 3,
      icon: <CheckCircleIcon sx={{ fontSize: 20 }} />,
      title: 'Publish & Discover',
      description: 'After testing, switch your Space to public and add the reachy_mini tag so others can find it.',
      details: [
        'Change Space settings to make it public',
        'In Space settings, add the tag: reachy_mini',
        'Fill in a good description and add some screenshots',
        'The dashboard will automatically pick it up',
      ],
      code: `# Configure your Space:
# 1. Switch visibility to Public in settings
# 2. Add the tag: reachy_mini
# 3. Write a description and upload screenshots

# Want to be featured? Submit to the official store:
# Open a PR at: https://huggingface.co/datasets/pollen-robotics/reachy-mini-official-app-store`,
      action: 'Browse Apps',
      actionUrl: 'https://huggingface.co/spaces/pollen-robotics/Reachy_Mini_Apps',
      tip: 'Tagged apps show up automatically in the dashboard. The official store contains curated, tested apps.',
    },
  ];

  return (
    <FullscreenOverlay
      open={isOpen}
      onClose={onClose}
      darkMode={darkMode}
      zIndex={10003}
      centeredX={true}
      centeredY={false}
    >
      <Box
        sx={{
          position: 'relative',
          width: '90%',
          maxWidth: '700px',
          display: 'flex',
          flexDirection: 'column',
          mt: 8,
          mb: 4,
        }}
      >
        {/* Close button - top right */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            color: '#FF9500',
            bgcolor: darkMode ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
            border: '1px solid #FF9500',
            opacity: 0.7,
            '&:hover': {
              opacity: 1,
              bgcolor: darkMode ? 'rgba(255, 255, 255, 0.12)' : '#ffffff',
            },
            zIndex: 1,
          }}
        >
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {/* Header */}
        <Box sx={{ mb: 6, textAlign: 'center' }}>
              <Box
                component="img"
            src={HowToCreateApp}
            alt="How to create app"
                sx={{
              width: 200,
                  height: 'auto',
              mb: 3,
              opacity: darkMode ? 0.9 : 1,
            }}
          />
          <Typography
            sx={{
              fontSize: 40,
              fontWeight: 700,
              color: darkMode ? '#f5f5f5' : '#1a1a1a',
              letterSpacing: '-0.8px',
              lineHeight: 1.1,
              mb: 1.5,
            }}
          >
            Build your own application
          </Typography>
          <Typography
            sx={{
              fontSize: 16,
              color: darkMode ? '#aaa' : '#666',
              fontWeight: 400,
              lineHeight: 1.6,
              maxWidth: '600px',
              mx: 'auto',
            }}
          >
            Create interactive apps for <Box component="span" sx={{ fontWeight: 600, color: darkMode ? '#ccc' : '#555' }}>Reachy Mini</Box> using the <Box component="span" sx={{ fontWeight: 600, color: darkMode ? '#ccc' : '#555' }}>Python SDK</Box>. Deploy on <Box component="span" sx={{ fontWeight: 600, color: darkMode ? '#ccc' : '#555' }}>Hugging Face Spaces</Box> and share with the <Box component="span" sx={{ fontWeight: 600, color: darkMode ? '#ccc' : '#555' }}>community</Box>.
          </Typography>
        </Box>

        {/* Accordions layout */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            mb: 6,
            maxWidth: '1400px',
            mx: 'auto',
            width: '100%',
            borderRadius: '20px',
            border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.18)'}`,
            bgcolor: darkMode ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
            overflow: 'hidden',
          }}
        >
          {/* Accordion 1: Get familiar with the robot */}
          <Accordion
            expanded={expanded === 'console'}
            onChange={handleChange('console')}
            sx={{
              bgcolor: 'transparent',
              border: 'none',
              borderRadius: '0 !important',
              boxShadow: 'none',
              '&:before': {
                display: 'none',
              },
              '&.Mui-expanded': {
                margin: 0,
              },
              borderBottom: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'}`,
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: '#FF9500', fontSize: 28 }} />}
              sx={{
                px: 3,
                py: 2.5,
                minHeight: 'auto',
                '&.Mui-expanded': {
                  minHeight: 'auto',
                },
                '& .MuiAccordionSummary-content': {
                  margin: 0,
                  '&.Mui-expanded': {
                    margin: 0,
                  },
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box
                  component="img"
                  src={JoystickIcon}
                  alt="Joystick"
                  sx={{
                    width: 64,
                    height: 64,
                  flexShrink: 0,
                    objectFit: 'contain',
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography
                  sx={{
                      fontSize: 24,
                    fontWeight: 700,
                      color: darkMode ? '#f5f5f5' : '#1a1a1a',
                      letterSpacing: '-0.4px',
                    mb: 0.5,
                  }}
                >
                    Get familiar with the robot
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: darkMode ? '#aaa' : '#666',
                    }}
                  >
                    Use the daemon API via console commands
                </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography
                  sx={{
                    fontSize: 13,
                    color: darkMode ? '#bbb' : '#666',
                    lineHeight: 1.6,
                    mb: 2.5,
                  }}
                >
                  The <Box component="span" sx={{ fontWeight: 600, color: darkMode ? '#ddd' : '#555' }}>Reachy Mini daemon</Box> runs a <Box component="span" sx={{ fontWeight: 600, color: darkMode ? '#ddd' : '#555' }}>REST API</Box> at <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 12, color: '#FF9500' }}>localhost:8000</Box>. It manages robot communication and exposes endpoints to control motors, read sensors, and execute movements. Use <Box component="span" sx={{ fontWeight: 600, color: darkMode ? '#ddd' : '#555' }}>curl</Box> commands or any HTTP client to interact with it.
                </Typography>
                
                {/* Console examples - 2 columns layout */}
                <Box 
                  sx={{ 
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 2,
                    mb: 2.5,
                  }}
                >
                  {consoleExamples.map((example, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 2,
                        borderRadius: '12px',
                        bgcolor: darkMode ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
                        border: `1.5px solid ${darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <Box sx={{ mb: 1 }}>
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: darkMode ? '#f5f5f5' : '#1a1a1a',
                            mb: 0.5,
                          }}
                        >
                          {example.title}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 10,
                            color: darkMode ? '#aaa' : '#666',
                            lineHeight: 1.4,
                          }}
                        >
                          {example.description}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          p: 1.25,
                          borderRadius: '8px',
                          bgcolor: darkMode ? '#0a0a0a' : '#f8f8f8',
                          border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
                          mb: example.explanation ? 1 : 0,
                          flex: 1,
                        }}
                      >
                        <Typography
                          component="pre"
                          sx={{
                            fontSize: 9,
                            fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
                            color: darkMode ? '#e0e0e0' : '#333',
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            lineHeight: 1.4,
                          }}
                        >
                          {example.code}
                        </Typography>
                      </Box>
                      {example.explanation && (
                        <Typography
                          sx={{
                            fontSize: 9,
                            color: darkMode ? '#888' : '#777',
                            lineHeight: 1.3,
                            fontStyle: 'italic',
                            mt: 'auto',
                          }}
                        >
                          💡 {example.explanation}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>

                {/* API Documentation link */}
                <Button
                  fullWidth
                  size="medium"
                  onClick={async () => {
                    try {
                      await open('http://localhost:8000/docs');
                    } catch (err) {
                      console.error('Failed to open API docs:', err);
                    }
                  }}
                  endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    textTransform: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#FF9500',
                    border: '1.5px solid #FF9500',
                    borderRadius: '10px',
                    py: 1.25,
                    bgcolor: 'transparent',
                    '&:hover': {
                      bgcolor: darkMode ? 'rgba(255, 149, 0, 0.1)' : 'rgba(255, 149, 0, 0.05)',
                      borderColor: '#FF9500',
                    },
                  }}
                >
                  View full API documentation
                  <Box component="span" sx={{ ml: 1, fontSize: 11, opacity: 0.7, fontFamily: 'monospace' }}>
                    (localhost:8000/docs)
                  </Box>
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Accordion 2: Create Your Own App */}
          <Accordion
            expanded={expanded === 'create'}
            onChange={handleChange('create')}
            sx={{
              bgcolor: 'transparent',
              border: 'none',
              borderRadius: '0 !important',
              boxShadow: 'none',
              '&:before': {
                display: 'none',
              },
              '&.Mui-expanded': {
                margin: 0,
              },
              borderBottom: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'}`,
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: '#FF9500', fontSize: 28 }} />}
              sx={{
                px: 3,
                py: 2.5,
                minHeight: 'auto',
                '&.Mui-expanded': {
                  minHeight: 'auto',
                },
                '& .MuiAccordionSummary-content': {
                  margin: 0,
                  '&.Mui-expanded': {
                    margin: 0,
                  },
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box
                  component="img"
                  src={BlueprintIcon}
                  alt="Blueprint"
                  sx={{
                    width: 64,
                    height: 64,
                    flexShrink: 0,
                    objectFit: 'contain',
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: darkMode ? '#f5f5f5' : '#1a1a1a',
                      letterSpacing: '-0.4px',
                      mb: 0.5,
                    }}
                  >
                    Create your own app
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: darkMode ? '#aaa' : '#666',
                    }}
                  >
                    Build your app with the Python SDK
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
              <Box 
                sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2.5,
                }}
              >
                {createSteps.map((step) => (
            <Box
              key={step.number}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2.5,
                p: 2.5,
                borderRadius: '16px',
                bgcolor: darkMode ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
                border: `1.5px solid ${darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  borderColor: darkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)',
                  boxShadow: darkMode 
                    ? '0 8px 24px rgba(0, 0, 0, 0.3)'
                    : '0 8px 24px rgba(0, 0, 0, 0.08)',
                },
              }}
            >
              {/* Left column: Explanations */}
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {/* Step header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      bgcolor: darkMode ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.1)',
                      border: `1px solid ${darkMode ? 'rgba(255, 149, 0, 0.3)' : 'rgba(255, 149, 0, 0.2)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#FF9500',
                    }}
                  >
                    {step.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Chip
                      label={`Step ${step.number}`}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: 9,
                        fontWeight: 700,
                        bgcolor: darkMode ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.1)',
                        color: '#FF9500',
                        border: 'none',
                        mb: 0.5,
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: darkMode ? '#f5f5f5' : '#1a1a1a',
                        letterSpacing: '-0.2px',
                        lineHeight: 1.2,
                      }}
                    >
                      {step.title}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Description */}
                <Typography
                  sx={{
                    fontSize: 11,
                    color: darkMode ? '#bbb' : '#666',
                    lineHeight: 1.5,
                    mb: 2,
                  }}
                >
                  {step.description}
                </Typography>

                {/* Details list */}
                {step.details && (
                  <Box sx={{ mb: 2 }}>
                    {step.details.map((detail, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 0.75,
                          mb: 0.75,
                        }}
                      >
                        <Box
                          sx={{
                            width: 3,
                            height: 3,
                            borderRadius: '50%',
                            bgcolor: '#FF9500',
                            mt: 0.6,
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: 10,
                            color: darkMode ? '#999' : '#777',
                            lineHeight: 1.4,
                          }}
                        >
                          {detail}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Tip */}
                {step.tip && (
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: '8px',
                      bgcolor: darkMode ? 'rgba(255, 149, 0, 0.08)' : 'rgba(255, 149, 0, 0.05)',
                      border: `1px solid ${darkMode ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 149, 0, 0.15)'}`,
                      mb: 1.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#FF9500',
                        mb: 0.5,
                      }}
                    >
                      💡 Tip
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 10,
                        color: darkMode ? '#ddd' : '#666',
                        lineHeight: 1.4,
                      }}
                    >
                      {step.tip}
                    </Typography>
                  </Box>
                )}

                {/* Action button */}
                {step.action && step.actionUrl && (
                  <Button
                    fullWidth
                    size="medium"
                    onClick={async () => {
                      try {
                        await open(step.actionUrl);
                      } catch (err) {
                        console.error('Failed to open URL:', err);
                      }
                    }}
                    endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      textTransform: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#FF9500',
                      border: '1px solid #FF9500',
                      borderRadius: '10px',
                      py: 1.25,
                      bgcolor: 'transparent',
                      mt: 'auto',
                      '&:hover': {
                        bgcolor: darkMode ? 'rgba(255, 149, 0, 0.1)' : 'rgba(255, 149, 0, 0.05)',
                        borderColor: '#FF9500',
                      },
                    }}
                  >
                    {step.action}
                  </Button>
                )}
              </Box>

              {/* Right column: Code */}
              {step.code && (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '10px',
                    bgcolor: darkMode ? '#0a0a0a' : '#f8f8f8',
                    border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
                    overflow: 'hidden',
                    height: 'fit-content',
                  }}
                >
                  <Typography
                    component="pre"
                    sx={{
                      fontSize: 9,
                      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
                      color: darkMode ? '#e0e0e0' : '#333',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: 1.5,
                    }}
                  >
                    {step.code}
                  </Typography>
                </Box>
              )}
            </Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Accordion 3: Deploy */}
          <Accordion
            expanded={expanded === 'deploy'}
            onChange={handleChange('deploy')}
            sx={{
              bgcolor: 'transparent',
              border: 'none',
              borderRadius: '0 !important',
              boxShadow: 'none',
              '&:before': {
                display: 'none',
              },
              '&.Mui-expanded': {
                margin: 0,
              },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: '#FF9500', fontSize: 28 }} />}
              sx={{
                px: 3,
                py: 2.5,
                minHeight: 'auto',
                '&.Mui-expanded': {
                  minHeight: 'auto',
                },
                '& .MuiAccordionSummary-content': {
                  margin: 0,
                  '&.Mui-expanded': {
                    margin: 0,
                  },
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box
                  component="img"
                  src={RocketIcon}
                  alt="Rocket"
                  sx={{
                    width: 64,
                    height: 64,
                    flexShrink: 0,
                    objectFit: 'contain',
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: darkMode ? '#f5f5f5' : '#1a1a1a',
                      letterSpacing: '-0.4px',
                      mb: 0.5,
                    }}
                  >
                    Deploy
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: darkMode ? '#aaa' : '#666',
                    }}
                  >
                    Share your app on Hugging Face Spaces
                  </Typography>
            </Box>
          </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
              <Box 
                sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2.5,
                }}
              >
                {deploySteps.map((step) => (
            <Box
              key={step.number}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2.5,
                p: 2.5,
                borderRadius: '16px',
                bgcolor: darkMode ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
                border: `1.5px solid ${darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  borderColor: darkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)',
                  boxShadow: darkMode
                    ? '0 8px 24px rgba(0, 0, 0, 0.3)'
                    : '0 8px 24px rgba(0, 0, 0, 0.08)',
                },
              }}
            >
              {/* Left column: Explanations */}
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {/* Step header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      bgcolor: darkMode ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.1)',
                      border: `1px solid ${darkMode ? 'rgba(255, 149, 0, 0.3)' : 'rgba(255, 149, 0, 0.2)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#FF9500',
                    }}
                  >
                    {step.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Chip
                      label={`Step ${step.number}`}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: 9,
                        fontWeight: 700,
                        bgcolor: darkMode ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.1)',
                        color: '#FF9500',
                        border: 'none',
                        mb: 0.5,
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: darkMode ? '#f5f5f5' : '#1a1a1a',
                        letterSpacing: '-0.2px',
                        lineHeight: 1.2,
                      }}
                    >
                      {step.title}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Description */}
                <Typography
                  sx={{
                    fontSize: 11,
                    color: darkMode ? '#bbb' : '#666',
                    lineHeight: 1.5,
                    mb: 2,
                  }}
                >
                  {step.description}
                </Typography>

                {/* Details list */}
                {step.details && (
                  <Box sx={{ mb: 2 }}>
                    {step.details.map((detail, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 0.75,
                          mb: 0.75,
                        }}
                      >
                        <Box
                          sx={{
                            width: 3,
                            height: 3,
                            borderRadius: '50%',
                            bgcolor: '#FF9500',
                            mt: 0.6,
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: 10,
                            color: darkMode ? '#999' : '#777',
                            lineHeight: 1.4,
                          }}
                        >
                          {detail}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Tip */}
                {step.tip && (
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: '8px',
                      bgcolor: darkMode ? 'rgba(255, 149, 0, 0.08)' : 'rgba(255, 149, 0, 0.05)',
                      border: `1px solid ${darkMode ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 149, 0, 0.15)'}`,
                      mb: 1.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#FF9500',
                        mb: 0.5,
                      }}
                    >
                      💡 Tip
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 10,
                        color: darkMode ? '#ddd' : '#666',
                        lineHeight: 1.4,
                      }}
                    >
                      {step.tip}
                    </Typography>
                  </Box>
                )}

                {/* Action button */}
                {step.action && step.actionUrl && (
                  <Button
                    fullWidth
                    size="small"
                    onClick={async () => {
                      try {
                        await open(step.actionUrl);
                      } catch (err) {
                        console.error('Failed to open URL:', err);
                      }
                    }}
                    endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                    sx={{
                      textTransform: 'none',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#FF9500',
                      border: '1px solid #FF9500',
                      borderRadius: '8px',
                      py: 1,
                      bgcolor: 'transparent',
                      mt: 'auto',
                      '&:hover': {
                        bgcolor: darkMode ? 'rgba(255, 149, 0, 0.1)' : 'rgba(255, 149, 0, 0.05)',
                        borderColor: '#FF9500',
                      },
                    }}
                  >
                    {step.action}
                  </Button>
                )}
              </Box>

              {/* Right column: Code */}
              {step.code && (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '10px',
                    bgcolor: darkMode ? '#0a0a0a' : '#f8f8f8',
                    border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
                    overflow: 'hidden',
                    height: 'fit-content',
                  }}
                >
                  <Typography
                    component="pre"
                    sx={{
                      fontSize: 9,
                      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
                      color: darkMode ? '#e0e0e0' : '#333',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: 1.5,
                    }}
                  >
                    {step.code}
                  </Typography>
                </Box>
              )}
            </Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* Footer note */}
        <Box
          sx={{
            textAlign: 'center',
            pt: 3,
            mb: 6,
          }}
        >
          <Typography
            sx={{
              fontSize: 12,
              color: darkMode ? '#888' : '#999',
              lineHeight: 1.6,
            }}
          >
            Need help? Check out the{' '}
            <Box
              component="span"
              onClick={async () => {
                try {
                  await open('http://localhost:8000/docs');
                } catch (err) {
                  console.error('Failed to open API docs:', err);
                }
              }}
              sx={{
                color: '#FF9500',
                cursor: 'pointer',
                textDecoration: 'underline',
                '&:hover': {
                  opacity: 0.8,
                },
              }}
            >
              API documentation
            </Box>
            {' '}or browse{' '}
            <Box
              component="span"
              onClick={async () => {
                try {
                  await open('https://huggingface.co/spaces?q=reachy_mini');
                } catch (err) {
                  console.error('Failed to open spaces:', err);
                }
              }}
              sx={{
                color: '#FF9500',
                cursor: 'pointer',
                textDecoration: 'underline',
                '&:hover': {
                  opacity: 0.8,
                },
              }}
            >
              existing apps
            </Box>
            {' '}for inspiration.
          </Typography>
        </Box>
      </Box>
    </FullscreenOverlay>
  );
}

