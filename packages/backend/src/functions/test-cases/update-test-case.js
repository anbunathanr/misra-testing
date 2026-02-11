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
        const testCaseId = event.pathParameters?.testCaseId;
        if (!testCaseId) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Missing testCaseId parameter' }),
            };
        }
        const input = {
            testCaseId,
            ...JSON.parse(event.body || '{}'),
        };
        const testCase = await testCaseService.updateTestCase(input);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testCase),
        };
    }
    catch (error) {
        console.error('Error updating test case:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLXRlc3QtY2FzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInVwZGF0ZS10ZXN0LWNhc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esd0VBQW1FO0FBRW5FLGtEQUFvQztBQUVwQyxNQUFNLGVBQWUsR0FBRyxJQUFJLG1DQUFlLEVBQUUsQ0FBQztBQUV2QyxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixJQUFJLENBQUM7UUFDSCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztRQUM5RSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7Z0JBQy9DLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLDhCQUE4QixFQUFFLENBQUM7YUFDaEUsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNoRCxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBUSxDQUFDO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLE9BQU8sRUFBRSxNQUFNLElBQUksT0FBTyxFQUFFLEdBQUcsQ0FBQztRQUUvQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRTtnQkFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLENBQUM7YUFDakQsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQztRQUNwRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7Z0JBQy9DLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLDhCQUE4QixFQUFFLENBQUM7YUFDaEUsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBd0I7WUFDakMsVUFBVTtZQUNWLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQztTQUNsQyxDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQUcsTUFBTSxlQUFlLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTdELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRTtZQUMvQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7U0FDL0IsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7WUFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQztTQUN6RCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQXBEVyxRQUFBLE9BQU8sV0FvRGxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBUZXN0Q2FzZVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy90ZXN0LWNhc2Utc2VydmljZSc7XHJcbmltcG9ydCB7IFVwZGF0ZVRlc3RDYXNlSW5wdXQgfSBmcm9tICcuLi8uLi90eXBlcy90ZXN0LWNhc2UnO1xyXG5pbXBvcnQgKiBhcyBqd3QgZnJvbSAnanNvbndlYnRva2VuJztcclxuXHJcbmNvbnN0IHRlc3RDYXNlU2VydmljZSA9IG5ldyBUZXN0Q2FzZVNlcnZpY2UoKTtcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGF1dGhIZWFkZXIgPSBldmVudC5oZWFkZXJzLkF1dGhvcml6YXRpb24gfHwgZXZlbnQuaGVhZGVycy5hdXRob3JpemF0aW9uO1xyXG4gICAgaWYgKCFhdXRoSGVhZGVyKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxyXG4gICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNaXNzaW5nIEF1dGhvcml6YXRpb24gaGVhZGVyJyB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0b2tlbiA9IGF1dGhIZWFkZXIucmVwbGFjZSgnQmVhcmVyICcsICcnKTtcclxuICAgIGNvbnN0IGRlY29kZWQgPSBqd3QuZGVjb2RlKHRva2VuKSBhcyBhbnk7XHJcbiAgICBjb25zdCB1c2VySWQgPSBkZWNvZGVkPy51c2VySWQgfHwgZGVjb2RlZD8uc3ViO1xyXG5cclxuICAgIGlmICghdXNlcklkKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxyXG4gICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIHRva2VuJyB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0ZXN0Q2FzZUlkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LnRlc3RDYXNlSWQ7XHJcbiAgICBpZiAoIXRlc3RDYXNlSWQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ01pc3NpbmcgdGVzdENhc2VJZCBwYXJhbWV0ZXInIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGlucHV0OiBVcGRhdGVUZXN0Q2FzZUlucHV0ID0ge1xyXG4gICAgICB0ZXN0Q2FzZUlkLFxyXG4gICAgICAuLi5KU09OLnBhcnNlKGV2ZW50LmJvZHkgfHwgJ3t9JyksXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHRlc3RDYXNlID0gYXdhaXQgdGVzdENhc2VTZXJ2aWNlLnVwZGF0ZVRlc3RDYXNlKGlucHV0KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh0ZXN0Q2FzZSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyB0ZXN0IGNhc2U6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludGVybmFsIHNlcnZlciBlcnJvcicgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19