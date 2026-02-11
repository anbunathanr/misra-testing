import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
export declare class ProjectsTable extends Construct {
    readonly table: dynamodb.Table;
    constructor(scope: Construct, id: string);
}
