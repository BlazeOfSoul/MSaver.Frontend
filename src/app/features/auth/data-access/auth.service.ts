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
}
