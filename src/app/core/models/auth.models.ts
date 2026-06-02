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

export interface RegisterResponse {
    id: string;
}

export interface LoginResponse {
    id: string;
    accessToken: string;
    refreshToken: string;
}
