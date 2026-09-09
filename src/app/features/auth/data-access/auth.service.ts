import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    AuthSessionResponse,
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
} from '../../../core/models/auth.models';
import { environment } from '../../../../environments/environment';

export interface AuthSessionItem {
    clientId: string;
    createdAt: string;
    expiresAt: string;
    isCurrent: boolean;
}

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
        return this.http.post<AuthSessionResponse>(`${this.baseUrl}/login`, payload, {
            withCredentials: true,
        });
    }

    refresh(): Observable<AuthSessionResponse> {
        return this.http.post<AuthSessionResponse>(
            `${this.baseUrl}/refresh`,
            {},
            { withCredentials: true },
        );
    }

    logout(): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/logout`, {}, { withCredentials: true });
    }

    sessions(): Observable<AuthSessionItem[]> {
        return this.http.get<AuthSessionItem[]>(`${this.baseUrl}/sessions`, {
            withCredentials: true,
        });
    }

    revokeSession(clientId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/sessions/${encodeURIComponent(clientId)}`, {
            withCredentials: true,
        });
    }

    logoutAll(): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/logout-all`, {}, { withCredentials: true });
    }
}
