import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { PerfilStorageService } from '../services/perfil-storage.service';
import { AuthSession, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from './auth.models';

const STORAGE_KEY = 'upeu_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly perfilStorage = inject(PerfilStorageService);
  private readonly session = signal<AuthSession | null>(this.loadSession());

  readonly currentSession = this.session.asReadonly();
  readonly isAdminUser = computed(() => this.checkIsAdmin(this.session()));
  readonly canUseCart = computed(() => !this.isAdminUser());

  login(credentials: LoginRequest) {
    return this.http.post<LoginResponse>('/auth/login', credentials).pipe(
      tap((response) => this.persistSession(response)),
    );
  }

  register(payload: RegisterRequest) {
    return this.http.post<RegisterResponse>('/auth/register', payload);
  }

  inicializarPerfilDesdeRegistro(userId: number, nombreCompleto: string, email: string): void {
    const data = this.perfilStorage.sembrarDesdeRegistro(userId, nombreCompleto, email);
    this.actualizarPerfilEnSesion({
      nombreCompleto: data.nombreCompleto,
      email: data.email,
      nombres: data.nombres,
      apellidos: data.apellidos,
    });
  }

  getPerfilSemilla() {
    const session = this.session();
    if (!session) return null;
    return {
      nombreCompleto: session.nombreCompleto,
      email: session.email,
      nombres: session.nombres,
      apellidos: session.apellidos,
    };
  }

  tieneDatosRegistro(): boolean {
    const semilla = this.getPerfilSemilla();
    return !!(semilla?.nombreCompleto?.trim() || semilla?.email?.trim());
  }

  private persistSession(response: LoginResponse): void {
    const prev = this.session();
    const session: AuthSession = {
      userId: response.userId,
      accessToken: response.accessToken,
      username: response.username,
      roles: response.roles ?? [],
      nombreCompleto: response.nombreCompleto ?? prev?.nombreCompleto,
      email: response.email ?? prev?.email,
      nombres: response.nombres ?? prev?.nombres,
      apellidos: response.apellidos ?? prev?.apellidos,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.session.set(session);

    if (response.nombreCompleto || response.email) {
      const local = this.perfilStorage.leer(response.userId);
      if (!local?.email || !local?.nombres) {
        this.perfilStorage.sembrarDesdeRegistro(
          response.userId,
          response.nombreCompleto ?? local?.nombreCompleto ?? response.username,
          response.email ?? local?.email ?? `${response.username}@techstore.com`,
        );
      }
    }
  }

  private actualizarPerfilEnSesion(data: Partial<AuthSession>): void {
    const current = this.session();
    if (!current) return;
    const next: AuthSession = { ...current, ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    this.session.set(next);
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

  getEmail(): string | null {
    return this.session()?.email ?? this.getPerfilSemilla()?.email ?? null;
  }

  getRoles(): string[] {
    return this.session()?.roles ?? [];
  }

  hasRole(role: string): boolean {
    const normalized = role.startsWith('ROLE_') ? role : `ROLE_${role}`;
    const bare = normalized.replace(/^ROLE_/, '');
    return this.getRoles().some((stored) => {
      const storedNormalized = stored.startsWith('ROLE_') ? stored : `ROLE_${stored}`;
      return storedNormalized === normalized || stored === bare;
    });
  }

  isAdmin(): boolean {
    return this.checkIsAdmin(this.session());
  }

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

  private checkIsAdmin(session: AuthSession | null): boolean {
    if (!session) return false;

    const roles = session.roles ?? [];
    const hasAdminRole = roles.some((role) => {
      const normalized = role.startsWith('ROLE_') ? role : `ROLE_${role}`;
      return normalized === 'ROLE_ADMIN' || role.toUpperCase() === 'ADMIN';
    });

    return hasAdminRole || session.username?.toLowerCase() === 'admin';
  }
}
