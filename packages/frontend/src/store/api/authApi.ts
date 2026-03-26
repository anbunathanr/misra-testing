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
  accessToken: string
  refreshToken: string
  expiresIn?: number
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn?: number
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
    }),
    registerUser: builder.mutation<void, { email: string; password: string; name: string }>({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials
      })
    }),
    confirmRegistration: builder.mutation<void, { email: string; code: string }>({
      query: (credentials) => ({
        url: '/auth/confirm-registration',
        method: 'POST',
        body: credentials
      })
    }),
    resendConfirmationCode: builder.mutation<void, string>({
      query: (email) => ({
        url: '/auth/resend-confirmation',
        method: 'POST',
        body: { email }
      })
    }),
    changePassword: builder.mutation<void, { oldPassword: string; newPassword: string }>({
      query: (credentials) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: credentials
      })
    }),
    forgotPassword: builder.mutation<void, string>({
      query: (email) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: { email }
      })
    }),
    confirmPassword: builder.mutation<void, { email: string; code: string; newPassword: string }>({
      query: (credentials) => ({
        url: '/auth/confirm-password',
        method: 'POST',
        body: credentials
      })
    })
  })
})

export const {
  useLoginMutation,
  useRefreshTokenMutation,
  useGetUserProfileQuery,
  useRegisterUserMutation,
  useConfirmRegistrationMutation,
  useResendConfirmationCodeMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useConfirmPasswordMutation
} = authApi
