import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { AuthSession, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from './auth.models';

const STORAGE_KEY = 'upeu_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<AuthSession | null>(this.loadSession());

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  readonly currentSession = this.session.asReadonly();

  login(credentials: LoginRequest) {
    return this.http.post<LoginResponse>('/auth/login', credentials).pipe(
      tap((response) => this.persistSession(response)),
    );
  }

  register(payload: RegisterRequest) {
    return this.http.post<RegisterResponse>('/auth/register', payload);
  }

  private persistSession(response: LoginResponse): void {
    const session: AuthSession = {
      userId: response.userId,
      accessToken: response.accessToken,
      username: response.username,
      roles: response.roles ?? [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.session.set(session);
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    void this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this.session() !== null;
  }

  getToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  getUsername(): string | null {
    return this.session()?.username ?? null;
  }

  getRoles(): string[] {
    return this.session()?.roles ?? [];
  }

  hasRole(role: string): boolean {
    const normalized = role.startsWith('ROLE_') ? role : `ROLE_${role}`;
    return this.getRoles().includes(normalized);
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  /** Usa el userId devuelto por el backend al iniciar sesión. */
  getUserId(): number {
    const userId = this.session()?.userId;
    if (userId != null) {
      return userId;
    }

    const username = this.getUsername();
    if (username === 'admin') return 1;
    if (username === 'user') return 2;
    return 1;
  }

  getHomeRoute(): string {
    return this.isAdmin() ? '/admin' : '/catalogo';
  }

  private loadSession(): AuthSession | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}
