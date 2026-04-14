import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
export declare class SampleFilesTable extends Construct {
    readonly table: Table;
    constructor(scope: Construct, id: string);
}
