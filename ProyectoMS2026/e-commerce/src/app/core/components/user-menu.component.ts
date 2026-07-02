import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { PerfilUsuario } from '../models/api.models';
import { PerfilStorageService } from '../services/perfil-storage.service';
import { UsuarioService } from '../services/api.service';

@Component({
  selector: 'app-user-menu',
  imports: [RouterLink],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
})
export class UserMenuComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuarioService);
  private readonly perfilStorage = inject(PerfilStorageService);

  protected readonly menuOpen = signal(false);
  protected readonly perfil = signal<PerfilUsuario | null>(null);
  protected readonly avatarUrl = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) return;

    this.usuarios.obtenerPerfil().subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        const stored = localStorage.getItem(`ts-avatar-${perfil.id}`);
        if (stored) this.avatarUrl.set(stored);
      },
      error: () => {
        const userId = this.auth.getUserId();
        const semilla = this.auth.getPerfilSemilla();
        this.perfil.set(this.perfilStorage.construirDesdeSesion(userId, this.auth.getUsername(), semilla));
        const stored = localStorage.getItem(`ts-avatar-${userId}`);
        if (stored) this.avatarUrl.set(stored);
      },
    });
  }

  protected displayName(): string {
    const perfil = this.perfil();
    const nombre = perfil?.nombreCompleto?.trim() || perfil?.nombres?.trim();
    return nombre || this.auth.getUsername() || 'Usuario';
  }

  protected initials(): string {
    return this.displayName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-wrap')) {
      this.closeMenu();
    }
  }
}
