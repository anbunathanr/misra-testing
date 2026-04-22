export declare class CloudWatchMonitoringService {
    recordMetric(metricName: string, value: number): Promise<void>;
    recordError(error: string | Error, service?: string, errorType?: string): Promise<void>;
    recordPerformance(metricName: string, duration: number, service?: string, success?: boolean): Promise<void>;
    recordUserActivity(activity: string, userId?: string, organizationId?: string): Promise<void>;
}
export declare const cloudWatchMonitoringService: CloudWatchMonitoringService;
