import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Divider,
  Tabs,
  Tab,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Assessment as ResultsIcon,
  Code as CodeIcon,
  Terminal as TerminalIcon
} from '@mui/icons-material';

interface PaneConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  visible: boolean;
  expanded: boolean;
  content: React.ReactNode;
  badge?: string | number;
}

interface MultiPaneDashboardProps {
  resultsContent?: React.ReactNode;
  codeViewerContent?: React.ReactNode;
  terminalContent?: React.ReactNode;
  onPaneToggle?: (paneId: string, visible: boolean) => void;
  onPaneExpand?: (paneId: string, expanded: boolean) => void;
}

const MultiPaneDashboard: React.FC<MultiPaneDashboardProps> = ({
  resultsContent,
  codeViewerContent,
  terminalContent,
  onPaneToggle,
  onPaneExpand
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);

  const [panes, setPanes] = useState<PaneConfig[]>([
    {
      id: 'results',
      title: 'Analysis Results',
      icon: <ResultsIcon />,
      visible: true,
      expanded: false,
      content: resultsContent,
      badge: '3'
    },
    {
      id: 'code-viewer',
      title: 'Interactive Code Viewer',
      icon: <CodeIcon />,
      visible: true,
      expanded: false,
      content: codeViewerContent
    },
    {
      id: 'terminal',
      title: 'Terminal Output',
      icon: <TerminalIcon />,
      visible: true,
      expanded: false,
      content: terminalContent,
      badge: 'Live'
    }
  ]);

  const togglePaneVisibility = (paneId: string) => {
    setPanes(prev => prev.map(pane => 
      pane.id === paneId 
        ? { ...pane, visible: !pane.visible }
        : pane
    ));
    const pane = panes.find(p => p.id === paneId);
    if (pane) {
      onPaneToggle?.(paneId, !pane.visible);
    }
  };

  const togglePaneExpansion = (paneId: string) => {
    setPanes(prev => prev.map(pane => 
      pane.id === paneId 
        ? { ...pane, expanded: !pane.expanded }
        : { ...pane, expanded: false } // Collapse others
    ));
    const pane = panes.find(p => p.id === paneId);
    if (pane) {
      onPaneExpand?.(paneId, !pane.expanded);
    }
  };

  const visiblePanes = panes.filter(pane => pane.visible);
  const expandedPane = panes.find(pane => pane.expanded);

  // Mobile layout - use tabs
  if (isMobile) {
    return (
      <Box sx={{ height: '100%' }}>
        <Paper sx={{ mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
          >
            {visiblePanes.map((pane, index) => (
              <Tab
                key={pane.id}
                icon={pane.icon}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {pane.title}
                    {pane.badge && (
                      <Chip 
                        label={pane.badge} 
                        size="small" 
                        color={pane.badge === 'Live' ? 'success' : 'primary'}
                      />
                    )}
                  </Box>
                }
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Paper>
        
        <Paper sx={{ p: 2, minHeight: 400 }}>
          {visiblePanes[activeTab]?.content || (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No content available
            </Typography>
          )}
        </Paper>
      </Box>
    );
  }

  // Desktop layout - multi-pane
  if (expandedPane) {
    // Single expanded pane
    return (
      <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid',
          borderBottomColor: 'divider'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {expandedPane.icon}
            <Typography variant="h6">{expandedPane.title}</Typography>
            {expandedPane.badge && (
              <Chip 
                label={expandedPane.badge} 
                size="small" 
                color={expandedPane.badge === 'Live' ? 'success' : 'primary'}
              />
            )}
          </Box>
          <IconButton onClick={() => togglePaneExpansion(expandedPane.id)}>
            <FullscreenExitIcon />
          </IconButton>
        </Box>
        <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
          {expandedPane.content}
        </Box>
      </Paper>
    );
  }

  // Multi-pane layout
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Results Pane (Top) */}
      {panes.find(p => p.id === 'results')?.visible && (
        <Paper sx={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid',
            borderBottomColor: 'divider'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ResultsIcon />
              <Typography variant="h6">Analysis Results</Typography>
              {panes.find(p => p.id === 'results')?.badge && (
                <Chip 
                  label={panes.find(p => p.id === 'results')?.badge} 
                  size="small" 
                  color="primary"
                />
              )}
            </Box>
            <Box>
              <IconButton 
                size="small" 
                onClick={() => togglePaneExpansion('results')}
              >
                <FullscreenIcon />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => togglePaneVisibility('results')}
              >
                <VisibilityOffIcon />
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
            {resultsContent || (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No analysis results yet
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      {/* Bottom Row - Code Viewer and Terminal */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        gap: 2,
        minHeight: 400
      }}>
        {/* Code Viewer Pane (Right) */}
        {panes.find(p => p.id === 'code-viewer')?.visible && (
          <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              p: 2,
              borderBottom: '1px solid',
              borderBottomColor: 'divider'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CodeIcon />
                <Typography variant="h6">Code Viewer</Typography>
              </Box>
              <Box>
                <IconButton 
                  size="small" 
                  onClick={() => togglePaneExpansion('code-viewer')}
                >
                  <FullscreenIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => togglePaneVisibility('code-viewer')}
                >
                  <VisibilityOffIcon />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
              {codeViewerContent || (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No code to display
                </Typography>
              )}
            </Box>
          </Paper>
        )}

        {/* Terminal Pane (Bottom) */}
        {panes.find(p => p.id === 'terminal')?.visible && (
          <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              p: 2,
              borderBottom: '1px solid',
              borderBottomColor: 'divider'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TerminalIcon />
                <Typography variant="h6">Terminal</Typography>
                {panes.find(p => p.id === 'terminal')?.badge && (
                  <Chip 
                    label={panes.find(p => p.id === 'terminal')?.badge} 
                    size="small" 
                    color="success"
                  />
                )}
              </Box>
              <Box>
                <IconButton 
                  size="small" 
                  onClick={() => togglePaneExpansion('terminal')}
                >
                  <FullscreenIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => togglePaneVisibility('terminal')}
                >
                  <VisibilityOffIcon />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
              {terminalContent || (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No terminal output
                </Typography>
              )}
            </Box>
          </Paper>
        )}
      </Box>

      {/* Pane Controls */}
      <Paper sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
          {panes.map(pane => (
            <IconButton
              key={pane.id}
              size="small"
              onClick={() => togglePaneVisibility(pane.id)}
              color={pane.visible ? 'primary' : 'default'}
              title={`Toggle ${pane.title}`}
            >
              {pane.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
            </IconButton>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

export default MultiPaneDashboard;