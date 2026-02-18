/**
 * Unit tests for Application Analyzer
 */

import { ApplicationAnalyzer } from '../application-analyzer';
import { browserService } from '../../browser-service';

// Mock the browser service
jest.mock('../../browser-service');

describe('ApplicationAnalyzer', () => {
  let analyzer: ApplicationAnalyzer;

  beforeEach(() => {
    analyzer = ApplicationAnalyzer.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ApplicationAnalyzer.getInstance();
      const instance2 = ApplicationAnalyzer.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('analyze', () => {
    it('should handle page load timeout errors', async () => {
      const mockPage = {
        setViewportSize: jest.fn(),
        setDefaultTimeout: jest.fn(),
        setDefaultNavigationTimeout: jest.fn(),
        goto: jest.fn().mockRejectedValue(new Error('Navigation timeout of 30000 ms exceeded')),
        title: jest.fn(),
        locator: jest.fn(),
        viewportSize: jest.fn().mockReturnValue({ width: 1280, height: 720 }),
        evaluate: jest.fn(),
      };

      const mockSession = {
        browser: {},
        context: {},
        page: mockPage,
      };

      (browserService.initializeBrowser as jest.Mock).mockResolvedValue(mockSession);
      (browserService.forceCleanup as jest.Mock).mockResolvedValue(undefined);

      await expect(
        analyzer.analyze('https://example.com')
      ).rejects.toThrow('Failed to load page: timeout after 30000ms');

      expect(browserService.forceCleanup).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const mockPage = {
        setViewportSize: jest.fn(),
        setDefaultTimeout: jest.fn(),
        setDefaultNavigationTimeout: jest.fn(),
        goto: jest.fn().mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED')),
        title: jest.fn(),
        locator: jest.fn(),
        viewportSize: jest.fn().mockReturnValue({ width: 1280, height: 720 }),
        evaluate: jest.fn(),
      };

      const mockSession = {
        browser: {},
        context: {},
        page: mockPage,
      };

      (browserService.initializeBrowser as jest.Mock).mockResolvedValue(mockSession);
      (browserService.forceCleanup as jest.Mock).mockResolvedValue(undefined);

      await expect(
        analyzer.analyze('https://example.com')
      ).rejects.toThrow('Failed to load page: network error');

      expect(browserService.forceCleanup).toHaveBeenCalled();
    });

    it('should use custom timeout when provided', async () => {
      const mockPage = {
        setViewportSize: jest.fn(),
        setDefaultTimeout: jest.fn(),
        setDefaultNavigationTimeout: jest.fn(),
        goto: jest.fn().mockRejectedValue(new Error('timeout')),
        title: jest.fn(),
        locator: jest.fn(),
        viewportSize: jest.fn().mockReturnValue({ width: 1280, height: 720 }),
        evaluate: jest.fn(),
      };

      const mockSession = {
        browser: {},
        context: {},
        page: mockPage,
      };

      (browserService.initializeBrowser as jest.Mock).mockResolvedValue(mockSession);
      (browserService.forceCleanup as jest.Mock).mockResolvedValue(undefined);

      await expect(
        analyzer.analyze('https://example.com', { timeout: 60000 })
      ).rejects.toThrow('Failed to load page: timeout after 60000ms');

      expect(mockPage.setDefaultTimeout).toHaveBeenCalledWith(60000);
      expect(mockPage.setDefaultNavigationTimeout).toHaveBeenCalledWith(60000);
    });

    it('should use custom viewport when provided', async () => {
      const mockPage = {
        setViewportSize: jest.fn(),
        setDefaultTimeout: jest.fn(),
        setDefaultNavigationTimeout: jest.fn(),
        goto: jest.fn().mockRejectedValue(new Error('test error')),
        title: jest.fn(),
        locator: jest.fn(),
        viewportSize: jest.fn().mockReturnValue({ width: 1920, height: 1080 }),
        evaluate: jest.fn(),
      };

      const mockSession = {
        browser: {},
        context: {},
        page: mockPage,
      };

      (browserService.initializeBrowser as jest.Mock).mockResolvedValue(mockSession);
      (browserService.forceCleanup as jest.Mock).mockResolvedValue(undefined);

      await expect(
        analyzer.analyze('https://example.com', { viewport: { width: 1920, height: 1080 } })
      ).rejects.toThrow();

      expect(mockPage.setViewportSize).toHaveBeenCalledWith({ width: 1920, height: 1080 });
    });

    it('should cleanup browser on error', async () => {
      const mockPage = {
        setViewportSize: jest.fn(),
        setDefaultTimeout: jest.fn(),
        setDefaultNavigationTimeout: jest.fn(),
        goto: jest.fn().mockRejectedValue(new Error('test error')),
        title: jest.fn(),
        locator: jest.fn(),
        viewportSize: jest.fn().mockReturnValue({ width: 1280, height: 720 }),
        evaluate: jest.fn(),
      };

      const mockSession = {
        browser: {},
        context: {},
        page: mockPage,
      };

      (browserService.initializeBrowser as jest.Mock).mockResolvedValue(mockSession);
      (browserService.forceCleanup as jest.Mock).mockResolvedValue(undefined);

      await expect(
        analyzer.analyze('https://example.com')
      ).rejects.toThrow();

      expect(browserService.forceCleanup).toHaveBeenCalled();
    });
  });
});
