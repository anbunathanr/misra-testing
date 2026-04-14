"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const sample_files_library_1 = require("../../data/sample-files-library");
/**
 * Lambda function to initialize the sample files library
 * This should be called once during deployment to populate the DynamoDB table
 */
const handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
    };
    try {
        // Handle preflight requests
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: '',
            };
        }
        console.log('Starting sample files library initialization...');
        await (0, sample_files_library_1.initializeSampleFilesLibrary)();
        console.log('Sample files library initialization completed successfully');
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Sample files library initialized successfully',
                timestamp: new Date().toISOString(),
            }),
        };
    }
    catch (error) {
        console.error('Error initializing sample files library:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to initialize sample files library',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdGlhbGl6ZS1zYW1wbGUtbGlicmFyeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluaXRpYWxpemUtc2FtcGxlLWxpYnJhcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsMEVBQStFO0FBRS9FOzs7R0FHRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE1BQU0sT0FBTyxHQUFHO1FBQ2QsY0FBYyxFQUFFLGtCQUFrQjtRQUNsQyw2QkFBNkIsRUFBRSxHQUFHO1FBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjtRQUM1RCw4QkFBOEIsRUFBRSxjQUFjO0tBQy9DLENBQUM7SUFFRixJQUFJLENBQUM7UUFDSCw0QkFBNEI7UUFDNUIsSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ25DLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTztnQkFDUCxJQUFJLEVBQUUsRUFBRTthQUNULENBQUM7UUFDSixDQUFDO1FBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO1FBRS9ELE1BQU0sSUFBQSxtREFBNEIsR0FBRSxDQUFDO1FBRXJDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNERBQTRELENBQUMsQ0FBQztRQUUxRSxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPO1lBQ1AsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLE9BQU8sRUFBRSxJQUFJO2dCQUNiLE9BQU8sRUFBRSwrQ0FBK0M7Z0JBQ3hELFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTthQUNwQyxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywwQ0FBMEMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVqRSxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPO1lBQ1AsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLE9BQU8sRUFBRSxLQUFLO2dCQUNkLEtBQUssRUFBRSwyQ0FBMkM7Z0JBQ2xELE9BQU8sRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlO2FBQ2xFLENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQTlDVyxRQUFBLE9BQU8sV0E4Q2xCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBpbml0aWFsaXplU2FtcGxlRmlsZXNMaWJyYXJ5IH0gZnJvbSAnLi4vLi4vZGF0YS9zYW1wbGUtZmlsZXMtbGlicmFyeSc7XHJcblxyXG4vKipcclxuICogTGFtYmRhIGZ1bmN0aW9uIHRvIGluaXRpYWxpemUgdGhlIHNhbXBsZSBmaWxlcyBsaWJyYXJ5XHJcbiAqIFRoaXMgc2hvdWxkIGJlIGNhbGxlZCBvbmNlIGR1cmluZyBkZXBsb3ltZW50IHRvIHBvcHVsYXRlIHRoZSBEeW5hbW9EQiB0YWJsZVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zdCBoZWFkZXJzID0ge1xyXG4gICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbicsXHJcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdQT1NULE9QVElPTlMnLFxyXG4gIH07XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBIYW5kbGUgcHJlZmxpZ2h0IHJlcXVlc3RzXHJcbiAgICBpZiAoZXZlbnQuaHR0cE1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICAgIGhlYWRlcnMsXHJcbiAgICAgICAgYm9keTogJycsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coJ1N0YXJ0aW5nIHNhbXBsZSBmaWxlcyBsaWJyYXJ5IGluaXRpYWxpemF0aW9uLi4uJyk7XHJcbiAgICBcclxuICAgIGF3YWl0IGluaXRpYWxpemVTYW1wbGVGaWxlc0xpYnJhcnkoKTtcclxuICAgIFxyXG4gICAgY29uc29sZS5sb2coJ1NhbXBsZSBmaWxlcyBsaWJyYXJ5IGluaXRpYWxpemF0aW9uIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnMsXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdTYW1wbGUgZmlsZXMgbGlicmFyeSBpbml0aWFsaXplZCBzdWNjZXNzZnVsbHknLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluaXRpYWxpemluZyBzYW1wbGUgZmlsZXMgbGlicmFyeTonLCBlcnJvcik7XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIGVycm9yOiAnRmFpbGVkIHRvIGluaXRpYWxpemUgc2FtcGxlIGZpbGVzIGxpYnJhcnknLFxyXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59OyJdfQ==