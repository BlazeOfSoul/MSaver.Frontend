import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { AuthSessionResponse } from '../../../core/models/auth.models';
import { AuthService } from '../data-access/auth.service';
import { AuthStore } from '../data-access/auth.store';
import { AuthPageComponent } from './auth-page.component';

describe('AuthPageComponent', () => {
    let fixture: ComponentFixture<AuthPageComponent>;
    let component: AuthPageComponent;
    let authService: {
        login: ReturnType<typeof vi.fn>;
        register: ReturnType<typeof vi.fn>;
    };
    let authStore: {
        setSession: ReturnType<typeof vi.fn>;
    };
    let router: {
        navigateByUrl: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        authService = {
            login: vi.fn(),
            register: vi.fn(),
        };
        authStore = {
            setSession: vi.fn(),
        };
        router = {
            navigateByUrl: vi.fn(),
        };

        await TestBed.configureTestingModule({
            imports: [AuthPageComponent],
            providers: [
                { provide: AuthService, useValue: authService },
                { provide: AuthStore, useValue: authStore },
                { provide: Router, useValue: router },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AuthPageComponent);
        component = fixture.componentInstance;
    });

    it('shows a friendly message when registration cannot connect', () => {
        authService.register.mockReturnValue(
            throwError(
                () =>
                    new HttpErrorResponse({
                        status: 0,
                        error: { message: 'Failed to fetch' },
                    }),
            ),
        );

        component.setMode('register');
        component.form.setValue({
            username: 'Codex QA',
            email: 'codex@example.com',
            password: 'Qwerty123!',
            confirmPassword: 'Qwerty123!',
        });

        component.submit();

        expect(component.errorMessage()).toBe(
            'Не удалось подключиться. Проверьте интернет и попробуйте снова.',
        );
    });

    it('shows the backend login error when the account does not exist', () => {
        authService.login.mockReturnValue(
            throwError(
                () =>
                    new HttpErrorResponse({
                        status: 401,
                        error: {
                            code: 'Auth.UserNotFound',
                            message: 'Пользователь не найден.',
                            details: {},
                        },
                    }),
            ),
        );

        component.form.setValue({
            username: '',
            email: 'missing@example.com',
            password: 'Qwerty123!',
            confirmPassword: '',
        });

        component.submit();

        expect(component.errorMessage()).toBe('Пользователь не найден.');
    });

    it('ignores malformed registration field details and shows the backend message', () => {
        authService.register.mockReturnValue(
            throwError(
                () =>
                    new HttpErrorResponse({
                        status: 400,
                        error: {
                            code: 'Validation',
                            message: 'Registration failed.',
                            details: {
                                Email: 'Use a real email.',
                            },
                        },
                    }),
            ),
        );

        component.setMode('register');
        component.form.setValue({
            username: 'Codex QA',
            email: 'codex@example.com',
            password: 'Qwerty123!',
            confirmPassword: 'Qwerty123!',
        });

        component.submit();

        expect(component.errorMessage()).toBe('Registration failed.');
        expect(component.emailCtrl.errors?.['server']).toBeUndefined();
    });

    it('does not complete login side effects after the page is destroyed', () => {
        const login$ = new Subject<AuthSessionResponse>();
        authService.login.mockReturnValue(login$.asObservable());

        component.form.setValue({
            username: '',
            email: 'codex@example.com',
            password: 'Qwerty123!',
            confirmPassword: '',
        });

        component.submit();
        fixture.destroy();

        login$.next({
            id: 'user-id',
            name: 'Codex QA',
            email: 'codex@example.com',
            clientId: 'client-id',
        });
        login$.complete();

        expect(authStore.setSession).not.toHaveBeenCalled();
        expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('does not reset loading after a pending login is cancelled by page destroy', () => {
        const login$ = new Subject<AuthSessionResponse>();
        authService.login.mockReturnValue(login$.asObservable());

        component.form.setValue({
            username: '',
            email: 'codex@example.com',
            password: 'Qwerty123!',
            confirmPassword: '',
        });

        component.submit();

        expect(component.loading()).toBe(true);

        fixture.destroy();

        expect(component.loading()).toBe(true);
    });

    it('does not complete registration side effects after the page is destroyed', () => {
        const register$ = new Subject<string>();
        authService.register.mockReturnValue(register$.asObservable());

        component.setMode('register');
        component.form.setValue({
            username: 'Codex QA',
            email: 'codex@example.com',
            password: 'Qwerty123!',
            confirmPassword: 'Qwerty123!',
        });

        component.submit();
        fixture.destroy();

        register$.next('user-id');
        register$.complete();

        expect(component.mode()).toBe('register');
        expect(component.successMessage()).toBe('');
    });
});
