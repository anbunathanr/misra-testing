import { useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  LinearProgress,
  Alert,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import {
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as InsertDriveFileIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../store'
import { useGetUploadUrlMutation, useUploadToS3Mutation, useGetFilesQuery } from '../store/api/filesApi'
import { api } from '../store/api'

interface FileUploadItem {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  fileId?: string
}

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  pending: 'warning',
  in_progress: 'info',
  completed: 'success',
  failed: 'error',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Queued',
  in_progress: 'Analysing',
  completed: 'Completed',
  failed: 'Failed',
}

function MISRAAnalysisPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [files, setFiles] = useState<FileUploadItem[]>([])
  const [dragActive, setDragActive] = useState(false)
  const user = useSelector((state: RootState) => state.auth.user)
  const dispatch = useDispatch()

  const [getUploadUrl] = useGetUploadUrlMutation()
  const [uploadToS3] = useUploadToS3Mutation()
  const { data: uploadedFiles = [], isLoading: isLoadingFiles, refetch } = useGetFilesQuery(undefined, {
    skip: !user,
    pollingInterval: 10000, // poll every 10s to pick up analysis status changes
  })

  const allowedExtensions = ['.c', '.cpp', '.h', '.hpp']

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedExtensions.includes(ext)) return `Invalid type. Allowed: ${allowedExtensions.join(', ')}`
    if (file.size > 10 * 1024 * 1024) return 'File too large (max 10MB)'
    if (file.size === 0) return 'File is empty'
    return null
  }

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return
    const newFiles: FileUploadItem[] = []
    for (let i = 0; i < Math.min(fileList.length, 50); i++) {
      const file = fileList[i]
      const error = validateFile(file)
      newFiles.push({ file, status: error ? 'error' : 'pending', error: error || undefined })
    }
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const uploadFile = async (index: number) => {
    const item = files[index]
    if (item.status !== 'pending') return

    setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'uploading' as const } : f))

    try {
      const urlResp = await getUploadUrl({
        fileName: item.file.name,
        fileSize: item.file.size,
        contentType: item.file.type || 'application/octet-stream',
      }).unwrap()

      await uploadToS3({
        url: urlResp.uploadUrl,
        file: item.file,
        contentType: item.file.type || 'application/octet-stream',
      }).unwrap()

      setFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: 'success' as const, fileId: urlResp.fileId } : f
      ))

      // Invalidate file cache so Analysis Results tab refreshes
      dispatch(api.util.invalidateTags(['File']))
    } catch (err) {
      setFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload failed' } : f
      ))
    }
  }

  const uploadAll = async () => {
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') await uploadFile(i)
    }
  }

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index))
  const clearCompleted = () => setFiles(prev => prev.filter(f => f.status !== 'success'))

  const pendingCount = files.filter(f => f.status === 'pending').length
  const successCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length

  if (!user) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>MISRA C/C++ Analysis</Typography>
        <Typography color="text.secondary">Please log in to access MISRA analysis.</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>MISRA C/C++ Analysis</Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Upload C/C++ source files for MISRA compliance analysis
      </Typography>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Upload Files" />
        <Tab label={`Analysis Results${uploadedFiles.length > 0 ? ` (${uploadedFiles.length})` : ''}`} />
      </Tabs>

      {/* ── UPLOAD TAB ── */}
      {activeTab === 0 && (
        <Box>
          <Paper
            sx={{
              p: 4,
              border: '2px dashed',
              borderColor: dragActive ? 'primary.main' : 'grey.300',
              backgroundColor: dragActive ? 'action.hover' : 'background.paper',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="misra-upload"
              multiple
              accept={allowedExtensions.join(',')}
              onChange={e => handleFiles(e.target.files)}
              style={{ display: 'none' }}
            />
            <label htmlFor="misra-upload" style={{ cursor: 'pointer' }}>
              <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>Drag and drop C/C++ files here</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>or click to browse</Typography>
              <Typography variant="caption" color="text.secondary">
                Supported: {allowedExtensions.join(', ')} — Max 10MB per file, 50 files max
              </Typography>
            </label>
          </Paper>

          {files.length > 0 && (
            <Box mt={3}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Files ({files.length})</Typography>
                <Box display="flex" gap={1}>
                  {successCount > 0 && (
                    <Chip label={`${successCount} uploaded`} color="success" size="small" icon={<CheckCircleIcon />} />
                  )}
                  {errorCount > 0 && (
                    <Chip label={`${errorCount} failed`} color="error" size="small" icon={<ErrorIcon />} />
                  )}
                </Box>
              </Box>

              {pendingCount > 0 && (
                <Box mb={2} display="flex" gap={1}>
                  <Button variant="contained" onClick={uploadAll}>
                    Upload All ({pendingCount})
                  </Button>
                  {successCount > 0 && (
                    <Button variant="outlined" onClick={clearCompleted}>Clear Completed</Button>
                  )}
                </Box>
              )}

              {successCount > 0 && pendingCount === 0 && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Files uploaded successfully. Switch to "Analysis Results" to track progress.
                </Alert>
              )}

              <List>
                {files.map((item, i) => (
                  <ListItem
                    key={i}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => removeFile(i)} disabled={item.status === 'uploading'}>
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemIcon>
                      {item.status === 'success' ? <CheckCircleIcon color="success" /> :
                       item.status === 'error' ? <ErrorIcon color="error" /> :
                       <InsertDriveFileIcon />}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.file.name}
                      secondary={
                        <Box>
                          <Typography variant="caption">{(item.file.size / 1024).toFixed(1)} KB</Typography>
                          {item.status === 'uploading' && <LinearProgress sx={{ mt: 0.5 }} />}
                          {item.status === 'success' && (
                            <Typography variant="caption" color="success.main" display="block">
                              Uploaded — analysis queued
                            </Typography>
                          )}
                          {item.error && (
                            <Typography variant="caption" color="error.main" display="block">{item.error}</Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      )}

      {/* ── ANALYSIS RESULTS TAB ── */}
      {activeTab === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="body2" color="text.secondary">
              Results refresh automatically every 10 seconds while analysis is running.
            </Typography>
            <Button startIcon={<RefreshIcon />} size="small" onClick={() => refetch()}>
              Refresh
            </Button>
          </Box>

          {isLoadingFiles ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : uploadedFiles.length === 0 ? (
            <Alert severity="info">
              No files found. Upload C/C++ files using the "Upload Files" tab to get started.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>File Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Analysis Status</TableCell>
                    <TableCell>Uploaded</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {uploadedFiles.map(file => (
                    <TableRow key={file.file_id} hover>
                      <TableCell>{file.filename}</TableCell>
                      <TableCell>
                        <Chip label={file.file_type?.toUpperCase() || 'C'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{(file.file_size / 1024).toFixed(1)} KB</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip
                            label={STATUS_LABEL[file.analysis_status] ?? file.analysis_status ?? 'Queued'}
                            color={STATUS_COLOR[file.analysis_status] ?? 'default'}
                            size="small"
                          />
                          {file.analysis_status === 'in_progress' && (
                            <CircularProgress size={14} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {file.upload_timestamp
                          ? new Date(file.upload_timestamp * 1000).toLocaleString()
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </Box>
  )
}

export default MISRAAnalysisPage
