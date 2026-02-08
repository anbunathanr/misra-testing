"use strict";
/**
 * Fast-check generators for property-based testing
 * Generates realistic test data for FileMetadata and related types
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidFileSizeGenerator = exports.invalidFileTypeGenerator = exports.invalidFileIdGenerator = exports.partialFileMetadataGenerator = exports.fileMetadataGenerator = exports.analysisResultsGenerator = exports.s3KeyGenerator = exports.userIdGenerator = exports.timestampGenerator = exports.fileSizeGenerator = exports.filenameGenerator = exports.analysisStatusGenerator = exports.fileTypeGenerator = exports.uuidGenerator = void 0;
const fc = __importStar(require("fast-check"));
const uuid_1 = require("uuid");
const file_metadata_1 = require("../../types/file-metadata");
const uuidGenerator = () => fc.constant((0, uuid_1.v4)());
exports.uuidGenerator = uuidGenerator;
const fileTypeGenerator = () => fc.constantFrom(file_metadata_1.FileType.C, file_metadata_1.FileType.CPP, file_metadata_1.FileType.H, file_metadata_1.FileType.HPP);
exports.fileTypeGenerator = fileTypeGenerator;
const analysisStatusGenerator = () => fc.constantFrom(file_metadata_1.AnalysisStatus.PENDING, file_metadata_1.AnalysisStatus.IN_PROGRESS, file_metadata_1.AnalysisStatus.COMPLETED, file_metadata_1.AnalysisStatus.FAILED);
exports.analysisStatusGenerator = analysisStatusGenerator;
const filenameGenerator = () => fc.tuple(fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/), (0, exports.fileTypeGenerator)()).map(([name, type]) => `${name}.${type}`);
exports.filenameGenerator = filenameGenerator;
const fileSizeGenerator = () => fc.integer({ min: 1, max: 100 * 1024 * 1024 });
exports.fileSizeGenerator = fileSizeGenerator;
const timestampGenerator = () => {
    const now = Date.now();
    const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
    return fc.integer({ min: Math.floor(oneYearAgo / 1000), max: Math.floor(now / 1000) });
};
exports.timestampGenerator = timestampGenerator;
const userIdGenerator = () => fc.stringMatching(/^[a-zA-Z0-9]{8,32}$/);
exports.userIdGenerator = userIdGenerator;
const s3KeyGenerator = () => fc.tuple((0, exports.userIdGenerator)(), (0, exports.uuidGenerator)(), (0, exports.filenameGenerator)()).map(([userId, fileId, filename]) => `uploads/${userId}/${fileId}/${filename}`);
exports.s3KeyGenerator = s3KeyGenerator;
const analysisResultsGenerator = () => fc.record({
    violations_count: fc.integer({ min: 0, max: 1000 }),
    rules_checked: fc.array(fc.string({ minLength: 5, maxLength: 20 }), { minLength: 1, maxLength: 50 }),
    completion_timestamp: (0, exports.timestampGenerator)(),
    error_message: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined })
}, { requiredKeys: ['violations_count', 'rules_checked', 'completion_timestamp'] });
exports.analysisResultsGenerator = analysisResultsGenerator;
const fileMetadataGenerator = () => {
    return fc.record({
        file_id: (0, exports.uuidGenerator)(),
        user_id: (0, exports.userIdGenerator)(),
        filename: (0, exports.filenameGenerator)(),
        file_type: (0, exports.fileTypeGenerator)(),
        file_size: (0, exports.fileSizeGenerator)(),
        upload_timestamp: (0, exports.timestampGenerator)(),
        analysis_status: (0, exports.analysisStatusGenerator)(),
        analysis_results: fc.option((0, exports.analysisResultsGenerator)(), { nil: undefined }),
        s3_key: (0, exports.s3KeyGenerator)(),
        created_at: (0, exports.timestampGenerator)(),
        updated_at: (0, exports.timestampGenerator)()
    }, {
        requiredKeys: [
            'file_id',
            'user_id',
            'filename',
            'file_type',
            'file_size',
            'upload_timestamp',
            'analysis_status',
            's3_key',
            'created_at',
            'updated_at'
        ]
    });
};
exports.fileMetadataGenerator = fileMetadataGenerator;
const partialFileMetadataGenerator = () => fc.record({
    analysis_status: fc.option((0, exports.analysisStatusGenerator)(), { nil: undefined }),
    analysis_results: fc.option((0, exports.analysisResultsGenerator)(), { nil: undefined }),
    updated_at: fc.option((0, exports.timestampGenerator)(), { nil: undefined })
}, { requiredKeys: [] });
exports.partialFileMetadataGenerator = partialFileMetadataGenerator;
const invalidFileIdGenerator = () => fc.oneof(fc.constant(''), fc.constant('not-a-uuid'), fc.string({ minLength: 1, maxLength: 10 }), fc.constant('12345678-1234-1234-1234-123456789012'), fc.constant('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'));
exports.invalidFileIdGenerator = invalidFileIdGenerator;
const invalidFileTypeGenerator = () => fc.oneof(fc.constant(''), fc.constant('txt'), fc.constant('js'), fc.constant('py'), fc.string({ minLength: 1, maxLength: 10 }).filter(s => !['c', 'cpp', 'h', 'hpp'].includes(s)));
exports.invalidFileTypeGenerator = invalidFileTypeGenerator;
const invalidFileSizeGenerator = () => fc.oneof(fc.constant(0), fc.constant(-1), fc.integer({ max: -1 }));
exports.invalidFileSizeGenerator = invalidFileSizeGenerator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1tZXRhZGF0YS1nZW5lcmF0b3JzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZS1tZXRhZGF0YS1nZW5lcmF0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFnQztBQUNoQywrQkFBbUM7QUFDbkMsNkRBQW1HO0FBRTVGLE1BQU0sYUFBYSxHQUFHLEdBQXlCLEVBQUUsQ0FDdEQsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFBLFNBQU0sR0FBRSxDQUFDLENBQUE7QUFEVixRQUFBLGFBQWEsaUJBQ0g7QUFFaEIsTUFBTSxpQkFBaUIsR0FBRyxHQUEyQixFQUFFLENBQzVELEVBQUUsQ0FBQyxZQUFZLENBQUMsd0JBQVEsQ0FBQyxDQUFDLEVBQUUsd0JBQVEsQ0FBQyxHQUFHLEVBQUUsd0JBQVEsQ0FBQyxDQUFDLEVBQUUsd0JBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUR4RCxRQUFBLGlCQUFpQixxQkFDdUM7QUFFOUQsTUFBTSx1QkFBdUIsR0FBRyxHQUFpQyxFQUFFLENBQ3hFLEVBQUUsQ0FBQyxZQUFZLENBQ2IsOEJBQWMsQ0FBQyxPQUFPLEVBQ3RCLDhCQUFjLENBQUMsV0FBVyxFQUMxQiw4QkFBYyxDQUFDLFNBQVMsRUFDeEIsOEJBQWMsQ0FBQyxNQUFNLENBQ3RCLENBQUE7QUFOVSxRQUFBLHVCQUF1QiwyQkFNakM7QUFFSSxNQUFNLGlCQUFpQixHQUFHLEdBQXlCLEVBQUUsQ0FDMUQsRUFBRSxDQUFDLEtBQUssQ0FDTixFQUFFLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLEVBQzFDLElBQUEseUJBQWlCLEdBQUUsQ0FDcEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQTtBQUovQixRQUFBLGlC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LE1BQU0sQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQzFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsc0NBQXNDLENBQUMsRUFDbkQsRUFBRSxDQUFDLFFBQVEsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUNwRCxDQUFBO0FBUFUsUUFBQSxzQkFBc0IsMEJBT2hDO0FBRUksTUFBTSx3QkFBd0IsR0FBRyxHQUF5QixFQUFFLENBQ2pFLEVBQUUsQ0FBQyxLQUFLLENBQ04sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFDZixFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUNsQixFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUNqQixFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUNqQixFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQzlGLENBQUE7QUFQVSxRQUFBLHdCQUF3Qiw0QkFPbEM7QUFFSSxNQUFNLHdCQUF3QixHQUFHLEdBQXlCLEVBQUUsQ0FDakUsRUFBRSxDQUFDLEtBQUssQ0FDTixFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUNkLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDZixFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FDeEIsQ0FBQTtBQUxVLFFBQUEsd0JBQXdCLDRCQUtsQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBGYXN0LWNoZWNrIGdlbmVyYXRvcnMgZm9yIHByb3BlcnR5LWJhc2VkIHRlc3RpbmdcclxuICogR2VuZXJhdGVzIHJlYWxpc3RpYyB0ZXN0IGRhdGEgZm9yIEZpbGVNZXRhZGF0YSBhbmQgcmVsYXRlZCB0eXBlc1xyXG4gKi9cclxuXHJcbmltcG9ydCAqIGFzIGZjIGZyb20gJ2Zhc3QtY2hlY2snXHJcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnXHJcbmltcG9ydCB7IEZpbGVNZXRhZGF0YSwgRmlsZVR5cGUsIEFuYWx5c2lzU3RhdHVzLCBBbmFseXNpc1Jlc3VsdHMgfSBmcm9tICcuLi8uLi90eXBlcy9maWxlLW1ldGFkYXRhJ1xyXG5cclxuZXhwb3J0IGNvbnN0IHV1aWRHZW5lcmF0b3IgPSAoKTogZmMuQXJiaXRyYXJ5PHN0cmluZz4gPT4gXHJcbiAgZmMuY29uc3RhbnQodXVpZHY0KCkpXHJcblxyXG5leHBvcnQgY29uc3QgZmlsZVR5cGVHZW5lcmF0b3IgPSAoKTogZmMuQXJiaXRyYXJ5PEZpbGVUeXBlPiA9PlxyXG4gIGZjLmNvbnN0YW50RnJvbShGaWxlVHlwZS5DLCBGaWxlVHlwZS5DUFAsIEZpbGVUeXBlLkgsIEZpbGVUeXBlLkhQUClcclxuXHJcbmV4cG9ydCBjb25zdCBhbmFseXNpc1N0YXR1c0dlbmVyYXRvciA9ICgpOiBmYy5BcmJpdHJhcnk8QW5hbHlzaXNTdGF0dXM+ID0+XHJcbiAgZmMuY29uc3RhbnRGcm9tKFxyXG4gICAgQW5hbHlzaXNTdGF0dXMuUEVORElORyxcclxuICAgIEFuYWx5c2lzU3RhdHVzLklOX1BST0dSRVNTLFxyXG4gICAgQW5hbHlzaXNTdGF0dXMuQ09NUExFVEVELFxyXG4gICAgQW5hbHlzaXNTdGF0dXMuRkFJTEVEXHJcbiAgKVxyXG5cclxuZXhwb3J0IGNvbnN0IGZpbGVuYW1lR2VuZXJhdG9yID0gKCk6IGZjLkFyYml0cmFyeTxzdHJpbmc+ID0+XHJcbiAgZmMudHVwbGUoXHJcbiAgICBmYy5zdHJpbmdNYXRjaGluZygvXlthLXpBLVowLTlfLV17MSw1MH0kLyksXHJcbiAgICBmaWxlVHlwZUdlbmVyYXRvcigpXHJcbiAgKS5tYXAoKFtuYW1lLCB0eXBlXSkgPT4gYCR7bmFtZX0uJHt0eXBlfWApXHJcblxyXG5leHBvcnQgY29uc3QgZmlsZVNpemVHZW5lcmF0b3IgPSAoKTogZmMuQXJiaXRyYXJ5PG51bWJlcj4gPT5cclxuICBmYy5pbnRlZ2VyKHsgbWluOiAxLCBtYXg6IDEwMCAqIDEwMjQgKiAxMDI0IH0pXHJcblxyXG5leHBvcnQgY29uc3QgdGltZXN0YW1wR2VuZXJhdG9yID0gKCk6IGZjLkFyYml0cmFyeTxudW1iZXI+ID0+IHtcclxuICBjb25zdCBub3cgPSBEYXRlLm5vdygpXHJcbiAgY29uc3Qgb25lWWVhckFnbyA9IG5vdyAtICgzNjUgKiAyNCAqIDYwICogNjAgKiAxMDAwKVxyXG4gIHJldHVybiBmYy5pbnRlZ2VyKHsgbWluOiBNYXRoLmZsb29yKG9uZVllYXJBZ28gLyAxMDAwKSwgbWF4OiBNYXRoLmZsb29yKG5vdyAvIDEwMDApIH0pXHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCB1c2VySWRHZW5lcmF0b3IgPSAoKTogZmMuQXJiaXRyYXJ5PHN0cmluZz4gPT5cclxuICBmYy5zdHJpbmdNYXRjaGluZygvXlthLXpBLVowLTldezgsMzJ9JC8pXHJcblxyXG5leHBvcnQgY29uc3QgczNLZXlHZW5lcmF0b3IgPSAoKTogZmMuQXJiaXRyYXJ5PHN0cmluZz4gPT5cclxuICBmYy50dXBsZShcclxuICAgIHVzZXJJZEdlbmVyYXRvcigpLFxyXG4gICAgdXVpZEdlbmVyYXRvcigpLFxyXG4gICAgZmlsZW5hbWVHZW5lcmF0b3IoKVxyXG4gICkubWFwKChbdXNlcklkLCBmaWxlSWQsIGZpbGVuYW1lXSkgPT4gYHVwbG9hZHMvJHt1c2VySWR9LyR7ZmlsZUlkfS8ke2ZpbGVuYW1lfWApXHJcblxyXG5leHBvcnQgY29uc3QgYW5hbHlzaXNSZXN1bHRzR2VuZXJhdG9yID0gKCk6IGZjLkFyYml0cmFyeTxBbmFseXNpc1Jlc3VsdHM+ID0+XHJcbiAgZmMucmVjb3JkKHtcclxuICAgIHZpb2xhdGlvbnNfY291bnQ6IGZjLmludGVnZXIoeyBtaW46IDAsIG1heDogMTAwMCB9KSxcclxuICAgIHJ1bGVzX2NoZWNrZWQ6IGZjLmFycmF5KGZjLnN0cmluZyh7IG1pbkxlbmd0aDogNSwgbWF4TGVuZ3RoOiAyMCB9KSwgeyBtaW5MZW5ndGg6IDEsIG1heExlbmd0aDogNTAgfSksXHJcbiAgICBjb21wbGV0aW9uX3RpbWVzdGFtcDogdGltZXN0YW1wR2VuZXJhdG9yKCksXHJcbiAgICBlcnJvcl9tZXNzYWdlOiBmYy5vcHRpb24oZmMuc3RyaW5nKHsgbWluTGVuZ3RoOiAxMCwgbWF4TGVuZ3RoOiAyMDAgfSksIHsgbmlsOiB1bmRlZmluZWQgfSlcclxuICB9LCB7IHJlcXVpcmVkS2V5czogWyd2aW9sYXRpb25zX2NvdW50JywgJ3J1bGVzX2NoZWNrZWQnLCAnY29tcGxldGlvbl90aW1lc3RhbXAnXSB9KSBhcyBmYy5BcmJpdHJhcnk8QW5hbHlzaXNSZXN1bHRzPlxyXG5cclxuZXhwb3J0IGNvbnN0IGZpbGVNZXRhZGF0YUdlbmVyYXRvciA9ICgpOiBmYy5BcmJpdHJhcnk8RmlsZU1ldGFkYXRhPiA9PiB7XHJcbiAgcmV0dXJuIGZjLnJlY29yZCh7XHJcbiAgICBmaWxlX2lkOiB1dWlkR2VuZXJhdG9yKCksXHJcbiAgICB1c2VyX2lkOiB1c2VySWRHZW5lcmF0b3IoKSxcclxuICAgIGZpbGVuYW1lOiBmaWxlbmFtZUdlbmVyYXRvcigpLFxyXG4gICAgZmlsZV90eXBlOiBmaWxlVHlwZUdlbmVyYXRvcigpLFxyXG4gICAgZmlsZV9zaXplOiBmaWxlU2l6ZUdlbmVyYXRvcigpLFxyXG4gICAgdXBsb2FkX3RpbWVzdGFtcDogdGltZXN0YW1wR2VuZXJhdG9yKCksXHJcbiAgICBhbmFseXNpc19zdGF0dXM6IGFuYWx5c2lzU3RhdHVzR2VuZXJhdG9yKCksXHJcbiAgICBhbmFseXNpc19yZXN1bHRzOiBmYy5vcHRpb24oYW5hbHlzaXNSZXN1bHRzR2VuZXJhdG9yKCksIHsgbmlsOiB1bmRlZmluZWQgfSksXHJcbiAgICBzM19rZXk6IHMzS2V5R2VuZXJhdG9yKCksXHJcbiAgICBjcmVhdGVkX2F0OiB0aW1lc3RhbXBHZW5lcmF0b3IoKSxcclxuICAgIHVwZGF0ZWRfYXQ6IHRpbWVzdGFtcEdlbmVyYXRvcigpXHJcbiAgfSwgeyBcclxuICAgIHJlcXVpcmVkS2V5czogW1xyXG4gICAgICAnZmlsZV9pZCcsIFxyXG4gICAgICAndXNlcl9pZCcsIFxyXG4gICAgICAnZmlsZW5hbWUnLCBcclxuICAgICAgJ2ZpbGVfdHlwZScsIFxyXG4gICAgICAnZmlsZV9zaXplJywgXHJcbiAgICAgICd1cGxvYWRfdGltZXN0YW1wJywgXHJcbiAgICAgICdhbmFseXNpc19zdGF0dXMnLCBcclxuICAgICAgJ3MzX2tleScsIFxyXG4gICAgICAnY3JlYXRlZF9hdCcsIFxyXG4gICAgICAndXBkYXRlZF9hdCdcclxuICAgIF0gXHJcbiAgfSkgYXMgZmMuQXJiaXRyYXJ5PEZpbGVNZXRhZGF0YT5cclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IHBhcnRpYWxGaWxlTWV0YWRhdGFHZW5lcmF0b3IgPSAoKTogZmMuQXJiaXRyYXJ5PFBhcnRpYWw8RmlsZU1ldGFkYXRhPj4gPT5cclxuICBmYy5yZWNvcmQoe1xyXG4gICAgYW5hbHlzaXNfc3RhdHVzOiBmYy5vcHRpb24oYW5hbHlzaXNTdGF0dXNHZW5lcmF0b3IoKSwgeyBuaWw6IHVuZGVmaW5lZCB9KSxcclxuICAgIGFuYWx5c2lzX3Jlc3VsdHM6IGZjLm9wdGlvbihhbmFseXNpc1Jlc3VsdHNHZW5lcmF0b3IoKSwgeyBuaWw6IHVuZGVmaW5lZCB9KSxcclxuICAgIHVwZGF0ZWRfYXQ6IGZjLm9wdGlvbih0aW1lc3RhbXBHZW5lcmF0b3IoKSwgeyBuaWw6IHVuZGVmaW5lZCB9KVxyXG4gIH0sIHsgcmVxdWlyZWRLZXlzOiBbXSB9KSBhcyBmYy5BcmJpdHJhcnk8UGFydGlhbDxGaWxlTWV0YWRhdGE+PlxyXG5cclxuZXhwb3J0IGNvbnN0IGludmFsaWRGaWxlSWRHZW5lcmF0b3IgPSAoKTogZmMuQXJiaXRyYXJ5PHN0cmluZz4gPT5cclxuICBmYy5vbmVvZihcclxuICAgIGZjLmNvbnN0YW50KCcnKSxcclxuICAgIGZjLmNvbnN0YW50KCdub3QtYS11dWlkJyksXHJcbiAgICBmYy5zdHJpbmcoeyBtaW5MZW5ndGg6IDEsIG1heExlbmd0aDogMTAgfSksXHJcbiAgICBmYy5jb25zdGFudCgnMTIzNDU2NzgtMTIzNC0xMjM0LTEyMzQtMTIzNDU2Nzg5MDEyJyksXHJcbiAgICBmYy5jb25zdGFudCgneHh4eHh4eHgteHh4eC14eHh4LXh4eHgteHh4eHh4eHh4eHh4JylcclxuICApXHJcblxyXG5leHBvcnQgY29uc3QgaW52YWxpZEZpbGVUeXBlR2VuZXJhdG9yID0gKCk6IGZjLkFyYml0cmFyeTxzdHJpbmc+ID0+XHJcbiAgZmMub25lb2YoXHJcbiAgICBmYy5jb25zdGFudCgnJyksXHJcbiAgICBmYy5jb25zdGFudCgndHh0JyksXHJcbiAgICBmYy5jb25zdGFudCgnanMnKSxcclxuICAgIGZjLmNvbnN0YW50KCdweScpLFxyXG4gICAgZmMuc3RyaW5nKHsgbWluTGVuZ3RoOiAxLCBtYXhMZW5ndGg6IDEwIH0pLmZpbHRlcihzID0+ICFbJ2MnLCAnY3BwJywgJ2gnLCAnaHBwJ10uaW5jbHVkZXMocykpXHJcbiAgKVxyXG5cclxuZXhwb3J0IGNvbnN0IGludmFsaWRGaWxlU2l6ZUdlbmVyYXRvciA9ICgpOiBmYy5BcmJpdHJhcnk8bnVtYmVyPiA9PlxyXG4gIGZjLm9uZW9mKFxyXG4gICAgZmMuY29uc3RhbnQoMCksXHJcbiAgICBmYy5jb25zdGFudCgtMSksXHJcbiAgICBmYy5pbnRlZ2VyKHsgbWF4OiAtMSB9KVxyXG4gIClcclxuIl19