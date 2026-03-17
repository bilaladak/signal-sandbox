export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  organisationName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: TokenPair;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  organisationId: string;
  role: UserRole;
  createdAt: string;
}

export type UserRole = 'owner' | 'admin' | 'analyst' | 'viewer';

export interface JwtPayload {
  sub: string;
  email: string;
  orgId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
