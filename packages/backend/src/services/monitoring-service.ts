export const monitoringService = {
  recordMetric: (metric: string, value: number) => {
    console.log(`Metric: ${metric} = ${value}`);
  },
  recordEvent: (event: string, data?: any) => {
    console.log(`Event: ${event}`, data);
  },
  recordAnalysisMetrics: async (analysisId: string, fileId: string, complianceScore: number, violationCount: number, duration: number, success: boolean) => {
    console.log(`Analysis metrics: ${analysisId} - ${fileId} - Score: ${complianceScore}, Violations: ${violationCount}, Duration: ${duration}ms, Success: ${success}`);
  },
  monitorS3Operation: async (bucket: string, operation: string, success: boolean, duration: number, size?: number) => {
    console.log(`S3 operation: ${operation} on ${bucket} - ${success ? 'success' : 'failed'} (${duration}ms, ${size || 0} bytes)`);
  }
};
