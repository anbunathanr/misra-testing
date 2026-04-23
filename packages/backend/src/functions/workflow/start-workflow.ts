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

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminInitiateAuthCommand, AdminRespondToAuthChallengeCommand, AssociateSoftwareTokenCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { createLogger } from '../../utils/logger';
import { ProductionWorkflowService } from '../../services/workflow/production-workflow-service';

const logger = createLogger('StartWorkflowFunction');
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

interface StartWorkflowRequest {
  email: string;
}

interface StartWorkflowResponse {
  workflowId: string;
  status: string;
  progress: number;
  message: string;
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    logger.info('Start workflow request received', { body: event.body });

    // Parse request
    const body = JSON.parse(event.body || '{}') as StartWorkflowRequest;
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

    const userPoolId = process.env.COGNITO_USER_POOL_ID!;
    const clientId = process.env.COGNITO_CLIENT_ID!;
    const tempPassword = `TempPass${Date.now()}!`;

    logger.info('Starting workflow for email', { email });

    try {
      // Step 1: Create user in Cognito
      const username = email.split('@')[0] + Date.now();
      
      await cognitoClient.send(new AdminCreateUserCommand({
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
      
      await cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: username,
        Password: permanentPassword,
        Permanent: true
      }));

      logger.info('Password set for user', { username });

      // Step 3: Initiate auth to get session token
      const authResponse = await cognitoClient.send(new AdminInitiateAuthCommand({
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
        const tokenResponse = await cognitoClient.send(new AssociateSoftwareTokenCommand({
          Session: sessionToken
        }));

        sessionToken = tokenResponse.Session || '';
        logger.info('Software token associated', { username });
      }

      // Step 5: Get user ID from Cognito
      const userId = username;

      // Step 6: Start autonomous workflow
      const workflowState = await ProductionWorkflowService.startAutomatedWorkflow(
        email,
        userId,
        sessionToken || accessToken
      );

      const response: StartWorkflowResponse = {
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
    } catch (error: any) {
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
  } catch (error: any) {
    logger.error('Unexpected error', { error: error.message });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
