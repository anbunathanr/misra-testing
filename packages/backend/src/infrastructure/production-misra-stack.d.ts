import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
export interface ProductionMisraStackProps extends cdk.StackProps {
    environment: 'dev' | 'staging' | 'production';
    domainName?: string;
    certificateArn?: string;
}
export declare class ProductionMisraStack extends cdk.Stack {
    userPool: cognito.UserPool;
    userPoolClient: cognito.UserPoolClient;
    api: apigateway.RestApi;
    filesBucket: s3.Bucket;
    kmsKey: kms.Key;
    usersTable: dynamodb.Table;
    fileMetadataTable: dynamodb.Table;
    analysisResultsTable: dynamodb.Table;
    sampleFilesTable: dynamodb.Table;
    progressTable: dynamodb.Table;
    authorizerFunction: lambda.Function;
    jwtSecret: secretsmanager.Secret;
    constructor(scope: Construct, id: string, props: ProductionMisraStackProps);
    private createDynamoDBTables;
    private createS3Bucket;
    private createCognitoUserPool;
    private createApiGateway;
    private createApiEndpoints;
    private createSecrets;
    private createLambdaFunctions;
    private createOutputs;
}
