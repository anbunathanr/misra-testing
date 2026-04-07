import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * Lambda handler for GET /api/executions/suites/{suiteExecutionId}
 * Retrieves detailed results for a test suite execution including aggregate statistics
 * and individual test case results.
 */
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
