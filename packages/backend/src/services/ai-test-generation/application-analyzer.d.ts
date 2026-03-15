/**
 * Application Analyzer Service
 * Examines web pages to identify testable elements and user flows
 */
import { ApplicationAnalysis, AnalysisOptions } from '../../types/ai-test-generation';
export declare class ApplicationAnalyzer {
    private static instance;
    private constructor();
    static getInstance(): ApplicationAnalyzer;
    /**
     * Analyze a web page to identify testable elements and user flows
     */
    analyze(url: string, options?: AnalysisOptions): Promise<ApplicationAnalysis>;
    /**
     * Identify interactive elements on the page
     */
    private identifyElements;
    /**
     * Generate CSS path for an element
     */
    private generateCSSPath;
    /**
     * Generate XPath for an element
     */
    private generateXPath;
    /**
     * Detect common UI patterns
     */
    private detectUIPatterns;
    /**
     * Detect form patterns
     */
    private detectForms;
    /**
     * Get elements within a form
     */
    private getFormElements;
    /**
     * Get form description
     */
    private getFormDescription;
    /**
     * Detect navigation patterns
     */
    private detectNavigation;
    /**
     * Get links within a navigation element
     */
    private getNavigationLinks;
    /**
     * Detect modal patterns
     */
    private detectModals;
    /**
     * Get elements within a modal
     */
    private getModalElements;
    /**
     * Detect table patterns
     */
    private detectTables;
    /**
     * Get interactive elements within a table
     */
    private getTableElements;
    /**
     * Identify potential user flows
     */
    private identifyUserFlows;
    /**
     * Identify form submission flows
     */
    private identifyFormFlows;
    /**
     * Identify navigation flows
     */
    private identifyNavigationFlows;
    /**
     * Capture page metadata
     */
    private captureMetadata;
    /**
     * Detect if the page is a Single Page Application
     */
    private detectSPA;
}
export declare const applicationAnalyzer: ApplicationAnalyzer;
