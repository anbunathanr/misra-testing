import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from './index.ts'
import { authService } from '../services/auth-service'

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
    return headers
  }
})

// Enhanced base query with automatic token refresh
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  // Check if token needs refresh before making the request
  if (authService.needsRefresh()) {
    console.log('Token needs refresh before API call, refreshing...')
    const newToken = await authService.refreshAccessToken()
    
    if (newToken) {
      // Update the token in Redux state
      const state = api.getState() as RootState
      if (state.auth.user) {
        api.dispatch({
          type: 'auth/setCredentials',
          payload: {
            user: state.auth.user,
            token: newToken
          }
        })
      }
    }
  }

  // Make the actual request
  let result = await baseQuery(args, api, extraOptions)

  // If we get a 401, try to refresh the token and retry
  if (result.error && result.error.status === 401) {
    console.log('Got 401, attempting token refresh...')
    
    const newToken = await authService.refreshAccessToken()
    
    if (newToken) {
      // Update the token in Redux state
      const state = api.getState() as RootState
      if (state.auth.user) {
        api.dispatch({
          type: 'auth/setCredentials',
          payload: {
            user: state.auth.user,
            token: newToken
          }
        })
      }
      
      // Retry the original request with new token
      result = await baseQuery(args, api, extraOptions)
    } else {
      // Token refresh failed, logout user
      console.log('Token refresh failed, logging out...')
      api.dispatch({ type: 'auth/logout/fulfilled' })
    }
  }

  return result
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'File', 'Analysis', 'Insight', 'Projects', 'TestSuites', 'TestCases', 'Executions', 'MISRAAnalysis', 'MISRAReport'],
  endpoints: () => ({})
})
