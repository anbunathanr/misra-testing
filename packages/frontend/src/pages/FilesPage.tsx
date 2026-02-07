import { Box, Typography, Paper, Tabs, Tab } from '@mui/material'
import { useState } from 'react'
import FileUpload from '../components/FileUpload'
import FileHistory from '../components/FileHistory'

function FilesPage() {
  const [tabValue, setTabValue] = useState(0)

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Files
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Upload and manage your C/C++ source files for MISRA analysis.
      </Typography>

      <Paper sx={{ mt: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Upload Files" />
          <Tab label="File History" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tabValue === 0 && <FileUpload />}
          {tabValue === 1 && <FileHistory />}
        </Box>
      </Paper>
    </Box>
  )
}

export default FilesPage
