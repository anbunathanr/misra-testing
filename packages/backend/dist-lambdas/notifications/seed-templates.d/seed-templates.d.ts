/**
 * Template Seeding Lambda
 *
 * Seeds default notification templates into DynamoDB.
 * Can be triggered manually or during stack deployment via custom resource.
 */
import { Handler } from 'aws-lambda';
/**
 * Lambda handler for seeding default templates
 */
export declare const handler: Handler;
