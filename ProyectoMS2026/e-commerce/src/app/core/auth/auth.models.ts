export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  userId: number;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  username: string;
  roles: string[];
  nombreCompleto?: string;
  email?: string;
  nombres?: string;
  apellidos?: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  nombreCompleto?: string;
  email?: string;
}

export interface RegisterResponse {
  id: number;
  username: string;
  roles: string[];
  nombreCompleto?: string;
  email?: string;
}

export interface AuthSession {
  userId: number;
  accessToken: string;
  username: string;
  roles: string[];
  nombreCompleto?: string;
  email?: string;
  nombres?: string;
  apellidos?: string;
}
