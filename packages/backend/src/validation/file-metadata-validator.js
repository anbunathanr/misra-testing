"use strict";
/**
 * File Metadata Validator implementation
 * Provides comprehensive validation for file metadata operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileMetadataValidator = void 0;
const file_metadata_1 = require("../types/file-metadata");
const validation_1 = require("../types/validation");
/**
 * Implementation of FileMetadataValidator interface
 */
class FileMetadataValidator {
    validateCreate(metadata) {
        const errors = [];
        const requiredFields = [
            'file_id', 'user_id', 'filename', 'file_type',
            'file_size', 'upload_timestamp', 'analysis_status', 's3_key'
        ];
        for (const field of requiredFields) {
            if (!(field in metadata) || metadata[field] === undefined) {
                errors.push({
                    field,
                    message: `${field} is required for file creation`,
                    code: validation_1.ErrorCodes.VALIDATION_ERROR
                });
            }
        }
        if (metadata.file_id !== undefined && !this.validateFileId(metadata.file_id)) {
            errors.push({
                field: 'file_id',
                message: 'file_id must be a valid UUID v4 format',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        if (metadata.user_id !== undefined && !this.validateUserId(metadata.user_id)) {
            errors.push({
                field: 'user_id',
                message: 'user_id must be 3-128 characters and contain only alphanumeric, hyphen, underscore, @, or dot characters',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        if (metadata.filename !== undefined && !this.validateFilename(metadata.filename)) {
            errors.push({
                field: 'filename',
                message: 'filename must be a non-empty string with valid characters',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        if (metadata.file_type !== undefined && !this.validateFileType(metadata.file_type)) {
            errors.push({
                field: 'file_type',
                message: 'file_type must be one of: c, cpp, h, hpp',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        if (metadata.file_size !== undefined && !this.validateFileSize(metadata.file_size)) {
            errors.push({
                field: 'file_size',
                message: 'file_size must be a positive integer',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        if (metadata.upload_timestamp !== undefined && !this.validateTimestamp(metadata.upload_timestamp)) {
            errors.push({
                field: 'upload_timestamp',
                message: 'upload_timestamp must be a valid Unix timestamp',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        if (metadata.analysis_status !== undefined && !this.validateAnalysisStatus(metadata.analysis_status)) {
            errors.push({
                field: 'analysis_status',
                message: 'analysis_status must be one of: pending, in_progress, completed, failed',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        if (metadata.s3_key !== undefined && !this.validateS3Key(metadata.s3_key)) {
            errors.push({
                field: 's3_key',
                message: 's3_key must be a valid S3 object key',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        if (metadata.created_at !== undefined && !this.validateTimestamp(metadata.created_at)) {
            errors.push({
                field: 'created_at',
                message: 'created_at must be a valid Unix timestamp',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        if (metadata.updated_at !== undefined && !this.validateTimestamp(metadata.updated_at)) {
            errors.push({
                field: 'updated_at',
                message: 'updated_at must be a valid Unix timestamp',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    validateUpdate(updates) {
        const errors = [];
        const immutableFields = ['file_id', 'user_id', 'upload_timestamp'];
        for (const field of immutableFields) {
            if (field in updates) {
                errors.push({
                    field,
                    message: `${field} is immutable and cannot be updated`,
                    code: validation_1.ErrorCodes.VALIDATION_ERROR
                });
            }
        }
        if (updates.filename !== undefined && !this.validateFilename(updates.filename)) {
            errors.push({
                field: 'filename',
                message: 'filename must be a non-empty string with valid characters',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        if (updates.file_type !== undefined && !this.validateFileType(updates.file_type)) {
            errors.push({
                field: 'file_type',
                message: 'file_type must be one of: c, cpp, h, hpp',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        if (updates.file_size !== undefined && !this.validateFileSize(updates.file_size)) {
            errors.push({
                field: 'file_size',
                message: 'file_size must be a positive integer',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        if (updates.analysis_status !== undefined && !this.validateAnalysisStatus(updates.analysis_status)) {
            errors.push({
                field: 'analysis_status',
                message: 'analysis_status must be one of: pending, in_progress, completed, failed',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        if (updates.s3_key !== undefined && !this.validateS3Key(updates.s3_key)) {
            errors.push({
                field: 's3_key',
                message: 's3_key must be a valid S3 object key',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        if (updates.created_at !== undefined && !this.validateTimestamp(updates.created_at)) {
            errors.push({
                field: 'created_at',
                message: 'created_at must be a valid Unix timestamp',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        if (updates.updated_at !== undefined && !this.validateTimestamp(updates.updated_at)) {
            errors.push({
                field: 'updated_at',
                message: 'updated_at must be a valid Unix timestamp',
                code: validation_1.ErrorCodes.VALIDATION_ERROR
            });
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    validateFileId(fileId) {
        if (typeof fileId !== 'string' || fileId.length === 0) {
            return false;
        }
        const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidV4Regex.test(fileId);
    }
    validateUserId(userId) {
        if (typeof userId !== 'string' || userId.length === 0) {
            return false;
        }
        // Allow alphanumeric + hyphens up to 128 chars (covers Cognito sub UUIDs and custom IDs)
        const userIdRegex = /^[a-zA-Z0-9-_@.]{3,128}$/;
        return userIdRegex.test(userId);
    }
    validateFileType(fileType) {
        if (typeof fileType !== 'string') {
            return false;
        }
        return Object.values(file_metadata_1.FileType).includes(fileType);
    }
    validateAnalysisStatus(status) {
        if (typeof status !== 'string') {
            return false;
        }
        return Object.values(file_metadata_1.AnalysisStatus).includes(status);
    }
    validateFilename(filename) {
        if (typeof filename !== 'string' || filename.length === 0) {
            return false;
        }
        const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
        return !invalidChars.test(filename) && filename.length <= 255;
    }
    validateFileSize(fileSize) {
        return typeof fileSize === 'number' &&
            Number.isInteger(fileSize) &&
            fileSize > 0 &&
            fileSize <= 1024 * 1024 * 1024;
    }
    validateTimestamp(timestamp) {
        if (typeof timestamp !== 'number' || !Number.isInteger(timestamp)) {
            return false;
        }
        const minTimestamp = 946684800;
        const maxTimestamp = 4102444800;
        return timestamp >= minTimestamp && timestamp <= maxTimestamp;
    }
    validateS3Key(s3Key) {
        if (typeof s3Key !== 'string' || s3Key.length === 0) {
            return false;
        }
        return !s3Key.startsWith('/') &&
            s3Key.length <= 1024 &&
            s3Key.length > 0;
    }
}
exports.FileMetadataValidator = FileMetadataValidator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1tZXRhZGF0YS12YWxpZGF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmaWxlLW1ldGFkYXRhLXZhbGlkYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFFSCwwREFBK0U7QUFDL0Usb0RBSzRCO0FBRTVCOztHQUVHO0FBQ0gsTUFBYSxxQkFBcUI7SUFFaEMsY0FBYyxDQUFDLFFBQStCO1FBQzVDLE1BQU0sTUFBTSxHQUFzQixFQUFFLENBQUE7UUFFcEMsTUFBTSxjQUFjLEdBQUc7WUFDckIsU0FBUyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsV0FBVztZQUM3QyxXQUFXLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsUUFBUTtTQUM3RCxDQUFBO1FBRUQsS0FBSyxNQUFNLEtBQUssSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksUUFBUSxDQUFDLElBQUksUUFBUSxDQUFDLEtBQTJCLENBQUMsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDaEYsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDVixLQUFLO29CQUNMLE9BQU8sRUFBRSxHQUFHLEtBQUssZ0NBQWdDO29CQUNqRCxJQUFJLEVBQUUsdUJBQVUsQ0FBQyxnQkFBZ0I7aUJBQ2xDLENBQUMsQ0FBQTtZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxRQUFRLENBQUMsT0FBTyxLQUFLLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDN0UsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDVixLQUFLLEVBQUUsU0FBUztnQkFDaEIsT0FBTyxFQUFFLHdDQUF3QztnQkFDakQsSUFBSSxFQUFFLHVCQUFVLENBQUMsZ0JBQWdCO2FBQ2xDLENBQUMsQ0FBQTtRQUNKLENBQUM7UUFFRCxJQUFJLFFBQVEsQ0FBQyxPQUFPLEtBQUssU0FB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LE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNsRSxPQUFPLEtBQUssQ0FBQTtRQUNkLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUE7UUFDOUIsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFBO1FBQy9CLE9BQU8sU0FBUyxJQUFJLFlBQVksSUFBSSxTQUFTLElBQUksWUFBWSxDQUFBO0lBQy9ELENBQUM7SUFFTyxhQUFhLENBQUMsS0FBYTtRQUNqQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BELE9BQU8sS0FBSyxDQUFBO1FBQ2QsQ0FBQztRQUVELE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUN0QixLQUFLLENBQUMsTUFBTSxJQUFJLElBQUk7WUFDcEIsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7SUFDekIsQ0FBQztDQUNGO0FBNVBELHNEQTRQQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBGaWxlIE1ldGFkYXRhIFZhbGlkYXRvciBpbXBsZW1lbnRhdGlvblxyXG4gKiBQcm92aWRlcyBjb21wcmVoZW5zaXZlIHZhbGlkYXRpb24gZm9yIGZpbGUgbWV0YWRhdGEgb3BlcmF0aW9uc1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IEZpbGVNZXRhZGF0YSwgRmlsZVR5cGUsIEFuYWx5c2lzU3RhdHVzIH0gZnJvbSAnLi4vdHlwZXMvZmlsZS1tZXRhZGF0YSdcclxuaW1wb3J0IHsgXHJcbiAgVmFsaWRhdGlvblJlc3VsdCwgXHJcbiAgVmFsaWRhdGlvbkVycm9yLCBcclxuICBGaWxlTWV0YWRhdGFWYWxpZGF0b3IgYXMgSUZpbGVNZXRhZGF0YVZhbGlkYXRvcixcclxuICBFcnJvckNvZGVzIFxyXG59IGZyb20gJy4uL3R5cGVzL3ZhbGlkYXRpb24nXHJcblxyXG4vKipcclxuICogSW1wbGVtZW50YXRpb24gb2YgRmlsZU1ldGFkYXRhVmFsaWRhdG9yIGludGVyZmFjZVxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEZpbGVNZXRhZGF0YVZhbGlkYXRvciBpbXBsZW1lbnRzIElGaWxlTWV0YWRhdGFWYWxpZGF0b3Ige1xyXG4gIFxyXG4gIHZhbGlkYXRlQ3JlYXRlKG1ldGFkYXRhOiBQYXJ0aWFsPEZpbGVNZXRhZGF0YT4pOiBWYWxpZGF0aW9uUmVzdWx0IHtcclxuICAgIGNvbnN0IGVycm9yczogVmFsaWRhdGlvbkVycm9yW10gPSBbXVxyXG5cclxuICAgIGNvbnN0IHJlcXVpcmVkRmllbGRzID0gW1xyXG4gICAgICAnZmlsZV9pZCcsICd1c2VyX2lkJywgJ2ZpbGVuYW1lJywgJ2ZpbGVfdHlwZScsIFxyXG4gICAgICAnZmlsZV9zaXplJywgJ3VwbG9hZF90aW1lc3RhbXAnLCAnYW5hbHlzaXNfc3RhdHVzJywgJ3MzX2tleSdcclxuICAgIF1cclxuXHJcbiAgICBmb3IgKGNvbnN0IGZpZWxkIG9mIHJlcXVpcmVkRmllbGRzKSB7XHJcbiAgICAgIGlmICghKGZpZWxkIGluIG1ldGFkYXRhKSB8fCBtZXRhZGF0YVtmaWVsZCBhcyBrZXlvZiBGaWxlTWV0YWRhdGFdID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgICBmaWVsZCxcclxuICAgICAgICAgIG1lc3NhZ2U6IGAke2ZpZWxkfSBpcyByZXF1aXJlZCBmb3IgZmlsZSBjcmVhdGlvbmAsXHJcbiAgICAgICAgICBjb2RlOiBFcnJvckNvZGVzLlZBTElEQVRJT05fRVJST1JcclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG1ldGFkYXRhLmZpbGVfaWQgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy52YWxpZGF0ZUZpbGVJZChtZXRhZGF0YS5maWxlX2lkKSkge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6ICdmaWxlX2lkJyxcclxuICAgICAgICBtZXNzYWdlOiAnZmlsZV9pZCBtdXN0IGJlIGEgdmFsaWQgVVVJRCB2NCBmb3JtYXQnLFxyXG4gICAgICAgIGNvZGU6IEVycm9yQ29kZXMuVkFMSURBVElPTl9FUlJPUlxyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChtZXRhZGF0YS51c2VyX2lkICE9PSB1bmRlZmluZWQgJiYgIXRoaXMudmFsaWRhdGVVc2VySWQobWV0YWRhdGEudXNlcl9pZCkpIHtcclxuICAgICAgZXJyb3JzLnB1c2goe1xyXG4gICAgICAgIGZpZWxkOiAndXNlcl9pZCcsXHJcbiAgICAgICAgbWVzc2FnZTogJ3VzZXJfaWQgbXVzdCBiZSAzLTEyOCBjaGFyYWN0ZXJzIGFuZCBjb250YWluIG9ubHkgYWxwaGFudW1lcmljLCBoeXBoZW4sIHVuZGVyc2NvcmUsIEAsIG9yIGRvdCBjaGFyYWN0ZXJzJyxcclxuICAgICAgICBjb2RlOiBFcnJvckNvZGVzLlZBTElEQVRJT05fRVJST1JcclxuICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBpZiAobWV0YWRhdGEuZmlsZW5hbWUgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy52YWxpZGF0ZUZpbGVuYW1lKG1ldGFkYXRhLmZpbGVuYW1lKSkge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6ICdmaWxlbmFtZScsXHJcbiAgICAgICAgbWVzc2FnZTogJ2ZpbGVuYW1lIG11c3QgYmUgYSBub24tZW1wdHkgc3RyaW5nIHdpdGggdmFsaWQgY2hhcmFjdGVycycsXHJcbiAgICAgICAgY29kZTogRXJyb3JDb2Rlcy5WQUxJREFUSU9OX0VSUk9SXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG1ldGFkYXRhLmZpbGVfdHlwZSAhPT0gdW5kZWZpbmVkICYmICF0aGlzLnZhbGlkYXRlRmlsZVR5cGUobWV0YWRhdGEuZmlsZV90eXBlKSkge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6ICdmaWxlX3R5cGUnLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdmaWxlX3R5cGUgbXVzdCBiZSBvbmUgb2Y6IGMsIGNwcCwgaCwgaHBwJyxcclxuICAgICAgICBjb2RlOiBFcnJvckNvZGVzLlZBTElEQVRJT05fRVJST1JcclxuICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBpZiAobWV0YWRhdGEuZmlsZV9zaXplICE9PSB1bmRlZmluZWQgJiYgIXRoaXMudmFsaWRhdGVGaWxlU2l6ZShtZXRhZGF0YS5maWxlX3NpemUpKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKHtcclxuICAgICAgICBmaWVsZDogJ2ZpbGVfc2l6ZScsXHJcbiAgICAgICAgbWVzc2FnZTogJ2ZpbGVfc2l6ZSBtdXN0IGJlIGEgcG9zaXRpdmUgaW50ZWdlcicsXHJcbiAgICAgICAgY29kZTogRXJyb3JDb2Rlcy5WQUxJREFUSU9OX0VSUk9SXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG1ldGFkYXRhLnVwbG9hZF90aW1lc3RhbXAgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy52YWxpZGF0ZVRpbWVzdGFtcChtZXRhZGF0YS51cGxvYWRfdGltZXN0YW1wKSkge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6ICd1cGxvYWRfdGltZXN0YW1wJyxcclxuICAgICAgICBtZXNzYWdlOiAndXBsb2FkX3RpbWVzdGFtcCBtdXN0IGJlIGEgdmFsaWQgVW5peCB0aW1lc3RhbXAnLFxyXG4gICAgICAgIGNvZGU6IEVycm9yQ29kZXMuVkFMSURBVElPTl9FUlJPUlxyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChtZXRhZGF0YS5hbmFseXNpc19zdGF0dXMgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy52YWxpZGF0ZUFuYWx5c2lzU3RhdHVzKG1ldGFkYXRhLmFuYWx5c2lzX3N0YXR1cykpIHtcclxuICAgICAgZXJyb3JzLnB1c2goe1xyXG4gICAgICAgIGZpZWxkOiAnYW5hbHlzaXNfc3RhdHVzJyxcclxuICAgICAgICBtZXNzYWdlOiAnYW5hbHlzaXNfc3RhdHVzIG11c3QgYmUgb25lIG9mOiBwZW5kaW5nLCBpbl9wcm9ncmVzcywgY29tcGxldGVkLCBmYWlsZWQnLFxyXG4gICAgICAgIGNvZGU6IEVycm9yQ29kZXMuVkFMSURBVElPTl9FUlJPUlxyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChtZXRhZGF0YS5zM19rZXkgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy52YWxpZGF0ZVMzS2V5KG1ldGFkYXRhLnMzX2tleSkpIHtcclxuICAgICAgZXJyb3JzLnB1c2goe1xyXG4gICAgICAgIGZpZWxkOiAnczNfa2V5JyxcclxuICAgICAgICBtZXNzYWdlOiAnczNfa2V5IG11c3QgYmUgYSB2YWxpZCBTMyBvYmplY3Qga2V5JyxcclxuICAgICAgICBjb2RlOiBFcnJvckNvZGVzLlZBTElEQVRJT05fRVJST1JcclxuICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBpZiAobWV0YWRhdGEuY3JlYXRlZF9hdCAhPT0gdW5kZWZpbmVkICYmICF0aGlzLnZhbGlkYXRlVGltZXN0YW1wKG1ldGFkYXRhLmNyZWF0ZWRfYXQpKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKHtcclxuICAgICAgICBmaWVsZDogJ2NyZWF0ZWRfYXQnLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdjcmVhdGVkX2F0IG11c3QgYmUgYSB2YWxpZCBVbml4IHRpbWVzdGFtcCcsXHJcbiAgICAgICAgY29kZTogRXJyb3JDb2Rlcy5WQUxJREFUSU9OX0VSUk9SXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG1ldGFkYXRhLnVwZGF0ZWRfYXQgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy52YWxpZGF0ZVRpbWVzdGFtcChtZXRhZGF0YS51cGRhdGVkX2F0KSkge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6ICd1cGRhdGVkX2F0JyxcclxuICAgICAgICBtZXNzYWdlOiAndXBkYXRlZF9hdCBtdXN0IGJlIGEgdmFsaWQgVW5peCB0aW1lc3RhbXAnLFxyXG4gICAgICAgIGNvZGU6IEVycm9yQ29kZXMuVkFMSURBVElPTl9FUlJPUlxyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGlzVmFsaWQ6IGVycm9ycy5sZW5ndGggPT09IDAsXHJcbiAgICAgIGVycm9yc1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdmFsaWRhdGVVcGRhdGUodXBkYXRlczogUGFydGlhbDxGaWxlTWV0YWRhdGE+KTogVmFsaWRhdGlvblJlc3VsdCB7XHJcbiAgICBjb25zdCBlcnJvcnM6IFZhbGlkYXRpb25FcnJvcltdID0gW11cclxuXHJcbiAgICBjb25zdCBpbW11dGFibGVGaWVsZHMgPSBbJ2ZpbGVfaWQnLCAndXNlcl9pZCcsICd1cGxvYWRfdGltZXN0YW1wJ11cclxuICAgIGZvciAoY29uc3QgZmllbGQgb2YgaW1tdXRhYmxlRmllbGRzKSB7XHJcbiAgICAgIGlmIChmaWVsZCBpbiB1cGRhdGVzKSB7XHJcbiAgICAgICAgZXJyb3JzLnB1c2goe1xyXG4gICAgICAgICAgZmllbGQsXHJcbiAgICAgICAgICBtZXNzYWdlOiBgJHtmaWVsZH0gaXMgaW1tdXRhYmxlIGFuZCBjYW5ub3QgYmUgdXBkYXRlZGAsXHJcbiAgICAgICAgICBjb2RlOiBFcnJvckNvZGVzLlZBTElEQVRJT05fRVJST1JcclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHVwZGF0ZXMuZmlsZW5hbWUgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy52YWxpZGF0ZUZpbGVuYW1lKHVwZGF0ZXMuZmlsZW5hbWUpKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKHtcclxuICAgICAgICBmaWVsZDogJ2ZpbGVuYW1lJyxcclxuICAgICAgICBtZXNzYWdlOiAnZmlsZW5hbWUgbXVzdCBiZSBhIG5vbi1lbXB0eSBzdHJpbmcgd2l0aCB2YWxpZCBjaGFyYWN0ZXJzJyxcclxuICAgICAgICBjb2RlOiBFcnJvckNvZGVzLlZBTElEQVRJT05fRVJST1JcclxuICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBpZiAodXBkYXRlcy5maWxlX3R5cGUgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy52YWxpZGF0ZUZpbGVUeXBlKHVwZGF0ZXMuZmlsZV90eXBlKSkge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6ICdmaWxlX3R5cGUnLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdmaWxlX3R5cGUgbXVzdCBiZSBvbmUgb2Y6IGMsIGNwcCwgaCwgaHBwJyxcclxuICAgICAgICBjb2RlOiBFcnJvckNvZGVzLlZBTElEQVRJT05fRVJST1JcclxuICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBpZiAodXBkYXRlcy5maWxlX3NpemUgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy52YWxpZGF0ZUZpbGVTaXplKHVwZGF0ZXMuZmlsZV9zaXplKSkge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6ICdmaWxlX3NpemUnLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdmaWxlX3NpemUgbXVzdCBiZSBhIHBvc2l0aXZlIGludGVnZXInLFxyXG4gICAgICAgIGNvZGU6IEVycm9yQ29kZXMuVkFMSURBVElPTl9FUlJPUlxyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIGlmICh1cGRhdGVzLmFuYWx5c2lzX3N0YXR1cyAhPT0gdW5kZWZpbmVkICYmICF0aGlzLnZhbGlkYXRlQW5hbHlzaXNTdGF0dXModXBkYXRlcy5hbmFseXNpc19zdGF0dXMpKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKHtcclxuICAgICAgICBmaWVsZDogJ2FuYWx5c2lzX3N0YXR1cycsXHJcbiAgICAgICAgbWVzc2FnZTogJ2FuYWx5c2lzX3N0YXR1cyBtdXN0IGJlIG9uZSBvZjogcGVuZGluZywgaW5fcHJvZ3Jlc3MsIGNvbXBsZXRlZCwgZmFpbGVkJyxcclxuICAgICAgICBjb2RlOiBFcnJvckNvZGVzLlZBTElEQVRJT05fRVJST1JcclxuICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBpZiAodXBkYXRlcy5zM19rZXkgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy52YWxpZGF0ZVMzS2V5KHVwZGF0ZXMuczNfa2V5KSkge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6ICdzM19rZXknLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdzM19rZXkgbXVzdCBiZSBhIHZhbGlkIFMzIG9iamVjdCBrZXknLFxyXG4gICAgICAgIGNvZGU6IEVycm9yQ29kZXMuVkFMSURBVElPTl9FUlJPUlxyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIGlmICh1cGRhdGVzLmNyZWF0ZWRfYXQgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy52YWxpZGF0ZVRpbWVzdGFtcCh1cGRhdGVzLmNyZWF0ZWRfYXQpKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKHtcclxuICAgICAgICBmaWVsZDogJ2NyZWF0ZWRfYXQnLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdjcmVhdGVkX2F0IG11c3QgYmUgYSB2YWxpZCBVbml4IHRpbWVzdGFtcCcsXHJcbiAgICAgICAgY29kZTogRXJyb3JDb2Rlcy5WQUxJREFUSU9OX0VSUk9SXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHVwZGF0ZXMudXBkYXRlZF9hdCAhPT0gdW5kZWZpbmVkICYmICF0aGlzLnZhbGlkYXRlVGltZXN0YW1wKHVwZGF0ZXMudXBkYXRlZF9hdCkpIHtcclxuICAgICAgZXJyb3JzLnB1c2goe1xyXG4gICAgICAgIGZpZWxkOiAndXBkYXRlZF9hdCcsXHJcbiAgICAgICAgbWVzc2FnZTogJ3VwZGF0ZWRfYXQgbXVzdCBiZSBhIHZhbGlkIFVuaXggdGltZXN0YW1wJyxcclxuICAgICAgICBjb2RlOiBFcnJvckNvZGVzLlZBTElEQVRJT05fRVJST1JcclxuICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpc1ZhbGlkOiBlcnJvcnMubGVuZ3RoID09PSAwLFxyXG4gICAgICBlcnJvcnNcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHZhbGlkYXRlRmlsZUlkKGZpbGVJZDogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICBpZiAodHlwZW9mIGZpbGVJZCAhPT0gJ3N0cmluZycgfHwgZmlsZUlkLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB1dWlkVjRSZWdleCA9IC9eWzAtOWEtZl17OH0tWzAtOWEtZl17NH0tNFswLTlhLWZdezN9LVs4OWFiXVswLTlhLWZdezN9LVswLTlhLWZdezEyfSQvaVxyXG4gICAgcmV0dXJuIHV1aWRWNFJlZ2V4LnRlc3QoZmlsZUlkKVxyXG4gIH1cclxuXHJcbiAgdmFsaWRhdGVVc2VySWQodXNlcklkOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIGlmICh0eXBlb2YgdXNlcklkICE9PSAnc3RyaW5nJyB8fCB1c2VySWQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEFsbG93IGFscGhhbnVtZXJpYyArIGh5cGhlbnMgdXAgdG8gMTI4IGNoYXJzIChjb3ZlcnMgQ29nbml0byBzdWIgVVVJRHMgYW5kIGN1c3RvbSBJRHMpXHJcbiAgICBjb25zdCB1c2VySWRSZWdleCA9IC9eW2EtekEtWjAtOS1fQC5dezMsMTI4fSQvXHJcbiAgICByZXR1cm4gdXNlcklkUmVnZXgudGVzdCh1c2VySWQpXHJcbiAgfVxyXG5cclxuICB2YWxpZGF0ZUZpbGVUeXBlKGZpbGVUeXBlOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIGlmICh0eXBlb2YgZmlsZVR5cGUgIT09ICdzdHJpbmcnKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBPYmplY3QudmFsdWVzKEZpbGVUeXBlKS5pbmNsdWRlcyhmaWxlVHlwZSBhcyBGaWxlVHlwZSlcclxuICB9XHJcblxyXG4gIHZhbGlkYXRlQW5hbHlzaXNTdGF0dXMoc3RhdHVzOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIGlmICh0eXBlb2Ygc3RhdHVzICE9PSAnc3RyaW5nJykge1xyXG4gICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyhBbmFseXNpc1N0YXR1cykuaW5jbHVkZXMoc3RhdHVzIGFzIEFuYWx5c2lzU3RhdHVzKVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSB2YWxpZGF0ZUZpbGVuYW1lKGZpbGVuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIGlmICh0eXBlb2YgZmlsZW5hbWUgIT09ICdzdHJpbmcnIHx8IGZpbGVuYW1lLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBpbnZhbGlkQ2hhcnMgPSAvWzw+OlwiL1xcXFx8PypcXHgwMC1cXHgxZl0vXHJcbiAgICByZXR1cm4gIWludmFsaWRDaGFycy50ZXN0KGZpbGVuYW1lKSAmJiBmaWxlbmFtZS5sZW5ndGggPD0gMjU1XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHZhbGlkYXRlRmlsZVNpemUoZmlsZVNpemU6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHR5cGVvZiBmaWxlU2l6ZSA9PT0gJ251bWJlcicgJiYgXHJcbiAgICAgICAgICAgTnVtYmVyLmlzSW50ZWdlcihmaWxlU2l6ZSkgJiYgXHJcbiAgICAgICAgICAgZmlsZVNpemUgPiAwICYmIFxyXG4gICAgICAgICAgIGZpbGVTaXplIDw9IDEwMjQgKiAxMDI0ICogMTAyNFxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSB2YWxpZGF0ZVRpbWVzdGFtcCh0aW1lc3RhbXA6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgaWYgKHR5cGVvZiB0aW1lc3RhbXAgIT09ICdudW1iZXInIHx8ICFOdW1iZXIuaXNJbnRlZ2VyKHRpbWVzdGFtcCkpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbWluVGltZXN0YW1wID0gOTQ2Njg0ODAwXHJcbiAgICBjb25zdCBtYXhUaW1lc3RhbXAgPSA0MTAyNDQ0ODAwXHJcbiAgICByZXR1cm4gdGltZXN0YW1wID49IG1pblRpbWVzdGFtcCAmJiB0aW1lc3RhbXAgPD0gbWF4VGltZXN0YW1wXHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHZhbGlkYXRlUzNLZXkoczNLZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgaWYgKHR5cGVvZiBzM0tleSAhPT0gJ3N0cmluZycgfHwgczNLZXkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiAhczNLZXkuc3RhcnRzV2l0aCgnLycpICYmIFxyXG4gICAgICAgICAgIHMzS2V5Lmxlbmd0aCA8PSAxMDI0ICYmIFxyXG4gICAgICAgICAgIHMzS2V5Lmxlbmd0aCA+IDBcclxuICB9XHJcbn1cclxuIl19