import { useState } from 'react'
import { Box, Typography, Tabs, Tab, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import AnalysisStats from '../components/AnalysisStats'
import AnalysisResultsTable from '../components/AnalysisResultsTable'
import ViolationDetails from '../components/ViolationDetails'

function AnalysisPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null)
  const user = useSelector((state: RootState) => state.auth.user)

  const handleViewDetails = (analysisId: string) => {
    setSelectedAnalysisId(analysisId)
  }

  const handleCloseDetails = () => {
    setSelectedAnalysisId(null)
  }

  if (!user) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Analysis Results
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please log in to view analysis results.
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Analysis Results
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        View detailed MISRA compliance analysis results and violation reports.
      </Typography>

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Statistics" />
        <Tab label="Analysis History" />
      </Tabs>

      {activeTab === 0 && <AnalysisStats userId={user.userId} />}
      {activeTab === 1 && (
        <AnalysisResultsTable userId={user.userId} onViewDetails={handleViewDetails} />
      )}

      <Dialog
        open={!!selectedAnalysisId}
        onClose={handleCloseDetails}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Violation Details</Typography>
            <IconButton onClick={handleCloseDetails} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAnalysisId && <ViolationDetails analysisId={selectedAnalysisId} />}
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default AnalysisPage
