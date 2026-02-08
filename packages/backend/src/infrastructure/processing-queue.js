"use strict";
/**
 * AWS CDK infrastructure definition for File Processing SQS Queue
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingQueue = void 0;
const constructs_1 = require("constructs");
const aws_sqs_1 = require("aws-cdk-lib/aws-sqs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class ProcessingQueue extends constructs_1.Construct {
    queue;
    deadLetterQueue;
    constructor(scope, id, props) {
        super(scope, id);
        const environment = props?.environment || 'dev';
        const queueName = `file-processing-queue-${environment}`;
        const dlqName = `file-processing-dlq-${environment}`;
        // Create Dead Letter Queue for failed messages
        this.deadLetterQueue = new aws_sqs_1.Queue(this, 'ProcessingDeadLetterQueue', {
            queueName: dlqName,
            encryption: aws_sqs_1.QueueEncryption.SQS_MANAGED,
            retentionPeriod: aws_cdk_lib_1.Duration.days(14), // Keep failed messages for 14 days
            removalPolicy: environment === 'prod' ? aws_cdk_lib_1.RemovalPolicy.RETAIN : aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        // Create main processing queue
        this.queue = new aws_sqs_1.Queue(this, 'ProcessingQueue', {
            queueName,
            // Encryption
            encryption: aws_sqs_1.QueueEncryption.SQS_MANAGED,
            // Message retention
            retentionPeriod: aws_cdk_lib_1.Duration.days(4), // Keep messages for 4 days
            // Visibility timeout (time Lambda has to process message)
            visibilityTimeout: aws_cdk_lib_1.Duration.minutes(15), // 15 minutes for processing
            // Receive message wait time (long polling)
            receiveMessageWaitTime: aws_cdk_lib_1.Duration.seconds(20),
            // Dead letter queue configuration
            deadLetterQueue: {
                queue: this.deadLetterQueue,
                maxReceiveCount: 3, // Retry 3 times before sending to DLQ
            },
            // Delivery delay
            deliveryDelay: aws_cdk_lib_1.Duration.seconds(0),
            // Message deduplication (for FIFO queues, not used here)
            // fifo: false,
            // Removal policy
            removalPolicy: environment === 'prod' ? aws_cdk_lib_1.RemovalPolicy.RETAIN : aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        // Add metadata tags
        this.queue.node.addMetadata('Purpose', 'File processing job queue');
        this.queue.node.addMetadata('Environment', environment);
        this.deadLetterQueue.node.addMetadata('Purpose', 'Failed file processing jobs');
        this.deadLetterQueue.node.addMetadata('Environment', environment);
    }
    /**
     * Grant send message permissions to a principal
     */
    grantSendMessages(grantee) {
        return this.queue.grantSendMessages(grantee);
    }
    /**
     * Grant consume message permissions to a principal
     */
    grantConsumeMessages(grantee) {
        return this.queue.grantConsumeMessages(grantee);
    }
    /**
     * Grant full access to the queue
     */
    grantFullAccess(grantee) {
        this.queue.grantSendMessages(grantee);
        this.queue.grantConsumeMessages(grantee);
        return this.queue;
    }
}
exports.ProcessingQueue = ProcessingQueue;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc2luZy1xdWV1ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByb2Nlc3NpbmctcXVldWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7QUFFSCwyQ0FBc0M7QUFDdEMsaURBQTZFO0FBQzdFLDZDQUFxRDtBQUVyRCxNQUFhLGVBQWdCLFNBQVEsc0JBQVM7SUFDNUIsS0FBSyxDQUFPO0lBQ1osZUFBZSxDQUFPO0lBRXRDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBZ0M7UUFDeEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVoQixNQUFNLFdBQVcsR0FBRyxLQUFLLEVBQUUsV0FBVyxJQUFJLEtBQUssQ0FBQTtRQUMvQyxNQUFNLFNBQVMsR0FBRyx5QkFBeUIsV0FBVyxFQUFFLENBQUE7UUFDeEQsTUFBTSxPQUFPLEdBQUcsdUJBQXVCLFdBQVcsRUFBRSxDQUFBO1FBRXBELCtDQUErQztRQUMvQyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksZUFBSyxDQUFDLElBQUksRUFBRSwyQkFBMkIsRUFBRTtZQUNsRSxTQUFTLEVBQUUsT0FBTztZQUNsQixVQUFVLEVBQUUseUJBQWUsQ0FBQyxXQUFXO1lBQ3ZDLGVBQWUsRUFBRSxzQkFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxtQ0FBbUM7WUFDdkUsYUFBYSxFQUFFLFdBQVcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLDJCQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQywyQkFBYSxDQUFDLE9BQU87U0FDckYsQ0FBQyxDQUFBO1FBRUYsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxlQUFLLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQzlDLFNBQVM7WUFFVCxhQUFhO1lBQ2IsVUFBVSxFQUFFLHlCQUFlLENBQUMsV0FBVztZQUV2QyxvQkFBb0I7WUFDcEIsZUFBZSxFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLDJCQUEyQjtZQUU5RCwwREFBMEQ7WUFDMUQsaUJBQWlCLEVBQUUsc0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsNEJBQTRCO1lBRXJFLDJDQUEyQztZQUMzQyxzQkFBc0IsRUFBRSxzQkFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFFNUMsa0NBQWtDO1lBQ2xDLGVBQWUsRUFBRTtnQkFDZixLQUFLLEVBQUUsSUFBSSxDQUFDLGVBQWU7Z0JBQzNCLGVBQWUsRUFBRSxDQUFDLEVBQUUsc0NBQXNDO2FBQzNEO1lBRUQsaUJBQWlCO1lBQ2pCLGFBQWEsRUFBRSxzQkFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFFbEMseURBQXlEO1lBQ3pELGVBQWU7WUFFZixpQkFBaUI7WUFDakIsYUFBYSxFQUFFLFdBQVcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLDJCQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQywyQkFBYSxDQUFDLE9BQU87U0FDckYsQ0FBQyxDQUFBO1FBRUYsb0JBQW9CO1FBQ3BCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsMkJBQTJCLENBQUMsQ0FBQTtRQUNuRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsNkJBQTZCLENBQUMsQ0FBQTtRQUMvRSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRDs7T0FFRztJQUNJLGlCQUFpQixDQUFDLE9BQVk7UUFDbkMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFRDs7T0FFRztJQUNJLG9CQUFvQixDQUFDLE9BQVk7UUFDdEMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ2pELENBQUM7SUFFRDs7T0FFRztJQUNJLGVBQWUsQ0FBQyxPQUFZO1FBQ2pDLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDckMsSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN4QyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDbkIsQ0FBQztDQUNGO0FBaEZELDBDQWdGQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBV1MgQ0RLIGluZnJhc3RydWN0dXJlIGRlZmluaXRpb24gZm9yIEZpbGUgUHJvY2Vzc2luZyBTUVMgUXVldWVcclxuICovXHJcblxyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xyXG5pbXBvcnQgeyBRdWV1ZSwgUXVldWVFbmNyeXB0aW9uLCBEZWFkTGV0dGVyUXVldWUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3FzJ1xyXG5pbXBvcnQgeyBEdXJhdGlvbiwgUmVtb3ZhbFBvbGljeSB9IGZyb20gJ2F3cy1jZGstbGliJ1xyXG5cclxuZXhwb3J0IGNsYXNzIFByb2Nlc3NpbmdRdWV1ZSBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IHF1ZXVlOiBRdWV1ZVxyXG4gIHB1YmxpYyByZWFkb25seSBkZWFkTGV0dGVyUXVldWU6IFF1ZXVlXHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogeyBlbnZpcm9ubWVudD86IHN0cmluZyB9KSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpXHJcblxyXG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBwcm9wcz8uZW52aXJvbm1lbnQgfHwgJ2RldidcclxuICAgIGNvbnN0IHF1ZXVlTmFtZSA9IGBmaWxlLXByb2Nlc3NpbmctcXVldWUtJHtlbnZpcm9ubWVudH1gXHJcbiAgICBjb25zdCBkbHFOYW1lID0gYGZpbGUtcHJvY2Vzc2luZy1kbHEtJHtlbnZpcm9ubWVudH1gXHJcblxyXG4gICAgLy8gQ3JlYXRlIERlYWQgTGV0dGVyIFF1ZXVlIGZvciBmYWlsZWQgbWVzc2FnZXNcclxuICAgIHRoaXMuZGVhZExldHRlclF1ZXVlID0gbmV3IFF1ZXVlKHRoaXMsICdQcm9jZXNzaW5nRGVhZExldHRlclF1ZXVlJywge1xyXG4gICAgICBxdWV1ZU5hbWU6IGRscU5hbWUsXHJcbiAgICAgIGVuY3J5cHRpb246IFF1ZXVlRW5jcnlwdGlvbi5TUVNfTUFOQUdFRCxcclxuICAgICAgcmV0ZW50aW9uUGVyaW9kOiBEdXJhdGlvbi5kYXlzKDE0KSwgLy8gS2VlcCBmYWlsZWQgbWVzc2FnZXMgZm9yIDE0IGRheXNcclxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/IFJlbW92YWxQb2xpY3kuUkVUQUlOIDogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBDcmVhdGUgbWFpbiBwcm9jZXNzaW5nIHF1ZXVlXHJcbiAgICB0aGlzLnF1ZXVlID0gbmV3IFF1ZXVlKHRoaXMsICdQcm9jZXNzaW5nUXVldWUnLCB7XHJcbiAgICAgIHF1ZXVlTmFtZSxcclxuICAgICAgXHJcbiAgICAgIC8vIEVuY3J5cHRpb25cclxuICAgICAgZW5jcnlwdGlvbjogUXVldWVFbmNyeXB0aW9uLlNRU19NQU5BR0VELFxyXG4gICAgICBcclxuICAgICAgLy8gTWVzc2FnZSByZXRlbnRpb25cclxuICAgICAgcmV0ZW50aW9uUGVyaW9kOiBEdXJhdGlvbi5kYXlzKDQpLCAvLyBLZWVwIG1lc3NhZ2VzIGZvciA0IGRheXNcclxuICAgICAgXHJcbiAgICAgIC8vIFZpc2liaWxpdHkgdGltZW91dCAodGltZSBMYW1iZGEgaGFzIHRvIHByb2Nlc3MgbWVzc2FnZSlcclxuICAgICAgdmlzaWJpbGl0eVRpbWVvdXQ6IER1cmF0aW9uLm1pbnV0ZXMoMTUpLCAvLyAxNSBtaW51dGVzIGZvciBwcm9jZXNzaW5nXHJcbiAgICAgIFxyXG4gICAgICAvLyBSZWNlaXZlIG1lc3NhZ2Ugd2FpdCB0aW1lIChsb25nIHBvbGxpbmcpXHJcbiAgICAgIHJlY2VpdmVNZXNzYWdlV2FpdFRpbWU6IER1cmF0aW9uLnNlY29uZHMoMjApLFxyXG4gICAgICBcclxuICAgICAgLy8gRGVhZCBsZXR0ZXIgcXVldWUgY29uZmlndXJhdGlvblxyXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcclxuICAgICAgICBxdWV1ZTogdGhpcy5kZWFkTGV0dGVyUXVldWUsXHJcbiAgICAgICAgbWF4UmVjZWl2ZUNvdW50OiAzLCAvLyBSZXRyeSAzIHRpbWVzIGJlZm9yZSBzZW5kaW5nIHRvIERMUVxyXG4gICAgICB9LFxyXG4gICAgICBcclxuICAgICAgLy8gRGVsaXZlcnkgZGVsYXlcclxuICAgICAgZGVsaXZlcnlEZWxheTogRHVyYXRpb24uc2Vjb25kcygwKSxcclxuICAgICAgXHJcbiAgICAgIC8vIE1lc3NhZ2UgZGVkdXBsaWNhdGlvbiAoZm9yIEZJRk8gcXVldWVzLCBub3QgdXNlZCBoZXJlKVxyXG4gICAgICAvLyBmaWZvOiBmYWxzZSxcclxuICAgICAgXHJcbiAgICAgIC8vIFJlbW92YWwgcG9saWN5XHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyBSZW1vdmFsUG9saWN5LlJFVEFJTiA6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pXHJcblxyXG4gICAgLy8gQWRkIG1ldGFkYXRhIHRhZ3NcclxuICAgIHRoaXMucXVldWUubm9kZS5hZGRNZXRhZGF0YSgnUHVycG9zZScsICdGaWxlIHByb2Nlc3Npbmcgam9iIHF1ZXVlJylcclxuICAgIHRoaXMucXVldWUubm9kZS5hZGRNZXRhZGF0YSgnRW52aXJvbm1lbnQnLCBlbnZpcm9ubWVudClcclxuICAgIHRoaXMuZGVhZExldHRlclF1ZXVlLm5vZGUuYWRkTWV0YWRhdGEoJ1B1cnBvc2UnLCAnRmFpbGVkIGZpbGUgcHJvY2Vzc2luZyBqb2JzJylcclxuICAgIHRoaXMuZGVhZExldHRlclF1ZXVlLm5vZGUuYWRkTWV0YWRhdGEoJ0Vudmlyb25tZW50JywgZW52aXJvbm1lbnQpXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHcmFudCBzZW5kIG1lc3NhZ2UgcGVybWlzc2lvbnMgdG8gYSBwcmluY2lwYWxcclxuICAgKi9cclxuICBwdWJsaWMgZ3JhbnRTZW5kTWVzc2FnZXMoZ3JhbnRlZTogYW55KSB7XHJcbiAgICByZXR1cm4gdGhpcy5xdWV1ZS5ncmFudFNlbmRNZXNzYWdlcyhncmFudGVlKVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JhbnQgY29uc3VtZSBtZXNzYWdlIHBlcm1pc3Npb25zIHRvIGEgcHJpbmNpcGFsXHJcbiAgICovXHJcbiAgcHVibGljIGdyYW50Q29uc3VtZU1lc3NhZ2VzKGdyYW50ZWU6IGFueSkge1xyXG4gICAgcmV0dXJuIHRoaXMucXVldWUuZ3JhbnRDb25zdW1lTWVzc2FnZXMoZ3JhbnRlZSlcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdyYW50IGZ1bGwgYWNjZXNzIHRvIHRoZSBxdWV1ZVxyXG4gICAqL1xyXG4gIHB1YmxpYyBncmFudEZ1bGxBY2Nlc3MoZ3JhbnRlZTogYW55KSB7XHJcbiAgICB0aGlzLnF1ZXVlLmdyYW50U2VuZE1lc3NhZ2VzKGdyYW50ZWUpXHJcbiAgICB0aGlzLnF1ZXVlLmdyYW50Q29uc3VtZU1lc3NhZ2VzKGdyYW50ZWUpXHJcbiAgICByZXR1cm4gdGhpcy5xdWV1ZVxyXG4gIH1cclxufVxyXG4iXX0=