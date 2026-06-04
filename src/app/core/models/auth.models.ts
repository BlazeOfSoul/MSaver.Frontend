export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface LogoutClientRequest {
    clientId: string;
}

export type RegisterResponse = string;

export interface AuthSessionResponse {
    id: string;
    name: string;
    email: string;
    clientId: string;
    accessToken: string;
    refreshToken: string;
}
