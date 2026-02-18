"use strict";
/**
 * Unit tests for Get Execution Results Lambda
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const get_results_1 = require("../get-results");
const test_execution_db_service_1 = require("../../../services/test-execution-db-service");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
// Mock the database service
globals_1.jest.mock('../../../services/test-execution-db-service');
// Mock AWS S3 getSignedUrl
globals_1.jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: globals_1.jest.fn(),
}));
(0, globals_1.describe)('Get Execution Results Lambda', () => {
    const mockGetExecution = test_execution_db_service_1.testExecutionDBService.getExecution;
    const mockGetSignedUrl = s3_request_presigner_1.getSignedUrl;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.test)('should return 400 if executionId is missing', async () => {
        const event = {
            pathParameters: null,
        };
        const result = await (0, get_results_1.handler)(event);
        (0, globals_1.expect)(result.statusCode).toBe(400);
        (0, globals_1.expect)(JSON.parse(result.body)).toEqual({
            message: 'executionId is required',
        });
    });
    (0, globals_1.test)('should return 404 if execution not found', async () => {
        mockGetExecution.mockResolvedValue(null);
        const event = {
            pathParameters: {
                executionId: 'non-existent-id',
            },
        };
        const result = await (0, get_results_1.handler)(event);
        (0, globals_1.expect)(result.statusCode).toBe(404);
        (0, globals_1.expect)(JSON.parse(result.body)).toEqual({
            message: 'Execution not found: non-existent-id',
        });
    });
    (0, globals_1.test)('should return 500 on database error', async () => {
        mockGetExecution.mockRejectedValue(new Error('Database connection failed'));
        const event = {
            pathParameters: {
                executionId: 'exec-123',
            },
        };
        const result = await (0, get_results_1.handler)(event);
        (0, globals_1.expect)(result.statusCode).toBe(500);
        (0, globals_1.expect)(JSON.parse(result.body)).toEqual({
            message: 'Internal server error',
            error: 'Database connection failed',
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXJlc3VsdHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC1yZXN1bHRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOztBQUVILDJDQUF5RTtBQUV6RSxnREFBeUM7QUFDekMsMkZBQXFGO0FBRXJGLHdFQUE2RDtBQUU3RCw0QkFBNEI7QUFDNUIsY0FBSSxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO0FBRXpELDJCQUEyQjtBQUMzQixjQUFJLENBQUMsSUFBSSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDaEQsWUFBWSxFQUFFLGNBQUksQ0FBQyxFQUFFLEVBQUU7Q0FDeEIsQ0FBQyxDQUFDLENBQUM7QUFFSixJQUFBLGtCQUFRLEVBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO0lBQzVDLE1BQU0sZ0JBQWdCLEdBQUcsa0RBQXNCLENBQUMsWUFFL0MsQ0FBQztJQUNGLE1BQU0sZ0JBQWdCLEdBQUcsbUNBQXdELENBQUM7SUFFbEYsSUFBQSxvQkFBVSxFQUFDLEdBQUcsRUFBRTtRQUNkLGNBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztJQUVILElBQUEsY0FBSSxFQUFDLDZDQUE2QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdELE1BQU0sS0FBSyxHQUFHO1lBQ1osY0FBYyxFQUFFLElBQUk7U0FDYyxDQUFDO1FBRXJDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSxxQkFBTyxFQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXBDLElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLElBQUEsZ0JBQU0sRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUN0QyxPQUFPLEVBQUUseUJBQXlCO1NBQ25DLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBQSxjQUFJLEVBQUMsMENBQTBDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUQsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFekMsTUFBTSxLQUFLLEdBQUc7WUFDWixjQUFjLEVBQUU7Z0JBQ2QsV0FBVyxFQUFFLGlCQUFpQjthQUMvQjtTQUNpQyxDQUFDO1FBRXJDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSxxQkFBTyxFQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXBDLElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLElBQUEsZ0JBQU0sRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUN0QyxPQUFPLEVBQUUsc0NBQXNDO1NBQ2hELENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBQSxjQUFJLEVBQUMscUNBQXFDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDckQsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO1FBRTVFLE1BQU0sS0FBSyxHQUFHO1lBQ1osY0FBYyxFQUFFO2dCQUNkLFdBQVcsRUFBRSxVQUFVO2FBQ3hCO1NBQ2lDLENBQUM7UUFFckMsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLHFCQUFPLEVBQUMsS0FBSyxDQUFDLENBQUM7UUFFcEMsSUFBQSxnQkFBTSxFQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEMsSUFBQSxnQkFBTSxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQ3RDLE9BQU8sRUFBRSx1QkFBdUI7WUFDaEMsS0FBSyxFQUFFLDRCQUE0QjtTQUNwQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFVuaXQgdGVzdHMgZm9yIEdldCBFeGVjdXRpb24gUmVzdWx0cyBMYW1iZGFcclxuICovXHJcblxyXG5pbXBvcnQgeyBiZWZvcmVFYWNoLCBkZXNjcmliZSwgZXhwZWN0LCBqZXN0LCB0ZXN0IH0gZnJvbSAnQGplc3QvZ2xvYmFscyc7XHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IGhhbmRsZXIgfSBmcm9tICcuLi9nZXQtcmVzdWx0cyc7XHJcbmltcG9ydCB7IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UgfSBmcm9tICcuLi8uLi8uLi9zZXJ2aWNlcy90ZXN0LWV4ZWN1dGlvbi1kYi1zZXJ2aWNlJztcclxuaW1wb3J0IHsgVGVzdEV4ZWN1dGlvbiB9IGZyb20gJy4uLy4uLy4uL3R5cGVzL3Rlc3QtZXhlY3V0aW9uJztcclxuaW1wb3J0IHsgZ2V0U2lnbmVkVXJsIH0gZnJvbSAnQGF3cy1zZGsvczMtcmVxdWVzdC1wcmVzaWduZXInO1xyXG5cclxuLy8gTW9jayB0aGUgZGF0YWJhc2Ugc2VydmljZVxyXG5qZXN0Lm1vY2soJy4uLy4uLy4uL3NlcnZpY2VzL3Rlc3QtZXhlY3V0aW9uLWRiLXNlcnZpY2UnKTtcclxuXHJcbi8vIE1vY2sgQVdTIFMzIGdldFNpZ25lZFVybFxyXG5qZXN0Lm1vY2soJ0Bhd3Mtc2RrL3MzLXJlcXVlc3QtcHJlc2lnbmVyJywgKCkgPT4gKHtcclxuICBnZXRTaWduZWRVcmw6IGplc3QuZm4oKSxcclxufSkpO1xyXG5cclxuZGVzY3JpYmUoJ0dldCBFeGVjdXRpb24gUmVzdWx0cyBMYW1iZGEnLCAoKSA9PiB7XHJcbiAgY29uc3QgbW9ja0dldEV4ZWN1dGlvbiA9IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UuZ2V0RXhlY3V0aW9uIGFzIGplc3QuTW9ja2VkRnVuY3Rpb248XHJcbiAgICB0eXBlb2YgdGVzdEV4ZWN1dGlvbkRCU2VydmljZS5nZXRFeGVjdXRpb25cclxuICA+O1xyXG4gIGNvbnN0IG1vY2tHZXRTaWduZWRVcmwgPSBnZXRTaWduZWRVcmwgYXMgamVzdC5Nb2NrZWRGdW5jdGlvbjx0eXBlb2YgZ2V0U2lnbmVkVXJsPjtcclxuXHJcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICBqZXN0LmNsZWFyQWxsTW9ja3MoKTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnc2hvdWxkIHJldHVybiA0MDAgaWYgZXhlY3V0aW9uSWQgaXMgbWlzc2luZycsIGFzeW5jICgpID0+IHtcclxuICAgIGNvbnN0IGV2ZW50ID0ge1xyXG4gICAgICBwYXRoUGFyYW1ldGVyczogbnVsbCxcclxuICAgIH0gYXMgdW5rbm93biBhcyBBUElHYXRld2F5UHJveHlFdmVudDtcclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcclxuXHJcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcclxuICAgIGV4cGVjdChKU09OLnBhcnNlKHJlc3VsdC5ib2R5KSkudG9FcXVhbCh7XHJcbiAgICAgIG1lc3NhZ2U6ICdleGVjdXRpb25JZCBpcyByZXF1aXJlZCcsXHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnc2hvdWxkIHJldHVybiA0MDQgaWYgZXhlY3V0aW9uIG5vdCBmb3VuZCcsIGFzeW5jICgpID0+IHtcclxuICAgIG1vY2tHZXRFeGVjdXRpb24ubW9ja1Jlc29sdmVkVmFsdWUobnVsbCk7XHJcblxyXG4gICAgY29uc3QgZXZlbnQgPSB7XHJcbiAgICAgIHBhdGhQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgZXhlY3V0aW9uSWQ6ICdub24tZXhpc3RlbnQtaWQnLFxyXG4gICAgICB9LFxyXG4gICAgfSBhcyB1bmtub3duIGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50O1xyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG5cclxuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDQpO1xyXG4gICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpKS50b0VxdWFsKHtcclxuICAgICAgbWVzc2FnZTogJ0V4ZWN1dGlvbiBub3QgZm91bmQ6IG5vbi1leGlzdGVudC1pZCcsXHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnc2hvdWxkIHJldHVybiA1MDAgb24gZGF0YWJhc2UgZXJyb3InLCBhc3luYyAoKSA9PiB7XHJcbiAgICBtb2NrR2V0RXhlY3V0aW9uLm1vY2tSZWplY3RlZFZhbHVlKG5ldyBFcnJvcignRGF0YWJhc2UgY29ubmVjdGlvbiBmYWlsZWQnKSk7XHJcblxyXG4gICAgY29uc3QgZXZlbnQgPSB7XHJcbiAgICAgIHBhdGhQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgZXhlY3V0aW9uSWQ6ICdleGVjLTEyMycsXHJcbiAgICAgIH0sXHJcbiAgICB9IGFzIHVua25vd24gYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQ7XHJcblxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcblxyXG4gICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDUwMCk7XHJcbiAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkpLnRvRXF1YWwoe1xyXG4gICAgICBtZXNzYWdlOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyxcclxuICAgICAgZXJyb3I6ICdEYXRhYmFzZSBjb25uZWN0aW9uIGZhaWxlZCcsXHJcbiAgICB9KTtcclxuICB9KTtcclxufSk7XHJcbiJdfQ==