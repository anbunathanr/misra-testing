"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const sqsClient = process.env.NODE_ENV === 'production'
    ? new client_sqs_1.SQSClient({ region: process.env.AWS_REGION || 'us-east-1' })
    : {};
const handler = async (event) => {
    console.log('S3 upload complete event received:', JSON.stringify(event, null, 2));
    for (const record of event.Records) {
        try {
            const bucketName = record.s3.bucket.name;
            const s3Key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
            const fileSize = record.s3.object.size;
            console.log(`Processing file upload: ${s3Key} (${fileSize} bytes)`);
            // Extract metadata from S3 key structure
            // Expected format: uploads/{organizationId}/{userId}/{timestamp}-{fileId}-{filename}
            const keyParts = s3Key.split('/');
            if (keyParts.length < 4 || keyParts[0] !== 'uploads') {
                console.warn(`Unexpected S3 key format: ${s3Key}`);
                continue;
            }
            const organizationId = keyParts[1];
            const userId = keyParts[2];
            const filenamePart = keyParts[3];
            // Extract fileId from filename part
            const filenameParts = filenamePart.split('-');
            if (filenameParts.length < 3) {
                console.warn(`Unexpected filename format: ${filenamePart}`);
                continue;
            }
            const uploadTimestamp = filenameParts[0];
            const fileId = filenameParts[1];
            const originalFilename = filenameParts.slice(2).join('-');
            // Create processing message
            const processingMessage = {
                fileId,
                s3Key,
                bucketName,
                fileName: originalFilename,
                fileSize,
                userId,
                organizationId,
                uploadTimestamp,
            };
            // Send message to processing queue
            if (process.env.NODE_ENV === 'production') {
                const queueUrl = process.env.PROCESSING_QUEUE_URL;
                if (!queueUrl) {
                    throw new Error('PROCESSING_QUEUE_URL environment variable not set');
                }
                const command = new client_sqs_1.SendMessageCommand({
                    QueueUrl: queueUrl,
                    MessageBody: JSON.stringify(processingMessage),
                    MessageAttributes: {
                        'file-type': {
                            DataType: 'String',
                            StringValue: getFileType(originalFilename),
                        },
                        'organization-id': {
                            DataType: 'String',
                            StringValue: organizationId,
                        },
                        'user-id': {
                            DataType: 'String',
                            StringValue: userId,
                        },
                    },
                });
                await sqsClient.send(command);
                console.log(`Sent processing message for file ${fileId} to queue`);
            }
            else {
                console.log('Development mode: Mock processing message sent:', processingMessage);
            }
        }
        catch (error) {
            console.error('Error processing S3 upload event:', error);
            // Don't throw - we want to continue processing other records
        }
    }
};
exports.handler = handler;
function getFileType(filename) {
    const extension = filename.toLowerCase().split('.').pop() || '';
    switch (extension) {
        case 'c':
            return 'C';
        case 'cpp':
        case 'cc':
        case 'cxx':
            return 'CPP';
        case 'h':
        case 'hpp':
        case 'hxx':
            return 'HEADER';
        default:
            return 'UNKNOWN';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBsb2FkLWNvbXBsZXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBsb2FkLWNvbXBsZXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9EQUFvRTtBQW9CcEUsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEtBQUssWUFBWTtJQUNyRCxDQUFDLENBQUMsSUFBSSxzQkFBUyxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO0lBQ2xFLENBQUMsQ0FBQyxFQUFlLENBQUM7QUFFYixNQUFNLE9BQU8sR0FBYyxLQUFLLEVBQUUsS0FBYyxFQUFFLEVBQUU7SUFDekQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVsRixLQUFLLE1BQU0sTUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNuQyxJQUFJLENBQUM7WUFDSCxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDekMsTUFBTSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMzRSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFFdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsS0FBSyxLQUFLLFFBQVEsU0FBUyxDQUFDLENBQUM7WUFFcEUseUNBQXlDO1lBQ3pDLHFGQUFxRjtZQUNyRixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2xDLElB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QUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFFaEUsUUFBUSxTQUFTLEVBQUUsQ0FBQztRQUNsQixLQUFLLEdBQUc7WUFDTixPQUFPLEdBQUcsQ0FBQztRQUNiLEtBQUssS0FBSyxDQUFDO1FBQ1gsS0FBSyxJQUFJLENBQUM7UUFDVixLQUFLLEtBQUs7WUFDUixPQUFPLEtBQUssQ0FBQztRQUNmLEtBQUssR0FBRyxDQUFDO1FBQ1QsS0FBSyxLQUFLLENBQUM7UUFDWCxLQUFLLEtBQUs7WUFDUixPQUFPLFFBQVEsQ0FBQztRQUNsQjtZQUNFLE9BQU8sU0FBUyxDQUFDO0lBQ3JCLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUzNFdmVudCwgUzNIYW5kbGVyIH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFNRU0NsaWVudCwgU2VuZE1lc3NhZ2VDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXNxcyc7XHJcblxyXG4vLyBNb2NrIEFXUyBTREsgZm9yIGRldmVsb3BtZW50XHJcbmRlY2xhcmUgY29uc3QgcHJvY2Vzczoge1xyXG4gIGVudjoge1xyXG4gICAgW2tleTogc3RyaW5nXTogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gIH07XHJcbn07XHJcblxyXG5pbnRlcmZhY2UgRmlsZVByb2Nlc3NpbmdNZXNzYWdlIHtcclxuICBmaWxlSWQ6IHN0cmluZztcclxuICBzM0tleTogc3RyaW5nO1xyXG4gIGJ1Y2tldE5hbWU6IHN0cmluZztcclxuICBmaWxlTmFtZTogc3RyaW5nO1xyXG4gIGZpbGVTaXplOiBudW1iZXI7XHJcbiAgdXNlcklkOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZztcclxuICB1cGxvYWRUaW1lc3RhbXA6IHN0cmluZztcclxufVxyXG5cclxuY29uc3Qgc3FzQ2xpZW50ID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdwcm9kdWN0aW9uJyBcclxuICA/IG5ldyBTUVNDbGllbnQoeyByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgfSlcclxuICA6IHt9IGFzIFNRU0NsaWVudDtcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyOiBTM0hhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IFMzRXZlbnQpID0+IHtcclxuICBjb25zb2xlLmxvZygnUzMgdXBsb2FkIGNvbXBsZXRlIGV2ZW50IHJlY2VpdmVkOicsIEpTT04uc3RyaW5naWZ5KGV2ZW50LCBudWxsLCAyKSk7XHJcblxyXG4gIGZvciAoY29uc3QgcmVjb3JkIG9mIGV2ZW50LlJlY29yZHMpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGJ1Y2tldE5hbWUgPSByZWNvcmQuczMuYnVja2V0Lm5hbWU7XHJcbiAgICAgIGNvbnN0IHMzS2V5ID0gZGVjb2RlVVJJQ29tcG9uZW50KHJlY29yZC5zMy5vYmplY3Qua2V5LnJlcGxhY2UoL1xcKy9nLCAnICcpKTtcclxuICAgICAgY29uc3QgZmlsZVNpemUgPSByZWNvcmQuczMub2JqZWN0LnNpemU7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyBmaWxlIHVwbG9hZDogJHtzM0tleX0gKCR7ZmlsZVNpemV9IGJ5dGVzKWApO1xyXG5cclxuICAgICAgLy8gRXh0cmFjdCBtZXRhZGF0YSBmcm9tIFMzIGtleSBzdHJ1Y3R1cmVcclxuICAgICAgLy8gRXhwZWN0ZWQgZm9ybWF0OiB1cGxvYWRzL3tvcmdhbml6YXRpb25JZH0ve3VzZXJJZH0ve3RpbWVzdGFtcH0te2ZpbGVJZH0te2ZpbGVuYW1lfVxyXG4gICAgICBjb25zdCBrZXlQYXJ0cyA9IHMzS2V5LnNwbGl0KCcvJyk7XHJcbiAgICAgIGlmIChrZXlQYXJ0cy5sZW5ndGggPCA0IHx8IGtleVBhcnRzWzBdICE9PSAndXBsb2FkcycpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oYFVuZXhwZWN0ZWQgUzMga2V5IGZvcm1hdDogJHtzM0tleX1gKTtcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3Qgb3JnYW5pemF0aW9uSWQgPSBrZXlQYXJ0c1sxXTtcclxuICAgICAgY29uc3QgdXNlcklkID0ga2V5UGFydHNbMl07XHJcbiAgICAgIGNvbnN0IGZpbGVuYW1lUGFydCA9IGtleVBhcnRzWzNdO1xyXG4gICAgICBcclxuICAgICAgLy8gRXh0cmFjdCBmaWxlSWQgZnJvbSBmaWxlbmFtZSBwYXJ0XHJcbiAgICAgIGNvbnN0IGZpbGVuYW1lUGFydHMgPSBmaWxlbmFtZVBhcnQuc3BsaXQoJy0nKTtcclxuICAgICAgaWYgKGZpbGVuYW1lUGFydHMubGVuZ3RoIDwgMykge1xyXG4gICAgICAgIGNvbnNvbGUud2FybihgVW5leHBlY3RlZCBmaWxlbmFtZSBmb3JtYXQ6ICR7ZmlsZW5hbWVQYXJ0fWApO1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCB1cGxvYWRUaW1lc3RhbXAgPSBmaWxlbmFtZVBhcnRzWzBdO1xyXG4gICAgICBjb25zdCBmaWxlSWQgPSBmaWxlbmFtZVBhcnRzWzFdO1xyXG4gICAgICBjb25zdCBvcmlnaW5hbEZpbGVuYW1lID0gZmlsZW5hbWVQYXJ0cy5zbGljZSgyKS5qb2luKCctJyk7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgcHJvY2Vzc2luZyBtZXNzYWdlXHJcbiAgICAgIGNvbnN0IHByb2Nlc3NpbmdNZXNzYWdlOiBGaWxlUHJvY2Vzc2luZ01lc3NhZ2UgPSB7XHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIHMzS2V5LFxyXG4gICAgICAgIGJ1Y2tldE5hbWUsXHJcbiAgICAgICAgZmlsZU5hbWU6IG9yaWdpbmFsRmlsZW5hbWUsXHJcbiAgICAgICAgZmlsZVNpemUsXHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgIHVwbG9hZFRpbWVzdGFtcCxcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIFNlbmQgbWVzc2FnZSB0byBwcm9jZXNzaW5nIHF1ZXVlXHJcbiAgICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Byb2R1Y3Rpb24nKSB7XHJcbiAgICAgICAgY29uc3QgcXVldWVVcmwgPSBwcm9jZXNzLmVudi5QUk9DRVNTSU5HX1FVRVVFX1VSTDtcclxuICAgICAgICBpZiAoIXF1ZXVlVXJsKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BST0NFU1NJTkdfUVVFVUVfVVJMIGVudmlyb25tZW50IHZhcmlhYmxlIG5vdCBzZXQnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgU2VuZE1lc3NhZ2VDb21tYW5kKHtcclxuICAgICAgICAgIFF1ZXVlVXJsOiBxdWV1ZVVybCxcclxuICAgICAgICAgIE1lc3NhZ2VCb2R5OiBKU09OLnN0cmluZ2lmeShwcm9jZXNzaW5nTWVzc2FnZSksXHJcbiAgICAgICAgICBNZXNzYWdlQXR0cmlidXRlczoge1xyXG4gICAgICAgICAgICAnZmlsZS10eXBlJzoge1xyXG4gICAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgICBTdHJpbmdWYWx1ZTogZ2V0RmlsZVR5cGUob3JpZ2luYWxGaWxlbmFtZSksXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICdvcmdhbml6YXRpb24taWQnOiB7XHJcbiAgICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiBvcmdhbml6YXRpb25JZCxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgJ3VzZXItaWQnOiB7XHJcbiAgICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiB1c2VySWQsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBhd2FpdCBzcXNDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgU2VudCBwcm9jZXNzaW5nIG1lc3NhZ2UgZm9yIGZpbGUgJHtmaWxlSWR9IHRvIHF1ZXVlYCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ0RldmVsb3BtZW50IG1vZGU6IE1vY2sgcHJvY2Vzc2luZyBtZXNzYWdlIHNlbnQ6JywgcHJvY2Vzc2luZ01lc3NhZ2UpO1xyXG4gICAgICB9XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcHJvY2Vzc2luZyBTMyB1cGxvYWQgZXZlbnQ6JywgZXJyb3IpO1xyXG4gICAgICAvLyBEb24ndCB0aHJvdyAtIHdlIHdhbnQgdG8gY29udGludWUgcHJvY2Vzc2luZyBvdGhlciByZWNvcmRzXHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuZnVuY3Rpb24gZ2V0RmlsZVR5cGUoZmlsZW5hbWU6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgY29uc3QgZXh0ZW5zaW9uID0gZmlsZW5hbWUudG9Mb3dlckNhc2UoKS5zcGxpdCgnLicpLnBvcCgpIHx8ICcnO1xyXG4gIFxyXG4gIHN3aXRjaCAoZXh0ZW5zaW9uKSB7XHJcbiAgICBjYXNlICdjJzpcclxuICAgICAgcmV0dXJuICdDJztcclxuICAgIGNhc2UgJ2NwcCc6XHJcbiAgICBjYXNlICdjYyc6XHJcbiAgICBjYXNlICdjeHgnOlxyXG4gICAgICByZXR1cm4gJ0NQUCc7XHJcbiAgICBjYXNlICdoJzpcclxuICAgIGNhc2UgJ2hwcCc6XHJcbiAgICBjYXNlICdoeHgnOlxyXG4gICAgICByZXR1cm4gJ0hFQURFUic7XHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICByZXR1cm4gJ1VOS05PV04nO1xyXG4gIH1cclxufSJdfQ==