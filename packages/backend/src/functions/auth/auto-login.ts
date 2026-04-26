/**
 * Auto-login endpoint for automated workflows
 * Handles user creation and authentication internally
 * Returns a valid JWT token for any email address
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminGetUserCommand, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminInitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import jwt from 'jsonwebtoken';

const region = process.env.AWS_REGION || 'us-east-1';
const userPoolId = process.env.COGNITO_USER_POOL_ID!;
const clientId = process.env.COGNITO_CLIENT_ID!;
const usersTable = process.env.USERS_TABLE || 'Users';

const cognitoClient = new CognitoIdentityProviderClient({ region });
const dynamoClient = new DynamoDBClient({ region });

// Fixed password for all auto-generated users
const AUTO_PASSWORD = 'AutoUser@123!';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
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
      await cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: email,
      }));
      userExists = true;
      console.log(`User exists in Cognito: ${email}`);
    } catch (error: any) {
      if (error.name === 'UserNotFoundException') {
        console.log(`User does not exist in Cognito: ${email}`);
        userExists = false;
      } else {
        throw error;
      }
    }

    // Step 2: Create user if doesn't exist
    if (!userExists) {
      console.log(`Creating new user: ${email}`);
      
      // Create user in Cognito
      await cognitoClient.send(new AdminCreateUserCommand({
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
      await cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: email,
        Password: AUTO_PASSWORD,
        Permanent: true,
      }));

      // Create user record in DynamoDB
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await dynamoClient.send(new PutItemCommand({
        TableName: usersTable,
        Item: marshall({
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
    
    const authResponse = await cognitoClient.send(new AdminInitiateAuthCommand({
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
    const decodedToken = jwt.decode(accessToken) as any;
    
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

  } catch (error) {
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