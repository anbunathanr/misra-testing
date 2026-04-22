export declare const monitoringService: {
    recordMetric: (metric: string, value: number) => void;
    recordEvent: (event: string, data?: any) => void;
    recordAnalysisMetrics: (analysisId: string, fileId: string, complianceScore: number, violationCount: number, duration: number, success: boolean) => Promise<void>;
    monitorS3Operation: (bucket: string, operation: string, success: boolean, duration: number, size?: number) => Promise<void>;
};
