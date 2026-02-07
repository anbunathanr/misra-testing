/**
 * User data models and types
 */

export type UserRole = 'admin' | 'developer' | 'viewer'

export interface UserPreferences {
  theme: 'light' | 'dark'
  notifications: {
    email: boolean
    webhook: boolean
  }
  defaultMisraRuleSet: 'MISRA_C_2004' | 'MISRA_C_2012' | 'MISRA_CPP_2008'
}

export interface User {
  userId: string
  email: string
  organizationId: string
  role: UserRole
  preferences: UserPreferences
  createdAt: Date
  lastLoginAt: Date
  active?: boolean
  firstName?: string
  lastName?: string
}

export interface CreateUserRequest {
  email: string
  organizationId: string
  role: UserRole
  preferences: UserPreferences
  firstName?: string
  lastName?: string
}

export interface UpdateUserRequest {
  role?: UserRole
  preferences?: Partial<UserPreferences>
  active?: boolean
  firstName?: string
  lastName?: string
}

export interface UserListResponse {
  users: User[]
  total: number
  page: number
  pageSize: number
}

export interface UserQueryFilters {
  organizationId?: string
  role?: UserRole
  active?: boolean
  searchTerm?: string
}
