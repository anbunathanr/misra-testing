"use strict";
/**
 * Unit tests for Get Execution Status Lambda
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const get_status_1 = require("../get-status");
const test_execution_db_service_1 = require("../../../services/test-execution-db-service");
// Mock the database service
globals_1.jest.mock('../../../services/test-execution-db-service');
(0, globals_1.describe)('Get Execution Status Lambda', () => {
    const mockGetExecution = test_execution_db_service_1.testExecutionDBService.getExecution;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.test)('should return 400 if executionId is missing', async () => {
        const event = {
            pathParameters: null,
        };
        const result = await (0, get_status_1.handler)(event);
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
        const result = await (0, get_status_1.handler)(event);
        (0, globals_1.expect)(result.statusCode).toBe(404);
        (0, globals_1.expect)(JSON.parse(result.body)).toEqual({
            message: 'Execution not found: non-existent-id',
        });
    });
    (0, globals_1.test)('should return execution status for queued execution', async () => {
        const mockExecution = {
            executionId: 'exec-123',
            projectId: 'proj-1',
            testCaseId: 'tc-1',
            status: 'queued',
            startTime: '2024-01-01T00:00:00.000Z',
            steps: [
                {
                    stepIndex: 0,
                    action: 'navigate',
                    status: 'pass',
                    duration: 0,
                },
                {
                    stepIndex: 1,
                    action: 'click',
                    status: 'pass',
                    duration: 0,
                },
            ],
            screenshots: [],
            metadata: {
                triggeredBy: 'user-1',
            },
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
        };
        mockGetExecution.mockResolvedValue(mockExecution);
        const event = {
            pathParameters: {
                executionId: 'exec-123',
            },
        };
        const result = await (0, get_status_1.handler)(event);
        (0, globals_1.expect)(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        (0, globals_1.expect)(body).toMatchObject({
            executionId: 'exec-123',
            status: 'queued',
            totalSteps: 2,
            startTime: '2024-01-01T00:00:00.000Z',
        });
        (0, globals_1.expect)(body.currentStep).toBeUndefined();
    });
    (0, globals_1.test)('should return execution status with current step for running execution', async () => {
        const mockExecution = {
            executionId: 'exec-123',
            projectId: 'proj-1',
            testCaseId: 'tc-1',
            status: 'running',
            startTime: '2024-01-01T00:00:00.000Z',
            steps: [
                {
                    stepIndex: 0,
                    action: 'navigate',
                    status: 'pass',
                    duration: 100,
                },
                {
                    stepIndex: 1,
                    action: 'click',
                    status: 'pass',
                    duration: 50,
                },
                {
                    stepIndex: 2,
                    action: 'type',
                    status: 'pass',
                    duration: 0,
                },
            ],
            screenshots: [],
            metadata: {
                triggeredBy: 'user-1',
            },
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:01.000Z',
        };
        mockGetExecution.mockResolvedValue(mockExecution);
        const event = {
            pathParameters: {
                executionId: 'exec-123',
            },
        };
        const result = await (0, get_status_1.handler)(event);
        (0, globals_1.expect)(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        (0, globals_1.expect)(body).toMatchObject({
            executionId: 'exec-123',
            status: 'running',
            currentStep: 3, // 3 steps completed
            totalSteps: 3,
            startTime: '2024-01-01T00:00:00.000Z',
        });
        (0, globals_1.expect)(body.duration).toBeGreaterThan(0);
    });
    (0, globals_1.test)('should return execution status with result for completed execution', async () => {
        const mockExecution = {
            executionId: 'exec-123',
            projectId: 'proj-1',
            testCaseId: 'tc-1',
            status: 'completed',
            result: 'pass',
            startTime: '2024-01-01T00:00:00.000Z',
            endTime: '2024-01-01T00:00:05.000Z',
            duration: 5000,
            steps: [
                {
                    stepIndex: 0,
                    action: 'navigate',
                    status: 'pass',
                    duration: 2000,
                },
                {
                    stepIndex: 1,
                    action: 'click',
                    status: 'pass',
                    duration: 1000,
                },
                {
                    stepIndex: 2,
                    action: 'assert',
                    status: 'pass',
                    duration: 2000,
                },
            ],
            screenshots: [],
            metadata: {
                triggeredBy: 'user-1',
            },
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:05.000Z',
        };
        mockGetExecution.mockResolvedValue(mockExecution);
        const event = {
            pathParameters: {
                executionId: 'exec-123',
            },
        };
        const result = await (0, get_status_1.handler)(event);
        (0, globals_1.expect)(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        (0, globals_1.expect)(body).toEqual({
            executionId: 'exec-123',
            status: 'completed',
            result: 'pass',
            totalSteps: 3,
            startTime: '2024-01-01T00:00:00.000Z',
            duration: 5000,
        });
    });
    (0, globals_1.test)('should return execution status for failed execution', async () => {
        const mockExecution = {
            executionId: 'exec-123',
            projectId: 'proj-1',
            testCaseId: 'tc-1',
            status: 'completed',
            result: 'fail',
            startTime: '2024-01-01T00:00:00.000Z',
            endTime: '2024-01-01T00:00:03.000Z',
            duration: 3000,
            steps: [
                {
                    stepIndex: 0,
                    action: 'navigate',
                    status: 'pass',
                    duration: 1000,
                },
                {
                    stepIndex: 1,
                    action: 'click',
                    status: 'fail',
                    duration: 2000,
                    errorMessage: 'Element not found',
                },
            ],
            screenshots: ['screenshot-1.png'],
            metadata: {
                triggeredBy: 'user-1',
            },
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:03.000Z',
        };
        mockGetExecution.mockResolvedValue(mockExecution);
        const event = {
            pathParameters: {
                executionId: 'exec-123',
            },
        };
        const result = await (0, get_status_1.handler)(event);
        (0, globals_1.expect)(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        (0, globals_1.expect)(body).toEqual({
            executionId: 'exec-123',
            status: 'completed',
            result: 'fail',
            totalSteps: 2,
            startTime: '2024-01-01T00:00:00.000Z',
            duration: 3000,
        });
    });
    (0, globals_1.test)('should return 500 on database error', async () => {
        mockGetExecution.mockRejectedValue(new Error('Database connection failed'));
        const event = {
            pathParameters: {
                executionId: 'exec-123',
            },
        };
        const result = await (0, get_status_1.handler)(event);
        (0, globals_1.expect)(result.statusCode).toBe(500);
        (0, globals_1.expect)(JSON.parse(result.body)).toEqual({
            message: 'Internal server error',
            error: 'Database connection failed',
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXN0YXR1cy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LXN0YXR1cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7R0FFRzs7QUFFSCwyQ0FBeUU7QUFFekUsOENBQXdDO0FBQ3hDLDJGQUFxRjtBQUdyRiw0QkFBNEI7QUFDNUIsY0FBSSxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO0FBRXpELElBQUEsa0JBQVEsRUFBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7SUFDM0MsTUFBTSxnQkFBZ0IsR0FBRyxrREFBc0IsQ0FBQyxZQUUvQyxDQUFDO0lBRUYsSUFBQSxvQkFBVSxFQUFDLEdBQUcsRUFBRTtRQUNkLGNBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztJQUVILElBQUEsY0FBSSxFQUFDLDZDQUE2QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdELE1BQU0sS0FBSyxHQUFHO1lBQ1osY0FBYyxFQUFFLElBQUk7U0FDYyxDQUFDO1FBRXJDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSxvQkFBTyxFQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXBDLElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLElBQUEsZ0JBQU0sRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUN0QyxPQUFPLEVBQUUseUJBQXlCO1NBQ25DLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBQSxjQUFJLEVBQUMsMENBQTBDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUQsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFekMsTUFBTSxLQUFLLEdBQUc7WUFDWixjQUFjLEVBQUU7Z0JBQ2QsV0FBVyxF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b3IgR2V0IEV4ZWN1dGlvbiBTdGF0dXMgTGFtYmRhXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgYmVmb3JlRWFjaCwgZGVzY3JpYmUsIGV4cGVjdCwgamVzdCwgdGVzdCB9IGZyb20gJ0BqZXN0L2dsb2JhbHMnO1xyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBoYW5kbGVyIH0gZnJvbSAnLi4vZ2V0LXN0YXR1cyc7XHJcbmltcG9ydCB7IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UgfSBmcm9tICcuLi8uLi8uLi9zZXJ2aWNlcy90ZXN0LWV4ZWN1dGlvbi1kYi1zZXJ2aWNlJztcclxuaW1wb3J0IHsgVGVzdEV4ZWN1dGlvbiB9IGZyb20gJy4uLy4uLy4uL3R5cGVzL3Rlc3QtZXhlY3V0aW9uJztcclxuXHJcbi8vIE1vY2sgdGhlIGRhdGFiYXNlIHNlcnZpY2VcclxuamVzdC5tb2NrKCcuLi8uLi8uLi9zZXJ2aWNlcy90ZXN0LWV4ZWN1dGlvbi1kYi1zZXJ2aWNlJyk7XHJcblxyXG5kZXNjcmliZSgnR2V0IEV4ZWN1dGlvbiBTdGF0dXMgTGFtYmRhJywgKCkgPT4ge1xyXG4gIGNvbnN0IG1vY2tHZXRFeGVjdXRpb24gPSB0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlLmdldEV4ZWN1dGlvbiBhcyBqZXN0Lk1vY2tlZEZ1bmN0aW9uPFxyXG4gICAgdHlwZW9mIHRlc3RFeGVjdXRpb25EQlNlcnZpY2UuZ2V0RXhlY3V0aW9uXHJcbiAgPjtcclxuXHJcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICBqZXN0LmNsZWFyQWxsTW9ja3MoKTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnc2hvdWxkIHJldHVybiA0MDAgaWYgZXhlY3V0aW9uSWQgaXMgbWlzc2luZycsIGFzeW5jICgpID0+IHtcclxuICAgIGNvbnN0IGV2ZW50ID0ge1xyXG4gICAgICBwYXRoUGFyYW1ldGVyczogbnVsbCxcclxuICAgIH0gYXMgdW5rbm93biBhcyBBUElHYXRld2F5UHJveHlFdmVudDtcclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcclxuXHJcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcclxuICAgIGV4cGVjdChKU09OLnBhcnNlKHJlc3VsdC5ib2R5KSkudG9FcXVhbCh7XHJcbiAgICAgIG1lc3NhZ2U6ICdleGVjdXRpb25JZCBpcyByZXF1aXJlZCcsXHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnc2hvdWxkIHJldHVybiA0MDQgaWYgZXhlY3V0aW9uIG5vdCBmb3VuZCcsIGFzeW5jICgpID0+IHtcclxuICAgIG1vY2tHZXRFeGVjdXRpb24ubW9ja1Jlc29sdmVkVmFsdWUobnVsbCk7XHJcblxyXG4gICAgY29uc3QgZXZlbnQgPSB7XHJcbiAgICAgIHBhdGhQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgZXhlY3V0aW9uSWQ6ICdub24tZXhpc3RlbnQtaWQnLFxyXG4gICAgICB9LFxyXG4gICAgfSBhcyB1bmtub3duIGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50O1xyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG5cclxuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDQpO1xyXG4gICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpKS50b0VxdWFsKHtcclxuICAgICAgbWVzc2FnZTogJ0V4ZWN1dGlvbiBub3QgZm91bmQ6IG5vbi1leGlzdGVudC1pZCcsXHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnc2hvdWxkIHJldHVybiBleGVjdXRpb24gc3RhdHVzIGZvciBxdWV1ZWQgZXhlY3V0aW9uJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgY29uc3QgbW9ja0V4ZWN1dGlvbjogVGVzdEV4ZWN1dGlvbiA9IHtcclxuICAgICAgZXhlY3V0aW9uSWQ6ICdleGVjLTEyMycsXHJcbiAgICAgIHByb2plY3RJZDogJ3Byb2otMScsXHJcbiAgICAgIHRlc3RDYXNlSWQ6ICd0Yy0xJyxcclxuICAgICAgc3RhdHVzOiAncXVldWVkJyxcclxuICAgICAgc3RhcnRUaW1lOiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcclxuICAgICAgc3RlcHM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzdGVwSW5kZXg6IDAsXHJcbiAgICAgICAgICBhY3Rpb246ICduYXZpZ2F0ZScsXHJcbiAgICAgICAgICBzdGF0dXM6ICdwYXNzJyxcclxuICAgICAgICAgIGR1cmF0aW9uOiAwLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3RlcEluZGV4OiAxLFxyXG4gICAgICAgICAgYWN0aW9uOiAnY2xpY2snLFxyXG4gICAgICAgICAgc3RhdHVzOiAncGFzcycsXHJcbiAgICAgICAgICBkdXJhdGlvbjogMCxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICBzY3JlZW5zaG90czogW10sXHJcbiAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgdHJpZ2dlcmVkQnk6ICd1c2VyLTEnLFxyXG4gICAgICB9LFxyXG4gICAgICBjcmVhdGVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICB1cGRhdGVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgfTtcclxuXHJcbiAgICBtb2NrR2V0RXhlY3V0aW9uLm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tFeGVjdXRpb24pO1xyXG5cclxuICAgIGNvbnN0IGV2ZW50ID0ge1xyXG4gICAgICBwYXRoUGFyYW1ldGVyczoge1xyXG4gICAgICAgIGV4ZWN1dGlvbklkOiAnZXhlYy0xMjMnLFxyXG4gICAgICB9LFxyXG4gICAgfSBhcyB1bmtub3duIGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50O1xyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG5cclxuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xyXG4gICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgZXhwZWN0KGJvZHkpLnRvTWF0Y2hPYmplY3Qoe1xyXG4gICAgICBleGVjdXRpb25JZDogJ2V4ZWMtMTIzJyxcclxuICAgICAgc3RhdHVzOiAncXVldWVkJyxcclxuICAgICAgdG90YWxTdGVwczogMixcclxuICAgICAgc3RhcnRUaW1lOiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcclxuICAgIH0pO1xyXG4gICAgZXhwZWN0KGJvZHkuY3VycmVudFN0ZXApLnRvQmVVbmRlZmluZWQoKTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnc2hvdWxkIHJldHVybiBleGVjdXRpb24gc3RhdHVzIHdpdGggY3VycmVudCBzdGVwIGZvciBydW5uaW5nIGV4ZWN1dGlvbicsIGFzeW5jICgpID0+IHtcclxuICAgIGNvbnN0IG1vY2tFeGVjdXRpb246IFRlc3RFeGVjdXRpb24gPSB7XHJcbiAgICAgIGV4ZWN1dGlvbklkOiAnZXhlYy0xMjMnLFxyXG4gICAgICBwcm9qZWN0SWQ6ICdwcm9qLTEnLFxyXG4gICAgICB0ZXN0Q2FzZUlkOiAndGMtMScsXHJcbiAgICAgIHN0YXR1czogJ3J1bm5pbmcnLFxyXG4gICAgICBzdGFydFRpbWU6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICBzdGVwczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHN0ZXBJbmRleDogMCxcclxuICAgICAgICAgIGFjdGlvbjogJ25hdmlnYXRlJyxcclxuICAgICAgICAgIHN0YXR1czogJ3Bhc3MnLFxyXG4gICAgICAgICAgZHVyYXRpb246IDEwMCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHN0ZXBJbmRleDogMSxcclxuICAgICAgICAgIGFjdGlvbjogJ2NsaWNrJyxcclxuICAgICAgICAgIHN0YXR1czogJ3Bhc3MnLFxyXG4gICAgICAgICAgZHVyYXRpb246IDUwLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3RlcEluZGV4OiAyLFxyXG4gICAgICAgICAgYWN0aW9uOiAndHlwZScsXHJcbiAgICAgICAgICBzdGF0dXM6ICdwYXNzJyxcclxuICAgICAgICAgIGR1cmF0aW9uOiAwLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcbiAgICAgIHNjcmVlbnNob3RzOiBbXSxcclxuICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICB0cmlnZ2VyZWRCeTogJ3VzZXItMScsXHJcbiAgICAgIH0sXHJcbiAgICAgIGNyZWF0ZWRBdDogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXHJcbiAgICAgIHVwZGF0ZWRBdDogJzIwMjQtMDEtMDFUMDA6MDA6MDEuMDAwWicsXHJcbiAgICB9O1xyXG5cclxuICAgIG1vY2tHZXRFeGVjdXRpb24ubW9ja1Jlc29sdmVkVmFsdWUobW9ja0V4ZWN1dGlvbik7XHJcblxyXG4gICAgY29uc3QgZXZlbnQgPSB7XHJcbiAgICAgIHBhdGhQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgZXhlY3V0aW9uSWQ6ICdleGVjLTEyMycsXHJcbiAgICAgIH0sXHJcbiAgICB9IGFzIHVua25vd24gYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQ7XHJcblxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcblxyXG4gICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XHJcbiAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XHJcbiAgICBleHBlY3QoYm9keSkudG9NYXRjaE9iamVjdCh7XHJcbiAgICAgIGV4ZWN1dGlvbklkOiAnZXhlYy0xMjMnLFxyXG4gICAgICBzdGF0dXM6ICdydW5uaW5nJyxcclxuICAgICAgY3VycmVudFN0ZXA6IDMsIC8vIDMgc3RlcHMgY29tcGxldGVkXHJcbiAgICAgIHRvdGFsU3RlcHM6IDMsXHJcbiAgICAgIHN0YXJ0VGltZTogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXHJcbiAgICB9KTtcclxuICAgIGV4cGVjdChib2R5LmR1cmF0aW9uKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcbiAgfSk7XHJcblxyXG4gIHRlc3QoJ3Nob3VsZCByZXR1cm4gZXhlY3V0aW9uIHN0YXR1cyB3aXRoIHJlc3VsdCBmb3IgY29tcGxldGVkIGV4ZWN1dGlvbicsIGFzeW5jICgpID0+IHtcclxuICAgIGNvbnN0IG1vY2tFeGVjdXRpb246IFRlc3RFeGVjdXRpb24gPSB7XHJcbiAgICAgIGV4ZWN1dGlvbklkOiAnZXhlYy0xMjMnLFxyXG4gICAgICBwcm9qZWN0SWQ6ICdwcm9qLTEnLFxyXG4gICAgICB0ZXN0Q2FzZUlkOiAndGMtMScsXHJcbiAgICAgIHN0YXR1czogJ2NvbXBsZXRlZCcsXHJcbiAgICAgIHJlc3VsdDogJ3Bhc3MnLFxyXG4gICAgICBzdGFydFRpbWU6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICBlbmRUaW1lOiAnMjAyNC0wMS0wMVQwMDowMDowNS4wMDBaJyxcclxuICAgICAgZHVyYXRpb246IDUwMDAsXHJcbiAgICAgIHN0ZXBzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3RlcEluZGV4OiAwLFxyXG4gICAgICAgICAgYWN0aW9uOiAnbmF2aWdhdGUnLFxyXG4gICAgICAgICAgc3RhdHVzOiAncGFzcycsXHJcbiAgICAgICAgICBkdXJhdGlvbjogMjAwMCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHN0ZXBJbmRleDogMSxcclxuICAgICAgICAgIGFjdGlvbjogJ2NsaWNrJyxcclxuICAgICAgICAgIHN0YXR1czogJ3Bhc3MnLFxyXG4gICAgICAgICAgZHVyYXRpb246IDEwMDAsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzdGVwSW5kZXg6IDIsXHJcbiAgICAgICAgICBhY3Rpb246ICdhc3NlcnQnLFxyXG4gICAgICAgICAgc3RhdHVzOiAncGFzcycsXHJcbiAgICAgICAgICBkdXJhdGlvbjogMjAwMCxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICBzY3JlZW5zaG90czogW10sXHJcbiAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgdHJpZ2dlcmVkQnk6ICd1c2VyLTEnLFxyXG4gICAgICB9LFxyXG4gICAgICBjcmVhdGVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICB1cGRhdGVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjA1LjAwMFonLFxyXG4gICAgfTtcclxuXHJcbiAgICBtb2NrR2V0RXhlY3V0aW9uLm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tFeGVjdXRpb24pO1xyXG5cclxuICAgIGNvbnN0IGV2ZW50ID0ge1xyXG4gICAgICBwYXRoUGFyYW1ldGVyczoge1xyXG4gICAgICAgIGV4ZWN1dGlvbklkOiAnZXhlYy0xMjMnLFxyXG4gICAgICB9LFxyXG4gICAgfSBhcyB1bmtub3duIGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50O1xyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG5cclxuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xyXG4gICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgZXhwZWN0KGJvZHkpLnRvRXF1YWwoe1xyXG4gICAgICBleGVjdXRpb25JZDogJ2V4ZWMtMTIzJyxcclxuICAgICAgc3RhdHVzOiAnY29tcGxldGVkJyxcclxuICAgICAgcmVzdWx0OiAncGFzcycsXHJcbiAgICAgIHRvdGFsU3RlcHM6IDMsXHJcbiAgICAgIHN0YXJ0VGltZTogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXHJcbiAgICAgIGR1cmF0aW9uOiA1MDAwLFxyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIHRlc3QoJ3Nob3VsZCByZXR1cm4gZXhlY3V0aW9uIHN0YXR1cyBmb3IgZmFpbGVkIGV4ZWN1dGlvbicsIGFzeW5jICgpID0+IHtcclxuICAgIGNvbnN0IG1vY2tFeGVjdXRpb246IFRlc3RFeGVjdXRpb24gPSB7XHJcbiAgICAgIGV4ZWN1dGlvbklkOiAnZXhlYy0xMjMnLFxyXG4gICAgICBwcm9qZWN0SWQ6ICdwcm9qLTEnLFxyXG4gICAgICB0ZXN0Q2FzZUlkOiAndGMtMScsXHJcbiAgICAgIHN0YXR1czogJ2NvbXBsZXRlZCcsXHJcbiAgICAgIHJlc3VsdDogJ2ZhaWwnLFxyXG4gICAgICBzdGFydFRpbWU6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICBlbmRUaW1lOiAnMjAyNC0wMS0wMVQwMDowMDowMy4wMDBaJyxcclxuICAgICAgZHVyYXRpb246IDMwMDAsXHJcbiAgICAgIHN0ZXBzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3RlcEluZGV4OiAwLFxyXG4gICAgICAgICAgYWN0aW9uOiAnbmF2aWdhdGUnLFxyXG4gICAgICAgICAgc3RhdHVzOiAncGFzcycsXHJcbiAgICAgICAgICBkdXJhdGlvbjogMTAwMCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHN0ZXBJbmRleDogMSxcclxuICAgICAgICAgIGFjdGlvbjogJ2NsaWNrJyxcclxuICAgICAgICAgIHN0YXR1czogJ2ZhaWwnLFxyXG4gICAgICAgICAgZHVyYXRpb246IDIwMDAsXHJcbiAgICAgICAgICBlcnJvck1lc3NhZ2U6ICdFbGVtZW50IG5vdCBmb3VuZCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgICAgc2NyZWVuc2hvdHM6IFsnc2NyZWVuc2hvdC0xLnBuZyddLFxyXG4gICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgIHRyaWdnZXJlZEJ5OiAndXNlci0xJyxcclxuICAgICAgfSxcclxuICAgICAgY3JlYXRlZEF0OiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcclxuICAgICAgdXBkYXRlZEF0OiAnMjAyNC0wMS0wMVQwMDowMDowMy4wMDBaJyxcclxuICAgIH07XHJcblxyXG4gICAgbW9ja0dldEV4ZWN1dGlvbi5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrRXhlY3V0aW9uKTtcclxuXHJcbiAgICBjb25zdCBldmVudCA9IHtcclxuICAgICAgcGF0aFBhcmFtZXRlcnM6IHtcclxuICAgICAgICBleGVjdXRpb25JZDogJ2V4ZWMtMTIzJyxcclxuICAgICAgfSxcclxuICAgIH0gYXMgdW5rbm93biBhcyBBUElHYXRld2F5UHJveHlFdmVudDtcclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcclxuXHJcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgIGV4cGVjdChib2R5KS50b0VxdWFsKHtcclxuICAgICAgZXhlY3V0aW9uSWQ6ICdleGVjLTEyMycsXHJcbiAgICAgIHN0YXR1czogJ2NvbXBsZXRlZCcsXHJcbiAgICAgIHJlc3VsdDogJ2ZhaWwnLFxyXG4gICAgICB0b3RhbFN0ZXBzOiAyLFxyXG4gICAgICBzdGFydFRpbWU6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICBkdXJhdGlvbjogMzAwMCxcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KCdzaG91bGQgcmV0dXJuIDUwMCBvbiBkYXRhYmFzZSBlcnJvcicsIGFzeW5jICgpID0+IHtcclxuICAgIG1vY2tHZXRFeGVjdXRpb24ubW9ja1JlamVjdGVkVmFsdWUobmV3IEVycm9yKCdEYXRhYmFzZSBjb25uZWN0aW9uIGZhaWxlZCcpKTtcclxuXHJcbiAgICBjb25zdCBldmVudCA9IHtcclxuICAgICAgcGF0aFBhcmFtZXRlcnM6IHtcclxuICAgICAgICBleGVjdXRpb25JZDogJ2V4ZWMtMTIzJyxcclxuICAgICAgfSxcclxuICAgIH0gYXMgdW5rbm93biBhcyBBUElHYXRld2F5UHJveHlFdmVudDtcclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcclxuXHJcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNTAwKTtcclxuICAgIGV4cGVjdChKU09OLnBhcnNlKHJlc3VsdC5ib2R5KSkudG9FcXVhbCh7XHJcbiAgICAgIG1lc3NhZ2U6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InLFxyXG4gICAgICBlcnJvcjogJ0RhdGFiYXNlIGNvbm5lY3Rpb24gZmFpbGVkJyxcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59KTtcclxuIl19