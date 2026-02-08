"use strict";
/**
 * Processing Queue Service
 * Manages SQS queue operations for file processing jobs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingQueueService = void 0;
const client_sqs_1 = require("@aws-sdk/client-sqs");
class ProcessingQueueService {
    sqsClient;
    queueUrl;
    constructor() {
        this.sqsClient = new client_sqs_1.SQSClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
        this.queueUrl = process.env.PROCESSING_QUEUE_URL || '';
        if (!this.queueUrl) {
            console.warn('PROCESSING_QUEUE_URL not configured');
        }
    }
    /**
     * Send a processing job to the queue
     */
    async sendJob(job) {
        try {
            const command = new client_sqs_1.SendMessageCommand({
                QueueUrl: this.queueUrl,
                MessageBody: JSON.stringify(job),
                MessageAttributes: {
                    jobType: {
                        DataType: 'String',
                        StringValue: job.jobType,
                    },
                    priority: {
                        DataType: 'String',
                        StringValue: job.priority,
                    },
                    userId: {
                        DataType: 'String',
                        StringValue: job.userId,
                    },
                    organizationId: {
                        DataType: 'String',
                        StringValue: job.organizationId,
                    },
                },
                // Delay delivery for low priority jobs
                DelaySeconds: job.priority === 'low' ? 30 : 0,
            });
            const response = await this.sqsClient.send(command);
            return response.MessageId || '';
        }
        catch (error) {
            console.error('Error sending job to queue:', error);
            throw new Error('Failed to queue processing job');
        }
    }
    /**
     * Send multiple jobs in batch (up to 10 at a time)
     */
    async sendJobBatch(jobs) {
        if (jobs.length === 0) {
            return [];
        }
        if (jobs.length > 10) {
            throw new Error('Batch size cannot exceed 10 messages');
        }
        try {
            const entries = jobs.map((job, index) => ({
                Id: `${index}`,
                MessageBody: JSON.stringify(job),
                MessageAttributes: {
                    jobType: {
                        DataType: 'String',
                        StringValue: job.jobType,
                    },
                    priority: {
                        DataType: 'String',
                        StringValue: job.priority,
                    },
                    userId: {
                        DataType: 'String',
                        StringValue: job.userId,
                    },
                    organizationId: {
                        DataType: 'String',
                        StringValue: job.organizationId,
                    },
                },
                DelaySeconds: job.priority === 'low' ? 30 : 0,
            }));
            const command = new client_sqs_1.SendMessageBatchCommand({
                QueueUrl: this.queueUrl,
                Entries: entries,
            });
            const response = await this.sqsClient.send(command);
            return response.Successful?.map(s => s.MessageId || '') || [];
        }
        catch (error) {
            console.error('Error sending batch jobs to queue:', error);
            throw new Error('Failed to queue batch processing jobs');
        }
    }
    /**
     * Receive messages from the queue
     */
    async receiveJobs(maxMessages = 1) {
        try {
            const command = new client_sqs_1.ReceiveMessageCommand({
                QueueUrl: this.queueUrl,
                MaxNumberOfMessages: Math.min(maxMessages, 10), // SQS max is 10
                WaitTimeSeconds: 20, // Long polling
                MessageAttributeNames: ['All'],
                AttributeNames: ['All'],
            });
            const response = await this.sqsClient.send(command);
            if (!response.Messages || response.Messages.length === 0) {
                return [];
            }
            return response.Messages.map(msg => ({
                messageId: msg.MessageId || '',
                receiptHandle: msg.ReceiptHandle || '',
                body: JSON.parse(msg.Body || '{}'),
                attributes: msg.Attributes,
            }));
        }
        catch (error) {
            console.error('Error receiving jobs from queue:', error);
            throw new Error('Failed to receive processing jobs');
        }
    }
    /**
     * Delete a message from the queue after successful processing
     */
    async deleteJob(receiptHandle) {
        try {
            const command = new client_sqs_1.DeleteMessageCommand({
                QueueUrl: this.queueUrl,
                ReceiptHandle: receiptHandle,
            });
            await this.sqsClient.send(command);
        }
        catch (error) {
            console.error('Error deleting job from queue:', error);
            throw new Error('Failed to delete processing job');
        }
    }
    /**
     * Create a processing job from file upload
     */
    createJobFromUpload(fileId, fileName, fileSize, s3Key, userId, organizationId, jobType = 'misra-analysis', priority = 'normal') {
        return {
            jobId: `job-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            fileId,
            fileName,
            fileSize,
            s3Key,
            userId,
            organizationId,
            jobType,
            priority,
            createdAt: Date.now(),
        };
    }
    /**
     * Get queue URL
     */
    getQueueUrl() {
        return this.queueUrl;
    }
    /**
     * Check if queue is configured
     */
    isConfigured() {
        return !!this.queueUrl;
    }
}
exports.ProcessingQueueService = ProcessingQueueService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc2luZy1xdWV1ZS1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicHJvY2Vzc2luZy1xdWV1ZS1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUVILG9EQUF5STtBQXVCekksTUFBYSxzQkFBc0I7SUFDekIsU0FBUyxDQUFXO0lBQ3BCLFFBQVEsQ0FBUTtJQUV4QjtRQUNFLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDO1lBQzdCLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsSUFBSSxFQUFFLENBQUE7UUFFdEQsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQixPQUFPLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxDQUFDLENBQUE7UUFDckQsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBa0I7UUFDOUIsSUFBSSxDQUFDO1lBQ0gsTUFBTSxPQUFPLEdBQUcsSUFBSSwrQkFBa0IsQ0FBQztnQkFDckMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO2dCQUN2QixXQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUM7Z0JBQ2hDLGlCQUFpQixFQUFFO29CQUNqQixPQUFPLEVBQUU7d0JBQ1AsUUFBUSxFQUFFLFFBQVE7d0JBQ2xCLFdBQVcsRUFBRSxHQUFHLENBQUMsT0FBTztxQkFDekI7b0JBQ0QsUUFBUSxFQUFFO3dCQUNSLFFBQVEsRUFBRSxRQUFRO3dCQUNsQixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVE7cUJBQzFCO29CQUNELE1BQU0sRUFBRTt3QkFDTixRQUFRLEVBQUUsUUFBUTt3QkFDbEIsV0FBVyxFQUFFLEdBQUcs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cm9jZXNzaW5nIFF1ZXVlIFNlcnZpY2VcclxuICogTWFuYWdlcyBTUVMgcXVldWUgb3BlcmF0aW9ucyBmb3IgZmlsZSBwcm9jZXNzaW5nIGpvYnNcclxuICovXHJcblxyXG5pbXBvcnQgeyBTUVNDbGllbnQsIFNlbmRNZXNzYWdlQ29tbWFuZCwgU2VuZE1lc3NhZ2VCYXRjaENvbW1hbmQsIFJlY2VpdmVNZXNzYWdlQ29tbWFuZCwgRGVsZXRlTWVzc2FnZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc3FzJ1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQcm9jZXNzaW5nSm9iIHtcclxuICBqb2JJZDogc3RyaW5nXHJcbiAgZmlsZUlkOiBzdHJpbmdcclxuICBmaWxlTmFtZTogc3RyaW5nXHJcbiAgZmlsZVNpemU6IG51bWJlclxyXG4gIHMzS2V5OiBzdHJpbmdcclxuICB1c2VySWQ6IHN0cmluZ1xyXG4gIG9yZ2FuaXphdGlvbklkOiBzdHJpbmdcclxuICBqb2JUeXBlOiAnbWlzcmEtYW5hbHlzaXMnIHwgJ3JlZ3Jlc3Npb24tdGVzdCcgfCAnYm90aCdcclxuICBwcmlvcml0eTogJ2hpZ2gnIHwgJ25vcm1hbCcgfCAnbG93J1xyXG4gIG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55PlxyXG4gIGNyZWF0ZWRBdDogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUXVldWVNZXNzYWdlIHtcclxuICBtZXNzYWdlSWQ6IHN0cmluZ1xyXG4gIHJlY2VpcHRIYW5kbGU6IHN0cmluZ1xyXG4gIGJvZHk6IFByb2Nlc3NpbmdKb2JcclxuICBhdHRyaWJ1dGVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUHJvY2Vzc2luZ1F1ZXVlU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBzcXNDbGllbnQ6IFNRU0NsaWVudFxyXG4gIHByaXZhdGUgcXVldWVVcmw6IHN0cmluZ1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuc3FzQ2xpZW50ID0gbmV3IFNRU0NsaWVudCh7XHJcbiAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxuICAgIH0pXHJcbiAgICB0aGlzLnF1ZXVlVXJsID0gcHJvY2Vzcy5lbnYuUFJPQ0VTU0lOR19RVUVVRV9VUkwgfHwgJydcclxuXHJcbiAgICBpZiAoIXRoaXMucXVldWVVcmwpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdQUk9DRVNTSU5HX1FVRVVFX1VSTCBub3QgY29uZmlndXJlZCcpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZW5kIGEgcHJvY2Vzc2luZyBqb2IgdG8gdGhlIHF1ZXVlXHJcbiAgICovXHJcbiAgYXN5bmMgc2VuZEpvYihqb2I6IFByb2Nlc3NpbmdKb2IpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBTZW5kTWVzc2FnZUNvbW1hbmQoe1xyXG4gICAgICAgIFF1ZXVlVXJsOiB0aGlzLnF1ZXVlVXJsLFxyXG4gICAgICAgIE1lc3NhZ2VCb2R5OiBKU09OLnN0cmluZ2lmeShqb2IpLFxyXG4gICAgICAgIE1lc3NhZ2VBdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgICBqb2JUeXBlOiB7XHJcbiAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgU3RyaW5nVmFsdWU6IGpvYi5qb2JUeXBlLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHByaW9yaXR5OiB7XHJcbiAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgU3RyaW5nVmFsdWU6IGpvYi5wcmlvcml0eSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB1c2VySWQ6IHtcclxuICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICAgICAgICBTdHJpbmdWYWx1ZTogam9iLnVzZXJJZCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBvcmdhbml6YXRpb25JZDoge1xyXG4gICAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXHJcbiAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiBqb2Iub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gRGVsYXkgZGVsaXZlcnkgZm9yIGxvdyBwcmlvcml0eSBqb2JzXHJcbiAgICAgICAgRGVsYXlTZWNvbmRzOiBqb2IucHJpb3JpdHkgPT09ICdsb3cnID8gMzAgOiAwLFxyXG4gICAgICB9KVxyXG5cclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnNxc0NsaWVudC5zZW5kKGNvbW1hbmQpXHJcbiAgICAgIHJldHVybiByZXNwb25zZS5NZXNzYWdlSWQgfHwgJydcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNlbmRpbmcgam9iIHRvIHF1ZXVlOicsIGVycm9yKVxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBxdWV1ZSBwcm9jZXNzaW5nIGpvYicpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZW5kIG11bHRpcGxlIGpvYnMgaW4gYmF0Y2ggKHVwIHRvIDEwIGF0IGEgdGltZSlcclxuICAgKi9cclxuICBhc3luYyBzZW5kSm9iQmF0Y2goam9iczogUHJvY2Vzc2luZ0pvYltdKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xyXG4gICAgaWYgKGpvYnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiBbXVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChqb2JzLmxlbmd0aCA+IDEwKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignQmF0Y2ggc2l6ZSBjYW5ub3QgZXhjZWVkIDEwIG1lc3NhZ2VzJylcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBlbnRyaWVzID0gam9icy5tYXAoKGpvYiwgaW5kZXgpID0+ICh7XHJcbiAgICAgICAgSWQ6IGAke2luZGV4fWAsXHJcbiAgICAgICAgTWVzc2FnZUJvZHk6IEpTT04uc3RyaW5naWZ5KGpvYiksXHJcbiAgICAgICAgTWVzc2FnZUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAgIGpvYlR5cGU6IHtcclxuICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICAgICAgICBTdHJpbmdWYWx1ZTogam9iLmpvYlR5cGUsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgcHJpb3JpdHk6IHtcclxuICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICAgICAgICBTdHJpbmdWYWx1ZTogam9iLnByaW9yaXR5LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHVzZXJJZDoge1xyXG4gICAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXHJcbiAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiBqb2IudXNlcklkLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIG9yZ2FuaXphdGlvbklkOiB7XHJcbiAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgU3RyaW5nVmFsdWU6IGpvYi5vcmdhbml6YXRpb25JZCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICBEZWxheVNlY29uZHM6IGpvYi5wcmlvcml0eSA9PT0gJ2xvdycgPyAzMCA6IDAsXHJcbiAgICAgIH0pKVxyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBTZW5kTWVzc2FnZUJhdGNoQ29tbWFuZCh7XHJcbiAgICAgICAgUXVldWVVcmw6IHRoaXMucXVldWVVcmwsXHJcbiAgICAgICAgRW50cmllczogZW50cmllcyxcclxuICAgICAgfSlcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5zcXNDbGllbnQuc2VuZChjb21tYW5kKVxyXG4gICAgICByZXR1cm4gcmVzcG9uc2UuU3VjY2Vzc2Z1bD8ubWFwKHMgPT4gcy5NZXNzYWdlSWQgfHwgJycpIHx8IFtdXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzZW5kaW5nIGJhdGNoIGpvYnMgdG8gcXVldWU6JywgZXJyb3IpXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHF1ZXVlIGJhdGNoIHByb2Nlc3Npbmcgam9icycpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZWNlaXZlIG1lc3NhZ2VzIGZyb20gdGhlIHF1ZXVlXHJcbiAgICovXHJcbiAgYXN5bmMgcmVjZWl2ZUpvYnMobWF4TWVzc2FnZXM6IG51bWJlciA9IDEpOiBQcm9taXNlPFF1ZXVlTWVzc2FnZVtdPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFJlY2VpdmVNZXNzYWdlQ29tbWFuZCh7XHJcbiAgICAgICAgUXVldWVVcmw6IHRoaXMucXVldWVVcmwsXHJcbiAgICAgICAgTWF4TnVtYmVyT2ZNZXNzYWdlczogTWF0aC5taW4obWF4TWVzc2FnZXMsIDEwKSwgLy8gU1FTIG1heCBpcyAxMFxyXG4gICAgICAgIFdhaXRUaW1lU2Vjb25kczogMjAsIC8vIExvbmcgcG9sbGluZ1xyXG4gICAgICAgIE1lc3NhZ2VBdHRyaWJ1dGVOYW1lczogWydBbGwnXSxcclxuICAgICAgICBBdHRyaWJ1dGVOYW1lczogWydBbGwnXSxcclxuICAgICAgfSlcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5zcXNDbGllbnQuc2VuZChjb21tYW5kKVxyXG4gICAgICBcclxuICAgICAgaWYgKCFyZXNwb25zZS5NZXNzYWdlcyB8fCByZXNwb25zZS5NZXNzYWdlcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm4gW11cclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHJlc3BvbnNlLk1lc3NhZ2VzLm1hcChtc2cgPT4gKHtcclxuICAgICAgICBtZXNzYWdlSWQ6IG1zZy5NZXNzYWdlSWQgfHwgJycsXHJcbiAgICAgICAgcmVjZWlwdEhhbmRsZTogbXNnLlJlY2VpcHRIYW5kbGUgfHwgJycsXHJcbiAgICAgICAgYm9keTogSlNPTi5wYXJzZShtc2cuQm9keSB8fCAne30nKSBhcyBQcm9jZXNzaW5nSm9iLFxyXG4gICAgICAgIGF0dHJpYnV0ZXM6IG1zZy5BdHRyaWJ1dGVzLFxyXG4gICAgICB9KSlcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHJlY2VpdmluZyBqb2JzIGZyb20gcXVldWU6JywgZXJyb3IpXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHJlY2VpdmUgcHJvY2Vzc2luZyBqb2JzJylcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERlbGV0ZSBhIG1lc3NhZ2UgZnJvbSB0aGUgcXVldWUgYWZ0ZXIgc3VjY2Vzc2Z1bCBwcm9jZXNzaW5nXHJcbiAgICovXHJcbiAgYXN5bmMgZGVsZXRlSm9iKHJlY2VpcHRIYW5kbGU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBEZWxldGVNZXNzYWdlQ29tbWFuZCh7XHJcbiAgICAgICAgUXVldWVVcmw6IHRoaXMucXVldWVVcmwsXHJcbiAgICAgICAgUmVjZWlwdEhhbmRsZTogcmVjZWlwdEhhbmRsZSxcclxuICAgICAgfSlcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuc3FzQ2xpZW50LnNlbmQoY29tbWFuZClcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGRlbGV0aW5nIGpvYiBmcm9tIHF1ZXVlOicsIGVycm9yKVxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBkZWxldGUgcHJvY2Vzc2luZyBqb2InKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGEgcHJvY2Vzc2luZyBqb2IgZnJvbSBmaWxlIHVwbG9hZFxyXG4gICAqL1xyXG4gIGNyZWF0ZUpvYkZyb21VcGxvYWQoXHJcbiAgICBmaWxlSWQ6IHN0cmluZyxcclxuICAgIGZpbGVOYW1lOiBzdHJpbmcsXHJcbiAgICBmaWxlU2l6ZTogbnVtYmVyLFxyXG4gICAgczNLZXk6IHN0cmluZyxcclxuICAgIHVzZXJJZDogc3RyaW5nLFxyXG4gICAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZyxcclxuICAgIGpvYlR5cGU6IFByb2Nlc3NpbmdKb2JbJ2pvYlR5cGUnXSA9ICdtaXNyYS1hbmFseXNpcycsXHJcbiAgICBwcmlvcml0eTogUHJvY2Vzc2luZ0pvYlsncHJpb3JpdHknXSA9ICdub3JtYWwnXHJcbiAgKTogUHJvY2Vzc2luZ0pvYiB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBqb2JJZDogYGpvYi0ke0RhdGUubm93KCl9LSR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpfWAsXHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAgZmlsZU5hbWUsXHJcbiAgICAgIGZpbGVTaXplLFxyXG4gICAgICBzM0tleSxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBvcmdhbml6YXRpb25JZCxcclxuICAgICAgam9iVHlwZSxcclxuICAgICAgcHJpb3JpdHksXHJcbiAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBxdWV1ZSBVUkxcclxuICAgKi9cclxuICBnZXRRdWV1ZVVybCgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHRoaXMucXVldWVVcmxcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIHF1ZXVlIGlzIGNvbmZpZ3VyZWRcclxuICAgKi9cclxuICBpc0NvbmZpZ3VyZWQoKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gISF0aGlzLnF1ZXVlVXJsXHJcbiAgfVxyXG59XHJcbiJdfQ==