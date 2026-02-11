"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const project_service_1 = require("../../services/project-service");
const jwt = __importStar(require("jsonwebtoken"));
const projectService = new project_service_1.ProjectService();
const handler = async (event) => {
    try {
        // Extract token from Authorization header
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader) {
            return {
                statusCode: 401,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Missing Authorization header' }),
            };
        }
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.decode(token);
        const userId = decoded?.userId || decoded?.sub;
        if (!userId) {
            return {
                statusCode: 401,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Invalid token' }),
            };
        }
        const projectId = event.pathParameters?.projectId;
        if (!projectId) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Missing projectId' }),
            };
        }
        const input = {
            projectId,
            ...JSON.parse(event.body || '{}'),
        };
        const project = await projectService.updateProject(input);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project),
        };
    }
    catch (error) {
        console.error('Error updating project:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLXByb2plY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1cGRhdGUtcHJvamVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxvRUFBZ0U7QUFFaEUsa0RBQW9DO0FBRXBDLE1BQU0sY0FBYyxHQUFHLElBQUksZ0NBQWMsRUFBRSxDQUFDO0FBRXJDLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLElBQUksQ0FBQztRQUNILDBDQUEwQztRQUMxQyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztRQUM5RSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7Z0JBQy9DLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLDhCQUE4QixFQUFFLENBQUM7YUFDaEUsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNoRCxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBUSxDQUFDO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLE9BQU8sRUFBRSxNQUFNLElBQUksT0FBTyxFQUFFLEdBQUcsQ0FBQztRQUUvQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRTtnQkFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLENBQUM7YUFDakQsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQztRQUNsRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDZixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRTtnQkFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQzthQUNyRCxDQUFDO1FBQ0osQ0FBQztRQUVELE1BQU0sS0FBSyxHQUF1QjtZQUNoQyxTQUFTO1lBQ1QsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDO1NBQ2xDLENBQUM7UUFFRixNQUFNLE9BQU8sR0FBRyxNQUFNLGNBQWMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFMUQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFO1lBQy9DLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztTQUM5QixDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRTtZQUMvQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSx1QkFBdUIsRUFBRSxDQUFDO1NBQ3pELENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBckRXLFFBQUEsT0FBTyxXQXFEbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFByb2plY3RTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvcHJvamVjdC1zZXJ2aWNlJztcclxuaW1wb3J0IHsgVXBkYXRlUHJvamVjdElucHV0IH0gZnJvbSAnLi4vLi4vdHlwZXMvdGVzdC1wcm9qZWN0JztcclxuaW1wb3J0ICogYXMgand0IGZyb20gJ2pzb253ZWJ0b2tlbic7XHJcblxyXG5jb25zdCBwcm9qZWN0U2VydmljZSA9IG5ldyBQcm9qZWN0U2VydmljZSgpO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICB0cnkge1xyXG4gICAgLy8gRXh0cmFjdCB0b2tlbiBmcm9tIEF1dGhvcml6YXRpb24gaGVhZGVyXHJcbiAgICBjb25zdCBhdXRoSGVhZGVyID0gZXZlbnQuaGVhZGVycy5BdXRob3JpemF0aW9uIHx8IGV2ZW50LmhlYWRlcnMuYXV0aG9yaXphdGlvbjtcclxuICAgIGlmICghYXV0aEhlYWRlcikge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTWlzc2luZyBBdXRob3JpemF0aW9uIGhlYWRlcicgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdG9rZW4gPSBhdXRoSGVhZGVyLnJlcGxhY2UoJ0JlYXJlciAnLCAnJyk7XHJcbiAgICBjb25zdCBkZWNvZGVkID0gand0LmRlY29kZSh0b2tlbikgYXMgYW55O1xyXG4gICAgY29uc3QgdXNlcklkID0gZGVjb2RlZD8udXNlcklkIHx8IGRlY29kZWQ/LnN1YjtcclxuXHJcbiAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW52YWxpZCB0b2tlbicgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcHJvamVjdElkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LnByb2plY3RJZDtcclxuICAgIGlmICghcHJvamVjdElkKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNaXNzaW5nIHByb2plY3RJZCcgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgaW5wdXQ6IFVwZGF0ZVByb2plY3RJbnB1dCA9IHtcclxuICAgICAgcHJvamVjdElkLFxyXG4gICAgICAuLi5KU09OLnBhcnNlKGV2ZW50LmJvZHkgfHwgJ3t9JyksXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHByb2plY3QgPSBhd2FpdCBwcm9qZWN0U2VydmljZS51cGRhdGVQcm9qZWN0KGlucHV0KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShwcm9qZWN0KSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVwZGF0aW5nIHByb2plY3Q6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludGVybmFsIHNlcnZlciBlcnJvcicgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19