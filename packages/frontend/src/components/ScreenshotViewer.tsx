import { useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Button,
} from '@mui/material';
import {
  Close as CloseIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  ZoomOutMap as ResetIcon,
} from '@mui/icons-material';

interface ScreenshotViewerProps {
  screenshotUrl: string;
  stepIndex: number;
  action: string;
}

export function ScreenshotViewer({
  screenshotUrl,
  stepIndex,
  action,
}: ScreenshotViewerProps) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setZoom(1);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        onClick={handleOpen}
        sx={{ mt: 1 }}
      >
        View Screenshot
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6">
                Screenshot - Step {stepIndex + 1}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Action: {action}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={handleZoomIn} size="small">
                <ZoomInIcon />
              </IconButton>
              <IconButton onClick={handleZoomOut} size="small">
                <ZoomOutIcon />
              </IconButton>
              <IconButton onClick={handleResetZoom} size="small">
                <ResetIcon />
              </IconButton>
              <IconButton onClick={handleClose} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'auto',
              minHeight: 400,
              maxHeight: '70vh',
            }}
          >
            <img
              src={screenshotUrl}
              alt={`Screenshot for step ${stepIndex + 1}`}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center',
                transition: 'transform 0.2s ease-in-out',
                maxWidth: '100%',
                height: 'auto',
                cursor: zoom > 1 ? 'move' : 'default',
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
