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
const test_case_service_1 = require("../../services/test-case-service");
const jwt = __importStar(require("jsonwebtoken"));
const testCaseService = new test_case_service_1.TestCaseService();
const handler = async (event) => {
    try {
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
        const suiteId = event.queryStringParameters?.suiteId;
        const projectId = event.queryStringParameters?.projectId;
        let testCases;
        if (suiteId) {
            testCases = await testCaseService.getSuiteTestCases(suiteId);
        }
        else if (projectId) {
            testCases = await testCaseService.getProjectTestCases(projectId);
        }
        else {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Either suiteId or projectId query parameter is required' }),
            };
        }
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testCases),
        };
    }
    catch (error) {
        console.error('Error getting test cases:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXRlc3QtY2FzZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtdGVzdC1jYXNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx3RUFBbUU7QUFDbkUsa0RBQW9DO0FBRXBDLE1BQU0sZUFBZSxHQUFHLElBQUksbUNBQWUsRUFBRSxDQUFDO0FBRXZDLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLElBQUksQ0FBQztRQUNILE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO1FBQzlFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNoQixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRTtnQkFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsOEJBQThCLEVBQUUsQ0FBQzthQUNoRSxDQUFDO1FBQ0osQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFRLENBQUM7UUFDekMsTUFBTSxNQUFNLEdBQUcsT0FBTyxFQUFFLE1BQU0sSUFBSSxPQUFPLEVBQUUsR0FBRyxDQUFDO1FBRS9DLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFO2dCQUMvQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsQ0FBQzthQUNqRCxDQUFDO1FBQ0osQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLENBQUM7UUFDckQsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixFQUFFLFNBQVMsQ0FBQztRQUV6RCxJQUFJLFNBQVMsQ0FBQztRQUNkLElBQUksT0FBTyxFQUFFLENBQUM7WUFDWixTQUFTLEdBQUcsTUFBTSxlQUFlLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0QsQ0FBQzthQUFNLElBQUksU0FBUyxFQUFFLENBQUM7WUFDckIsU0FBUyxHQUFHLE1BQU0sZUFBZSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ25FLENBQUM7YUFBTSxDQUFDO1lBQ04sT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7Z0JBQy9DLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHlEQUF5RCxFQUFFLENBQUM7YUFDM0YsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7WUFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO1NBQ2hDLENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFO1lBQy9DLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHVCQUF1QixFQUFFLENBQUM7U0FDekQsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUFwRFcsUUFBQSxPQUFPLFdBb0RsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgVGVzdENhc2VTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvdGVzdC1jYXNlLXNlcnZpY2UnO1xyXG5pbXBvcnQgKiBhcyBqd3QgZnJvbSAnanNvbndlYnRva2VuJztcclxuXHJcbmNvbnN0IHRlc3RDYXNlU2VydmljZSA9IG5ldyBUZXN0Q2FzZVNlcnZpY2UoKTtcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGF1dGhIZWFkZXIgPSBldmVudC5oZWFkZXJzLkF1dGhvcml6YXRpb24gfHwgZXZlbnQuaGVhZGVycy5hdXRob3JpemF0aW9uO1xyXG4gICAgaWYgKCFhdXRoSGVhZGVyKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxyXG4gICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNaXNzaW5nIEF1dGhvcml6YXRpb24gaGVhZGVyJyB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0b2tlbiA9IGF1dGhIZWFkZXIucmVwbGFjZSgnQmVhcmVyICcsICcnKTtcclxuICAgIGNvbnN0IGRlY29kZWQgPSBqd3QuZGVjb2RlKHRva2VuKSBhcyBhbnk7XHJcbiAgICBjb25zdCB1c2VySWQgPSBkZWNvZGVkPy51c2VySWQgfHwgZGVjb2RlZD8uc3ViO1xyXG5cclxuICAgIGlmICghdXNlcklkKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxyXG4gICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIHRva2VuJyB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzdWl0ZUlkID0gZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzPy5zdWl0ZUlkO1xyXG4gICAgY29uc3QgcHJvamVjdElkID0gZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzPy5wcm9qZWN0SWQ7XHJcblxyXG4gICAgbGV0IHRlc3RDYXNlcztcclxuICAgIGlmIChzdWl0ZUlkKSB7XHJcbiAgICAgIHRlc3RDYXNlcyA9IGF3YWl0IHRlc3RDYXNlU2VydmljZS5nZXRTdWl0ZVRlc3RDYXNlcyhzdWl0ZUlkKTtcclxuICAgIH0gZWxzZSBpZiAocHJvamVjdElkKSB7XHJcbiAgICAgIHRlc3RDYXNlcyA9IGF3YWl0IHRlc3RDYXNlU2VydmljZS5nZXRQcm9qZWN0VGVzdENhc2VzKHByb2plY3RJZCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnRWl0aGVyIHN1aXRlSWQgb3IgcHJvamVjdElkIHF1ZXJ5IHBhcmFtZXRlciBpcyByZXF1aXJlZCcgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkodGVzdENhc2VzKSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgdGVzdCBjYXNlczonLCBlcnJvcik7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG4iXX0=