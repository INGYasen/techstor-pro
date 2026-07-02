import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Usuario } from '../../core/models/api.models';
import { UsuarioService } from '../../core/services/api.service';
import { extractHttpErrorMessage } from '../../core/utils/http-error.util';

type RolFiltro = 'TODOS' | 'ADMIN' | 'USER';

@Component({
  selector: 'app-admin-usuarios',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-usuarios.component.html',
  styleUrl: './admin-usuarios.component.scss',
})
export class AdminUsuariosComponent implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly fb = inject(FormBuilder);

  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly modalAbierto = signal(false);
  protected readonly editando = signal<Usuario | null>(null);
  protected readonly busqueda = signal('');
  protected readonly filtroRol = signal<RolFiltro>('TODOS');

  protected readonly usuariosFiltrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const rol = this.filtroRol();

    return this.usuarios().filter((u) => {
      const coincideRol = rol === 'TODOS' || u.roles.includes(rol);
      if (!coincideRol) return false;
      if (!q) return true;
      return (
        u.nombreCompleto.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        String(u.id).includes(q)
      );
    });
  });

  protected readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.minLength(6)]],
    nombreCompleto: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['USER' as 'ADMIN' | 'USER', Validators.required],
    enabled: [true],
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.usuarioService.listar().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudieron cargar los usuarios'));
        this.loading.set(false);
      },
    });
  }

  abrirNuevo(): void {
    this.editando.set(null);
    this.form.reset({
      username: '',
      password: '',
      nombreCompleto: '',
      email: '',
      role: 'USER',
      enabled: true,
    });
    this.form.controls.username.enable();
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.controls.password.updateValueAndValidity();
    this.modalAbierto.set(true);
    this.message.set(null);
    this.error.set(null);
  }

  abrirEditar(usuario: Usuario): void {
    this.editando.set(usuario);
    this.form.reset({
      username: usuario.username,
      password: '',
      nombreCompleto: usuario.nombreCompleto,
      email: usuario.email,
      role: usuario.roles.includes('ADMIN') ? 'ADMIN' : 'USER',
      enabled: usuario.enabled,
    });
    this.form.controls.username.disable();
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.modalAbierto.set(true);
    this.message.set(null);
    this.error.set(null);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.editando.set(null);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const raw = this.form.getRawValue();
    const edit = this.editando();

    if (edit) {
      const body: {
        nombreCompleto: string;
        email: string;
        role: 'ADMIN' | 'USER';
        enabled: boolean;
        password?: string;
      } = {
        nombreCompleto: raw.nombreCompleto,
        email: raw.email,
        role: raw.role,
        enabled: raw.enabled,
      };
      if (raw.password) body.password = raw.password;

      this.usuarioService.actualizar(edit.id, body).subscribe({
        next: () => {
          this.message.set('Usuario actualizado correctamente');
          this.saving.set(false);
          this.cerrarModal();
          this.cargar();
        },
        error: (err) => {
          this.error.set(extractHttpErrorMessage(err, 'No se pudo actualizar el usuario'));
          this.saving.set(false);
        },
      });
      return;
    }

    this.usuarioService
      .crear({
        username: raw.username,
        password: raw.password,
        nombreCompleto: raw.nombreCompleto,
        email: raw.email,
        role: raw.role,
        enabled: raw.enabled,
      })
      .subscribe({
        next: () => {
          this.message.set('Usuario creado correctamente');
          this.saving.set(false);
          this.cerrarModal();
          this.cargar();
        },
        error: (err) => {
          this.error.set(extractHttpErrorMessage(err, 'No se pudo crear el usuario'));
          this.saving.set(false);
        },
      });
  }

  eliminar(usuario: Usuario): void {
    if (!confirm(`¿Eliminar al usuario "${usuario.nombreCompleto}"?`)) return;

    this.usuarioService.eliminar(usuario.id).subscribe({
      next: () => {
        this.message.set('Usuario eliminado');
        this.cargar();
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudo eliminar el usuario'));
      },
    });
  }

  rolEtiqueta(roles: string[]): string {
    return roles.includes('ADMIN') ? 'Administrador' : 'Cliente';
  }

  rolClase(roles: string[]): string {
    return roles.includes('ADMIN') ? 'admin' : 'cliente';
  }

  iniciales(nombre: string): string {
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }

  onBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busqueda.set(input.value);
  }

  onFiltroRol(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filtroRol.set(select.value as RolFiltro);
  }
}
