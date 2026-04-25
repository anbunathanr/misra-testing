import { api } from '../api'

interface UploadUrlRequest {
  fileName: string
  fileSize: number
  contentType: string
}

interface UploadUrlResponse {
  fileId: string
  s3Key: string
  uploadUrl: string
  downloadUrl: string
  expiresIn: number
}

interface FileMetadata {
  file_id: string
  user_id: string
  filename: string
  file_type: string
  file_size: number
  upload_timestamp: number
  analysis_status: string
  s3_key: string
  created_at: number
  updated_at: number
}

export const filesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUploadUrl: builder.mutation<UploadUrlResponse, UploadUrlRequest>({
      query: (body) => ({
        url: '/files/upload',
        method: 'POST',
        body
      }),
      invalidatesTags: ['File']
    }),
    uploadToS3: builder.mutation<void, { url: string; file: File; contentType: string }>({
      queryFn: async ({ url, file, contentType }) => {
        try {
          console.log('🚀 Starting S3 upload:', { 
            urlPrefix: url.substring(0, 100), 
            fileSize: file.size, 
            fileName: file.name,
            contentType 
          })
          
          const response = await fetch(url, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': contentType
            }
          })

          console.log('📡 S3 upload response:', { 
            status: response.status, 
            statusText: response.statusText,
            contentLength: response.headers.get('content-length'),
            etag: response.headers.get('etag')
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ S3 upload error:', { 
              status: response.status,
              statusText: response.statusText,
              errorText,
              url: url.substring(0, 100)
            })
            throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`)
          }

          console.log('✅ S3 upload successful for file:', file.name)
          return { data: undefined }
        } catch (error) {
          console.error('❌ Upload exception:', error)
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } }
        }
      }
    }),
    getFiles: builder.query<FileMetadata[], void>({
      query: () => '/files',
      providesTags: ['File']
    })
  })
})

export const {
  useGetUploadUrlMutation,
  useUploadToS3Mutation,
  useGetFilesQuery
} = filesApi
