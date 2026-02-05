"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const file_upload_service_1 = require("../../services/file/file-upload-service");
const jwt_service_1 = require("../../services/auth/jwt-service");
const fileUploadService = new file_upload_service_1.FileUploadService();
const jwtService = new jwt_service_1.JWTService();
const handler = async (event) => {
    try {
        // Extract and validate JWT token
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return errorResponse(401, 'MISSING_TOKEN', 'Authorization token is required');
        }
        const token = authHeader.substring(7);
        let tokenPayload;
        try {
            tokenPayload = await jwtService.verifyAccessToken(token);
        }
        catch (error) {
            return errorResponse(401, 'INVALID_TOKEN', 'Invalid or expired token');
        }
        // Parse request body
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required');
        }
        const uploadRequest = JSON.parse(event.body);
        // Validate input
        if (!uploadRequest.fileName || !uploadRequest.fileSize || !uploadRequest.contentType) {
            return errorResponse(400, 'INVALID_INPUT', 'fileName, fileSize, and contentType are required');
        }
        // Create file upload request
        const fileUploadRequest = {
            fileName: uploadRequest.fileName,
            fileSize: uploadRequest.fileSize,
            contentType: uploadRequest.contentType,
            organizationId: tokenPayload.organizationId,
            userId: tokenPayload.userId,
        };
        // Generate presigned upload URL
        const uploadResponse = await fileUploadService.generatePresignedUploadUrl(fileUploadRequest);
        const response = {
            fileId: uploadResponse.fileId,
            uploadUrl: uploadResponse.uploadUrl,
            downloadUrl: uploadResponse.downloadUrl,
            expiresIn: uploadResponse.expiresIn,
        };
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            },
            body: JSON.stringify(response),
        };
    }
    catch (error) {
        console.error('File upload error:', error);
        if (error instanceof Error) {
            if (error.message.includes('validation failed')) {
                return errorResponse(400, 'FILE_VALIDATION_ERROR', error.message);
            }
            if (error.message.includes('Failed to generate upload URL')) {
                return errorResponse(503, 'UPLOAD_SERVICE_UNAVAILABLE', 'File upload service temporarily unavailable');
            }
        }
        return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
    }
};
exports.handler = handler;
function errorResponse(statusCode, code, message) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: JSON.stringify({
            error: {
                code,
                message,
                timestamp: new Date().toISOString(),
                requestId: Math.random().toString(36).substring(7),
            },
        }),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBsb2FkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBsb2FkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGlGQUErRjtBQUMvRixpRUFBNkQ7QUFnQjdELE1BQU0saUJBQWlCLEdBQUcsSUFBSSx1Q0FBaUIsRUFBRSxDQUFDO0FBQ2xELE1BQU0sVUFBVSxHQUFHLElBQUksd0JBQVUsRUFBRSxDQUFDO0FBRTdCLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLElBQUksQ0FBQztRQUNILGlDQUFpQztRQUNqQyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztRQUM5RSxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3JELE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxlQUFlLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztRQUNoRixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QyxJQUFJLFlBQVksQ0FBQztRQUVqQixJQUFJLENBQUM7WUFDSCxZQUFZLEdBQUcsTUFBTSxVQUFVLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDekUsQ0FBQztRQUVELHFCQUFxQjtRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBRUQsTUFBTSxhQUFhLEdB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b3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBGaWxlVXBsb2FkU2VydmljZSwgRmlsZVVwbG9hZFJlcXVlc3QgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9maWxlL2ZpbGUtdXBsb2FkLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBKV1RTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYXV0aC9qd3Qtc2VydmljZSc7XHJcblxyXG4vLyBMb2NhbCB0eXBlIGRlZmluaXRpb25zXHJcbmludGVyZmFjZSBVcGxvYWRSZXF1ZXN0Qm9keSB7XHJcbiAgZmlsZU5hbWU6IHN0cmluZztcclxuICBmaWxlU2l6ZTogbnVtYmVyO1xyXG4gIGNvbnRlbnRUeXBlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBVcGxvYWRSZXNwb25zZSB7XHJcbiAgZmlsZUlkOiBzdHJpbmc7XHJcbiAgdXBsb2FkVXJsOiBzdHJpbmc7XHJcbiAgZG93bmxvYWRVcmw6IHN0cmluZztcclxuICBleHBpcmVzSW46IG51bWJlcjtcclxufVxyXG5cclxuY29uc3QgZmlsZVVwbG9hZFNlcnZpY2UgPSBuZXcgRmlsZVVwbG9hZFNlcnZpY2UoKTtcclxuY29uc3Qgand0U2VydmljZSA9IG5ldyBKV1RTZXJ2aWNlKCk7XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcclxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICB0cnkge1xyXG4gICAgLy8gRXh0cmFjdCBhbmQgdmFsaWRhdGUgSldUIHRva2VuXHJcbiAgICBjb25zdCBhdXRoSGVhZGVyID0gZXZlbnQuaGVhZGVycy5BdXRob3JpemF0aW9uIHx8IGV2ZW50LmhlYWRlcnMuYXV0aG9yaXphdGlvbjtcclxuICAgIGlmICghYXV0aEhlYWRlciB8fCAhYXV0aEhlYWRlci5zdGFydHNXaXRoKCdCZWFyZXIgJykpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAxLCAnTUlTU0lOR19UT0tFTicsICdBdXRob3JpemF0aW9uIHRva2VuIGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdG9rZW4gPSBhdXRoSGVhZGVyLnN1YnN0cmluZyg3KTtcclxuICAgIGxldCB0b2tlblBheWxvYWQ7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIHRva2VuUGF5bG9hZCA9IGF3YWl0IGp3dFNlcnZpY2UudmVyaWZ5QWNjZXNzVG9rZW4odG9rZW4pO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAxLCAnSU5WQUxJRF9UT0tFTicsICdJbnZhbGlkIG9yIGV4cGlyZWQgdG9rZW4nKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0JPRFknLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdXBsb2FkUmVxdWVzdDogVXBsb2FkUmVxdWVzdEJvZHkgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIGlucHV0XHJcbiAgICBpZiAoIXVwbG9hZFJlcXVlc3QuZmlsZU5hbWUgfHwgIXVwbG9hZFJlcXVlc3QuZmlsZVNpemUgfHwgIXVwbG9hZFJlcXVlc3QuY29udGVudFR5cGUpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnSU5WQUxJRF9JTlBVVCcsICdmaWxlTmFtZSwgZmlsZVNpemUsIGFuZCBjb250ZW50VHlwZSBhcmUgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgZmlsZSB1cGxvYWQgcmVxdWVzdFxyXG4gICAgY29uc3QgZmlsZVVwbG9hZFJlcXVlc3Q6IEZpbGVVcGxvYWRSZXF1ZXN0ID0ge1xyXG4gICAgICBmaWxlTmFtZTogdXBsb2FkUmVxdWVzdC5maWxlTmFtZSxcclxuICAgICAgZmlsZVNpemU6IHVwbG9hZFJlcXVlc3QuZmlsZVNpemUsXHJcbiAgICAgIGNvbnRlbnRUeXBlOiB1cGxvYWRSZXF1ZXN0LmNvbnRlbnRUeXBlLFxyXG4gICAgICBvcmdhbml6YXRpb25JZDogdG9rZW5QYXlsb2FkLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICB1c2VySWQ6IHRva2VuUGF5bG9hZC51c2VySWQsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEdlbmVyYXRlIHByZXNpZ25lZCB1cGxvYWQgVVJMXHJcbiAgICBjb25zdCB1cGxvYWRSZXNwb25zZSA9IGF3YWl0IGZpbGVVcGxvYWRTZXJ2aWNlLmdlbmVyYXRlUHJlc2lnbmVkVXBsb2FkVXJsKGZpbGVVcGxvYWRSZXF1ZXN0KTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogVXBsb2FkUmVzcG9uc2UgPSB7XHJcbiAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgICB1cGxvYWRVcmw6IHVwbG9hZFJlc3BvbnNlLnVwbG9hZFVybCxcclxuICAgICAgZG93bmxvYWRVcmw6IHVwbG9hZFJlc3BvbnNlLmRvd25sb2FkVXJsLFxyXG4gICAgICBleHBpcmVzSW46IHVwbG9hZFJlc3BvbnNlLmV4cGlyZXNJbixcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRmlsZSB1cGxvYWQgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgXHJcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xyXG4gICAgICBpZiAoZXJyb3IubWVzc2FnZS5pbmNsdWRlcygndmFsaWRhdGlvbiBmYWlsZWQnKSkge1xyXG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0ZJTEVfVkFMSURBVElPTl9FUlJPUicsIGVycm9yLm1lc3NhZ2UpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChlcnJvci5tZXNzYWdlLmluY2x1ZGVzKCdGYWlsZWQgdG8gZ2VuZXJhdGUgdXBsb2FkIFVSTCcpKSB7XHJcbiAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAzLCAnVVBMT0FEX1NFUlZJQ0VfVU5BVkFJTEFCTEUnLCAnRmlsZSB1cGxvYWQgc2VydmljZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZScpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ0lOVEVSTkFMX0VSUk9SJywgJ0ludGVybmFsIHNlcnZlciBlcnJvcicpO1xyXG4gIH1cclxufTtcclxuXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyksXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICB9O1xyXG59Il19