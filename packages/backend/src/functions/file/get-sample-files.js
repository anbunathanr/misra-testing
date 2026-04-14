"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const sample_file_service_1 = require("../../services/sample-file-service");
/**
 * Lambda function to get sample files from the library
 * Supports filtering by language and difficulty level
 */
const handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
    };
    try {
        // Handle preflight requests
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: '',
            };
        }
        const sampleFileService = new sample_file_service_1.SampleFileService();
        const queryParams = event.queryStringParameters || {};
        const language = queryParams.language;
        const difficultyLevel = queryParams.difficulty;
        let sampleFiles;
        if (language && difficultyLevel) {
            // Get files matching both criteria
            const allByLanguage = await sampleFileService.getSampleFilesByLanguage(language);
            sampleFiles = allByLanguage.filter(file => file.difficultyLevel === difficultyLevel);
        }
        else if (language) {
            sampleFiles = await sampleFileService.getSampleFilesByLanguage(language);
        }
        else if (difficultyLevel) {
            sampleFiles = await sampleFileService.getSampleFilesByDifficulty(difficultyLevel);
        }
        else {
            sampleFiles = await sampleFileService.getAllSampleFiles();
        }
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                samples: sampleFiles,
                count: sampleFiles.length,
            }),
        };
    }
    catch (error) {
        console.error('Error getting sample files:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to retrieve sample files',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXNhbXBsZS1maWxlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC1zYW1wbGUtZmlsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNEVBQXVFO0FBRXZFOzs7R0FHRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE1BQU0sT0FBTyxHQUFHO1FBQ2QsY0FBYyxFQUFFLGtCQUFrQjtRQUNsQyw2QkFBNkIsRUFBRSxHQUFHO1FBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjtRQUM1RCw4QkFBOEIsRUFBRSxhQUFhO0tBQzlDLENBQUM7SUFFRixJQUFJLENBQUM7UUFDSCw0QkFBNEI7UUFDNUIsSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ25DLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTztnQkFDUCxJQUFJLEVBQUUsRUFBRTthQUNULENBQUM7UUFDSixDQUFDO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLHVDQUFpQixFQUFFLENBQUM7UUFDbEQsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixJQUFJLEVBQUUsQ0FBQztRQUV0RCxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsUUFBbUMsQ0FBQztRQUNqRSxNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsVUFBK0QsQ0FBQztRQUVwRyxJQUFJLFdBQVcsQ0FBQztRQUVoQixJQUFJLFFBQVEsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNoQyxtQ0FBbUM7WUFDbkMsTUFBTSxhQUFhLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNqRixXQUFXLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLEtBQUssZUFBZSxDQUFDLENBQUM7UUFDdkYsQ0FBQzthQUFNLElBQUksUUFBUSxFQUFFLENBQUM7WUFDcEIsV0FBVyxHQUFHLE1BQU0saUJBQWlCLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0UsQ0FBQzthQUFNLElBQUksZUFBZSxFQUFFLENBQUM7WUFDM0IsV0FBVyxHQUFHLE1BQU0saUJBQWlCLENBQUMsMEJBQTBCLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDcEYsQ0FBQzthQUFNLENBQUM7WUFDTixXQUFXLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzVELENBQUM7UUFFRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPO1lBQ1AsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLE9BQU8sRUFBRSxJQUFJO2dCQUNiLE9BQU8sRUFBRSxXQUFXO2dCQUNwQixLQUFLLEVBQUUsV0FBVyxDQUFDLE1BQU07YUFDMUIsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFcEQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTztZQUNQLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixPQUFPLEVBQUUsS0FBSztnQkFDZCxLQUFLLEVBQUUsaUNBQWlDO2dCQUN4QyxPQUFPLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNsRSxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUE1RFcsUUFBQSxPQUFPLFdBNERsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgU2FtcGxlRmlsZVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9zYW1wbGUtZmlsZS1zZXJ2aWNlJztcclxuXHJcbi8qKlxyXG4gKiBMYW1iZGEgZnVuY3Rpb24gdG8gZ2V0IHNhbXBsZSBmaWxlcyBmcm9tIHRoZSBsaWJyYXJ5XHJcbiAqIFN1cHBvcnRzIGZpbHRlcmluZyBieSBsYW5ndWFnZSBhbmQgZGlmZmljdWx0eSBsZXZlbFxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zdCBoZWFkZXJzID0ge1xyXG4gICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbicsXHJcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdHRVQsT1BUSU9OUycsXHJcbiAgfTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIEhhbmRsZSBwcmVmbGlnaHQgcmVxdWVzdHNcclxuICAgIGlmIChldmVudC5odHRwTWV0aG9kID09PSAnT1BUSU9OUycpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgaGVhZGVycyxcclxuICAgICAgICBib2R5OiAnJyxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzYW1wbGVGaWxlU2VydmljZSA9IG5ldyBTYW1wbGVGaWxlU2VydmljZSgpO1xyXG4gICAgY29uc3QgcXVlcnlQYXJhbXMgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnMgfHwge307XHJcbiAgICBcclxuICAgIGNvbnN0IGxhbmd1YWdlID0gcXVlcnlQYXJhbXMubGFuZ3VhZ2UgYXMgJ0MnIHwgJ0NQUCcgfCB1bmRlZmluZWQ7XHJcbiAgICBjb25zdCBkaWZmaWN1bHR5TGV2ZWwgPSBxdWVyeVBhcmFtcy5kaWZmaWN1bHR5IGFzICdiYXNpYycgfCAnaW50ZXJtZWRpYXRlJyB8ICdhZHZhbmNlZCcgfCB1bmRlZmluZWQ7XHJcblxyXG4gICAgbGV0IHNhbXBsZUZpbGVzO1xyXG5cclxuICAgIGlmIChsYW5ndWFnZSAmJiBkaWZmaWN1bHR5TGV2ZWwpIHtcclxuICAgICAgLy8gR2V0IGZpbGVzIG1hdGNoaW5nIGJvdGggY3JpdGVyaWFcclxuICAgICAgY29uc3QgYWxsQnlMYW5ndWFnZSA9IGF3YWl0IHNhbXBsZUZpbGVTZXJ2aWNlLmdldFNhbXBsZUZpbGVzQnlMYW5ndWFnZShsYW5ndWFnZSk7XHJcbiAgICAgIHNhbXBsZUZpbGVzID0gYWxsQnlMYW5ndWFnZS5maWx0ZXIoZmlsZSA9PiBmaWxlLmRpZmZpY3VsdHlMZXZlbCA9PT0gZGlmZmljdWx0eUxldmVsKTtcclxuICAgIH0gZWxzZSBpZiAobGFuZ3VhZ2UpIHtcclxuICAgICAgc2FtcGxlRmlsZXMgPSBhd2FpdCBzYW1wbGVGaWxlU2VydmljZS5nZXRTYW1wbGVGaWxlc0J5TGFuZ3VhZ2UobGFuZ3VhZ2UpO1xyXG4gICAgfSBlbHNlIGlmIChkaWZmaWN1bHR5TGV2ZWwpIHtcclxuICAgICAgc2FtcGxlRmlsZXMgPSBhd2FpdCBzYW1wbGVGaWxlU2VydmljZS5nZXRTYW1wbGVGaWxlc0J5RGlmZmljdWx0eShkaWZmaWN1bHR5TGV2ZWwpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2FtcGxlRmlsZXMgPSBhd2FpdCBzYW1wbGVGaWxlU2VydmljZS5nZXRBbGxTYW1wbGVGaWxlcygpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgc2FtcGxlczogc2FtcGxlRmlsZXMsXHJcbiAgICAgICAgY291bnQ6IHNhbXBsZUZpbGVzLmxlbmd0aCxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIHNhbXBsZSBmaWxlczonLCBlcnJvcik7XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIGVycm9yOiAnRmFpbGVkIHRvIHJldHJpZXZlIHNhbXBsZSBmaWxlcycsXHJcbiAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn07Il19