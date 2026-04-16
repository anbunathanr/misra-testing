"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SampleFilesTable = void 0;
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class SampleFilesTable extends constructs_1.Construct {
    constructor(scope, id) {
        super(scope, id);
        this.table = new aws_dynamodb_1.Table(this, 'SampleFilesTable', {
            tableName: 'SampleFiles',
            partitionKey: {
                name: 'sample_id',
                type: aws_dynamodb_1.AttributeType.STRING,
            },
            billingMode: aws_dynamodb_1.BillingMode.PAY_PER_REQUEST,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.RETAIN,
            pointInTimeRecovery: true,
            encryption: aws_dynamodb_1.TableEncryption.AWS_MANAGED,
        });
        // Global Secondary Index for querying by language
        this.table.addGlobalSecondaryIndex({
            indexName: 'LanguageIndex',
            partitionKey: {
                name: 'language',
                type: aws_dynamodb_1.AttributeType.STRING,
            },
            sortKey: {
                name: 'difficulty_level',
                type: aws_dynamodb_1.AttributeType.STRING,
            },
        });
        // Global Secondary Index for querying by difficulty level
        this.table.addGlobalSecondaryIndex({
            indexName: 'DifficultyIndex',
            partitionKey: {
                name: 'difficulty_level',
                type: aws_dynamodb_1.AttributeType.STRING,
            },
            sortKey: {
                name: 'expected_violations',
                type: aws_dynamodb_1.AttributeType.NUMBER,
            },
        });
    }
}
exports.SampleFilesTable = SampleFilesTable;
