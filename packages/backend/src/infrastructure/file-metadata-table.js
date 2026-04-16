"use strict";
/**
 * AWS CDK infrastructure definition for File Metadata DynamoDB table
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileMetadataTable = void 0;
const constructs_1 = require("constructs");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const dynamodb_config_1 = require("../config/dynamodb-config");
class FileMetadataTable extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const environment = props?.environment || 'dev';
        const tableName = `${dynamodb_config_1.FILE_METADATA_TABLE_CONFIG.tableName}-${environment}`;
        this.table = new aws_dynamodb_1.Table(this, 'FileMetadataTable', {
            tableName,
            partitionKey: {
                name: 'file_id',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            billingMode: aws_dynamodb_1.BillingMode.PAY_PER_REQUEST,
            removalPolicy: environment === 'prod' ? aws_cdk_lib_1.RemovalPolicy.RETAIN : aws_cdk_lib_1.RemovalPolicy.DESTROY,
            pointInTimeRecovery: environment === 'prod'
        });
        // Add Global Secondary Indexes
        this.table.addGlobalSecondaryIndex({
            indexName: 'UserIndex',
            partitionKey: {
                name: 'user_id',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'upload_timestamp',
                type: aws_dynamodb_1.AttributeType.NUMBER
            },
            projectionType: aws_dynamodb_1.ProjectionType.ALL
        });
        this.table.addGlobalSecondaryIndex({
            indexName: 'StatusIndex',
            partitionKey: {
                name: 'analysis_status',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'upload_timestamp',
                type: aws_dynamodb_1.AttributeType.NUMBER
            },
            projectionType: aws_dynamodb_1.ProjectionType.ALL
        });
        this.table.addGlobalSecondaryIndex({
            indexName: 'UserStatusIndex',
            partitionKey: {
                name: 'user_id',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'analysis_status',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            projectionType: aws_dynamodb_1.ProjectionType.ALL
        });
        this.table.node.addMetadata('Purpose', 'File metadata storage for MISRA testing');
        this.table.node.addMetadata('Environment', environment);
    }
    grantReadData(grantee) {
        return this.table.grantReadData(grantee);
    }
    grantWriteData(grantee) {
        return this.table.grantWriteData(grantee);
    }
    grantReadWriteData(grantee) {
        return this.table.grantReadWriteData(grantee);
    }
    grantFullAccess(grantee) {
        return this.table.grantFullAccess(grantee);
    }
}
exports.FileMetadataTable = FileMetadataTable;
