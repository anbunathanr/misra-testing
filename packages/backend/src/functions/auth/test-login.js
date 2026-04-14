"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const aws_sdk_1 = require("aws-sdk");
const uuid_1 = require("uuid");
const cognito = new aws_sdk_1.CognitoIdentityServiceProvider();
const handler = async (event) => {
    try {
        // Only allow in development/staging
        const environment = process.env.ENVIRONMENT || 'production';
        const testModeEnabled = process.env.TEST_MODE_ENABLED === 'true';
        if (!testModeEnabled || environment === 'production') {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Test mode not enabled' }),
            };
        }
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        const clientId = process.env.COGNITO_CLIENT_ID;
        // Generate test credentials
        const testEmail = 'test-misra@example.com';
        const testPassword = 'TestPassword123!';
        const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const userId = (0, uuid_1.v4)();
        // Create or update test user
        try {
            await cognito.adminCreateUser({
                UserPoolId: userPoolId,
                Username: testEmail,
                TemporaryPassword: testPassword,
                MessageAction: 'SUPPRESS',
                UserAttributes: [
                    { Name: 'email', Value: testEmail },
                    { Name: 'email_verified', Value: 'true' },
                    { Name: 'custom:user_id', Value: userId },
                    { Name: 'name', Value: 'Test User' },
                ],
            }).promise();
        }
        catch (err) {
            // User might already exist, that's fine
            if (err.code !== 'UsernameExistsException') {
                throw err;
            }
        }
        // Set permanent password
        await cognito.adminSetUserPassword({
            UserPoolId: userPoolId,
            Username: testEmail,
            Password: testPassword,
            Permanent: true,
        }).promise();
        // Initiate auth
        const authResponse = await cognito.adminInitiateAuth({
            UserPoolId: userPoolId,
            ClientId: clientId,
            AuthFlow: 'ADMIN_NO_SRP_AUTH',
            AuthParameters: {
                USERNAME: testEmail,
                PASSWORD: testPassword,
            },
        }).promise();
        // Store OTP in DynamoDB for verification (optional, for real OTP flow)
        // For now, we'll just return it directly in test mode
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                accessToken: authResponse.AuthenticationResult?.AccessToken,
                refreshToken: authResponse.AuthenticationResult?.RefreshToken,
                user: {
                    userId,
                    email: testEmail,
                    name: 'Test User',
                },
                expiresIn: authResponse.AuthenticationResult?.ExpiresIn || 3600,
                testOtp, // OTP returned directly in test mode
                testMode: true,
            }),
        };
    }
    catch (error) {
        console.error('[TEST-LOGIN] Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1sb2dpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlc3QtbG9naW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EscUNBQXlEO0FBQ3pELCtCQUFvQztBQUVwQyxNQUFNLE9BQU8sR0FBRyxJQUFJLHdDQUE4QixFQUFFLENBQUM7QUFlOUMsTUFBTSxPQUFPLEdBQTJCLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtJQUM3RCxJQUFJLENBQUM7UUFDSCxvQ0FBb0M7UUFDcEMsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksWUFBWSxDQUFDO1FBQzVELE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEtBQUssTUFBTSxDQUFDO1FBRWpFLElBQUksQ0FBQyxlQUFlLElBQUksV0FBVyxLQUFLLFlBQVksRUFBRSxDQUFDO1lBQ3JELE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQzthQUN6RCxDQUFDO1FBQ0osQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQXFCLENBQUM7UUFDckQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBa0IsQ0FBQztRQUVoRCw0QkFBNEI7UUFDNUIsTUFBTSxTQUFTLEdBQUcsd0JBQXdCLENBQUM7UUFDM0MsTUFBTSxZQUFZLEdBQUcsa0JBQWtCLENBQUM7UUFDeEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3ZFLE1BQU0sTUFBTSxHQUFHLElBQUEsU0FBTSxHQUFFLENBQUM7UUFFeEIsNkJBQTZCO1FBQzdCLElBQUksQ0FBQztZQUNILE1BQU0sT0FBTyxDQUFDLGVBQWUsQ0FBQztnQkFDNUIsVUFBVSxFQUFFLFVBQVU7Z0JBQ3RCLFFBQVEsRUFBRSxTQUFTO2dCQUNuQixpQkFBaUIsRUFBRSxZQUFZO2dCQUMvQixhQUFhLEVBQUUsVUFBVTtnQkFDekIsY0FBYyxFQUFFO29CQUNkLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFO29CQUNuQyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO29CQUN6QyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO29CQUN6QyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRTtpQkFDckM7YUFDRixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDZixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNsQix3Q0FBd0M7WUFDeEMsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLHlCQUF5QixFQUFFLENBQUM7Z0JBQzNDLE1BQU0sR0FBRyxDQUFDO1lBQ1osQ0FBQztRQUNILENBQUM7UUFFRCx5QkFBeUI7UUFDekIsTUFBTSxPQUFPLENBQUMsb0JBQW9CLENBQUM7WUFDakMsVUFBVSxFQUFFLFVBQVU7WUFDdEIsUUFBUSxFQUFFLFNBQVM7WUFDbkIsUUFBUSxFQUFFLFlBQVk7WUFDdEIsU0FBUyxFQUFFLElBQUk7U0FDaEIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRWIsZ0JBQWdCO1FBQ2hCLE1BQU0sWUFBWSxHQUFHLE1BQU0sT0FBTyxDQUFDLGlCQUFpQixDQUFDO1lBQ25ELFVBQVUsRUFBRSxVQUFVO1lBQ3RCLFFBQVEsRUFBRSxRQUFRO1lBQ2xCLFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsY0FBYyxFQUFFO2dCQUNkLFFBQVEsRUFBRSxTQUFTO2dCQUNuQixRQUFRLEVBQUUsWUFBWTthQUN2QjtTQUNGLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUViLHVFQUF1RTtRQUN2RSxzREFBc0Q7UUFFdEQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsV0FBVyxFQUFFLFlBQVksQ0FBQyxvQkFBb0IsRUFBRSxXQUFXO2dCQUMzRCxZQUFZLEVBQUUsWUFBWSxDQUFDLG9CQUFvQixFQUFFLFlBQVk7Z0JBQzdELElBQUksRUFBRTtvQkFDSixNQUFNO29CQUNOLEtBQUssRUFBRSxTQUFTO29CQUNoQixJQUFJLEVBQUUsV0FBVztpQkFDbEI7Z0JBQ0QsU0FBUyxFQUFFLFlBQVksQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLElBQUksSUFBSTtnQkFDL0QsT0FBTyxFQUFFLHFDQUFxQztnQkFDOUMsUUFBUSxFQUFFLElBQUk7YUFDTSxDQUFDO1NBQ3hCLENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDNUMsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQztTQUN6RCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQTNGVyxRQUFBLE9BQU8sV0EyRmxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5SGFuZGxlciB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXIgfSBmcm9tICdhd3Mtc2RrJztcclxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XHJcblxyXG5jb25zdCBjb2duaXRvID0gbmV3IENvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlcigpO1xyXG5cclxuaW50ZXJmYWNlIFRlc3RMb2dpblJlc3BvbnNlIHtcclxuICBhY2Nlc3NUb2tlbjogc3RyaW5nO1xyXG4gIHJlZnJlc2hUb2tlbjogc3RyaW5nO1xyXG4gIHVzZXI6IHtcclxuICAgIHVzZXJJZDogc3RyaW5nO1xyXG4gICAgZW1haWw6IHN0cmluZztcclxuICAgIG5hbWU6IHN0cmluZztcclxuICB9O1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG4gIHRlc3RPdHA6IHN0cmluZztcclxuICB0ZXN0TW9kZTogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXI6IEFQSUdhdGV3YXlQcm94eUhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcclxuICB0cnkge1xyXG4gICAgLy8gT25seSBhbGxvdyBpbiBkZXZlbG9wbWVudC9zdGFnaW5nXHJcbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IHByb2Nlc3MuZW52LkVOVklST05NRU5UIHx8ICdwcm9kdWN0aW9uJztcclxuICAgIGNvbnN0IHRlc3RNb2RlRW5hYmxlZCA9IHByb2Nlc3MuZW52LlRFU1RfTU9ERV9FTkFCTEVEID09PSAndHJ1ZSc7XHJcblxyXG4gICAgaWYgKCF0ZXN0TW9kZUVuYWJsZWQgfHwgZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJykge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnVGVzdCBtb2RlIG5vdCBlbmFibGVkJyB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB1c2VyUG9vbElkID0gcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhO1xyXG4gICAgY29uc3QgY2xpZW50SWQgPSBwcm9jZXNzLmVudi5DT0dOSVRPX0NMSUVOVF9JRCE7XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgdGVzdCBjcmVkZW50aWFsc1xyXG4gICAgY29uc3QgdGVzdEVtYWlsID0gJ3Rlc3QtbWlzcmFAZXhhbXBsZS5jb20nO1xyXG4gICAgY29uc3QgdGVzdFBhc3N3b3JkID0gJ1Rlc3RQYXNzd29yZDEyMyEnO1xyXG4gICAgY29uc3QgdGVzdE90cCA9IE1hdGguZmxvb3IoMTAwMDAwICsgTWF0aC5yYW5kb20oKSAqIDkwMDAwMCkudG9TdHJpbmcoKTtcclxuICAgIGNvbnN0IHVzZXJJZCA9IHV1aWR2NCgpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBvciB1cGRhdGUgdGVzdCB1c2VyXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCBjb2duaXRvLmFkbWluQ3JlYXRlVXNlcih7XHJcbiAgICAgICAgVXNlclBvb2xJZDogdXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogdGVzdEVtYWlsLFxyXG4gICAgICAgIFRlbXBvcmFyeVBhc3N3b3JkOiB0ZXN0UGFzc3dvcmQsXHJcbiAgICAgICAgTWVzc2FnZUFjdGlvbjogJ1NVUFBSRVNTJyxcclxuICAgICAgICBVc2VyQXR0cmlidXRlczogW1xyXG4gICAgICAgICAgeyBOYW1lOiAnZW1haWwnLCBWYWx1ZTogdGVzdEVtYWlsIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICdlbWFpbF92ZXJpZmllZCcsIFZhbHVlOiAndHJ1ZScgfSxcclxuICAgICAgICAgIHsgTmFtZTogJ2N1c3RvbTp1c2VyX2lkJywgVmFsdWU6IHVzZXJJZCB9LFxyXG4gICAgICAgICAgeyBOYW1lOiAnbmFtZScsIFZhbHVlOiAnVGVzdCBVc2VyJyB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0pLnByb21pc2UoKTtcclxuICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgIC8vIFVzZXIgbWlnaHQgYWxyZWFkeSBleGlzdCwgdGhhdCdzIGZpbmVcclxuICAgICAgaWYgKGVyci5jb2RlICE9PSAnVXNlcm5hbWVFeGlzdHNFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgdGhyb3cgZXJyO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2V0IHBlcm1hbmVudCBwYXNzd29yZFxyXG4gICAgYXdhaXQgY29nbml0by5hZG1pblNldFVzZXJQYXNzd29yZCh7XHJcbiAgICAgIFVzZXJQb29sSWQ6IHVzZXJQb29sSWQsXHJcbiAgICAgIFVzZXJuYW1lOiB0ZXN0RW1haWwsXHJcbiAgICAgIFBhc3N3b3JkOiB0ZXN0UGFzc3dvcmQsXHJcbiAgICAgIFBlcm1hbmVudDogdHJ1ZSxcclxuICAgIH0pLnByb21pc2UoKTtcclxuXHJcbiAgICAvLyBJbml0aWF0ZSBhdXRoXHJcbiAgICBjb25zdCBhdXRoUmVzcG9uc2UgPSBhd2FpdCBjb2duaXRvLmFkbWluSW5pdGlhdGVBdXRoKHtcclxuICAgICAgVXNlclBvb2xJZDogdXNlclBvb2xJZCxcclxuICAgICAgQ2xpZW50SWQ6IGNsaWVudElkLFxyXG4gICAgICBBdXRoRmxvdzogJ0FETUlOX05PX1NSUF9BVVRIJyxcclxuICAgICAgQXV0aFBhcmFtZXRlcnM6IHtcclxuICAgICAgICBVU0VSTkFNRTogdGVzdEVtYWlsLFxyXG4gICAgICAgIFBBU1NXT1JEOiB0ZXN0UGFzc3dvcmQsXHJcbiAgICAgIH0sXHJcbiAgICB9KS5wcm9taXNlKCk7XHJcblxyXG4gICAgLy8gU3RvcmUgT1RQIGluIER5bmFtb0RCIGZvciB2ZXJpZmljYXRpb24gKG9wdGlvbmFsLCBmb3IgcmVhbCBPVFAgZmxvdylcclxuICAgIC8vIEZvciBub3csIHdlJ2xsIGp1c3QgcmV0dXJuIGl0IGRpcmVjdGx5IGluIHRlc3QgbW9kZVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGFjY2Vzc1Rva2VuOiBhdXRoUmVzcG9uc2UuQXV0aGVudGljYXRpb25SZXN1bHQ/LkFjY2Vzc1Rva2VuLFxyXG4gICAgICAgIHJlZnJlc2hUb2tlbjogYXV0aFJlc3BvbnNlLkF1dGhlbnRpY2F0aW9uUmVzdWx0Py5SZWZyZXNoVG9rZW4sXHJcbiAgICAgICAgdXNlcjoge1xyXG4gICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgZW1haWw6IHRlc3RFbWFpbCxcclxuICAgICAgICAgIG5hbWU6ICdUZXN0IFVzZXInLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZXhwaXJlc0luOiBhdXRoUmVzcG9uc2UuQXV0aGVudGljYXRpb25SZXN1bHQ/LkV4cGlyZXNJbiB8fCAzNjAwLFxyXG4gICAgICAgIHRlc3RPdHAsIC8vIE9UUCByZXR1cm5lZCBkaXJlY3RseSBpbiB0ZXN0IG1vZGVcclxuICAgICAgICB0ZXN0TW9kZTogdHJ1ZSxcclxuICAgICAgfSBhcyBUZXN0TG9naW5SZXNwb25zZSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdbVEVTVC1MT0dJTl0gRXJyb3I6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG4iXX0=