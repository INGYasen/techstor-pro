import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { extractHttpErrorMessage } from '../../core/utils/http-error.util';

function passwordStrength(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (!value) return null;

  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);

  if (value.length < 8 || !hasUpper || !hasLower || !hasNumber) {
    return { passwordStrength: true };
  }

  return null;
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;

  if (!password || !confirm) {
    return null;
  }

  return password === confirm ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(8), passwordStrength]],
      confirmPassword: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue],
    },
    { validators: passwordsMatch },
  );

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  showFieldError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && control.touched;
  }

  onSubmit(): void {
    this.error.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(this.buildValidationMessage());
      return;
    }

    const { username, password, fullName, email } = this.form.getRawValue();
    this.loading.set(true);

    this.auth
      .register({
        username,
        password,
        nombreCompleto: fullName,
        email,
      })
      .pipe(
        switchMap(() => this.auth.login({ username, password })),
        tap((login) => this.auth.inicializarPerfilDesdeRegistro(login.userId, fullName, email)),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/catalogo']);
        },
        error: (err) => {
          this.loading.set(false);
          const message = extractHttpErrorMessage(err, 'No se pudo crear la cuenta');
          if (err?.status === 403 || err?.status === 409) {
            this.error.set(message.includes('existe') ? message : 'Ese nombre de usuario ya está en uso. Prueba con otro o inicia sesión.');
          } else {
            this.error.set(message);
          }
        },
        complete: () => this.loading.set(false),
      });
  }

  private buildValidationMessage(): string {
    const messages: string[] = [];

    if (this.form.get('fullName')?.invalid) {
      messages.push('Ingresa tu nombre completo (mínimo 3 caracteres)');
    }
    if (this.form.get('email')?.invalid) {
      messages.push('Ingresa un correo electrónico válido');
    }
    if (this.form.get('username')?.invalid) {
      messages.push('El usuario debe tener al menos 3 caracteres');
    }
    if (this.form.get('password')?.hasError('required')) {
      messages.push('Ingresa una contraseña');
    } else if (this.form.get('password')?.hasError('passwordStrength') || this.form.get('password')?.hasError('minlength')) {
      messages.push('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número');
    }
    if (this.form.get('confirmPassword')?.invalid) {
      messages.push('Confirma tu contraseña');
    }
    if (this.form.hasError('passwordsMismatch')) {
      messages.push('Las contraseñas no coinciden');
    }
    if (this.form.get('acceptTerms')?.invalid) {
      messages.push('Debes aceptar los Términos y Condiciones');
    }

    return messages.length ? messages.join('. ') + '.' : 'Revisa los datos del formulario.';
  }
}
