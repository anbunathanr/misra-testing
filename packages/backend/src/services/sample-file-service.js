"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SampleFileService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
class SampleFileService {
    dynamoClient;
    tableName = 'SampleFiles';
    constructor() {
        const client = new client_dynamodb_1.DynamoDBClient({});
        this.dynamoClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
    }
    /**
     * Get all sample files from the library
     */
    async getAllSampleFiles() {
        try {
            const command = new lib_dynamodb_1.ScanCommand({
                TableName: this.tableName,
            });
            const result = await this.dynamoClient.send(command);
            if (!result.Items) {
                return [];
            }
            return result.Items.map(item => this.mapToResponse(item));
        }
        catch (error) {
            console.error('Error getting sample files:', error);
            throw new Error('Failed to retrieve sample files');
        }
    }
    /**
     * Get sample files by language
     */
    async getSampleFilesByLanguage(language) {
        try {
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: this.tableName,
                IndexName: 'LanguageIndex',
                KeyConditionExpression: '#language = :language',
                ExpressionAttributeNames: {
                    '#language': 'language',
                },
                ExpressionAttributeValues: {
                    ':language': language,
                },
            });
            const result = await this.dynamoClient.send(command);
            if (!result.Items) {
                return [];
            }
            return result.Items.map(item => this.mapToResponse(item));
        }
        catch (error) {
            console.error('Error getting sample files by language:', error);
            throw new Error(`Failed to retrieve ${language} sample files`);
        }
    }
    /**
     * Get sample files by difficulty level
     */
    async getSampleFilesByDifficulty(difficultyLevel) {
        try {
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: this.tableName,
                IndexName: 'DifficultyIndex',
                KeyConditionExpression: 'difficulty_level = :difficulty',
                ExpressionAttributeValues: {
                    ':difficulty': difficultyLevel,
                },
            });
            const result = await this.dynamoClient.send(command);
            if (!result.Items) {
                return [];
            }
            return result.Items.map(item => this.mapToResponse(item));
        }
        catch (error) {
            console.error('Error getting sample files by difficulty:', error);
            throw new Error(`Failed to retrieve ${difficultyLevel} sample files`);
        }
    }
    /**
     * Get a specific sample file by ID
     */
    async getSampleFileById(sampleId) {
        try {
            const command = new lib_dynamodb_1.GetCommand({
                TableName: this.tableName,
                Key: {
                    sample_id: sampleId,
                },
            });
            const result = await this.dynamoClient.send(command);
            if (!result.Item) {
                return null;
            }
            return result.Item;
        }
        catch (error) {
            console.error('Error getting sample file by ID:', error);
            throw new Error(`Failed to retrieve sample file: ${sampleId}`);
        }
    }
    /**
     * Randomly select a sample file based on criteria
     */
    async getRandomSampleFile(language, difficultyLevel) {
        try {
            let sampleFiles;
            if (language && difficultyLevel) {
                // Get files matching both criteria
                const allByLanguage = await this.getSampleFilesByLanguage(language);
                sampleFiles = allByLanguage.filter(file => file.difficultyLevel === difficultyLevel);
            }
            else if (language) {
                sampleFiles = await this.getSampleFilesByLanguage(language);
            }
            else if (difficultyLevel) {
                sampleFiles = await this.getSampleFilesByDifficulty(difficultyLevel);
            }
            else {
                sampleFiles = await this.getAllSampleFiles();
            }
            if (sampleFiles.length === 0) {
                return null;
            }
            // Randomly select one file
            const randomIndex = Math.floor(Math.random() * sampleFiles.length);
            return sampleFiles[randomIndex];
        }
        catch (error) {
            console.error('Error getting random sample file:', error);
            throw new Error('Failed to select random sample file');
        }
    }
    /**
     * Add a new sample file to the library
     */
    async addSampleFile(sampleFile) {
        try {
            const now = Date.now();
            const fileWithTimestamps = {
                ...sampleFile,
                created_at: now,
                updated_at: now,
            };
            const command = new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: fileWithTimestamps,
            });
            await this.dynamoClient.send(command);
        }
        catch (error) {
            console.error('Error adding sample file:', error);
            throw new Error('Failed to add sample file');
        }
    }
    /**
     * Map internal SampleFile to public SampleFileResponse
     */
    mapToResponse(sampleFile) {
        return {
            id: sampleFile.sample_id,
            name: sampleFile.filename,
            language: sampleFile.language,
            description: sampleFile.description,
            expectedViolations: sampleFile.expected_violations,
            size: sampleFile.file_size,
            difficultyLevel: sampleFile.difficulty_level,
            violationCategories: sampleFile.violation_categories,
            learningObjectives: sampleFile.learning_objectives,
            estimatedAnalysisTime: sampleFile.estimated_analysis_time,
        };
    }
}
exports.SampleFileService = SampleFileService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2FtcGxlLWZpbGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNhbXBsZS1maWxlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsOERBQTBEO0FBQzFELHdEQUFrSDtBQUdsSCxNQUFhLGlCQUFpQjtJQUNYLFlBQVksQ0FBeUI7SUFDckMsU0FBUyxHQUFHLGFBQWEsQ0FBQztJQUUzQztRQUNFLE1BQU0sTUFBTSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsWUFBWSxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsaUJBQWlCO1FBQ3JCLElBQUksQ0FBQztZQUNILE1BQU0sT0FBTyxHQUFHLElBQUksMEJBQVcsQ0FBQztnQkFDOUIsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO2FBQzFCLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFckQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDbEIsT0FBTyxFQUFFLENBQUM7WUFDWixDQUFDO1lBRUQsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBa0IsQ0FBQyxDQUFDLENBQUM7UUFDMUUsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3BELE1BQU0sSUFBSSxLQUFLLENBQUMsaUNBQWlDLENBQUMsQ0FBQztRQUNyRCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLHdCQUF3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RSxVQUFVLENBQUMsbUJBQW1CO1lBQ2xELHFCQUFxQixFQUFFLFVBQVUsQ0FBQyx1QkFBdUI7U0FDMUQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQTdMRCw4Q0E2TEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFB1dENvbW1hbmQsIFNjYW5Db21tYW5kLCBRdWVyeUNvbW1hbmQsIEdldENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyBTYW1wbGVGaWxlLCBTYW1wbGVGaWxlUmVzcG9uc2UgfSBmcm9tICcuLi90eXBlcy9zYW1wbGUtZmlsZSc7XHJcblxyXG5leHBvcnQgY2xhc3MgU2FtcGxlRmlsZVNlcnZpY2Uge1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgZHluYW1vQ2xpZW50OiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50O1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgdGFibGVOYW1lID0gJ1NhbXBsZUZpbGVzJztcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBjb25zdCBjbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xyXG4gICAgdGhpcy5keW5hbW9DbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oY2xpZW50KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBhbGwgc2FtcGxlIGZpbGVzIGZyb20gdGhlIGxpYnJhcnlcclxuICAgKi9cclxuICBhc3luYyBnZXRBbGxTYW1wbGVGaWxlcygpOiBQcm9taXNlPFNhbXBsZUZpbGVSZXNwb25zZVtdPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFNjYW5Db21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXJlc3VsdC5JdGVtcykge1xyXG4gICAgICAgIHJldHVybiBbXTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHJlc3VsdC5JdGVtcy5tYXAoaXRlbSA9PiB0aGlzLm1hcFRvUmVzcG9uc2UoaXRlbSBhcyBTYW1wbGVGaWxlKSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIHNhbXBsZSBmaWxlczonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHJldHJpZXZlIHNhbXBsZSBmaWxlcycpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHNhbXBsZSBmaWxlcyBieSBsYW5ndWFnZVxyXG4gICAqL1xyXG4gIGFzeW5jIGdldFNhbXBsZUZpbGVzQnlMYW5ndWFnZShsYW5ndWFnZTogJ0MnIHwgJ0NQUCcpOiBQcm9taXNlPFNhbXBsZUZpbGVSZXNwb25zZVtdPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBJbmRleE5hbWU6ICdMYW5ndWFnZUluZGV4JyxcclxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnI2xhbmd1YWdlID0gOmxhbmd1YWdlJyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAgICcjbGFuZ3VhZ2UnOiAnbGFuZ3VhZ2UnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzpsYW5ndWFnZSc6IGxhbmd1YWdlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5keW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgXHJcbiAgICAgIGlmICghcmVzdWx0Lkl0ZW1zKSB7XHJcbiAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gcmVzdWx0Lkl0ZW1zLm1hcChpdGVtID0+IHRoaXMubWFwVG9SZXNwb25zZShpdGVtIGFzIFNhbXBsZUZpbGUpKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgc2FtcGxlIGZpbGVzIGJ5IGxhbmd1YWdlOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gcmV0cmlldmUgJHtsYW5ndWFnZX0gc2FtcGxlIGZpbGVzYCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgc2FtcGxlIGZpbGVzIGJ5IGRpZmZpY3VsdHkgbGV2ZWxcclxuICAgKi9cclxuICBhc3luYyBnZXRTYW1wbGVGaWxlc0J5RGlmZmljdWx0eShkaWZmaWN1bHR5TGV2ZWw6ICdiYXNpYycgfCAnaW50ZXJtZWRpYXRlJyB8ICdhZHZhbmNlZCcpOiBQcm9taXNlPFNhbXBsZUZpbGVSZXNwb25zZVtdPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBJbmRleE5hbWU6ICdEaWZmaWN1bHR5SW5kZXgnLFxyXG4gICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdkaWZmaWN1bHR5X2xldmVsID0gOmRpZmZpY3VsdHknLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6ZGlmZmljdWx0eSc6IGRpZmZpY3VsdHlMZXZlbCxcclxuICAgICAgICB9LFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXJlc3VsdC5JdGVtcykge1xyXG4gICAgICAgIHJldHVybiBbXTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHJlc3VsdC5JdGVtcy5tYXAoaXRlbSA9PiB0aGlzLm1hcFRvUmVzcG9uc2UoaXRlbSBhcyBTYW1wbGVGaWxlKSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIHNhbXBsZSBmaWxlcyBieSBkaWZmaWN1bHR5OicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gcmV0cmlldmUgJHtkaWZmaWN1bHR5TGV2ZWx9IHNhbXBsZSBmaWxlc2ApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGEgc3BlY2lmaWMgc2FtcGxlIGZpbGUgYnkgSURcclxuICAgKi9cclxuICBhc3luYyBnZXRTYW1wbGVGaWxlQnlJZChzYW1wbGVJZDogc3RyaW5nKTogUHJvbWlzZTxTYW1wbGVGaWxlIHwgbnVsbD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEtleToge1xyXG4gICAgICAgICAgc2FtcGxlX2lkOiBzYW1wbGVJZCxcclxuICAgICAgICB9LFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXJlc3VsdC5JdGVtKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiByZXN1bHQuSXRlbSBhcyBTYW1wbGVGaWxlO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBzYW1wbGUgZmlsZSBieSBJRDonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHJldHJpZXZlIHNhbXBsZSBmaWxlOiAke3NhbXBsZUlkfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmFuZG9tbHkgc2VsZWN0IGEgc2FtcGxlIGZpbGUgYmFzZWQgb24gY3JpdGVyaWFcclxuICAgKi9cclxuICBhc3luYyBnZXRSYW5kb21TYW1wbGVGaWxlKFxyXG4gICAgbGFuZ3VhZ2U/OiAnQycgfCAnQ1BQJyxcclxuICAgIGRpZmZpY3VsdHlMZXZlbD86ICdiYXNpYycgfCAnaW50ZXJtZWRpYXRlJyB8ICdhZHZhbmNlZCdcclxuICApOiBQcm9taXNlPFNhbXBsZUZpbGVSZXNwb25zZSB8IG51bGw+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGxldCBzYW1wbGVGaWxlczogU2FtcGxlRmlsZVJlc3BvbnNlW107XHJcblxyXG4gICAgICBpZiAobGFuZ3VhZ2UgJiYgZGlmZmljdWx0eUxldmVsKSB7XHJcbiAgICAgICAgLy8gR2V0IGZpbGVzIG1hdGNoaW5nIGJvdGggY3JpdGVyaWFcclxuICAgICAgICBjb25zdCBhbGxCeUxhbmd1YWdlID0gYXdhaXQgdGhpcy5nZXRTYW1wbGVGaWxlc0J5TGFuZ3VhZ2UobGFuZ3VhZ2UpO1xyXG4gICAgICAgIHNhbXBsZUZpbGVzID0gYWxsQnlMYW5ndWFnZS5maWx0ZXIoZmlsZSA9PiBmaWxlLmRpZmZpY3VsdHlMZXZlbCA9PT0gZGlmZmljdWx0eUxldmVsKTtcclxuICAgICAgfSBlbHNlIGlmIChsYW5ndWFnZSkge1xyXG4gICAgICAgIHNhbXBsZUZpbGVzID0gYXdhaXQgdGhpcy5nZXRTYW1wbGVGaWxlc0J5TGFuZ3VhZ2UobGFuZ3VhZ2UpO1xyXG4gICAgICB9IGVsc2UgaWYgKGRpZmZpY3VsdHlMZXZlbCkge1xyXG4gICAgICAgIHNhbXBsZUZpbGVzID0gYXdhaXQgdGhpcy5nZXRTYW1wbGVGaWxlc0J5RGlmZmljdWx0eShkaWZmaWN1bHR5TGV2ZWwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHNhbXBsZUZpbGVzID0gYXdhaXQgdGhpcy5nZXRBbGxTYW1wbGVGaWxlcygpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc2FtcGxlRmlsZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFJhbmRvbWx5IHNlbGVjdCBvbmUgZmlsZVxyXG4gICAgICBjb25zdCByYW5kb21JbmRleCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHNhbXBsZUZpbGVzLmxlbmd0aCk7XHJcbiAgICAgIHJldHVybiBzYW1wbGVGaWxlc1tyYW5kb21JbmRleF07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIHJhbmRvbSBzYW1wbGUgZmlsZTonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHNlbGVjdCByYW5kb20gc2FtcGxlIGZpbGUnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZCBhIG5ldyBzYW1wbGUgZmlsZSB0byB0aGUgbGlicmFyeVxyXG4gICAqL1xyXG4gIGFzeW5jIGFkZFNhbXBsZUZpbGUoc2FtcGxlRmlsZTogT21pdDxTYW1wbGVGaWxlLCAnY3JlYXRlZF9hdCcgfCAndXBkYXRlZF9hdCc+KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG4gICAgICBjb25zdCBmaWxlV2l0aFRpbWVzdGFtcHM6IFNhbXBsZUZpbGUgPSB7XHJcbiAgICAgICAgLi4uc2FtcGxlRmlsZSxcclxuICAgICAgICBjcmVhdGVkX2F0OiBub3csXHJcbiAgICAgICAgdXBkYXRlZF9hdDogbm93LFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEl0ZW06IGZpbGVXaXRoVGltZXN0YW1wcyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYWRkaW5nIHNhbXBsZSBmaWxlOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gYWRkIHNhbXBsZSBmaWxlJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBNYXAgaW50ZXJuYWwgU2FtcGxlRmlsZSB0byBwdWJsaWMgU2FtcGxlRmlsZVJlc3BvbnNlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBtYXBUb1Jlc3BvbnNlKHNhbXBsZUZpbGU6IFNhbXBsZUZpbGUpOiBTYW1wbGVGaWxlUmVzcG9uc2Uge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaWQ6IHNhbXBsZUZpbGUuc2FtcGxlX2lkLFxyXG4gICAgICBuYW1lOiBzYW1wbGVGaWxlLmZpbGVuYW1lLFxyXG4gICAgICBsYW5ndWFnZTogc2FtcGxlRmlsZS5sYW5ndWFnZSxcclxuICAgICAgZGVzY3JpcHRpb246IHNhbXBsZUZpbGUuZGVzY3JpcHRpb24sXHJcbiAgICAgIGV4cGVjdGVkVmlvbGF0aW9uczogc2FtcGxlRmlsZS5leHBlY3RlZF92aW9sYXRpb25zLFxyXG4gICAgICBzaXplOiBzYW1wbGVGaWxlLmZpbGVfc2l6ZSxcclxuICAgICAgZGlmZmljdWx0eUxldmVsOiBzYW1wbGVGaWxlLmRpZmZpY3VsdHlfbGV2ZWwsXHJcbiAgICAgIHZpb2xhdGlvbkNhdGVnb3JpZXM6IHNhbXBsZUZpbGUudmlvbGF0aW9uX2NhdGVnb3JpZXMsXHJcbiAgICAgIGxlYXJuaW5nT2JqZWN0aXZlczogc2FtcGxlRmlsZS5sZWFybmluZ19vYmplY3RpdmVzLFxyXG4gICAgICBlc3RpbWF0ZWRBbmFseXNpc1RpbWU6IHNhbXBsZUZpbGUuZXN0aW1hdGVkX2FuYWx5c2lzX3RpbWUsXHJcbiAgICB9O1xyXG4gIH1cclxufSJdfQ==