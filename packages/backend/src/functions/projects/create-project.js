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
        const input = JSON.parse(event.body || '{}');
        // Validation
        if (!input.name || !input.targetUrl || !input.environment) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Missing required fields: name, targetUrl, environment' }),
            };
        }
        const project = await projectService.createProject(userId, input);
        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project),
        };
    }
    catch (error) {
        console.error('Error creating project:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLXByb2plY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmVhdGUtcHJvamVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxvRUFBZ0U7QUFFaEUsa0RBQW9DO0FBRXBDLE1BQU0sY0FBYyxHQUFHLElBQUksZ0NBQWMsRUFBRSxDQUFDO0FBRXJDLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLElBQUksQ0FBQztRQUNILDBDQUEwQztRQUMxQyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztRQUM5RSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7Z0JBQy9DLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLDhCQUE4QixFQUFFLENBQUM7YUFDaEUsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNoRCxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBUSxDQUFDO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLE9BQU8sRUFBRSxNQUFNLElBQUksT0FBTyxFQUFFLEdBQUcsQ0FBQztRQUUvQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRTtnQkFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLENBQUM7YUFDakQsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBdUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDO1FBRWpFLGFBQWE7UUFDYixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDMUQsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7Z0JBQy9DLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHVEQUF1RCxFQUFFLENBQUM7YUFDekYsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxNQUFNLGNBQWMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxFLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRTtZQUMvQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7U0FDOUIsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7WUFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQztTQUN6RCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQWxEVyxRQUFBLE9BQU8sV0FrRGxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBQcm9qZWN0U2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL3Byb2plY3Qtc2VydmljZSc7XHJcbmltcG9ydCB7IENyZWF0ZVByb2plY3RJbnB1dCB9IGZyb20gJy4uLy4uL3R5cGVzL3Rlc3QtcHJvamVjdCc7XHJcbmltcG9ydCAqIGFzIGp3dCBmcm9tICdqc29ud2VidG9rZW4nO1xyXG5cclxuY29uc3QgcHJvamVjdFNlcnZpY2UgPSBuZXcgUHJvamVjdFNlcnZpY2UoKTtcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIEV4dHJhY3QgdG9rZW4gZnJvbSBBdXRob3JpemF0aW9uIGhlYWRlclxyXG4gICAgY29uc3QgYXV0aEhlYWRlciA9IGV2ZW50LmhlYWRlcnMuQXV0aG9yaXphdGlvbiB8fCBldmVudC5oZWFkZXJzLmF1dGhvcml6YXRpb247XHJcbiAgICBpZiAoIWF1dGhIZWFkZXIpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXHJcbiAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ01pc3NpbmcgQXV0aG9yaXphdGlvbiBoZWFkZXInIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHRva2VuID0gYXV0aEhlYWRlci5yZXBsYWNlKCdCZWFyZXIgJywgJycpO1xyXG4gICAgY29uc3QgZGVjb2RlZCA9IGp3dC5kZWNvZGUodG9rZW4pIGFzIGFueTtcclxuICAgIGNvbnN0IHVzZXJJZCA9IGRlY29kZWQ/LnVzZXJJZCB8fCBkZWNvZGVkPy5zdWI7XHJcblxyXG4gICAgaWYgKCF1c2VySWQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXHJcbiAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludmFsaWQgdG9rZW4nIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGlucHV0OiBDcmVhdGVQcm9qZWN0SW5wdXQgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkgfHwgJ3t9Jyk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGlvblxyXG4gICAgaWYgKCFpbnB1dC5uYW1lIHx8ICFpbnB1dC50YXJnZXRVcmwgfHwgIWlucHV0LmVudmlyb25tZW50KSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNaXNzaW5nIHJlcXVpcmVkIGZpZWxkczogbmFtZSwgdGFyZ2V0VXJsLCBlbnZpcm9ubWVudCcgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcHJvamVjdCA9IGF3YWl0IHByb2plY3RTZXJ2aWNlLmNyZWF0ZVByb2plY3QodXNlcklkLCBpbnB1dCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAxLFxyXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocHJvamVjdCksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjcmVhdGluZyBwcm9qZWN0OicsIGVycm9yKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcbiJdfQ==