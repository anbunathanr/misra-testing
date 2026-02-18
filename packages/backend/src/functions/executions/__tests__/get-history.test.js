"use strict";
/**
 * Unit tests for Get Execution History Lambda
 */
Object.defineProperty(exports, "__esModule", { value: true });
const get_history_1 = require("../get-history");
const test_execution_db_service_1 = require("../../../services/test-execution-db-service");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Get Execution History Lambda', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.restoreAllMocks();
    });
    (0, globals_1.test)('should return 400 if projectId is missing', async () => {
        const event = {
            queryStringParameters: null,
        };
        const result = await (0, get_history_1.handler)(event);
        (0, globals_1.expect)(result.statusCode).toBe(400);
        (0, globals_1.expect)(JSON.parse(result.body)).toEqual({
            message: 'projectId is required',
        });
    });
    (0, globals_1.test)('should return execution history for projectId only', async () => {
        const mockExecutions = [
            {
                executionId: 'exec-1',
                projectId: 'proj-1',
                testCaseId: 'tc-1',
                status: 'completed',
                result: 'pass',
                startTime: '2024-01-01T00:00:00.000Z',
                endTime: '2024-01-01T00:00:05.000Z',
                duration: 5000,
                steps: [],
                screenshots: [],
                metadata: {
                    triggeredBy: 'user-1',
                },
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:05.000Z',
            },
        ];
        const mockResult = {
            executions: mockExecutions,
            count: mockExecutions.length,
        };
        // Spy on the method
        const spy = globals_1.jest.spyOn(test_execution_db_service_1.testExecutionDBService, 'queryExecutionHistory').mockResolvedValue(mockResult);
        const event = {
            queryStringParameters: {
                projectId: 'proj-1',
            },
        };
        const result = await (0, get_history_1.handler)(event);
        (0, globals_1.expect)(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        (0, globals_1.expect)(body).toHaveProperty('executions');
        (0, globals_1.expect)(body).toHaveProperty('count');
        (0, globals_1.expect)(body.executions).toEqual(mockExecutions);
        (0, globals_1.expect)(body.count).toBe(1);
        (0, globals_1.expect)(spy).toHaveBeenCalledWith({
            projectId: 'proj-1',
            testCaseId: undefined,
            testSuiteId: undefined,
            startDate: undefined,
            endDate: undefined,
            limit: 50,
        });
    });
    (0, globals_1.test)('should return execution history with testCaseId filter', async () => {
        const mockExecutions = [];
        const spy = globals_1.jest.spyOn(test_execution_db_service_1.testExecutionDBService, 'queryExecutionHistory').mockResolvedValue({
            executions: mockExecutions,
            count: 0,
        });
        const event = {
            queryStringParameters: {
                projectId: 'proj-1',
                testCaseId: 'tc-1',
            },
        };
        const result = await (0, get_history_1.handler)(event);
        (0, globals_1.expect)(result.statusCode).toBe(200);
        (0, globals_1.expect)(spy).toHaveBeenCalledWith({
            projectId: 'proj-1',
            testCaseId: 'tc-1',
            testSuiteId: undefined,
            startDate: undefined,
            endDate: undefined,
            limit: 50,
        });
    });
    (0, globals_1.test)('should return execution history with date range filter', async () => {
        const mockExecutions = [];
        const spy = globals_1.jest.spyOn(test_execution_db_service_1.testExecutionDBService, 'queryExecutionHistory').mockResolvedValue({
            executions: mockExecutions,
            count: 0,
        });
        const event = {
            queryStringParameters: {
                projectId: 'proj-1',
                startDate: '2024-01-01T00:00:00.000Z',
                endDate: '2024-01-31T23:59:59.999Z',
            },
        };
        const result = await (0, get_history_1.handler)(event);
        (0, globals_1.expect)(result.statusCode).toBe(200);
        (0, globals_1.expect)(spy).toHaveBeenCalledWith({
            projectId: 'proj-1',
            testCaseId: undefined,
            testSuiteId: undefined,
            startDate: '2024-01-01T00:00:00.000Z',
            endDate: '2024-01-31T23:59:59.999Z',
            limit: 50,
        });
    });
    (0, globals_1.test)('should return execution history with custom limit', async () => {
        const mockExecutions = [];
        const spy = globals_1.jest.spyOn(test_execution_db_service_1.testExecutionDBService, 'queryExecutionHistory').mockResolvedValue({
            executions: mockExecutions,
            count: 0,
        });
        const event = {
            queryStringParameters: {
                projectId: 'proj-1',
                limit: '100',
            },
        };
        const result = await (0, get_history_1.handler)(event);
        (0, globals_1.expect)(result.statusCode).toBe(200);
        (0, globals_1.expect)(spy).toHaveBeenCalledWith({
            projectId: 'proj-1',
            testCaseId: undefined,
            testSuiteId: undefined,
            startDate: undefined,
            endDate: undefined,
            limit: 100,
        });
    });
    (0, globals_1.test)('should return 500 on database error', async () => {
        const spy = globals_1.jest.spyOn(test_execution_db_service_1.testExecutionDBService, 'queryExecutionHistory').mockRejectedValue(new Error('Database connection failed'));
        const event = {
            queryStringParameters: {
                projectId: 'proj-1',
            },
        };
        const result = await (0, get_history_1.handler)(event);
        (0, globals_1.expect)(result.statusCode).toBe(500);
        (0, globals_1.expect)(JSON.parse(result.body)).toEqual({
            message: 'Internal server error',
            error: 'Database connection failed',
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWhpc3RvcnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC1oaXN0b3J5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOztBQUdILGdEQUF5QztBQUN6QywyRkFBcUY7QUFFckYsMkNBQXlFO0FBRXpFLElBQUEsa0JBQVEsRUFBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7SUFDNUMsSUFBQSxvQkFBVSxFQUFDLEdBQUcsRUFBRTtRQUNkLGNBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUN6QixDQUFDLENBQUMsQ0FBQztJQUVILElBQUEsY0FBSSxFQUFDLDJDQUEyQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzNELE1BQU0sS0FBSyxHQUFHO1lBQ1oscUJBQXFCLEVBQUUsSUFBSTtTQUNPLENBQUM7UUFFckMsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLHFCQUFPLEVBQUMsS0FBSyxDQUFDLENBQUM7UUFFcEMsSUFBQSxnQkFBTSxFQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEMsSUFBQSxnQkFBTSxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQ3RDLE9BQU8sRUFBRSx1QkFBdUI7U0FDakMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFBLGNBQUksRUFBQyxvREFBb0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNwRSxNQUFNLGNBQWMsR0FBb0I7WUFDdEM7Z0JBQ0UsV0FBVyxFQUFFLFFBQVE7Z0JBQ3JCLFNBQVMsRUFBRSxRQUFRO2dCQUNuQixVQUFVLEVBQUUsTUFBTTtnQkFDbEIsTUFBTSxFQUFFLFdBQVc7Z0JBQ25CLE1BQU0sRUFBRSxNQUFNO2dCQUNkLFNBQVMsRUFBRSwwQkFBMEI7Z0JBQ3JDLE9BQU8sRUFBRSwwQkFBMEI7Z0JBQ25D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O1NBQ3BDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogVW5pdCB0ZXN0cyBmb3IgR2V0IEV4ZWN1dGlvbiBIaXN0b3J5IExhbWJkYVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IGhhbmRsZXIgfSBmcm9tICcuLi9nZXQtaGlzdG9yeSc7XHJcbmltcG9ydCB7IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UgfSBmcm9tICcuLi8uLi8uLi9zZXJ2aWNlcy90ZXN0LWV4ZWN1dGlvbi1kYi1zZXJ2aWNlJztcclxuaW1wb3J0IHsgVGVzdEV4ZWN1dGlvbiB9IGZyb20gJy4uLy4uLy4uL3R5cGVzL3Rlc3QtZXhlY3V0aW9uJztcclxuaW1wb3J0IHsgZGVzY3JpYmUsIHRlc3QsIGV4cGVjdCwgYmVmb3JlRWFjaCwgamVzdCB9IGZyb20gJ0BqZXN0L2dsb2JhbHMnO1xyXG5cclxuZGVzY3JpYmUoJ0dldCBFeGVjdXRpb24gSGlzdG9yeSBMYW1iZGEnLCAoKSA9PiB7XHJcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICBqZXN0LnJlc3RvcmVBbGxNb2NrcygpO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KCdzaG91bGQgcmV0dXJuIDQwMCBpZiBwcm9qZWN0SWQgaXMgbWlzc2luZycsIGFzeW5jICgpID0+IHtcclxuICAgIGNvbnN0IGV2ZW50ID0ge1xyXG4gICAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXHJcbiAgICB9IGFzIHVua25vd24gYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQ7XHJcblxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcblxyXG4gICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XHJcbiAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkpLnRvRXF1YWwoe1xyXG4gICAgICBtZXNzYWdlOiAncHJvamVjdElkIGlzIHJlcXVpcmVkJyxcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KCdzaG91bGQgcmV0dXJuIGV4ZWN1dGlvbiBoaXN0b3J5IGZvciBwcm9qZWN0SWQgb25seScsIGFzeW5jICgpID0+IHtcclxuICAgIGNvbnN0IG1vY2tFeGVjdXRpb25zOiBUZXN0RXhlY3V0aW9uW10gPSBbXHJcbiAgICAgIHtcclxuICAgICAgICBleGVjdXRpb25JZDogJ2V4ZWMtMScsXHJcbiAgICAgICAgcHJvamVjdElkOiAncHJvai0xJyxcclxuICAgICAgICB0ZXN0Q2FzZUlkOiAndGMtMScsXHJcbiAgICAgICAgc3RhdHVzOiAnY29tcGxldGVkJyxcclxuICAgICAgICByZXN1bHQ6ICdwYXNzJyxcclxuICAgICAgICBzdGFydFRpbWU6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICAgIGVuZFRpbWU6ICcyMDI0LTAxLTAxVDAwOjAwOjA1LjAwMFonLFxyXG4gICAgICAgIGR1cmF0aW9uOiA1MDAwLFxyXG4gICAgICAgIHN0ZXBzOiBbXSxcclxuICAgICAgICBzY3JlZW5zaG90czogW10sXHJcbiAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgIHRyaWdnZXJlZEJ5OiAndXNlci0xJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZWRBdDogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXHJcbiAgICAgICAgdXBkYXRlZEF0OiAnMjAyNC0wMS0wMVQwMDowMDowNS4wMDBaJyxcclxuICAgICAgfSxcclxuICAgIF07XHJcblxyXG4gICAgY29uc3QgbW9ja1Jlc3VsdCA9IHtcclxuICAgICAgZXhlY3V0aW9uczogbW9ja0V4ZWN1dGlvbnMsXHJcbiAgICAgIGNvdW50OiBtb2NrRXhlY3V0aW9ucy5sZW5ndGgsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFNweSBvbiB0aGUgbWV0aG9kXHJcbiAgICBjb25zdCBzcHkgPSBqZXN0LnNweU9uKHRlc3RFeGVjdXRpb25EQlNlcnZpY2UsICdxdWVyeUV4ZWN1dGlvbkhpc3RvcnknKS5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrUmVzdWx0KTtcclxuXHJcbiAgICBjb25zdCBldmVudCA9IHtcclxuICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgcHJvamVjdElkOiAncHJvai0xJyxcclxuICAgICAgfSxcclxuICAgIH0gYXMgdW5rbm93biBhcyBBUElHYXRld2F5UHJveHlFdmVudDtcclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcclxuXHJcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgIFxyXG4gICAgZXhwZWN0KGJvZHkpLnRvSGF2ZVByb3BlcnR5KCdleGVjdXRpb25zJyk7XHJcbiAgICBleHBlY3QoYm9keSkudG9IYXZlUHJvcGVydHkoJ2NvdW50Jyk7XHJcbiAgICBleHBlY3QoYm9keS5leGVjdXRpb25zKS50b0VxdWFsKG1vY2tFeGVjdXRpb25zKTtcclxuICAgIGV4cGVjdChib2R5LmNvdW50KS50b0JlKDEpO1xyXG4gICAgZXhwZWN0KHNweSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xyXG4gICAgICBwcm9qZWN0SWQ6ICdwcm9qLTEnLFxyXG4gICAgICB0ZXN0Q2FzZUlkOiB1bmRlZmluZWQsXHJcbiAgICAgIHRlc3RTdWl0ZUlkOiB1bmRlZmluZWQsXHJcbiAgICAgIHN0YXJ0RGF0ZTogdW5kZWZpbmVkLFxyXG4gICAgICBlbmREYXRlOiB1bmRlZmluZWQsXHJcbiAgICAgIGxpbWl0OiA1MCxcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KCdzaG91bGQgcmV0dXJuIGV4ZWN1dGlvbiBoaXN0b3J5IHdpdGggdGVzdENhc2VJZCBmaWx0ZXInLCBhc3luYyAoKSA9PiB7XHJcbiAgICBjb25zdCBtb2NrRXhlY3V0aW9uczogVGVzdEV4ZWN1dGlvbltdID0gW107XHJcbiAgICBjb25zdCBzcHkgPSBqZXN0LnNweU9uKHRlc3RFeGVjdXRpb25EQlNlcnZpY2UsICdxdWVyeUV4ZWN1dGlvbkhpc3RvcnknKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcbiAgICAgIGV4ZWN1dGlvbnM6IG1vY2tFeGVjdXRpb25zLFxyXG4gICAgICBjb3VudDogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGV2ZW50ID0ge1xyXG4gICAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM6IHtcclxuICAgICAgICBwcm9qZWN0SWQ6ICdwcm9qLTEnLFxyXG4gICAgICAgIHRlc3RDYXNlSWQ6ICd0Yy0xJyxcclxuICAgICAgfSxcclxuICAgIH0gYXMgdW5rbm93biBhcyBBUElHYXRld2F5UHJveHlFdmVudDtcclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcclxuXHJcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgIGV4cGVjdChzcHkpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKHtcclxuICAgICAgcHJvamVjdElkOiAncHJvai0xJyxcclxuICAgICAgdGVzdENhc2VJZDogJ3RjLTEnLFxyXG4gICAgICB0ZXN0U3VpdGVJZDogdW5kZWZpbmVkLFxyXG4gICAgICBzdGFydERhdGU6IHVuZGVmaW5lZCxcclxuICAgICAgZW5kRGF0ZTogdW5kZWZpbmVkLFxyXG4gICAgICBsaW1pdDogNTAsXHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnc2hvdWxkIHJldHVybiBleGVjdXRpb24gaGlzdG9yeSB3aXRoIGRhdGUgcmFuZ2UgZmlsdGVyJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgY29uc3QgbW9ja0V4ZWN1dGlvbnM6IFRlc3RFeGVjdXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3Qgc3B5ID0gamVzdC5zcHlPbih0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlLCAncXVlcnlFeGVjdXRpb25IaXN0b3J5JykubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICBleGVjdXRpb25zOiBtb2NrRXhlY3V0aW9ucyxcclxuICAgICAgY291bnQ6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBldmVudCA9IHtcclxuICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgcHJvamVjdElkOiAncHJvai0xJyxcclxuICAgICAgICBzdGFydERhdGU6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICAgIGVuZERhdGU6ICcyMDI0LTAxLTMxVDIzOjU5OjU5Ljk5OVonLFxyXG4gICAgICB9LFxyXG4gICAgfSBhcyB1bmtub3duIGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50O1xyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG5cclxuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xyXG4gICAgZXhwZWN0KHNweSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xyXG4gICAgICBwcm9qZWN0SWQ6ICdwcm9qLTEnLFxyXG4gICAgICB0ZXN0Q2FzZUlkOiB1bmRlZmluZWQsXHJcbiAgICAgIHRlc3RTdWl0ZUlkOiB1bmRlZmluZWQsXHJcbiAgICAgIHN0YXJ0RGF0ZTogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXHJcbiAgICAgIGVuZERhdGU6ICcyMDI0LTAxLTMxVDIzOjU5OjU5Ljk5OVonLFxyXG4gICAgICBsaW1pdDogNTAsXHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnc2hvdWxkIHJldHVybiBleGVjdXRpb24gaGlzdG9yeSB3aXRoIGN1c3RvbSBsaW1pdCcsIGFzeW5jICgpID0+IHtcclxuICAgIGNvbnN0IG1vY2tFeGVjdXRpb25zOiBUZXN0RXhlY3V0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IHNweSA9IGplc3Quc3B5T24odGVzdEV4ZWN1dGlvbkRCU2VydmljZSwgJ3F1ZXJ5RXhlY3V0aW9uSGlzdG9yeScpLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuICAgICAgZXhlY3V0aW9uczogbW9ja0V4ZWN1dGlvbnMsXHJcbiAgICAgIGNvdW50OiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZXZlbnQgPSB7XHJcbiAgICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczoge1xyXG4gICAgICAgIHByb2plY3RJZDogJ3Byb2otMScsXHJcbiAgICAgICAgbGltaXQ6ICcxMDAnLFxyXG4gICAgICB9LFxyXG4gICAgfSBhcyB1bmtub3duIGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50O1xyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG5cclxuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xyXG4gICAgZXhwZWN0KHNweSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xyXG4gICAgICBwcm9qZWN0SWQ6ICdwcm9qLTEnLFxyXG4gICAgICB0ZXN0Q2FzZUlkOiB1bmRlZmluZWQsXHJcbiAgICAgIHRlc3RTdWl0ZUlkOiB1bmRlZmluZWQsXHJcbiAgICAgIHN0YXJ0RGF0ZTogdW5kZWZpbmVkLFxyXG4gICAgICBlbmREYXRlOiB1bmRlZmluZWQsXHJcbiAgICAgIGxpbWl0OiAxMDAsXHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnc2hvdWxkIHJldHVybiA1MDAgb24gZGF0YWJhc2UgZXJyb3InLCBhc3luYyAoKSA9PiB7XHJcbiAgICBjb25zdCBzcHkgPSBqZXN0LnNweU9uKHRlc3RFeGVjdXRpb25EQlNlcnZpY2UsICdxdWVyeUV4ZWN1dGlvbkhpc3RvcnknKS5tb2NrUmVqZWN0ZWRWYWx1ZShuZXcgRXJyb3IoJ0RhdGFiYXNlIGNvbm5lY3Rpb24gZmFpbGVkJykpO1xyXG5cclxuICAgIGNvbnN0IGV2ZW50ID0ge1xyXG4gICAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM6IHtcclxuICAgICAgICBwcm9qZWN0SWQ6ICdwcm9qLTEnLFxyXG4gICAgICB9LFxyXG4gICAgfSBhcyB1bmtub3duIGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50O1xyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG5cclxuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg1MDApO1xyXG4gICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpKS50b0VxdWFsKHtcclxuICAgICAgbWVzc2FnZTogJ0ludGVybmFsIHNlcnZlciBlcnJvcicsXHJcbiAgICAgIGVycm9yOiAnRGF0YWJhc2UgY29ubmVjdGlvbiBmYWlsZWQnLFxyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn0pO1xyXG4iXX0=