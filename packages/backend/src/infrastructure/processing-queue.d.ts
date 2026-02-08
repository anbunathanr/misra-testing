/**
 * AWS CDK infrastructure definition for File Processing SQS Queue
 */
import { Construct } from 'constructs';
import { Queue } from 'aws-cdk-lib/aws-sqs';
export declare class ProcessingQueue extends Construct {
    readonly queue: Queue;
    readonly deadLetterQueue: Queue;
    constructor(scope: Construct, id: string, props?: {
        environment?: string;
    });
    /**
     * Grant send message permissions to a principal
     */
    grantSendMessages(grantee: any): import("aws-cdk-lib/aws-iam").Grant;
    /**
     * Grant consume message permissions to a principal
     */
    grantConsumeMessages(grantee: any): import("aws-cdk-lib/aws-iam").Grant;
    /**
     * Grant full access to the queue
     */
    grantFullAccess(grantee: any): Queue;
}
