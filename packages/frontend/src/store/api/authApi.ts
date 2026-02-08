import { api } from '../api'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: {
    userId: string
    email: string
    name: string
    role: string
    organizationId?: string
  }
  token: string
  refreshToken: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  token: string
  refreshToken: string
}

export interface UserProfile {
  userId: string
  email: string
  name: string
  role: string
  organizationId?: string
  createdAt: number
  lastLogin?: number
}

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials
      }),
      invalidatesTags: ['User']
    }),
    refreshToken: builder.mutation<RefreshTokenResponse, RefreshTokenRequest>({
      query: (body) => ({
        url: '/auth/refresh',
        method: 'POST',
        body
      })
    }),
    getUserProfile: builder.query<UserProfile, void>({
      query: () => '/auth/profile',
      providesTags: ['User']
    })
  })
})

export const {
  useLoginMutation,
  useRefreshTokenMutation,
  useGetUserProfileQuery
} = authApi
