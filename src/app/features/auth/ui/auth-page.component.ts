import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../data-access/auth.service';
import { AuthStore } from '../data-access/auth.store';

type AuthMode = 'login' | 'register';

type ApiErrorDetails = Record<string, string[]>;

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  readonly mode = signal<AuthMode>('login');
  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly isLogin = computed(() => this.mode() === 'login');

  readonly form = this.fb.nonNullable.group({
    username: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: [''],
  });

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

  get passwordsDoNotMatch(): boolean {
    return (
      !this.isLogin() &&
      this.confirmPasswordCtrl.touched &&
      !!this.passwordCtrl.value &&
      !!this.confirmPasswordCtrl.value &&
      this.passwordCtrl.value !== this.confirmPasswordCtrl.value
    );
  }

  toggleMode(): void {
    const nextMode = this.isLogin() ? 'register' : 'login';

    this.mode.set(nextMode);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.clearServerErrors();

    this.form.reset({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    });

    if (nextMode === 'register') {
      this.usernameCtrl.setValidators([Validators.required, Validators.minLength(3)]);
      this.confirmPasswordCtrl.setValidators([Validators.required]);
    } else {
      this.usernameCtrl.clearValidators();
      this.confirmPasswordCtrl.clearValidators();
    }

    this.usernameCtrl.updateValueAndValidity({ emitEvent: false });
    this.confirmPasswordCtrl.updateValueAndValidity({ emitEvent: false });
  }

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  submit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.clearServerErrors();

    if (this.isLogin()) {
      this.usernameCtrl.clearValidators();
      this.confirmPasswordCtrl.clearValidators();
    } else {
      this.usernameCtrl.setValidators([Validators.required, Validators.minLength(3)]);
      this.confirmPasswordCtrl.setValidators([Validators.required]);
    }

    this.usernameCtrl.updateValueAndValidity({ emitEvent: false });
    this.confirmPasswordCtrl.updateValueAndValidity({ emitEvent: false });

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
        .pipe(finalize(() => this.loading.set(false)))
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
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Аккаунт создан. Теперь войдите.');
          this.mode.set('login');
          this.usernameCtrl.clearValidators();
          this.confirmPasswordCtrl.clearValidators();
          this.clearServerErrors();
          this.form.patchValue({
            username: '',
            password: '',
            confirmPassword: '',
          });
          this.usernameCtrl.updateValueAndValidity({ emitEvent: false });
          this.confirmPasswordCtrl.updateValueAndValidity({ emitEvent: false });
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
      return `Минимум ${requiredLength} символа.`;
    }

    if (control.errors['mismatch']) {
      return 'Пароли не совпадают.';
    }

    if (control.errors['server']) {
      return control.errors['server'];
    }

    return null;
  }

  private handleError(error: any): void {
    const details = error?.error?.details as Record<string, string[]> | undefined;
    const message = error?.error?.message as string | undefined;

    if (this.isLogin()) {
      this.errorMessage.set(message || 'Неверный email или пароль.');
      return;
    }

    const hasFieldDetails =
      details && typeof details === 'object' && Object.keys(details).length > 0;

    if (hasFieldDetails) {
      this.applyServerErrors(details);
      this.errorMessage.set('');
      return;
    }

    this.errorMessage.set(message || 'Не удалось выполнить запрос. Попробуйте снова.');
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
