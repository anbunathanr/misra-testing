"use strict";
/**
 * MISRA Analysis Service
 * High-level service for managing MISRA analysis operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MisraAnalysisService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const misra_rule_engine_1 = require("./misra-rule-engine");
const misra_rules_1 = require("../../types/misra-rules");
const file_metadata_1 = require("../../types/file-metadata");
class MisraAnalysisService {
    s3Client;
    bucketName;
    constructor(bucketName, region = 'us-east-1') {
        this.bucketName = bucketName;
        this.s3Client = new client_s3_1.S3Client({ region });
    }
    /**
     * Analyze a file from S3
     */
    async analyzeFile(fileId, fileName, s3Key, fileType, config) {
        try {
            // Download file from S3
            const sourceCode = await this.downloadFileFromS3(s3Key);
            // Determine appropriate rule set based on file type
            const ruleSet = this.determineRuleSet(fileType, config?.ruleSet);
            // Create analysis configuration
            const analysisConfig = {
                ruleSet,
                enabledRules: config?.enabledRules,
                disabledRules: config?.disabledRules,
                severityFilter: config?.severityFilter,
                maxViolations: config?.maxViolations || 0
            };
            // Create rule engine and analyze
            const engine = new misra_rule_engine_1.MisraRuleEngine(analysisConfig);
            const result = await engine.analyzeCode(fileId, fileName, sourceCode);
            return result;
        }
        catch (error) {
            console.error('Error analyzing file:', error);
            return {
                fileId,
                fileName,
                ruleSet: config?.ruleSet || misra_rules_1.MisraRuleSet.C_2012,
                violations: [],
                violationsCount: 0,
                rulesChecked: [],
                analysisTimestamp: Date.now(),
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Download file content from S3
     */
    async downloadFileFromS3(s3Key) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.bucketName,
            Key: s3Key
        });
        const response = await this.s3Client.send(command);
        if (!response.Body) {
            throw new Error('Empty file content');
        }
        // Convert stream to string
        const bodyContents = await response.Body.transformToString();
        return bodyContents;
    }
    /**
     * Determine appropriate MISRA rule set based on file type
     */
    determineRuleSet(fileType, preferredRuleSet) {
        // If user specified a rule set, use it
        if (preferredRuleSet) {
            return preferredRuleSet;
        }
        // Default rule set selection based on file type
        switch (fileType) {
            case file_metadata_1.FileType.C:
            case file_metadata_1.FileType.H:
                return misra_rules_1.MisraRuleSet.C_2012; // Default to latest C standard
            case file_metadata_1.FileType.CPP:
            case file_metadata_1.FileType.HPP:
                return misra_rules_1.MisraRuleSet.CPP_2008; // Use C++ standard for C++ files
            default:
                return misra_rules_1.MisraRuleSet.C_2012; // Fallback to C 2012
        }
    }
    /**
     * Batch analyze multiple files
     */
    async analyzeMultipleFiles(files, config) {
        const results = [];
        for (const file of files) {
            const result = await this.analyzeFile(file.fileId, file.fileName, file.s3Key, file.fileType, config);
            results.push(result);
        }
        return results;
    }
    /**
     * Get analysis summary statistics
     */
    getAnalysisSummary(results) {
        const totalFiles = results.length;
        const successfulAnalyses = results.filter(r => r.success).length;
        const failedAnalyses = results.filter(r => !r.success).length;
        const totalViolations = results.reduce((sum, r) => sum + r.violationsCount, 0);
        const averageViolationsPerFile = totalFiles > 0 ? totalViolations / totalFiles : 0;
        return {
            totalFiles,
            successfulAnalyses,
            failedAnalyses,
            totalViolations,
            averageViolationsPerFile
        };
    }
}
exports.MisraAnalysisService = MisraAnalysisService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzcmEtYW5hbHlzaXMtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1pc3JhLWFuYWx5c2lzLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7O0FBRUgsa0RBQWdFO0FBQ2hFLDJEQUFzRDtBQUN0RCx5REFBdUY7QUFDdkYsNkRBQXFEO0FBRXJELE1BQWEsb0JBQW9CO0lBQ3ZCLFFBQVEsQ0FBVztJQUNuQixVQUFVLENBQVM7SUFFM0IsWUFBWSxVQUFrQixFQUFFLFNBQWlCLFdBQVc7UUFDMUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxXQUFXLENBQ2YsTUFBYyxFQUNkLFFBQWdCLEVBQ2hCLEtBQWEsRUFDYixRQUFrQixFQUNsQixNQUFnQztRQUVoQyxJQUFJLENBQUM7WUFDSCx3QkFBd0I7WUFDeEIsTUFBTSxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFeEQsb0RBQW9EO1lBQ3BELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRWpFLGdDQUFnQztZQUNoQyxNQUFNLGNBQWMsR0FBbUI7Z0JBQ3JDLE9BQU87Z0JBQ1AsWUFBWSxFQUFFLE1BQU0sRUFBRSxZQUFZO2dCQUNsQyxhQUFhLEVBQUUsTUFBTSxFQUFFLGFBQWE7Z0JBQ3BDLGNBQWMsRUFBRSxNQUFNLEVBQUUsY0FBYztnQkFDdEMsYUFBYSxFQUFFLE1BQU0sRUFBRSxhQUFhLElBQUksQ0FBQzthQUMxQyxDQUFDO1lBRUYsaUNBQWlDO1lBQ2pDLE1BQU0sTUFBTSxHQUFHLElBQUksbUNBQWUsQ0FB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QUMsTUFBTSxDQUFDO1FBQ2xDLE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDakUsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUM5RCxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0UsTUFBTSx3QkFBd0IsR0FBRyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbkYsT0FBTztZQUNMLFVBQVU7WUFDVixrQkFBa0I7WUFDbEIsY0FBYztZQUNkLGVBQWU7WUFDZix3QkFBd0I7U0FDekIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXRKRCxvREFzSkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogTUlTUkEgQW5hbHlzaXMgU2VydmljZVxyXG4gKiBIaWdoLWxldmVsIHNlcnZpY2UgZm9yIG1hbmFnaW5nIE1JU1JBIGFuYWx5c2lzIG9wZXJhdGlvbnNcclxuICovXHJcblxyXG5pbXBvcnQgeyBTM0NsaWVudCwgR2V0T2JqZWN0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zMyc7XHJcbmltcG9ydCB7IE1pc3JhUnVsZUVuZ2luZSB9IGZyb20gJy4vbWlzcmEtcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBbmFseXNpc0NvbmZpZywgQW5hbHlzaXNSZXN1bHQsIE1pc3JhUnVsZVNldCB9IGZyb20gJy4uLy4uL3R5cGVzL21pc3JhLXJ1bGVzJztcclxuaW1wb3J0IHsgRmlsZVR5cGUgfSBmcm9tICcuLi8uLi90eXBlcy9maWxlLW1ldGFkYXRhJztcclxuXHJcbmV4cG9ydCBjbGFzcyBNaXNyYUFuYWx5c2lzU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBzM0NsaWVudDogUzNDbGllbnQ7XHJcbiAgcHJpdmF0ZSBidWNrZXROYW1lOiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGJ1Y2tldE5hbWU6IHN0cmluZywgcmVnaW9uOiBzdHJpbmcgPSAndXMtZWFzdC0xJykge1xyXG4gICAgdGhpcy5idWNrZXROYW1lID0gYnVja2V0TmFtZTtcclxuICAgIHRoaXMuczNDbGllbnQgPSBuZXcgUzNDbGllbnQoeyByZWdpb24gfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBbmFseXplIGEgZmlsZSBmcm9tIFMzXHJcbiAgICovXHJcbiAgYXN5bmMgYW5hbHl6ZUZpbGUoXHJcbiAgICBmaWxlSWQ6IHN0cmluZyxcclxuICAgIGZpbGVOYW1lOiBzdHJpbmcsXHJcbiAgICBzM0tleTogc3RyaW5nLFxyXG4gICAgZmlsZVR5cGU6IEZpbGVUeXBlLFxyXG4gICAgY29uZmlnPzogUGFydGlhbDxBbmFseXNpc0NvbmZpZz5cclxuICApOiBQcm9taXNlPEFuYWx5c2lzUmVzdWx0PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBEb3dubG9hZCBmaWxlIGZyb20gUzNcclxuICAgICAgY29uc3Qgc291cmNlQ29kZSA9IGF3YWl0IHRoaXMuZG93bmxvYWRGaWxlRnJvbVMzKHMzS2V5KTtcclxuXHJcbiAgICAgIC8vIERldGVybWluZSBhcHByb3ByaWF0ZSBydWxlIHNldCBiYXNlZCBvbiBmaWxlIHR5cGVcclxuICAgICAgY29uc3QgcnVsZVNldCA9IHRoaXMuZGV0ZXJtaW5lUnVsZVNldChmaWxlVHlwZSwgY29uZmlnPy5ydWxlU2V0KTtcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBhbmFseXNpcyBjb25maWd1cmF0aW9uXHJcbiAgICAgIGNvbnN0IGFuYWx5c2lzQ29uZmlnOiBBbmFseXNpc0NvbmZpZyA9IHtcclxuICAgICAgICBydWxlU2V0LFxyXG4gICAgICAgIGVuYWJsZWRSdWxlczogY29uZmlnPy5lbmFibGVkUnVsZXMsXHJcbiAgICAgICAgZGlzYWJsZWRSdWxlczogY29uZmlnPy5kaXNhYmxlZFJ1bGVzLFxyXG4gICAgICAgIHNldmVyaXR5RmlsdGVyOiBjb25maWc/LnNldmVyaXR5RmlsdGVyLFxyXG4gICAgICAgIG1heFZpb2xhdGlvbnM6IGNvbmZpZz8ubWF4VmlvbGF0aW9ucyB8fCAwXHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBDcmVhdGUgcnVsZSBlbmdpbmUgYW5kIGFuYWx5emVcclxuICAgICAgY29uc3QgZW5naW5lID0gbmV3IE1pc3JhUnVsZUVuZ2luZShhbmFseXNpc0NvbmZpZyk7XHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGVuZ2luZS5hbmFseXplQ29kZShmaWxlSWQsIGZpbGVOYW1lLCBzb3VyY2VDb2RlKTtcclxuXHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBhbmFseXppbmcgZmlsZTonLCBlcnJvcik7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIGZpbGVOYW1lLFxyXG4gICAgICAgIHJ1bGVTZXQ6IGNvbmZpZz8ucnVsZVNldCB8fCBNaXNyYVJ1bGVTZXQuQ18yMDEyLFxyXG4gICAgICAgIHZpb2xhdGlvbnM6IFtdLFxyXG4gICAgICAgIHZpb2xhdGlvbnNDb3VudDogMCxcclxuICAgICAgICBydWxlc0NoZWNrZWQ6IFtdLFxyXG4gICAgICAgIGFuYWx5c2lzVGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIGVycm9yTWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERvd25sb2FkIGZpbGUgY29udGVudCBmcm9tIFMzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBkb3dubG9hZEZpbGVGcm9tUzMoczNLZXk6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldE9iamVjdENvbW1hbmQoe1xyXG4gICAgICBCdWNrZXQ6IHRoaXMuYnVja2V0TmFtZSxcclxuICAgICAgS2V5OiBzM0tleVxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnMzQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICBcclxuICAgIGlmICghcmVzcG9uc2UuQm9keSkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0VtcHR5IGZpbGUgY29udGVudCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENvbnZlcnQgc3RyZWFtIHRvIHN0cmluZ1xyXG4gICAgY29uc3QgYm9keUNvbnRlbnRzID0gYXdhaXQgcmVzcG9uc2UuQm9keS50cmFuc2Zvcm1Ub1N0cmluZygpO1xyXG4gICAgcmV0dXJuIGJvZHlDb250ZW50cztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERldGVybWluZSBhcHByb3ByaWF0ZSBNSVNSQSBydWxlIHNldCBiYXNlZCBvbiBmaWxlIHR5cGVcclxuICAgKi9cclxuICBwcml2YXRlIGRldGVybWluZVJ1bGVTZXQoZmlsZVR5cGU6IEZpbGVUeXBlLCBwcmVmZXJyZWRSdWxlU2V0PzogTWlzcmFSdWxlU2V0KTogTWlzcmFSdWxlU2V0IHtcclxuICAgIC8vIElmIHVzZXIgc3BlY2lmaWVkIGEgcnVsZSBzZXQsIHVzZSBpdFxyXG4gICAgaWYgKHByZWZlcnJlZFJ1bGVTZXQpIHtcclxuICAgICAgcmV0dXJuIHByZWZlcnJlZFJ1bGVTZXQ7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRGVmYXVsdCBydWxlIHNldCBzZWxlY3Rpb24gYmFzZWQgb24gZmlsZSB0eXBlXHJcbiAgICBzd2l0Y2ggKGZpbGVUeXBlKSB7XHJcbiAgICAgIGNhc2UgRmlsZVR5cGUuQzpcclxuICAgICAgY2FzZSBGaWxlVHlwZS5IOlxyXG4gICAgICAgIHJldHVybiBNaXNyYVJ1bGVTZXQuQ18yMDEyOyAvLyBEZWZhdWx0IHRvIGxhdGVzdCBDIHN0YW5kYXJkXHJcbiAgICAgIGNhc2UgRmlsZVR5cGUuQ1BQOlxyXG4gICAgICBjYXNlIEZpbGVUeXBlLkhQUDpcclxuICAgICAgICByZXR1cm4gTWlzcmFSdWxlU2V0LkNQUF8yMDA4OyAvLyBVc2UgQysrIHN0YW5kYXJkIGZvciBDKysgZmlsZXNcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4gTWlzcmFSdWxlU2V0LkNfMjAxMjsgLy8gRmFsbGJhY2sgdG8gQyAyMDEyXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBCYXRjaCBhbmFseXplIG11bHRpcGxlIGZpbGVzXHJcbiAgICovXHJcbiAgYXN5bmMgYW5hbHl6ZU11bHRpcGxlRmlsZXMoXHJcbiAgICBmaWxlczogQXJyYXk8e1xyXG4gICAgICBmaWxlSWQ6IHN0cmluZztcclxuICAgICAgZmlsZU5hbWU6IHN0cmluZztcclxuICAgICAgczNLZXk6IHN0cmluZztcclxuICAgICAgZmlsZVR5cGU6IEZpbGVUeXBlO1xyXG4gICAgfT4sXHJcbiAgICBjb25maWc/OiBQYXJ0aWFsPEFuYWx5c2lzQ29uZmlnPlxyXG4gICk6IFByb21pc2U8QW5hbHlzaXNSZXN1bHRbXT4ge1xyXG4gICAgY29uc3QgcmVzdWx0czogQW5hbHlzaXNSZXN1bHRbXSA9IFtdO1xyXG5cclxuICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmFuYWx5emVGaWxlKFxyXG4gICAgICAgIGZpbGUuZmlsZUlkLFxyXG4gICAgICAgIGZpbGUuZmlsZU5hbWUsXHJcbiAgICAgICAgZmlsZS5zM0tleSxcclxuICAgICAgICBmaWxlLmZpbGVUeXBlLFxyXG4gICAgICAgIGNvbmZpZ1xyXG4gICAgICApO1xyXG4gICAgICByZXN1bHRzLnB1c2gocmVzdWx0KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzdWx0cztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBhbmFseXNpcyBzdW1tYXJ5IHN0YXRpc3RpY3NcclxuICAgKi9cclxuICBnZXRBbmFseXNpc1N1bW1hcnkocmVzdWx0czogQW5hbHlzaXNSZXN1bHRbXSk6IHtcclxuICAgIHRvdGFsRmlsZXM6IG51bWJlcjtcclxuICAgIHN1Y2Nlc3NmdWxBbmFseXNlczogbnVtYmVyO1xyXG4gICAgZmFpbGVkQW5hbHlzZXM6IG51bWJlcjtcclxuICAgIHRvdGFsVmlvbGF0aW9uczogbnVtYmVyO1xyXG4gICAgYXZlcmFnZVZpb2xhdGlvbnNQZXJGaWxlOiBudW1iZXI7XHJcbiAgfSB7XHJcbiAgICBjb25zdCB0b3RhbEZpbGVzID0gcmVzdWx0cy5sZW5ndGg7XHJcbiAgICBjb25zdCBzdWNjZXNzZnVsQW5hbHlzZXMgPSByZXN1bHRzLmZpbHRlcihyID0+IHIuc3VjY2VzcykubGVuZ3RoO1xyXG4gICAgY29uc3QgZmFpbGVkQW5hbHlzZXMgPSByZXN1bHRzLmZpbHRlcihyID0+ICFyLnN1Y2Nlc3MpLmxlbmd0aDtcclxuICAgIGNvbnN0IHRvdGFsVmlvbGF0aW9ucyA9IHJlc3VsdHMucmVkdWNlKChzdW0sIHIpID0+IHN1bSArIHIudmlvbGF0aW9uc0NvdW50LCAwKTtcclxuICAgIGNvbnN0IGF2ZXJhZ2VWaW9sYXRpb25zUGVyRmlsZSA9IHRvdGFsRmlsZXMgPiAwID8gdG90YWxWaW9sYXRpb25zIC8gdG90YWxGaWxlcyA6IDA7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdG90YWxGaWxlcyxcclxuICAgICAgc3VjY2Vzc2Z1bEFuYWx5c2VzLFxyXG4gICAgICBmYWlsZWRBbmFseXNlcyxcclxuICAgICAgdG90YWxWaW9sYXRpb25zLFxyXG4gICAgICBhdmVyYWdlVmlvbGF0aW9uc1BlckZpbGVcclxuICAgIH07XHJcbiAgfVxyXG59XHJcbiJdfQ==