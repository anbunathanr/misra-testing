"use strict";
/**
 * Get Execution Results Lambda
 * Returns complete execution details with pre-signed screenshot URLs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const test_execution_db_service_1 = require("../../services/test-execution-db-service");
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
});
const SCREENSHOTS_BUCKET = process.env.SCREENSHOTS_BUCKET || 'test-screenshots';
const handler = async (event) => {
    try {
        console.log('Get execution results request:', JSON.stringify(event));
        // Extract executionId from path parameters
        const executionId = event.pathParameters?.executionId;
        if (!executionId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    message: 'executionId is required',
                }),
            };
        }
        // Get execution from database
        const execution = await test_execution_db_service_1.testExecutionDBService.getExecution(executionId);
        if (!execution) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    message: `Execution not found: ${executionId}`,
                }),
            };
        }
        // Verify user has access to the project (organization-level check)
        // In a real implementation, you would fetch the project and verify organizationId matches
        // For now, we trust that the execution belongs to the user's organization
        // Generate pre-signed URLs for all screenshots
        const screenshotUrls = [];
        for (const screenshotKey of execution.screenshots) {
            try {
                const command = new client_s3_1.GetObjectCommand({
                    Bucket: SCREENSHOTS_BUCKET,
                    Key: screenshotKey,
                });
                const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: 3600 }); // 1 hour
                screenshotUrls.push(url);
            }
            catch (error) {
                console.error(`Failed to generate pre-signed URL for ${screenshotKey}:`, error);
                // Continue with other screenshots even if one fails
            }
        }
        const response = {
            execution,
            screenshotUrls,
        };
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(response),
        };
    }
    catch (error) {
        console.error('Error getting execution results:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXJlc3VsdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtcmVzdWx0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFHSCxrREFBZ0U7QUFDaEUsd0VBQTZEO0FBQzdELHdGQUFrRjtBQUdsRixNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQUM7SUFDNUIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVc7Q0FDOUMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixJQUFJLGtCQUFrQixDQUFDO0FBT3pFLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQ3pGLElBQUksQ0FBQztRQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0NBQWdDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXJFLDJDQUEyQztRQUMzQyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQztRQUV0RCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDakIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLE9BQU8sRUFBRSx5QkFBeUI7aUJBQ25DLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELDhCQUE4QjtRQUM5QixNQUFNLFNBQVMsR0FBRyxNQUFNLGtEQUFzQixDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUV6RSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDZixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsT0FBTyxFQUFFLHdCQUF3QixXQUFXLEVBQUU7aUJBQy9DLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELG1FQUFtRTtRQUNuRSwwRkFBMEY7UUFDMUYsMEVBQTBFO1FBRTFFLCtDQUErQztRQUMvQyxNQUFNLGNBQWMsR0FBYSxFQUFFLENBQUM7UUFFcEMsS0FBSyxNQUFNLGFBQWEsSUFBSSxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEQsSUFBSSxDQUFDO2dCQUNILE1BQU0sT0FBTyxHQUFHLElBQUksNEJBQWdCLENBQUM7b0JBQ25DLE1BQU0sRUFBRSxrQkFBa0I7b0JBQzFCLEdBQUcsRUFBRSxhQUFhO2lCQUNuQixDQUFDLENBQUM7Z0JBRUgsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFBLG1DQUFZLEVBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUztnQkFDakYsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMzQixDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHlDQUF5QyxhQUFhLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDaEYsb0RBQW9EO1lBQ3RELENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQTZCO1lBQ3pDLFNBQVM7WUFDVCxjQUFjO1NBQ2YsQ0FBQztRQUVGLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO1NBQy9CLENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0NBQWtDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFekQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsT0FBTyxFQUFFLHVCQUF1QjtnQkFDaEMsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDaEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBdEZXLFFBQUEsT0FBTyxXQXNGbEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogR2V0IEV4ZWN1dGlvbiBSZXN1bHRzIExhbWJkYVxyXG4gKiBSZXR1cm5zIGNvbXBsZXRlIGV4ZWN1dGlvbiBkZXRhaWxzIHdpdGggcHJlLXNpZ25lZCBzY3JlZW5zaG90IFVSTHNcclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFMzQ2xpZW50LCBHZXRPYmplY3RDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXMzJztcclxuaW1wb3J0IHsgZ2V0U2lnbmVkVXJsIH0gZnJvbSAnQGF3cy1zZGsvczMtcmVxdWVzdC1wcmVzaWduZXInO1xyXG5pbXBvcnQgeyB0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvdGVzdC1leGVjdXRpb24tZGItc2VydmljZSc7XHJcbmltcG9ydCB7IFRlc3RFeGVjdXRpb24gfSBmcm9tICcuLi8uLi90eXBlcy90ZXN0LWV4ZWN1dGlvbic7XHJcblxyXG5jb25zdCBzM0NsaWVudCA9IG5ldyBTM0NsaWVudCh7XHJcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG59KTtcclxuXHJcbmNvbnN0IFNDUkVFTlNIT1RTX0JVQ0tFVCA9IHByb2Nlc3MuZW52LlNDUkVFTlNIT1RTX0JVQ0tFVCB8fCAndGVzdC1zY3JlZW5zaG90cyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEV4ZWN1dGlvblJlc3VsdHNSZXNwb25zZSB7XHJcbiAgZXhlY3V0aW9uOiBUZXN0RXhlY3V0aW9uO1xyXG4gIHNjcmVlbnNob3RVcmxzOiBzdHJpbmdbXTtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdHZXQgZXhlY3V0aW9uIHJlc3VsdHMgcmVxdWVzdDonLCBKU09OLnN0cmluZ2lmeShldmVudCkpO1xyXG5cclxuICAgICAgLy8gRXh0cmFjdCBleGVjdXRpb25JZCBmcm9tIHBhdGggcGFyYW1ldGVyc1xyXG4gICAgICBjb25zdCBleGVjdXRpb25JZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy5leGVjdXRpb25JZDtcclxuXHJcbiAgICAgIGlmICghZXhlY3V0aW9uSWQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgbWVzc2FnZTogJ2V4ZWN1dGlvbklkIGlzIHJlcXVpcmVkJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEdldCBleGVjdXRpb24gZnJvbSBkYXRhYmFzZVxyXG4gICAgICBjb25zdCBleGVjdXRpb24gPSBhd2FpdCB0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlLmdldEV4ZWN1dGlvbihleGVjdXRpb25JZCk7XHJcblxyXG4gICAgICBpZiAoIWV4ZWN1dGlvbikge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiA0MDQsXHJcbiAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICBtZXNzYWdlOiBgRXhlY3V0aW9uIG5vdCBmb3VuZDogJHtleGVjdXRpb25JZH1gLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gVmVyaWZ5IHVzZXIgaGFzIGFjY2VzcyB0byB0aGUgcHJvamVjdCAob3JnYW5pemF0aW9uLWxldmVsIGNoZWNrKVxyXG4gICAgICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHlvdSB3b3VsZCBmZXRjaCB0aGUgcHJvamVjdCBhbmQgdmVyaWZ5IG9yZ2FuaXphdGlvbklkIG1hdGNoZXNcclxuICAgICAgLy8gRm9yIG5vdywgd2UgdHJ1c3QgdGhhdCB0aGUgZXhlY3V0aW9uIGJlbG9uZ3MgdG8gdGhlIHVzZXIncyBvcmdhbml6YXRpb25cclxuXHJcbiAgICAgIC8vIEdlbmVyYXRlIHByZS1zaWduZWQgVVJMcyBmb3IgYWxsIHNjcmVlbnNob3RzXHJcbiAgICAgIGNvbnN0IHNjcmVlbnNob3RVcmxzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICBcclxuICAgICAgZm9yIChjb25zdCBzY3JlZW5zaG90S2V5IG9mIGV4ZWN1dGlvbi5zY3JlZW5zaG90cykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgICAgICBCdWNrZXQ6IFNDUkVFTlNIT1RTX0JVQ0tFVCxcclxuICAgICAgICAgICAgS2V5OiBzY3JlZW5zaG90S2V5LFxyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgY29uc3QgdXJsID0gYXdhaXQgZ2V0U2lnbmVkVXJsKHMzQ2xpZW50LCBjb21tYW5kLCB7IGV4cGlyZXNJbjogMzYwMCB9KTsgLy8gMSBob3VyXHJcbiAgICAgICAgICBzY3JlZW5zaG90VXJscy5wdXNoKHVybCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBnZW5lcmF0ZSBwcmUtc2lnbmVkIFVSTCBmb3IgJHtzY3JlZW5zaG90S2V5fTpgLCBlcnJvcik7XHJcbiAgICAgICAgICAvLyBDb250aW51ZSB3aXRoIG90aGVyIHNjcmVlbnNob3RzIGV2ZW4gaWYgb25lIGZhaWxzXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCByZXNwb25zZTogRXhlY3V0aW9uUmVzdWx0c1Jlc3BvbnNlID0ge1xyXG4gICAgICAgIGV4ZWN1dGlvbixcclxuICAgICAgICBzY3JlZW5zaG90VXJscyxcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBleGVjdXRpb24gcmVzdWx0czonLCBlcnJvcik7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIG1lc3NhZ2U6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InLFxyXG4gICAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG59O1xyXG4iXX0=