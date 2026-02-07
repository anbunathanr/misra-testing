import { useState, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { useGetUploadUrlMutation, useUploadToS3Mutation } from '../store/api/filesApi'

interface FileUploadItem {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  fileId?: string
}

function FileUpload() {
  const [files, setFiles] = useState<FileUploadItem[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [getUploadUrl] = useGetUploadUrlMutation()
  const [uploadToS3] = useUploadToS3Mutation()

  const allowedExtensions = ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx']
  const maxFileSize = 50 * 1024 * 1024 // 50MB

  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedExtensions.includes(extension)) {
      return `Invalid file type. Allowed: ${allowedExtensions.join(', ')}`
    }
    if (file.size > maxFileSize) {
      return `File too large. Maximum size: 50MB`
    }
    if (file.size === 0) {
      return 'File is empty'
    }
    return null
  }

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return

    const newFiles: FileUploadItem[] = []
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const error = validateFile(file)
      
      newFiles.push({
        file,
        status: error ? 'error' : 'pending',
        progress: 0,
        error: error || undefined
      })
    }

    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }, [handleFiles])

  const uploadFile = async (index: number) => {
    const fileItem = files[index]
    if (fileItem.status !== 'pending') return

    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, status: 'uploading' as const } : f))
    )

    try {
      // Get presigned URL
      const urlResponse = await getUploadUrl({
        fileName: fileItem.file.name,
        fileSize: fileItem.file.size,
        contentType: fileItem.file.type || 'application/octet-stream'
      }).unwrap()

      // Upload to S3
      await uploadToS3({
        url: urlResponse.uploadUrl,
        file: fileItem.file
      }).unwrap()

      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? { ...f, status: 'success' as const, progress: 100, fileId: urlResponse.fileId }
            : f
        )
      )
    } catch (error) {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Upload failed'
              }
            : f
        )
      )
    }
  }

  const uploadAll = async () => {
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') {
        await uploadFile(i)
      }
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== 'success'))
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length
  const successCount = files.filter((f) => f.status === 'success').length
  const errorCount = files.filter((f) => f.status === 'error').length

  return (
    <Box>
      <Paper
        sx={{
          p: 4,
          border: dragActive ? '2px dashed' : '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'grey.300',
          backgroundColor: dragActive ? 'action.hover' : 'background.paper',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          accept={allowedExtensions.join(',')}
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
          <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Drag and drop files here
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            or click to browse
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Supported: {allowedExtensions.join(', ')} (Max 50MB)
          </Typography>
        </label>
      </Paper>

      {files.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Files ({files.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {successCount > 0 && (
                <Chip
                  label={`${successCount} uploaded`}
                  color="success"
                  size="small"
                  icon={<CheckCircleIcon />}
                />
              )}
              {errorCount > 0 && (
                <Chip
                  label={`${errorCount} failed`}
                  color="error"
                  size="small"
                  icon={<ErrorIcon />}
                />
              )}
            </Box>
          </Box>

          {pendingCount > 0 && (
            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={uploadAll}
                disabled={pendingCount === 0}
              >
                Upload All ({pendingCount})
              </Button>
              {successCount > 0 && (
                <Button variant="outlined" onClick={clearCompleted}>
                  Clear Completed
                </Button>
              )}
            </Box>
          )}

          <List>
            {files.map((fileItem, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => removeFile(index)}
                    disabled={fileItem.status === 'uploading'}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemIcon>
                  {fileItem.status === 'success' ? (
                    <CheckCircleIcon color="success" />
                  ) : fileItem.status === 'error' ? (
                    <ErrorIcon color="error" />
                  ) : (
                    <InsertDriveFileIcon />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={fileItem.file.name}
                  secondary={
                    <Box>
                      <Typography variant="caption" component="span">
                        {(fileItem.file.size / 1024).toFixed(2)} KB
                      </Typography>
                      {fileItem.status === 'uploading' && (
                        <LinearProgress sx={{ mt: 1 }} />
                      )}
                      {fileItem.error && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {fileItem.error}
                        </Alert>
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
  )
}

export default FileUpload
