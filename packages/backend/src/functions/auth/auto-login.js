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
        // Step 2: Create user if doesn't exist
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0by1sb2dpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dG8tbG9naW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7O0dBSUc7Ozs7OztBQUdILGdHQUE4TDtBQUM5TCw4REFBMEU7QUFDMUUsMERBQWtEO0FBQ2xELGdFQUErQjtBQUUvQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLENBQUM7QUFDckQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBcUIsQ0FBQztBQUNyRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFrQixDQUFDO0FBQ2hELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLE9BQU8sQ0FBQztBQUV0RCxNQUFNLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUNwRSxNQUFNLFlBQVksR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBRXBELDhDQUE4QztBQUM5QyxNQUFNLGFBQWEsR0FBRyxlQUFlLENBQUM7QUFFL0IsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBRTNDLElBQUksQ0FBQztRQUNILE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRXZCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xD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QixLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRW5ELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxXQUFXO2dCQUN4QixZQUFZLEVBQUUsWUFBWSxDQUFDLG9CQUFvQixDQUFDLFlBQVk7Z0JBQzVELFNBQVMsRUFBRSxZQUFZLENBQUMsb0JBQW9CLENBQUMsU0FBUztnQkFDdEQsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLDRCQUE0QjthQUN4RSxDQUFDO1NBQ0gsQ0FBQztJQUVKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUUxQyxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixLQUFLLEVBQUU7b0JBQ0wsSUFBSSxFQUFFLG1CQUFtQjtvQkFDekIsT0FBTyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLG1CQUFtQjtpQkFDdEU7YUFDRixDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUF2SlcsUUFBQSxPQUFPLFdBdUpsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBdXRvLWxvZ2luIGVuZHBvaW50IGZvciBhdXRvbWF0ZWQgd29ya2Zsb3dzXHJcbiAqIEhhbmRsZXMgdXNlciBjcmVhdGlvbiBhbmQgYXV0aGVudGljYXRpb24gaW50ZXJuYWxseVxyXG4gKiBSZXR1cm5zIGEgdmFsaWQgSldUIHRva2VuIGZvciBhbnkgZW1haWwgYWRkcmVzc1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQsIEFkbWluR2V0VXNlckNvbW1hbmQsIEFkbWluQ3JlYXRlVXNlckNvbW1hbmQsIEFkbWluU2V0VXNlclBhc3N3b3JkQ29tbWFuZCwgQWRtaW5Jbml0aWF0ZUF1dGhDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgUHV0SXRlbUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBtYXJzaGFsbCB9IGZyb20gJ0Bhd3Mtc2RrL3V0aWwtZHluYW1vZGInO1xyXG5pbXBvcnQgand0IGZyb20gJ2pzb253ZWJ0b2tlbic7XHJcblxyXG5jb25zdCByZWdpb24gPSBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnO1xyXG5jb25zdCB1c2VyUG9vbElkID0gcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhO1xyXG5jb25zdCBjbGllbnRJZCA9IHByb2Nlc3MuZW52LkNPR05JVE9fQ0xJRU5UX0lEITtcclxuY29uc3QgdXNlcnNUYWJsZSA9IHByb2Nlc3MuZW52LlVTRVJTX1RBQkxFIHx8ICdVc2Vycyc7XHJcblxyXG5jb25zdCBjb2duaXRvQ2xpZW50ID0gbmV3IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50KHsgcmVnaW9uIH0pO1xyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoeyByZWdpb24gfSk7XHJcblxyXG4vLyBGaXhlZCBwYXNzd29yZCBmb3IgYWxsIGF1dG8tZ2VuZXJhdGVkIHVzZXJzXHJcbmNvbnN0IEFVVE9fUEFTU1dPUkQgPSAnQXV0b1VzZXJAMTIzISc7XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcclxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnQXV0by1sb2dpbiBlbmRwb2ludCBpbnZva2VkJyk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShldmVudC5ib2R5IHx8ICd7fScpO1xyXG4gICAgY29uc3QgeyBlbWFpbCB9ID0gYm9keTtcclxuXHJcbiAgICBpZiAoIWVtYWlsKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ0lOVkFMSURfUkVRVUVTVCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdFbWFpbCBpcyByZXF1aXJlZCcsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBBdXRvLWxvZ2luIHJlcXVlc3RlZCBmb3I6ICR7ZW1haWx9YCk7XHJcblxyXG4gICAgLy8gU3RlcCAxOiBDaGVjayBpZiB1c2VyIGV4aXN0cyBpbiBDb2duaXRvXHJcbiAgICBsZXQgdXNlckV4aXN0cyA9IGZhbHNlO1xyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkdldFVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbCxcclxuICAgICAgfSkpO1xyXG4gICAgICB1c2VyRXhpc3RzID0gdHJ1ZTtcclxuICAgICAgY29uc29sZS5sb2coYFVzZXIgZXhpc3RzIGluIENvZ25pdG86ICR7ZW1haWx9YCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGlmIChlcnJvci5uYW1lID09PSAnVXNlck5vdEZvdW5kRXhjZXB0aW9uJykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBVc2VyIGRvZXMgbm90IGV4aXN0IGluIENvZ25pdG86ICR7ZW1haWx9YCk7XHJcbiAgICAgICAgdXNlckV4aXN0cyA9IGZhbHNlO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3RlcCAyOiBDcmVhdGUgdXNlciBpZiBkb2Vzbid0IGV4aXN0XHJcbiAgICBpZiAoIXVzZXJFeGlzdHMpIHtcclxuICAgICAgY29uc29sZS5sb2coYENyZWF0aW5nIG5ldyB1c2VyOiAke2VtYWlsfWApO1xyXG4gICAgICBcclxuICAgICAgLy8gQ3JlYXRlIHVzZXIgaW4gQ29nbml0b1xyXG4gICAgICBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluQ3JlYXRlVXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHVzZXJQb29sSWQsXHJcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsLFxyXG4gICAgICAgIFVzZXJBdHRyaWJ1dGVzOiBbXHJcbiAgICAgICAgICB7IE5hbWU6ICdlbWFpbCcsIFZhbHVlOiBlbWFpbCB9LFxyXG4gICAgICAgICAgeyBOYW1lOiAnZW1haWxfdmVyaWZpZWQnLCBWYWx1ZTogJ3RydWUnIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICduYW1lJywgVmFsdWU6IGVtYWlsLnNwbGl0KCdAJylbMF0gfSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIE1lc3NhZ2VBY3Rpb246ICdTVVBQUkVTUycsIC8vIERvbid0IHNlbmQgd2VsY29tZSBlbWFpbFxyXG4gICAgICAgIFRlbXBvcmFyeVBhc3N3b3JkOiBBVVRPX1BBU1NXT1JELFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICAvLyBTZXQgcGVybWFuZW50IHBhc3N3b3JkXHJcbiAgICAgIGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5TZXRVc2VyUGFzc3dvcmRDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiBlbWFpbCxcclxuICAgICAgICBQYXNzd29yZDogQVVUT19QQVNTV09SRCxcclxuICAgICAgICBQZXJtYW5lbnQ6IHRydWUsXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIC8vIENyZWF0ZSB1c2VyIHJlY29yZCBpbiBEeW5hbW9EQlxyXG4gICAgICBjb25zdCB1c2VySWQgPSBgdXNlcl8ke0RhdGUubm93KCl9XyR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpfWA7XHJcbiAgICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBQdXRJdGVtQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB1c2Vyc1RhYmxlLFxyXG4gICAgICAgIEl0ZW06IG1hcnNoYWxsKHtcclxuICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICAgIGVtYWlsLFxyXG4gICAgICAgICAgbmFtZTogZW1haWwuc3BsaXQoJ0AnKVswXSxcclxuICAgICAgICAgIHJvbGU6ICd1c2VyJyxcclxuICAgICAgICAgIG9yZ2FuaXphdGlvbklkOiAnZGVmYXVsdCcsXHJcbiAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgVXNlciBjcmVhdGVkIHN1Y2Nlc3NmdWxseTogJHtlbWFpbH0gKCR7dXNlcklkfSlgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBTdGVwIDM6IEF1dGhlbnRpY2F0ZSB1c2VyIGFuZCBnZXQgdG9rZW5zXHJcbiAgICBjb25zb2xlLmxvZyhgQXV0aGVudGljYXRpbmcgdXNlcjogJHtlbWFpbH1gKTtcclxuICAgIFxyXG4gICAgY29uc3QgYXV0aFJlc3BvbnNlID0gYXdhaXQgY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkluaXRpYXRlQXV0aENvbW1hbmQoe1xyXG4gICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICBDbGllbnRJZDogY2xpZW50SWQsXHJcbiAgICAgIEF1dGhGbG93OiAnQURNSU5fTk9fU1JQX0FVVEgnLFxyXG4gICAgICBBdXRoUGFyYW1ldGVyczoge1xyXG4gICAgICAgIFVTRVJOQU1FOiBlbWFpbCxcclxuICAgICAgICBQQVNTV09SRDogQVVUT19QQVNTV09SRCxcclxuICAgICAgfSxcclxuICAgIH0pKTtcclxuXHJcbiAgICBpZiAoIWF1dGhSZXNwb25zZS5BdXRoZW50aWNhdGlvblJlc3VsdD8uQWNjZXNzVG9rZW4pIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gb2J0YWluIGFjY2VzcyB0b2tlbicpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFN0ZXAgNDogRGVjb2RlIHRva2VuIHRvIGdldCB1c2VyIGluZm9cclxuICAgIGNvbnN0IGFjY2Vzc1Rva2VuID0gYXV0aFJlc3BvbnNlLkF1dGhlbnRpY2F0aW9uUmVzdWx0LkFjY2Vzc1Rva2VuO1xyXG4gICAgY29uc3QgZGVjb2RlZFRva2VuID0gand0LmRlY29kZShhY2Nlc3NUb2tlbikgYXMgYW55O1xyXG4gICAgXHJcbiAgICBjb25zdCB1c2VySW5mbyA9IHtcclxuICAgICAgdXNlcklkOiBkZWNvZGVkVG9rZW4uc3ViLFxyXG4gICAgICBlbWFpbDogZGVjb2RlZFRva2VuLmVtYWlsIHx8IGVtYWlsLFxyXG4gICAgICBuYW1lOiBkZWNvZGVkVG9rZW4ubmFtZSB8fCBlbWFpbC5zcGxpdCgnQCcpWzBdLFxyXG4gICAgICByb2xlOiAndXNlcicsXHJcbiAgICAgIG9yZ2FuaXphdGlvbklkOiAnZGVmYXVsdCcsXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGBBdXRvLWxvZ2luIHN1Y2Nlc3NmdWwgZm9yOiAke2VtYWlsfWApO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHVzZXI6IHVzZXJJbmZvLFxyXG4gICAgICAgIGFjY2Vzc1Rva2VuOiBhY2Nlc3NUb2tlbixcclxuICAgICAgICByZWZyZXNoVG9rZW46IGF1dGhSZXNwb25zZS5BdXRoZW50aWNhdGlvblJlc3VsdC5SZWZyZXNoVG9rZW4sXHJcbiAgICAgICAgZXhwaXJlc0luOiBhdXRoUmVzcG9uc2UuQXV0aGVudGljYXRpb25SZXN1bHQuRXhwaXJlc0luLFxyXG4gICAgICAgIG1lc3NhZ2U6IHVzZXJFeGlzdHMgPyAnTG9naW4gc3VjY2Vzc2Z1bCcgOiAnVXNlciBjcmVhdGVkIGFuZCBsb2dnZWQgaW4nLFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdBdXRvLWxvZ2luIGVycm9yOicsIGVycm9yKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgIGNvZGU6ICdBVVRPX0xPR0lOX0ZBSUxFRCcsXHJcbiAgICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdBdXRvLWxvZ2luIGZhaWxlZCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTsiXX0=