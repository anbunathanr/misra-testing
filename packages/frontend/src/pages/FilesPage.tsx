import { Box, Typography } from '@mui/material'

function FilesPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Files
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Upload and manage your C/C++ source files for MISRA analysis.
      </Typography>
      {/* TODO: Implement file upload and management */}
    </Box>
  )
}

export default FilesPage
