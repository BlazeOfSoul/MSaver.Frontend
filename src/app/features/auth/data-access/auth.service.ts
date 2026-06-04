import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    AuthSessionResponse,
    LoginRequest,
    LogoutClientRequest,
    RefreshTokenRequest,
    RegisterRequest,
    RegisterResponse,
} from '../../../core/models/auth.models';
import { environment } from '../../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/Auth`;

    register(payload: RegisterRequest): Observable<RegisterResponse> {
        return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, payload);
    }

    login(payload: LoginRequest): Observable<AuthSessionResponse> {
        return this.http.post<AuthSessionResponse>(`${this.baseUrl}/login`, payload);
    }

    refresh(refreshToken: string): Observable<AuthSessionResponse> {
        const payload: RefreshTokenRequest = { refreshToken };
        return this.http.post<AuthSessionResponse>(`${this.baseUrl}/refresh`, payload);
    }

    logout(clientId: string): Observable<void> {
        const payload: LogoutClientRequest = { clientId };
        return this.http.post<void>(`${this.baseUrl}/logout`, payload);
    }
}
