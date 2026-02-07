import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Typography,
  CircularProgress
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DownloadIcon from '@mui/icons-material/Download'
import { useGetFilesQuery } from '../store/api/filesApi'

function FileHistory() {
  const { data: files, isLoading, error } = useGetFilesQuery()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'pending':
        return 'warning'
      case 'processing':
        return 'info'
      case 'failed':
        return 'error'
      default:
        return 'default'
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">
          Failed to load files. Please try again.
        </Typography>
      </Box>
    )
  }

  if (!files || files.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No files uploaded yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Upload your first C/C++ file to get started
        </Typography>
      </Box>
    )
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>File Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Size</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Uploaded</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.file_id} hover>
              <TableCell>
                <Typography variant="body2">{file.filename}</Typography>
              </TableCell>
              <TableCell>
                <Chip label={file.file_type} size="small" variant="outlined" />
              </TableCell>
              <TableCell>{formatFileSize(file.file_size)}</TableCell>
              <TableCell>
                <Chip
                  label={file.analysis_status}
                  size="small"
                  color={getStatusColor(file.analysis_status)}
                />
              </TableCell>
              <TableCell>{formatDate(file.upload_timestamp)}</TableCell>
              <TableCell align="right">
                <IconButton size="small" title="View Analysis">
                  <VisibilityIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" title="Download">
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default FileHistory
