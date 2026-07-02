import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/services/api.service';
import { extractHttpErrorMessage } from '../../core/utils/http-error.util';

const REMEMBER_KEY = 'techstore_remember_user';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    rememberMe: [false],
  });

  ngOnInit(): void {
    const savedUser = localStorage.getItem(REMEMBER_KEY);
    if (savedUser) {
      this.form.patchValue({ username: savedUser, rememberMe: true });
    }
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, password, rememberMe } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);

    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, username);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    this.auth.login({ username, password }).subscribe({
      next: () => {
        if (this.auth.isAdmin()) {
          void this.cart.clear();
        } else {
          void this.cart.refreshFromServer();
        }
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl && !this.auth.isAdmin()) {
          void this.router.navigateByUrl(returnUrl);
          return;
        }
        void this.router.navigate([this.auth.getHomeRoute()]);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractHttpErrorMessage(err, 'Usuario o contraseña incorrectos'));
      },
      complete: () => this.loading.set(false),
    });
  }
}
