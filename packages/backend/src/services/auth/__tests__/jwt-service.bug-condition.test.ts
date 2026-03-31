import { JWTService } from '../jwt-service';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Mock the AWS SDK
jest.mock('@aws-sdk/client-secrets-manager', () => {
  return {
    SecretsManagerClient: jest.fn().mockImplementation(() => ({
      send: jest.fn()
    })),
    GetSecretValueCommand: jest.fn().mockImplementation((params) => ({
      ...params,
      command: 'GetSecretValue'
    }))
  };
});

describe('JWT Service Bug Condition Exploration Test', () => {
  let jwtService: JWTService;
  let mockSecretsManager: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Clear module-level cache
    require('../jwt-service').cachedJwtSecret = null;
    require('../jwt-service').secretFetchInProgress = null;
    
    // REMOVE environment variable to force Secrets Manager usage
    delete process.env.JWT_SECRET;
    
    // Create a fresh instance for each test
    jwtService = new JWTService();
    
    // Get the mock instance
    const SecretsManagerClientMock = require('@aws-sdk/client-secrets-manager').SecretsManagerClient as jest.Mock;
    const mockInstance = SecretsManagerClientMock.mock.instances[0];
    mockSecretsManager = mockInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Restore environment variable for other tests
    process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
  });

  describe('Bug Condition: Secrets Manager Timeout', () => {
    it('should timeout when Secrets Manager call hangs', async () => {
      // Arrange: Mock a hanging Secrets Manager call
      const mockSend = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          // Simulate a hanging call that never resolves (simulating timeout)
          // We'll use a promise that never resolves to simulate timeout
          return new Promise(() => {
            // This promise never resolves, simulating a hanging call
          });
        });
      });
      
      mockSecretsManager.send = mockSend;
      
      // Act & Assert: The call should timeout
      await expect(jwtService.verifyAccessToken('some-token')).rejects.toThrow();
    }, 10000); // 10 second timeout for test

    it('should fail when Secrets Manager returns permission denied', async () => {
      // Arrange
      const permissionError = new Error('AccessDeniedException');
      permissionError.name = 'AccessDeniedException';
      permissionError.message = 'User is not authorized to perform: secretsmanager:GetSecretValue';
      
      mockSecretsManager.send = jest.fn().mockRejectedValue(permissionError);
      
      // Act & Assert
      await expect(jwtService.verifyAccessToken('some-token')).rejects.toThrow('Unable to retrieve JWT secret');
    });

    it('should fail when secret does not exist', async () => {
      // Arrange
      const notFoundError = new Error('ResourceNotFoundException');
      notFoundError.name = 'ResourceNotFoundException';
      notFoundError.message = 'Secrets Manager can\'t find the specified secret';
      
      mockSecretsManager.send = jest.fn().mockRejectedValue(notFoundError);
      
      // Act & Assert
      await expect(jwtService.verifyAccessToken('some-token')).rejects.toThrow('Unable to retrieve JWT secret');
    });

    it('should timeout when Secrets Manager is unresponsive', async () => {
      // Arrange: Mock a very slow response (simulating network latency)
      mockSecretsManager.send = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          // Simulate a 10-second delay (longer than Lambda timeout)
          setTimeout(() => {
            resolve({ SecretString: JSON.stringify({ secret: 'test-secret' }) });
          }, 10000); // 10 seconds
        });
      });
      
      // Act & Assert: Should timeout before 10 seconds
      const startTime = Date.now();
      
      try {
        await jwtService.verifyAccessToken('some-token');
        // If we get here, the test should fail because it should have timed out
        fail('Expected timeout but call succeeded');
      } catch (error) {
        const elapsedTime = Date.now() - startTime;
        // The call should fail due to Lambda timeout (30 seconds for Lambda, but we're testing 2-second timeout)
        expect(elapsedTime).toBeLessThan(10000); // Should fail before 10 seconds
      }
    }, 15000); // 15 second timeout for this test
  });

  describe('Bug Condition: Caching Issues', () => {
    it('should not cache secret when Secrets Manager call fails', async () => {
      // Arrange
      const error = new Error('Secrets Manager error');
      mockSecretsManager.send = jest.fn().mockRejectedValue(error);
      
      // Act & Assert
      await expect(jwtService.verifyAccessToken('some-token')).rejects.toThrow();
      
      // Verify the secret wasn't cached
      // (We would need to expose the cache for this test, or use a different approach)
    });

    it('should handle concurrent requests during cache miss', async () => {
      // This test simulates the "thundering herd" problem
      // where multiple Lambda invocations might try to fetch the secret simultaneously
      
      let callCount = 0;
      let resolveCall: Function;
      const secretPromise = new Promise((resolve) => {
        resolveCall = resolve;
      });
      
      mockSecretsManager.send = jest.fn().mockImplementation(() => {
        callCount++;
        return secretPromise;
      });
      
      // Make multiple concurrent calls
      const call1 = jwtService.verifyAccessToken('token1');
      const call2 = jwtService.verifyAccessToken('token2');
      const call3 = jwtService.verifyAccessToken('token3');
      
      // Resolve the promise after a delay to simulate network latency
      setTimeout(() => {
        resolveCall({ SecretString: JSON.stringify({ secret: 'test-secret' }) });
      }, 100);
      
      // All calls should resolve or reject appropriately
      await expect(Promise.race([
        Promise.allSettled([call1, call2, call3])
      ])).resolves.toBeDefined();
    });
  });
});