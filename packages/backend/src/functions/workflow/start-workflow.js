"use strict";
/**
 * Start Workflow Lambda
 *
 * POST /workflow/start
 * Initiates the autonomous one-click workflow
 *
 * Request body:
 * {
 *   "email": "user@example.com"
 * }
 *
 * Response:
 * {
 *   "workflowId": "workflow-xxx",
 *   "status": "INITIATED",
 *   "progress": 0
 * }
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const logger_1 = require("../../utils/logger");
const production_workflow_service_1 = require("../../services/workflow/production-workflow-service");
const logger = (0, logger_1.createLogger)('StartWorkflowFunction');
const cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION });
const handler = async (event) => {
    try {
        logger.info('Start workflow request received', { body: event.body });
        // Parse request
        const body = JSON.parse(event.body || '{}');
        const { email } = body;
        if (!email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Email is required' })
            };
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid email format' })
            };
        }
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        const clientId = process.env.COGNITO_CLIENT_ID;
        const tempPassword = `TempPass${Date.now()}!`;
        logger.info('Starting workflow for email', { email });
        try {
            // Step 1: Create user in Cognito
            const username = email.split('@')[0] + Date.now();
            await cognitoClient.send(new client_cognito_identity_provider_1.AdminCreateUserCommand({
                UserPoolId: userPoolId,
                Username: username,
                UserAttributes: [
                    { Name: 'email', Value: email },
                    { Name: 'email_verified', Value: 'true' }
                ],
                TemporaryPassword: tempPassword,
                MessageAction: 'SUPPRESS'
            }));
            logger.info('User created in Cognito', { username, email });
            // Step 2: Set permanent password
            const permanentPassword = `SecurePass${Date.now()}!@#`;
            await cognitoClient.send(new client_cognito_identity_provider_1.AdminSetUserPasswordCommand({
                UserPoolId: userPoolId,
                Username: username,
                Password: permanentPassword,
                Permanent: true
            }));
            logger.info('Password set for user', { username });
            // Step 3: Initiate auth to get session token
            const authResponse = await cognitoClient.send(new client_cognito_identity_provider_1.AdminInitiateAuthCommand({
                UserPoolId: userPoolId,
                ClientId: clientId,
                AuthFlow: 'ADMIN_NO_SRP_AUTH',
                AuthParameters: {
                    USERNAME: username,
                    PASSWORD: permanentPassword
                }
            }));
            logger.info('Auth initiated', { username, challenge: authResponse.ChallengeName });
            let sessionToken = authResponse.Session || '';
            let accessToken = authResponse.AuthenticationResult?.AccessToken || '';
            let idToken = authResponse.AuthenticationResult?.IdToken || '';
            // Step 4: Handle MFA setup if needed
            if (authResponse.ChallengeName) {
                logger.info('MFA setup required', { username, challenge: authResponse.ChallengeName });
                // Associate software token for TOTP
                const tokenResponse = await cognitoClient.send(new client_cognito_identity_provider_1.AssociateSoftwareTokenCommand({
                    Session: sessionToken
                }));
                sessionToken = tokenResponse.Session || '';
                logger.info('Software token associated', { username });
            }
            // Step 5: Get user ID from Cognito
            const userId = username;
            // Step 6: Start autonomous workflow
            const workflowState = await production_workflow_service_1.ProductionWorkflowService.startAutomatedWorkflow(email, userId, sessionToken || accessToken);
            const response = {
                workflowId: workflowState.workflowId,
                status: workflowState.status,
                progress: workflowState.progress,
                message: 'Workflow started successfully'
            };
            logger.info('Workflow started successfully', { workflowId: workflowState.workflowId });
            return {
                statusCode: 200,
                body: JSON.stringify(response),
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            };
        }
        catch (error) {
            logger.error('Workflow start failed', { error: error.message, code: error.code });
            // Handle specific Cognito errors
            if (error.code === 'UsernameExistsException') {
                return {
                    statusCode: 409,
                    body: JSON.stringify({ error: 'User already exists' })
                };
            }
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Workflow start failed: ${error.message}` })
            };
        }
    }
    catch (error) {
        logger.error('Unexpected error', { error: error.message });
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnQtd29ya2Zsb3cuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdGFydC13b3JrZmxvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBaUJHOzs7QUFHSCxnR0FBNE87QUFDNU8sOERBQTBFO0FBQzFFLCtDQUFrRDtBQUNsRCxxR0FBZ0c7QUFFaEcsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLHVCQUF1QixDQUFDLENBQUM7QUFDckQsTUFBTSxhQUFhLEdBQUcsSUFBSSxnRUFBNkIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7QUFDNUYsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztBQWFyRSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBNkIsRUFBb0MsRUFBRTtJQUMvRixJQUFJLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRXJFLGdCQUFnQjtRQUNoQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksSUFBSSxDQUF5QixDQUFDO1FBQ3BFLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFdkIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1gsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxDQUFDO2FBQ3JELENBQUM7UUFDSixDQUFDO1FBRUQsd0JBQXdCO1FBQ3hCLE1BQU0sVUFBVSxHQUFHLDRCQUE0QixD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RSxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUVsRixpQ0FBaUM7WUFDakMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLHlCQUF5QixFQUFFLENBQUM7Z0JBQzdDLE9BQU87b0JBQ0wsVUFBVSxFQUFFLEdBQUc7b0JBQ2YsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUscUJBQXFCLEVBQUUsQ0FBQztpQkFDdkQsQ0FBQztZQUNKLENBQUM7WUFFRCxPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLDBCQUEwQixLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQzthQUMzRSxDQUFDO1FBQ0osQ0FBQztJQUNILENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDM0QsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQztTQUN6RCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQTNJVyxRQUFBLE9BQU8sV0EySWxCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFN0YXJ0IFdvcmtmbG93IExhbWJkYVxyXG4gKiBcclxuICogUE9TVCAvd29ya2Zsb3cvc3RhcnRcclxuICogSW5pdGlhdGVzIHRoZSBhdXRvbm9tb3VzIG9uZS1jbGljayB3b3JrZmxvd1xyXG4gKiBcclxuICogUmVxdWVzdCBib2R5OlxyXG4gKiB7XHJcbiAqICAgXCJlbWFpbFwiOiBcInVzZXJAZXhhbXBsZS5jb21cIlxyXG4gKiB9XHJcbiAqIFxyXG4gKiBSZXNwb25zZTpcclxuICoge1xyXG4gKiAgIFwid29ya2Zsb3dJZFwiOiBcIndvcmtmbG93LXh4eFwiLFxyXG4gKiAgIFwic3RhdHVzXCI6IFwiSU5JVElBVEVEXCIsXHJcbiAqICAgXCJwcm9ncmVzc1wiOiAwXHJcbiAqIH1cclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudFYyLCBBUElHYXRld2F5UHJveHlSZXN1bHRWMiB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCwgQWRtaW5DcmVhdGVVc2VyQ29tbWFuZCwgQWRtaW5TZXRVc2VyUGFzc3dvcmRDb21tYW5kLCBBZG1pbkluaXRpYXRlQXV0aENvbW1hbmQsIEFkbWluUmVzcG9uZFRvQXV0aENoYWxsZW5nZUNvbW1hbmQsIEFzc29jaWF0ZVNvZnR3YXJlVG9rZW5Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgUHV0SXRlbUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5pbXBvcnQgeyBQcm9kdWN0aW9uV29ya2Zsb3dTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvd29ya2Zsb3cvcHJvZHVjdGlvbi13b3JrZmxvdy1zZXJ2aWNlJztcclxuXHJcbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignU3RhcnRXb3JrZmxvd0Z1bmN0aW9uJyk7XHJcbmNvbnN0IGNvZ25pdG9DbGllbnQgPSBuZXcgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQoeyByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfSk7XHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB9KTtcclxuXHJcbmludGVyZmFjZSBTdGFydFdvcmtmbG93UmVxdWVzdCB7XHJcbiAgZW1haWw6IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIFN0YXJ0V29ya2Zsb3dSZXNwb25zZSB7XHJcbiAgd29ya2Zsb3dJZDogc3RyaW5nO1xyXG4gIHN0YXR1czogc3RyaW5nO1xyXG4gIHByb2dyZXNzOiBudW1iZXI7XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRWMik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0VjI+ID0+IHtcclxuICB0cnkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1N0YXJ0IHdvcmtmbG93IHJlcXVlc3QgcmVjZWl2ZWQnLCB7IGJvZHk6IGV2ZW50LmJvZHkgfSk7XHJcblxyXG4gICAgLy8gUGFyc2UgcmVxdWVzdFxyXG4gICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSB8fCAne30nKSBhcyBTdGFydFdvcmtmbG93UmVxdWVzdDtcclxuICAgIGNvbnN0IHsgZW1haWwgfSA9IGJvZHk7XHJcblxyXG4gICAgaWYgKCFlbWFpbCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnRW1haWwgaXMgcmVxdWlyZWQnIH0pXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgZW1haWwgZm9ybWF0XHJcbiAgICBjb25zdCBlbWFpbFJlZ2V4ID0gL15bXlxcc0BdK0BbXlxcc0BdK1xcLlteXFxzQF0rJC87XHJcbiAgICBpZiAoIWVtYWlsUmVnZXgudGVzdChlbWFpbCkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludmFsaWQgZW1haWwgZm9ybWF0JyB9KVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHVzZXJQb29sSWQgPSBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCE7XHJcbiAgICBjb25zdCBjbGllbnRJZCA9IHByb2Nlc3MuZW52LkNPR05JVE9fQ0xJRU5UX0lEITtcclxuICAgIGNvbnN0IHRlbXBQYXNzd29yZCA9IGBUZW1wUGFzcyR7RGF0ZS5ub3coKX0hYDtcclxuXHJcbiAgICBsb2dnZXIuaW5mbygnU3RhcnRpbmcgd29ya2Zsb3cgZm9yIGVtYWlsJywgeyBlbWFpbCB9KTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBTdGVwIDE6IENyZWF0ZSB1c2VyIGluIENvZ25pdG9cclxuICAgICAgY29uc3QgdXNlcm5hbWUgPSBlbWFpbC5zcGxpdCgnQCcpWzBdICsgRGF0ZS5ub3coKTtcclxuICAgICAgXHJcbiAgICAgIGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5DcmVhdGVVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogdXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogdXNlcm5hbWUsXHJcbiAgICAgICAgVXNlckF0dHJpYnV0ZXM6IFtcclxuICAgICAgICAgIHsgTmFtZTogJ2VtYWlsJywgVmFsdWU6IGVtYWlsIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICdlbWFpbF92ZXJpZmllZCcsIFZhbHVlOiAndHJ1ZScgfVxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgVGVtcG9yYXJ5UGFzc3dvcmQ6IHRlbXBQYXNzd29yZCxcclxuICAgICAgICBNZXNzYWdlQWN0aW9uOiAnU1VQUFJFU1MnXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdVc2VyIGNyZWF0ZWQgaW4gQ29nbml0bycsIHsgdXNlcm5hbWUsIGVtYWlsIH0pO1xyXG5cclxuICAgICAgLy8gU3RlcCAyOiBTZXQgcGVybWFuZW50IHBhc3N3b3JkXHJcbiAgICAgIGNvbnN0IHBlcm1hbmVudFBhc3N3b3JkID0gYFNlY3VyZVBhc3Mke0RhdGUubm93KCl9IUAjYDtcclxuICAgICAgXHJcbiAgICAgIGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5TZXRVc2VyUGFzc3dvcmRDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiB1c2VybmFtZSxcclxuICAgICAgICBQYXNzd29yZDogcGVybWFuZW50UGFzc3dvcmQsXHJcbiAgICAgICAgUGVybWFuZW50OiB0cnVlXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQYXNzd29yZCBzZXQgZm9yIHVzZXInLCB7IHVzZXJuYW1lIH0pO1xyXG5cclxuICAgICAgLy8gU3RlcCAzOiBJbml0aWF0ZSBhdXRoIHRvIGdldCBzZXNzaW9uIHRva2VuXHJcbiAgICAgIGNvbnN0IGF1dGhSZXNwb25zZSA9IGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5Jbml0aWF0ZUF1dGhDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICAgIENsaWVudElkOiBjbGllbnRJZCxcclxuICAgICAgICBBdXRoRmxvdzogJ0FETUlOX05PX1NSUF9BVVRIJyxcclxuICAgICAgICBBdXRoUGFyYW1ldGVyczoge1xyXG4gICAgICAgICAgVVNFUk5BTUU6IHVzZXJuYW1lLFxyXG4gICAgICAgICAgUEFTU1dPUkQ6IHBlcm1hbmVudFBhc3N3b3JkXHJcbiAgICAgICAgfVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnQXV0aCBpbml0aWF0ZWQnLCB7IHVzZXJuYW1lLCBjaGFsbGVuZ2U6IGF1dGhSZXNwb25zZS5DaGFsbGVuZ2VOYW1lIH0pO1xyXG5cclxuICAgICAgbGV0IHNlc3Npb25Ub2tlbiA9IGF1dGhSZXNwb25zZS5TZXNzaW9uIHx8ICcnO1xyXG4gICAgICBsZXQgYWNjZXNzVG9rZW4gPSBhdXRoUmVzcG9uc2UuQXV0aGVudGljYXRpb25SZXN1bHQ/LkFjY2Vzc1Rva2VuIHx8ICcnO1xyXG4gICAgICBsZXQgaWRUb2tlbiA9IGF1dGhSZXNwb25zZS5BdXRoZW50aWNhdGlvblJlc3VsdD8uSWRUb2tlbiB8fCAnJztcclxuXHJcbiAgICAgIC8vIFN0ZXAgNDogSGFuZGxlIE1GQSBzZXR1cCBpZiBuZWVkZWRcclxuICAgICAgaWYgKGF1dGhSZXNwb25zZS5DaGFsbGVuZ2VOYW1lKSB7XHJcbiAgICAgICAgbG9nZ2VyLmluZm8oJ01GQSBzZXR1cCByZXF1aXJlZCcsIHsgdXNlcm5hbWUsIGNoYWxsZW5nZTogYXV0aFJlc3BvbnNlLkNoYWxsZW5nZU5hbWUgfSk7XHJcblxyXG4gICAgICAgIC8vIEFzc29jaWF0ZSBzb2Z0d2FyZSB0b2tlbiBmb3IgVE9UUFxyXG4gICAgICAgIGNvbnN0IHRva2VuUmVzcG9uc2UgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IEFzc29jaWF0ZVNvZnR3YXJlVG9rZW5Db21tYW5kKHtcclxuICAgICAgICAgIFNlc3Npb246IHNlc3Npb25Ub2tlblxyXG4gICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgc2Vzc2lvblRva2VuID0gdG9rZW5SZXNwb25zZS5TZXNzaW9uIHx8ICcnO1xyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdTb2Z0d2FyZSB0b2tlbiBhc3NvY2lhdGVkJywgeyB1c2VybmFtZSB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU3RlcCA1OiBHZXQgdXNlciBJRCBmcm9tIENvZ25pdG9cclxuICAgICAgY29uc3QgdXNlcklkID0gdXNlcm5hbWU7XHJcblxyXG4gICAgICAvLyBTdGVwIDY6IFN0YXJ0IGF1dG9ub21vdXMgd29ya2Zsb3dcclxuICAgICAgY29uc3Qgd29ya2Zsb3dTdGF0ZSA9IGF3YWl0IFByb2R1Y3Rpb25Xb3JrZmxvd1NlcnZpY2Uuc3RhcnRBdXRvbWF0ZWRXb3JrZmxvdyhcclxuICAgICAgICBlbWFpbCxcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgc2Vzc2lvblRva2VuIHx8IGFjY2Vzc1Rva2VuXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBjb25zdCByZXNwb25zZTogU3RhcnRXb3JrZmxvd1Jlc3BvbnNlID0ge1xyXG4gICAgICAgIHdvcmtmbG93SWQ6IHdvcmtmbG93U3RhdGUud29ya2Zsb3dJZCxcclxuICAgICAgICBzdGF0dXM6IHdvcmtmbG93U3RhdGUuc3RhdHVzLFxyXG4gICAgICAgIHByb2dyZXNzOiB3b3JrZmxvd1N0YXRlLnByb2dyZXNzLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdXb3JrZmxvdyBzdGFydGVkIHN1Y2Nlc3NmdWxseSdcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdXb3JrZmxvdyBzdGFydGVkIHN1Y2Nlc3NmdWxseScsIHsgd29ya2Zsb3dJZDogd29ya2Zsb3dTdGF0ZS53b3JrZmxvd0lkIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonXHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ1dvcmtmbG93IHN0YXJ0IGZhaWxlZCcsIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UsIGNvZGU6IGVycm9yLmNvZGUgfSk7XHJcblxyXG4gICAgICAvLyBIYW5kbGUgc3BlY2lmaWMgQ29nbml0byBlcnJvcnNcclxuICAgICAgaWYgKGVycm9yLmNvZGUgPT09ICdVc2VybmFtZUV4aXN0c0V4Y2VwdGlvbicpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDA5LFxyXG4gICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ1VzZXIgYWxyZWFkeSBleGlzdHMnIH0pXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogYFdvcmtmbG93IHN0YXJ0IGZhaWxlZDogJHtlcnJvci5tZXNzYWdlfWAgfSlcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ1VuZXhwZWN0ZWQgZXJyb3InLCB7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyB9KVxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcbiJdfQ==