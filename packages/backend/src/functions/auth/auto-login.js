"use strict";
/**
 * Auto-login endpoint for automated workflows
 * Handles user creation and authentication internally
 * Returns a valid JWT token for any email address
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const region = process.env.AWS_REGION || 'us-east-1';
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;
const usersTable = process.env.USERS_TABLE || 'Users';
const cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({ region });
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region });
// Fixed password for all auto-generated users
const AUTO_PASSWORD = 'AutoUser@123!';
const handler = async (event) => {
    console.log('Auto-login endpoint invoked');
    try {
        const body = JSON.parse(event.body || '{}');
        const { email } = body;
        if (!email) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: {
                        code: 'INVALID_REQUEST',
                        message: 'Email is required',
                    },
                }),
            };
        }
        console.log(`Auto-login requested for: ${email}`);
        // Step 1: Check if user exists in Cognito
        let userExists = false;
        try {
            await cognitoClient.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
                UserPoolId: userPoolId,
                Username: email,
            }));
            userExists = true;
            console.log(`User exists in Cognito: ${email}`);
        }
        catch (error) {
            if (error.name === 'UserNotFoundException') {
                console.log(`User does not exist in Cognito: ${email}`);
                userExists = false;
            }
            else {
                throw error;
            }
        }
        // Step 2: Create user if doesn't exist, or reset password if exists
        if (!userExists) {
            console.log(`Creating new user: ${email}`);
            // Create user in Cognito
            await cognitoClient.send(new client_cognito_identity_provider_1.AdminCreateUserCommand({
                UserPoolId: userPoolId,
                Username: email,
                UserAttributes: [
                    { Name: 'email', Value: email },
                    { Name: 'email_verified', Value: 'true' },
                    { Name: 'name', Value: email.split('@')[0] },
                ],
                MessageAction: 'SUPPRESS', // Don't send welcome email
                TemporaryPassword: AUTO_PASSWORD,
            }));
            // Set permanent password
            await cognitoClient.send(new client_cognito_identity_provider_1.AdminSetUserPasswordCommand({
                UserPoolId: userPoolId,
                Username: email,
                Password: AUTO_PASSWORD,
                Permanent: true,
            }));
            // Create user record in DynamoDB
            const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await dynamoClient.send(new client_dynamodb_1.PutItemCommand({
                TableName: usersTable,
                Item: (0, util_dynamodb_1.marshall)({
                    userId,
                    email,
                    name: email.split('@')[0],
                    role: 'user',
                    organizationId: 'default',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }),
            }));
            console.log(`User created successfully: ${email} (${userId})`);
        }
        else {
            console.log(`User exists, resetting password to standard: ${email}`);
            // Reset existing user's password to the standard one
            await cognitoClient.send(new client_cognito_identity_provider_1.AdminSetUserPasswordCommand({
                UserPoolId: userPoolId,
                Username: email,
                Password: AUTO_PASSWORD,
                Permanent: true,
            }));
            console.log(`Password reset successfully for existing user: ${email}`);
        }
        // Step 3: Authenticate user and get tokens
        console.log(`Authenticating user: ${email}`);
        const authResponse = await cognitoClient.send(new client_cognito_identity_provider_1.AdminInitiateAuthCommand({
            UserPoolId: userPoolId,
            ClientId: clientId,
            AuthFlow: 'ADMIN_NO_SRP_AUTH',
            AuthParameters: {
                USERNAME: email,
                PASSWORD: AUTO_PASSWORD,
            },
        }));
        if (!authResponse.AuthenticationResult?.AccessToken) {
            throw new Error('Failed to obtain access token');
        }
        // Step 4: Decode token to get user info
        const accessToken = authResponse.AuthenticationResult.AccessToken;
        const decodedToken = jsonwebtoken_1.default.decode(accessToken);
        const userInfo = {
            userId: decodedToken.sub,
            email: decodedToken.email || email,
            name: decodedToken.name || email.split('@')[0],
            role: 'user',
            organizationId: 'default',
        };
        console.log(`Auto-login successful for: ${email}`);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                user: userInfo,
                accessToken: accessToken,
                refreshToken: authResponse.AuthenticationResult.RefreshToken,
                expiresIn: authResponse.AuthenticationResult.ExpiresIn,
                message: userExists ? 'Login successful' : 'User created and logged in',
            }),
        };
    }
    catch (error) {
        console.error('Auto-login error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: {
                    code: 'AUTO_LOGIN_FAILED',
                    message: error instanceof Error ? error.message : 'Auto-login failed',
                },
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0by1sb2dpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dG8tbG9naW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7O0dBSUc7Ozs7OztBQUdILGdHQUE4TDtBQUM5TCw4REFBMEU7QUFDMUUsMERBQWtEO0FBQ2xELGdFQUErQjtBQUUvQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLENBQUM7QUFDckQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBcUIsQ0FBQztBQUNyRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFrQixDQUFDO0FBQ2hELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLE9BQU8sQ0FBQztBQUV0RCxNQUFNLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUNwRSxNQUFNLFlBQVksR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBRXBELDhDQUE4QztBQUM5QyxNQUFNLGFBQWEsR0FBRyxlQUFlLENBQUM7QUFFL0IsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBRTNDLElBQUksQ0FBQztRQUNILE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRXZCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xD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LEVBQUU7b0JBQ0wsSUFBSSxFQUFFLG1CQUFtQjtvQkFDekIsT0FBTyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLG1CQUFtQjtpQkFDdEU7YUFDRixDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUFuS1csUUFBQSxPQUFPLFdBbUtsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBdXRvLWxvZ2luIGVuZHBvaW50IGZvciBhdXRvbWF0ZWQgd29ya2Zsb3dzXHJcbiAqIEhhbmRsZXMgdXNlciBjcmVhdGlvbiBhbmQgYXV0aGVudGljYXRpb24gaW50ZXJuYWxseVxyXG4gKiBSZXR1cm5zIGEgdmFsaWQgSldUIHRva2VuIGZvciBhbnkgZW1haWwgYWRkcmVzc1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQsIEFkbWluR2V0VXNlckNvbW1hbmQsIEFkbWluQ3JlYXRlVXNlckNvbW1hbmQsIEFkbWluU2V0VXNlclBhc3N3b3JkQ29tbWFuZCwgQWRtaW5Jbml0aWF0ZUF1dGhDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgUHV0SXRlbUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBtYXJzaGFsbCB9IGZyb20gJ0Bhd3Mtc2RrL3V0aWwtZHluYW1vZGInO1xyXG5pbXBvcnQgand0IGZyb20gJ2pzb253ZWJ0b2tlbic7XHJcblxyXG5jb25zdCByZWdpb24gPSBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnO1xyXG5jb25zdCB1c2VyUG9vbElkID0gcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhO1xyXG5jb25zdCBjbGllbnRJZCA9IHByb2Nlc3MuZW52LkNPR05JVE9fQ0xJRU5UX0lEITtcclxuY29uc3QgdXNlcnNUYWJsZSA9IHByb2Nlc3MuZW52LlVTRVJTX1RBQkxFIHx8ICdVc2Vycyc7XHJcblxyXG5jb25zdCBjb2duaXRvQ2xpZW50ID0gbmV3IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50KHsgcmVnaW9uIH0pO1xyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoeyByZWdpb24gfSk7XHJcblxyXG4vLyBGaXhlZCBwYXNzd29yZCBmb3IgYWxsIGF1dG8tZ2VuZXJhdGVkIHVzZXJzXHJcbmNvbnN0IEFVVE9fUEFTU1dPUkQgPSAnQXV0b1VzZXJAMTIzISc7XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcclxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnQXV0by1sb2dpbiBlbmRwb2ludCBpbnZva2VkJyk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShldmVudC5ib2R5IHx8ICd7fScpO1xyXG4gICAgY29uc3QgeyBlbWFpbCB9ID0gYm9keTtcclxuXHJcbiAgICBpZiAoIWVtYWlsKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ0lOVkFMSURfUkVRVUVTVCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdFbWFpbCBpcyByZXF1aXJlZCcsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBBdXRvLWxvZ2luIHJlcXVlc3RlZCBmb3I6ICR7ZW1haWx9YCk7XHJcblxyXG4gICAgLy8gU3RlcCAxOiBDaGVjayBpZiB1c2VyIGV4aXN0cyBpbiBDb2duaXRvXHJcbiAgICBsZXQgdXNlckV4aXN0cyA9IGZhbHNlO1xyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkdldFVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbCxcclxuICAgICAgfSkpO1xyXG4gICAgICB1c2VyRXhpc3RzID0gdHJ1ZTtcclxuICAgICAgY29uc29sZS5sb2coYFVzZXIgZXhpc3RzIGluIENvZ25pdG86ICR7ZW1haWx9YCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGlmIChlcnJvci5uYW1lID09PSAnVXNlck5vdEZvdW5kRXhjZXB0aW9uJykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBVc2VyIGRvZXMgbm90IGV4aXN0IGluIENvZ25pdG86ICR7ZW1haWx9YCk7XHJcbiAgICAgICAgdXNlckV4aXN0cyA9IGZhbHNlO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3RlcCAyOiBDcmVhdGUgdXNlciBpZiBkb2Vzbid0IGV4aXN0LCBvciByZXNldCBwYXNzd29yZCBpZiBleGlzdHNcclxuICAgIGlmICghdXNlckV4aXN0cykge1xyXG4gICAgICBjb25zb2xlLmxvZyhgQ3JlYXRpbmcgbmV3IHVzZXI6ICR7ZW1haWx9YCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBDcmVhdGUgdXNlciBpbiBDb2duaXRvXHJcbiAgICAgIGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5DcmVhdGVVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogdXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogZW1haWwsXHJcbiAgICAgICAgVXNlckF0dHJpYnV0ZXM6IFtcclxuICAgICAgICAgIHsgTmFtZTogJ2VtYWlsJywgVmFsdWU6IGVtYWlsIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICdlbWFpbF92ZXJpZmllZCcsIFZhbHVlOiAndHJ1ZScgfSxcclxuICAgICAgICAgIHsgTmFtZTogJ25hbWUnLCBWYWx1ZTogZW1haWwuc3BsaXQoJ0AnKVswXSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgTWVzc2FnZUFjdGlvbjogJ1NVUFBSRVNTJywgLy8gRG9uJ3Qgc2VuZCB3ZWxjb21lIGVtYWlsXHJcbiAgICAgICAgVGVtcG9yYXJ5UGFzc3dvcmQ6IEFVVE9fUEFTU1dPUkQsXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIC8vIFNldCBwZXJtYW5lbnQgcGFzc3dvcmRcclxuICAgICAgYXdhaXQgY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pblNldFVzZXJQYXNzd29yZENvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHVzZXJQb29sSWQsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsLFxyXG4gICAgICAgIFBhc3N3b3JkOiBBVVRPX1BBU1NXT1JELFxyXG4gICAgICAgIFBlcm1hbmVudDogdHJ1ZSxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIHVzZXIgcmVjb3JkIGluIER5bmFtb0RCXHJcbiAgICAgIGNvbnN0IHVzZXJJZCA9IGB1c2VyXyR7RGF0ZS5ub3coKX1fJHtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSl9YDtcclxuICAgICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IFB1dEl0ZW1Db21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHVzZXJzVGFibGUsXHJcbiAgICAgICAgSXRlbTogbWFyc2hhbGwoe1xyXG4gICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgZW1haWwsXHJcbiAgICAgICAgICBuYW1lOiBlbWFpbC5zcGxpdCgnQCcpWzBdLFxyXG4gICAgICAgICAgcm9sZTogJ3VzZXInLFxyXG4gICAgICAgICAgb3JnYW5pemF0aW9uSWQ6ICdkZWZhdWx0JyxcclxuICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBVc2VyIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5OiAke2VtYWlsfSAoJHt1c2VySWR9KWApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc29sZS5sb2coYFVzZXIgZXhpc3RzLCByZXNldHRpbmcgcGFzc3dvcmQgdG8gc3RhbmRhcmQ6ICR7ZW1haWx9YCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBSZXNldCBleGlzdGluZyB1c2VyJ3MgcGFzc3dvcmQgdG8gdGhlIHN0YW5kYXJkIG9uZVxyXG4gICAgICBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluU2V0VXNlclBhc3N3b3JkQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogdXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogZW1haWwsXHJcbiAgICAgICAgUGFzc3dvcmQ6IEFVVE9fUEFTU1dPUkQsXHJcbiAgICAgICAgUGVybWFuZW50OiB0cnVlLFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgUGFzc3dvcmQgcmVzZXQgc3VjY2Vzc2Z1bGx5IGZvciBleGlzdGluZyB1c2VyOiAke2VtYWlsfWApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFN0ZXAgMzogQXV0aGVudGljYXRlIHVzZXIgYW5kIGdldCB0b2tlbnNcclxuICAgIGNvbnNvbGUubG9nKGBBdXRoZW50aWNhdGluZyB1c2VyOiAke2VtYWlsfWApO1xyXG4gICAgXHJcbiAgICBjb25zdCBhdXRoUmVzcG9uc2UgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluSW5pdGlhdGVBdXRoQ29tbWFuZCh7XHJcbiAgICAgIFVzZXJQb29sSWQ6IHVzZXJQb29sSWQsXHJcbiAgICAgIENsaWVudElkOiBjbGllbnRJZCxcclxuICAgICAgQXV0aEZsb3c6ICdBRE1JTl9OT19TUlBfQVVUSCcsXHJcbiAgICAgIEF1dGhQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgVVNFUk5BTUU6IGVtYWlsLFxyXG4gICAgICAgIFBBU1NXT1JEOiBBVVRPX1BBU1NXT1JELFxyXG4gICAgICB9LFxyXG4gICAgfSkpO1xyXG5cclxuICAgIGlmICghYXV0aFJlc3BvbnNlLkF1dGhlbnRpY2F0aW9uUmVzdWx0Py5BY2Nlc3NUb2tlbikge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBvYnRhaW4gYWNjZXNzIHRva2VuJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3RlcCA0OiBEZWNvZGUgdG9rZW4gdG8gZ2V0IHVzZXIgaW5mb1xyXG4gICAgY29uc3QgYWNjZXNzVG9rZW4gPSBhdXRoUmVzcG9uc2UuQXV0aGVudGljYXRpb25SZXN1bHQuQWNjZXNzVG9rZW47XHJcbiAgICBjb25zdCBkZWNvZGVkVG9rZW4gPSBqd3QuZGVjb2RlKGFjY2Vzc1Rva2VuKSBhcyBhbnk7XHJcbiAgICBcclxuICAgIGNvbnN0IHVzZXJJbmZvID0ge1xyXG4gICAgICB1c2VySWQ6IGRlY29kZWRUb2tlbi5zdWIsXHJcbiAgICAgIGVtYWlsOiBkZWNvZGVkVG9rZW4uZW1haWwgfHwgZW1haWwsXHJcbiAgICAgIG5hbWU6IGRlY29kZWRUb2tlbi5uYW1lIHx8IGVtYWlsLnNwbGl0KCdAJylbMF0sXHJcbiAgICAgIHJvbGU6ICd1c2VyJyxcclxuICAgICAgb3JnYW5pemF0aW9uSWQ6ICdkZWZhdWx0JyxcclxuICAgIH07XHJcblxyXG4gICAgY29uc29sZS5sb2coYEF1dG8tbG9naW4gc3VjY2Vzc2Z1bCBmb3I6ICR7ZW1haWx9YCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgdXNlcjogdXNlckluZm8sXHJcbiAgICAgICAgYWNjZXNzVG9rZW46IGFjY2Vzc1Rva2VuLFxyXG4gICAgICAgIHJlZnJlc2hUb2tlbjogYXV0aFJlc3BvbnNlLkF1dGhlbnRpY2F0aW9uUmVzdWx0LlJlZnJlc2hUb2tlbixcclxuICAgICAgICBleHBpcmVzSW46IGF1dGhSZXNwb25zZS5BdXRoZW50aWNhdGlvblJlc3VsdC5FeHBpcmVzSW4sXHJcbiAgICAgICAgbWVzc2FnZTogdXNlckV4aXN0cyA/ICdMb2dpbiBzdWNjZXNzZnVsJyA6ICdVc2VyIGNyZWF0ZWQgYW5kIGxvZ2dlZCBpbicsXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0F1dG8tbG9naW4gZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgY29kZTogJ0FVVE9fTE9HSU5fRkFJTEVEJyxcclxuICAgICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ0F1dG8tbG9naW4gZmFpbGVkJyxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59OyJdfQ==