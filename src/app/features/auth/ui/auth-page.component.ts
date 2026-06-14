import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../data-access/auth.service';
import { AuthStore } from '../data-access/auth.store';
import { Button } from '../../../shared/ui/button/button';
import { InputComponent } from '../../../shared/ui/input/input';
import { ApiErrorDetails, readApiError } from '../../../core/api-error.utils';

type AuthMode = 'login' | 'register';

const EMAIL_VALIDATORS = [Validators.required, Validators.email, Validators.maxLength(100)];
const USERNAME_VALIDATORS = [Validators.required, Validators.maxLength(50)];
const LOGIN_PASSWORD_VALIDATORS = [
    Validators.required,
    Validators.minLength(6),
    Validators.maxLength(100),
];
const REGISTER_PASSWORD_VALIDATORS = [
    ...LOGIN_PASSWORD_VALIDATORS,
    Validators.pattern(/[^a-zA-Z0-9]/),
];

@Component({
    selector: 'app-auth-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, InputComponent, Button],
    templateUrl: './auth-page.component.html',
    styleUrls: ['./auth-page.component.css', './auth-page.part-2.css', './auth-page.part-3.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPageComponent {
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly authStore = inject(AuthStore);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private isDestroyed = false;

    readonly mode = signal<AuthMode>('login');
    readonly loading = signal(false);
    readonly showPassword = signal(false);
    readonly errorMessage = signal('');
    readonly successMessage = signal('');

    readonly isLogin = computed(() => this.mode() === 'login');

    readonly form = this.fb.nonNullable.group({
        username: [''],
        email: ['', EMAIL_VALIDATORS],
        password: ['', LOGIN_PASSWORD_VALIDATORS],
        confirmPassword: [''],
    });

    constructor() {
        this.destroyRef.onDestroy(() => {
            this.isDestroyed = true;
        });
    }

    get usernameCtrl() {
        return this.form.controls.username;
    }

    get emailCtrl() {
        return this.form.controls.email;
    }

    get passwordCtrl() {
        return this.form.controls.password;
    }

    get confirmPasswordCtrl() {
        return this.form.controls.confirmPassword;
    }

    toggleMode(): void {
        this.setMode(this.isLogin() ? 'register' : 'login');
    }

    setMode(nextMode: AuthMode): void {
        if (this.mode() === nextMode) {
            return;
        }

        this.mode.set(nextMode);
        this.errorMessage.set('');
        this.successMessage.set('');
        this.showPassword.set(false);
        this.clearServerErrors();

        this.form.reset({
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
        });

        this.applyModeValidators(nextMode);
    }

    togglePassword(): void {
        this.showPassword.update((value) => !value);
    }

    submit(): void {
        this.errorMessage.set('');
        this.successMessage.set('');
        this.clearServerErrors();
        this.applyModeValidators(this.mode());

        if (this.form.invalid || this.loading()) {
            this.form.markAllAsTouched();
            return;
        }

        if (!this.isLogin() && this.passwordCtrl.value !== this.confirmPasswordCtrl.value) {
            this.confirmPasswordCtrl.setErrors({
                ...(this.confirmPasswordCtrl.errors ?? {}),
                mismatch: true,
            });
            this.confirmPasswordCtrl.markAsTouched();
            return;
        }

        this.loading.set(true);

        const { username, email, password } = this.form.getRawValue();

        if (this.isLogin()) {
            this.authService
                .login({ email, password })
                .pipe(
                    finalize(() => this.stopLoadingIfAlive()),
                    takeUntilDestroyed(this.destroyRef),
                )
                .subscribe({
                    next: (response) => {
                        this.authStore.setSession(response);
                        this.router.navigateByUrl('/');
                    },
                    error: (error) => this.handleError(error),
                });

            return;
        }

        this.authService
            .register({ username, email, password })
            .pipe(finalize(() => this.stopLoadingIfAlive()), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.successMessage.set('Аккаунт создан. Теперь войдите.');
                    this.mode.set('login');
                    this.showPassword.set(false);
                    this.applyModeValidators('login');
                    this.clearServerErrors();
                    this.form.patchValue({
                        username: '',
                        password: '',
                        confirmPassword: '',
                    });
                },
                error: (error) => this.handleError(error),
            });
    }

    getControlError(control: AbstractControl | null): string | null {
        if (!control || !control.touched || !control.errors) {
            return null;
        }

        if (control.errors['required']) {
            return 'Поле обязательно для заполнения.';
        }

        if (control.errors['email']) {
            return 'Введите корректный email.';
        }

        if (control.errors['minlength']) {
            const requiredLength = control.errors['minlength'].requiredLength;
            return `Минимум ${requiredLength} символов.`;
        }

        if (control.errors['maxlength']) {
            const requiredLength = control.errors['maxlength'].requiredLength;
            return `Максимум ${requiredLength} символов.`;
        }

        if (control.errors['pattern']) {
            return 'Пароль должен содержать хотя бы один специальный символ.';
        }

        if (control.errors['mismatch']) {
            return 'Пароли не совпадают.';
        }

        if (control.errors['server']) {
            return control.errors['server'];
        }

        return null;
    }

    private handleError(error: unknown): void {
        const apiError = readApiError(error);
        const details = apiError?.details;
        const message = apiError?.message;

        if (this.isLogin()) {
            this.errorMessage.set(this.resolveLoginErrorMessage(error, message));
            return;
        }

        const hasFieldDetails =
            details && typeof details === 'object' && Object.keys(details).length > 0;

        if (hasFieldDetails) {
            this.applyServerErrors(details);
            this.errorMessage.set('');
            return;
        }

        if (this.isNetworkError(error, message)) {
            this.errorMessage.set(
                'Не удалось подключиться. Проверьте интернет и попробуйте снова.',
            );
            return;
        }

        if (message && !this.isTechnicalErrorMessage(message)) {
            this.errorMessage.set(message);
            return;
        }

        this.errorMessage.set('Не удалось выполнить запрос. Попробуйте снова.');
    }

    private resolveLoginErrorMessage(error: unknown, message?: string): string {
        if (message && !this.isTechnicalErrorMessage(message)) {
            return message;
        }

        if (this.isNetworkError(error, message)) {
            return 'Не удалось подключиться. Проверьте интернет и попробуйте снова.';
        }

        if (error instanceof HttpErrorResponse && error.status === 401) {
            return 'Неверный email или пароль.';
        }

        return 'Не удалось войти в аккаунт. Попробуйте снова.';
    }

    private stopLoadingIfAlive(): void {
        if (this.isDestroyed) {
            return;
        }

        this.loading.set(false);
    }

    private applyModeValidators(mode: AuthMode): void {
        if (mode === 'register') {
            this.usernameCtrl.setValidators(USERNAME_VALIDATORS);
            this.passwordCtrl.setValidators(REGISTER_PASSWORD_VALIDATORS);
            this.confirmPasswordCtrl.setValidators([Validators.required]);
        } else {
            this.usernameCtrl.clearValidators();
            this.passwordCtrl.setValidators(LOGIN_PASSWORD_VALIDATORS);
            this.confirmPasswordCtrl.clearValidators();
        }

        this.usernameCtrl.updateValueAndValidity({ emitEvent: false });
        this.passwordCtrl.updateValueAndValidity({ emitEvent: false });
        this.confirmPasswordCtrl.updateValueAndValidity({ emitEvent: false });
    }

    private isNetworkError(error: unknown, message?: string): boolean {
        if (error instanceof HttpErrorResponse && error.status === 0) {
            return true;
        }

        if (this.isNetworkTransportMessage(message)) {
            return true;
        }

        if (
            !(error instanceof HttpErrorResponse) &&
            error &&
            typeof error === 'object' &&
            'message' in error &&
            typeof error.message === 'string' &&
            this.isNetworkTransportMessage(error.message)
        ) {
            return true;
        }

        const nestedMessage =
            error &&
            typeof error === 'object' &&
            'error' in error &&
            error.error &&
            typeof error.error === 'object' &&
            'message' in error.error &&
            typeof error.error.message === 'string'
                ? error.error.message
                : undefined;

        return this.isNetworkTransportMessage(nestedMessage);
    }

    private isTechnicalErrorMessage(message?: string): boolean {
        if (!message) {
            return false;
        }

        const normalizedMessage = message.trim().toLowerCase();

        return (
            normalizedMessage.includes('failed to fetch') ||
            normalizedMessage.includes('fetch failed') ||
            normalizedMessage.includes('http failure response')
        );
    }

    private isNetworkTransportMessage(message?: string): boolean {
        if (!message) {
            return false;
        }

        const normalizedMessage = message.trim().toLowerCase();

        return (
            normalizedMessage.includes('failed to fetch') ||
            normalizedMessage.includes('fetch failed') ||
            normalizedMessage.includes('load failed')
        );
    }

    private applyServerErrors(details: ApiErrorDetails): void {
        Object.entries(details).forEach(([field, messages]) => {
            const message = messages?.[0];
            if (!message) {
                return;
            }

            const control = this.findControlByBackendField(field);
            if (!control) {
                return;
            }

            control.setErrors({
                ...(control.errors ?? {}),
                server: message,
            });

            control.markAsTouched();
        });
    }

    private findControlByBackendField(field: string): AbstractControl | null {
        const normalized = field.trim().toLowerCase();

        switch (normalized) {
            case 'username':
                return this.usernameCtrl;
            case 'email':
                return this.emailCtrl;
            case 'password':
                return this.passwordCtrl;
            case 'confirmpassword':
                return this.confirmPasswordCtrl;
            case 'refreshtoken':
                return null;
            default:
                return this.form.get(field) ?? null;
        }
    }

    private clearServerErrors(): void {
        this.clearServerError(this.usernameCtrl);
        this.clearServerError(this.emailCtrl);
        this.clearServerError(this.passwordCtrl);
        this.clearServerError(this.confirmPasswordCtrl);
    }

    private clearServerError(control: AbstractControl): void {
        if (!control.errors) {
            return;
        }

        const { server, mismatch, ...rest } = control.errors;
        const nextErrors = Object.keys(rest).length ? rest : null;
        control.setErrors(nextErrors);
    }
}
