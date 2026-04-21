/**
 * Bug Condition Exploration Test for Report Download Fix
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **DO NOT attempt to fix the test or the code when it fails**
 * 
 * This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */

import * as fc from 'fast-check'
import axios, { AxiosError } from 'axios'

// Test configuration
const API_BASE_URL = process.env.API_GATEWAY_URL || 'https://7r9qmrftc6.execute-api.us-east-1.amazonaws.com'
const TEST_TIMEOUT = 30000 // 30 seconds

describe('Report Download Bug Condition Exploration', () => {
  let authToken: string | null = null

  beforeAll(async () => {
    // Get authentication token for testing
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'TestPassword123!'
      }, {
        timeout: TEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      authToken = loginResponse.data.accessToken
    } catch (error) {
      console.warn('Could not authenticate for bug exploration test:', error)
      // Continue without auth token - the test should still demonstrate the bug
    }
  }, TEST_TIMEOUT)

  /**
   * **Property 1: Bug Condition - Report Download Endpoint Missing**
   * 
   * **CRITICAL**: This test MUST FAIL on unfixed infrastructure - failure confirms the bug exists
   * 
   * **Scoped PBT Approach**: Scope the property to concrete failing cases: 
   * GET requests to `/reports/{fileId}` with valid authentication
   * 
   * Test that GET `/reports/{fileId}` returns 404 error on unfixed infrastructure
   * The test assertions should match the Expected Behavior Properties from design
   * 
   * **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
   * 
   * **Validates: Requirements 1.1, 1.2, 1.3**
   */
  test('Property 1: Bug Condition - Report Download Endpoint Missing', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid UUID-like file IDs
        fc.uuid(),
        async (fileId: string) => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          }
          
          // Add auth header if available
          if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`
          }

          try {
            // Make GET request to /reports/{fileId} endpoint
            const response = await axios.get(`${API_BASE_URL}/reports/${fileId}`, {
              headers,
              timeout: TEST_TIMEOUT,
              validateStatus: () => true // Don't throw on 4xx/5xx status codes
            })

            // **EXPECTED BEHAVIOR AFTER FIX**: 
            // The endpoint should exist and return either:
            // - 200 with presigned URL (if file exists and user owns it)
            // - 404 with proper error message (if file doesn't exist)  
            // - 403 with proper error message (if user doesn't own file)
            // - 401 with proper error message (if not authenticated)
            
            // **BUG CONDITION ON UNFIXED CODE**:
            // The endpoint returns 404 because the route doesn't exist in API Gateway
            // This is different from a 404 for "file not found" - it's a 404 for "endpoint not found"
            
            // On unfixed infrastructure, we expect 404 due to missing route
            // On fixed infrastructure, we expect the endpoint to exist (status should NOT be 404 due to missing route)
            
            // The bug is that the endpoint doesn't exist at all
            // After the fix, the endpoint should exist and handle the request properly
            expect(response.status).not.toBe(404) // This will FAIL on unfixed code, proving the bug exists
            
            // Additional assertions for expected behavior after fix
            if (response.status === 200) {
              // If successful, should return presigned URL structure
              expect(response.data).toHaveProperty('reportUrl')
              expect(response.data).toHaveProperty('expiresIn')
              expect(response.data).toHaveProperty('expiresAt')
              expect(response.data).toHaveProperty('fileId', fileId)
              expect(response.data.reportUrl).toMatch(/^https:\/\//)
              expect(response.data.expiresIn).toBe(3600) // 1 hour
            } else if (response.status === 401) {
              // If unauthorized, should return proper error structure
              expect(response.data).toHaveProperty('error')
              expect(response.data.error).toHaveProperty('code', 'UNAUTHORIZED')
              expect(response.data.error).toHaveProperty('message')
            } else if (response.status === 403) {
              // If forbidden, should return proper error structure  
              expect(response.data).toHaveProperty('error')
              expect(response.data.error).toHaveProperty('code', 'FORBIDDEN')
              expect(response.data.error).toHaveProperty('message')
            } else if (response.status === 404) {
              // If file not found, should return proper error structure
              expect(response.data).toHaveProperty('error')
              expect(response.data.error.code).toMatch(/FILE_NOT_FOUND|ANALYSIS_NOT_FOUND/)
              expect(response.data.error).toHaveProperty('message')
            } else {
              // Any other status should be a valid HTTP response from the Lambda function
              expect([200, 400, 401, 403, 404, 500]).toContain(response.status)
            }

          } catch (error) {
            if (axios.isAxiosError(error)) {
              const axiosError = error as AxiosError
              
              // Network errors or timeouts indicate infrastructure issues
              if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
                throw new Error(`API endpoint not reachable: ${API_BASE_URL}`)
              }
              
              if (axiosError.code === 'ECONNABORTED') {
                throw new Error(`Request timeout - API may be down: ${API_BASE_URL}`)
              }
              
              // If we get a response, check the status
              if (axiosError.response) {
                const status = axiosError.response.status
                
                // On unfixed infrastructure, we expect 404 due to missing route
                // This assertion will FAIL, proving the bug exists
                expect(status).not.toBe(404)
                
                // The endpoint should exist and return proper error responses
                expect([200, 400, 401, 403, 404, 500]).toContain(status)
              } else {
                // Re-throw unexpected errors
                throw error
              }
            } else {
              throw error
            }
          }
        }
      ),
      { 
        numRuns: 5, // Further reduced runs for faster HTTP tests
        timeout: TEST_TIMEOUT * 2 // Allow extra time for HTTP requests
      }
    )
  }, TEST_TIMEOUT * 3) // Test timeout

  /**
   * **Concrete Bug Demonstration Cases**
   * 
   * These are specific test cases that demonstrate the bug condition
   * with known file IDs and scenarios
   */
  describe('Concrete Bug Demonstration Cases', () => {
    const testCases = [
      {
        name: 'Valid UUID format file ID',
        fileId: '123e4567-e89b-12d3-a456-426614174000'
      },
      {
        name: 'Another valid UUID format file ID', 
        fileId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      },
      {
        name: 'Short UUID format file ID',
        fileId: 'abc123-def456-ghi789'
      }
    ]

    testCases.forEach(({ name, fileId }) => {
      test(`Bug demonstration: ${name}`, async () => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        }
        
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`
        }

        try {
          const response = await axios.get(`${API_BASE_URL}/reports/${fileId}`, {
            headers,
            timeout: TEST_TIMEOUT,
            validateStatus: () => true
          })

          // **THIS ASSERTION WILL FAIL ON UNFIXED CODE**
          // Proving that the bug exists - the endpoint returns 404 because the route doesn't exist
          expect(response.status).not.toBe(404)
          
          // Document the counterexample for root cause analysis
          console.log(`Counterexample found for ${name}:`, {
            fileId,
            status: response.status,
            headers: response.headers,
            data: response.data
          })

        } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            const status = error.response.status
            
            // **THIS ASSERTION WILL FAIL ON UNFIXED CODE**
            expect(status).not.toBe(404)
            
            // Document the counterexample
            console.log(`Counterexample found for ${name}:`, {
              fileId,
              status,
              error: error.response.data
            })
          } else {
            throw error
          }
        }
      }, TEST_TIMEOUT)
    })
  })

  /**
   * **Root Cause Analysis Documentation**
   * 
   * This test documents the expected counterexamples that demonstrate the bug
   */
  test('Root cause analysis - document expected failure pattern', async () => {
    const fileId = '123e4567-e89b-12d3-a456-426614174000'
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/reports/${fileId}`, {
        headers,
        timeout: TEST_TIMEOUT,
        validateStatus: () => true
      })

      // Document the actual response for analysis
      console.log('Root cause analysis - API response:', {
        url: `${API_BASE_URL}/reports/${fileId}`,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      })

      // **EXPECTED FAILURE ON UNFIXED CODE**: 
      // Status 404 because API Gateway route doesn't exist
      // This proves the root cause is missing infrastructure configuration
      
      if (response.status === 404) {
        console.log('BUG CONFIRMED: Endpoint returns 404 - route does not exist in API Gateway')
        console.log('ROOT CAUSE: Missing Lambda function deployment and API Gateway route configuration')
        console.log('EXPECTED: After fix, endpoint should exist and return proper responses')
      }

      // This assertion will FAIL on unfixed code, confirming the bug
      expect(response.status).not.toBe(404)

    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('BUG CONFIRMED: Endpoint returns 404 - route does not exist in API Gateway')
        expect(error.response.status).not.toBe(404)
      } else {
        throw error
      }
    }
  }, TEST_TIMEOUT)
})