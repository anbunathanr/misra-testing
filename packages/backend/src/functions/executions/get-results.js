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
const auth_middleware_1 = require("../../middleware/auth-middleware");
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
});
const SCREENSHOTS_BUCKET = process.env.SCREENSHOTS_BUCKET || 'test-screenshots';
exports.handler = (0, auth_middleware_1.withAuthAndPermission)('tests', 'read', async (event) => {
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXJlc3VsdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtcmVzdWx0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFHSCxrREFBZ0U7QUFDaEUsd0VBQTZEO0FBQzdELHdGQUFrRjtBQUVsRixzRUFBNkY7QUFFN0YsTUFBTSxRQUFRLEdBQUcsSUFBSSxvQkFBUSxDQUFDO0lBQzVCLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO0NBQzlDLENBQUMsQ0FBQztBQUVILE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxrQkFBa0IsQ0FBQztBQU9uRSxRQUFBLE9BQU8sR0FBRyxJQUFBLHVDQUFxQixFQUMxQyxPQUFPLEVBQ1AsTUFBTSxFQUNOLEtBQUssRUFBRSxLQUF5QixFQUFrQyxFQUFFO0lBQ2xFLElBQUksQ0FBQztRQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0NBQWdDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXJFLDJDQUEyQztRQUMzQyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQztRQUV0RCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDakIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLE9BQU8sRUFBRSx5QkFBeUI7aUJBQ25DLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELDhCQUE4QjtRQUM5QixNQUFNLFNBQVMsR0FBRyxNQUFNLGtEQUFzQixDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUV6RSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDZixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsT0FBTyxFQUFFLHdCQUF3QixXQUFXLEVBQUU7aUJBQy9DLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELG1FQUFtRTtRQUNuRSwwRkFBMEY7UUFDMUYsMEVBQTBFO1FBRTFFLCtDQUErQztRQUMvQyxNQUFNLGNBQWMsR0FBYSxFQUFFLENBQUM7UUFFcEMsS0FBSyxNQUFNLGFBQWEsSUFBSSxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEQsSUFBSSxDQUFDO2dCQUNILE1BQU0sT0FBTyxHQUFHLElBQUksNEJBQWdCLENBQUM7b0JBQ25DLE1BQU0sRUFBRSxrQkFBa0I7b0JBQzFCLEdBQUcsRUFBRSxhQUFhO2lCQUNuQixDQUFDLENBQUM7Z0JBRUgsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFBLG1DQUFZLEVBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUztnQkFDakYsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMzQixDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHlDQUF5QyxhQUFhLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDaEYsb0RBQW9EO1lBQ3RELENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQTZCO1lBQ3pDLFNBQVM7WUFDVCxjQUFjO1NBQ2YsQ0FBQztRQUVGLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO1NBQy9CLENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0NBQWtDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFekQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsT0FBTyxFQUFFLHVCQUF1QjtnQkFDaEMsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDaEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUNGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogR2V0IEV4ZWN1dGlvbiBSZXN1bHRzIExhbWJkYVxyXG4gKiBSZXR1cm5zIGNvbXBsZXRlIGV4ZWN1dGlvbiBkZXRhaWxzIHdpdGggcHJlLXNpZ25lZCBzY3JlZW5zaG90IFVSTHNcclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgUzNDbGllbnQsIEdldE9iamVjdENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtczMnO1xyXG5pbXBvcnQgeyBnZXRTaWduZWRVcmwgfSBmcm9tICdAYXdzLXNkay9zMy1yZXF1ZXN0LXByZXNpZ25lcic7XHJcbmltcG9ydCB7IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy90ZXN0LWV4ZWN1dGlvbi1kYi1zZXJ2aWNlJztcclxuaW1wb3J0IHsgVGVzdEV4ZWN1dGlvbiB9IGZyb20gJy4uLy4uL3R5cGVzL3Rlc3QtZXhlY3V0aW9uJztcclxuaW1wb3J0IHsgd2l0aEF1dGhBbmRQZXJtaXNzaW9uLCBBdXRoZW50aWNhdGVkRXZlbnQgfSBmcm9tICcuLi8uLi9taWRkbGV3YXJlL2F1dGgtbWlkZGxld2FyZSc7XHJcblxyXG5jb25zdCBzM0NsaWVudCA9IG5ldyBTM0NsaWVudCh7XHJcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG59KTtcclxuXHJcbmNvbnN0IFNDUkVFTlNIT1RTX0JVQ0tFVCA9IHByb2Nlc3MuZW52LlNDUkVFTlNIT1RTX0JVQ0tFVCB8fCAndGVzdC1zY3JlZW5zaG90cyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEV4ZWN1dGlvblJlc3VsdHNSZXNwb25zZSB7XHJcbiAgZXhlY3V0aW9uOiBUZXN0RXhlY3V0aW9uO1xyXG4gIHNjcmVlbnNob3RVcmxzOiBzdHJpbmdbXTtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSB3aXRoQXV0aEFuZFBlcm1pc3Npb24oXHJcbiAgJ3Rlc3RzJyxcclxuICAncmVhZCcsXHJcbiAgYXN5bmMgKGV2ZW50OiBBdXRoZW50aWNhdGVkRXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc29sZS5sb2coJ0dldCBleGVjdXRpb24gcmVzdWx0cyByZXF1ZXN0OicsIEpTT04uc3RyaW5naWZ5KGV2ZW50KSk7XHJcblxyXG4gICAgICAvLyBFeHRyYWN0IGV4ZWN1dGlvbklkIGZyb20gcGF0aCBwYXJhbWV0ZXJzXHJcbiAgICAgIGNvbnN0IGV4ZWN1dGlvbklkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LmV4ZWN1dGlvbklkO1xyXG5cclxuICAgICAgaWYgKCFleGVjdXRpb25JZCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICBtZXNzYWdlOiAnZXhlY3V0aW9uSWQgaXMgcmVxdWlyZWQnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gR2V0IGV4ZWN1dGlvbiBmcm9tIGRhdGFiYXNlXHJcbiAgICAgIGNvbnN0IGV4ZWN1dGlvbiA9IGF3YWl0IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UuZ2V0RXhlY3V0aW9uKGV4ZWN1dGlvbklkKTtcclxuXHJcbiAgICAgIGlmICghZXhlY3V0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDQwNCxcclxuICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBFeGVjdXRpb24gbm90IGZvdW5kOiAke2V4ZWN1dGlvbklkfWAsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBWZXJpZnkgdXNlciBoYXMgYWNjZXNzIHRvIHRoZSBwcm9qZWN0IChvcmdhbml6YXRpb24tbGV2ZWwgY2hlY2spXHJcbiAgICAgIC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgeW91IHdvdWxkIGZldGNoIHRoZSBwcm9qZWN0IGFuZCB2ZXJpZnkgb3JnYW5pemF0aW9uSWQgbWF0Y2hlc1xyXG4gICAgICAvLyBGb3Igbm93LCB3ZSB0cnVzdCB0aGF0IHRoZSBleGVjdXRpb24gYmVsb25ncyB0byB0aGUgdXNlcidzIG9yZ2FuaXphdGlvblxyXG5cclxuICAgICAgLy8gR2VuZXJhdGUgcHJlLXNpZ25lZCBVUkxzIGZvciBhbGwgc2NyZWVuc2hvdHNcclxuICAgICAgY29uc3Qgc2NyZWVuc2hvdFVybHM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgIFxyXG4gICAgICBmb3IgKGNvbnN0IHNjcmVlbnNob3RLZXkgb2YgZXhlY3V0aW9uLnNjcmVlbnNob3RzKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0T2JqZWN0Q29tbWFuZCh7XHJcbiAgICAgICAgICAgIEJ1Y2tldDogU0NSRUVOU0hPVFNfQlVDS0VULFxyXG4gICAgICAgICAgICBLZXk6IHNjcmVlbnNob3RLZXksXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICBjb25zdCB1cmwgPSBhd2FpdCBnZXRTaWduZWRVcmwoczNDbGllbnQsIGNvbW1hbmQsIHsgZXhwaXJlc0luOiAzNjAwIH0pOyAvLyAxIGhvdXJcclxuICAgICAgICAgIHNjcmVlbnNob3RVcmxzLnB1c2godXJsKTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIGdlbmVyYXRlIHByZS1zaWduZWQgVVJMIGZvciAke3NjcmVlbnNob3RLZXl9OmAsIGVycm9yKTtcclxuICAgICAgICAgIC8vIENvbnRpbnVlIHdpdGggb3RoZXIgc2NyZWVuc2hvdHMgZXZlbiBpZiBvbmUgZmFpbHNcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlOiBFeGVjdXRpb25SZXN1bHRzUmVzcG9uc2UgPSB7XHJcbiAgICAgICAgZXhlY3V0aW9uLFxyXG4gICAgICAgIHNjcmVlbnNob3RVcmxzLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSksXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIGV4ZWN1dGlvbiByZXN1bHRzOicsIGVycm9yKTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgbWVzc2FnZTogJ0ludGVybmFsIHNlcnZlciBlcnJvcicsXHJcbiAgICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG4pO1xyXG4iXX0=