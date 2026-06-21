export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export type RegisterResponse = string;

export interface AuthSessionResponse {
    id: string;
    name?: string | null;
    username?: string | null;
    email: string;
    clientId: string;
}
