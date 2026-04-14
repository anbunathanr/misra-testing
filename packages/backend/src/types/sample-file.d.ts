export interface SampleFile {
    sample_id: string;
    filename: string;
    file_content: string;
    language: 'C' | 'CPP';
    description: string;
    expected_violations: number;
    file_size: number;
    difficulty_level: 'basic' | 'intermediate' | 'advanced';
    created_at: number;
    updated_at: number;
    violation_categories: string[];
    learning_objectives: string[];
    estimated_analysis_time: number;
}
export interface SampleFileResponse {
    id: string;
    name: string;
    language: 'C' | 'CPP';
    description: string;
    expectedViolations: number;
    size: number;
    difficultyLevel: 'basic' | 'intermediate' | 'advanced';
    violationCategories: string[];
    learningObjectives: string[];
    estimatedAnalysisTime: number;
}
export interface SampleFileUploadRequest {
    userEmail: string;
    preferredLanguage?: 'C' | 'CPP';
    difficultyLevel?: 'basic' | 'intermediate' | 'advanced';
}
export interface SampleFileUploadResponse {
    fileId: string;
    fileName: string;
    fileSize: number;
    language: 'C' | 'CPP';
    description: string;
    expectedViolations: number;
    uploadStatus: 'completed' | 'failed';
    s3Key: string;
    sampleId: string;
}
export interface UploadProgressResponse {
    success: boolean;
    fileId: string;
    fileName: string;
    fileSize: number;
    progress: {
        percentage: number;
        status: 'starting' | 'uploading' | 'completed' | 'failed';
        message: string;
        estimatedTimeRemaining: number;
    };
    timestamps: {
        createdAt: number;
        updatedAt: number;
    };
    error?: {
        message: string;
    };
}
