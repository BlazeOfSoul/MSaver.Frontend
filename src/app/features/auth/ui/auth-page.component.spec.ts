import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
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

    beforeEach(async () => {
        authService = {
            login: vi.fn(),
            register: vi.fn(),
        };

        await TestBed.configureTestingModule({
            imports: [AuthPageComponent],
            providers: [
                { provide: AuthService, useValue: authService },
                { provide: AuthStore, useValue: { setSession: vi.fn() } },
                { provide: Router, useValue: { navigateByUrl: vi.fn() } },
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
});
