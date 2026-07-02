import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { PerfilUpdateRequest, PerfilUsuario } from '../../core/models/api.models';
import { UsuarioService } from '../../core/services/api.service';
import { PerfilStorageService } from '../../core/services/perfil-storage.service';
import { ToastService } from '../../core/services/toast.service';
import { extractHttpErrorMessage } from '../../core/utils/http-error.util';

const DEPARTAMENTOS = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao',
  'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque',
  'Lima', 'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno',
  'San Martín', 'Tacna', 'Tumbes', 'Ucayali',
];

@Component({
  selector: 'app-cliente-perfil',
  imports: [ReactiveFormsModule],
  templateUrl: './cliente-perfil.component.html',
  styleUrl: './cliente-perfil.component.scss',
})
export class ClientePerfilComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usuarios = inject(UsuarioService);
  private readonly perfilStorage = inject(PerfilStorageService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly success = signal(false);
  protected readonly error = signal('');
  protected readonly offlineMode = signal(false);
  protected readonly avatarUrl = signal<string | null>(null);
  protected readonly departamentos = DEPARTAMENTOS;
  protected readonly sexoOptions = ['Femenino', 'Masculino', 'Otro', 'Prefiero no decir'];

  private perfilId: number | null = null;
  private snapshot: PerfilUpdateRequest | null = null;

  protected readonly form = this.fb.nonNullable.group({
    nombres: ['', Validators.required],
    apellidos: [''],
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    fechaNacimiento: [''],
    sexo: [''],
    telefono: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    pais: ['Perú', Validators.required],
    departamento: ['', Validators.required],
    provincia: ['', Validators.required],
    distrito: ['', Validators.required],
    codigoPostal: [''],
    direccion: ['', Validators.required],
    referencia: [''],
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected reintentar(): void {
    this.cargar();
  }

  protected initials(): string {
    const nombres = this.form.controls.nombres.value;
    const apellidos = this.form.controls.apellidos.value;
    const parts = `${nombres} ${apellidos}`.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
  }

  protected campoInvalido(campo: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.invalid && control.touched;
  }

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const userId = this.perfilId ?? this.auth.getUserId();
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      this.toast.error('Solo JPG, PNG o GIF.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.toast.error('La imagen no debe superar 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      localStorage.setItem(`ts-avatar-${userId}`, dataUrl);
      this.avatarUrl.set(dataUrl);
      this.toast.success('Foto actualizada.');
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  protected cancelar(): void {
    if (this.snapshot) {
      this.form.patchValue(this.snapshot as never);
      this.error.set('');
      this.success.set(false);
    } else {
      void this.router.navigate(['/catalogo']);
    }
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Completa los campos obligatorios marcados con *');
      return;
    }

    const body = this.construirBody();
    this.saving.set(true);
    this.error.set('');
    this.success.set(false);

    if (this.offlineMode()) {
      this.guardarLocal(body);
      return;
    }

    this.usuarios.actualizarPerfil(body).subscribe({
      next: (perfil) => {
        this.applyPerfil(perfil, false);
        this.perfilStorage.guardar(perfil.id, body);
        this.saving.set(false);
        this.success.set(true);
        this.toast.success('Perfil actualizado correctamente.');
      },
      error: (err) => {
        if (err instanceof HttpErrorResponse && (err.status === 403 || err.status === 404 || err.status === 0)) {
          this.offlineMode.set(true);
          this.guardarLocal(body);
          return;
        }
        this.saving.set(false);
        this.error.set(extractHttpErrorMessage(err, 'No se pudieron guardar los cambios.'));
        this.toast.error('Error al guardar el perfil.');
      },
    });
  }

  private cargar(): void {
    this.loading.set(true);
    this.error.set('');
    this.success.set(false);

    const userId = this.auth.getUserId();
    const username = this.auth.getUsername();

    this.usuarios.obtenerPerfil().subscribe({
      next: (perfil) => {
        this.offlineMode.set(false);
        this.applyPerfil(perfil, true);
      },
      error: (err) => {
        const semilla = this.auth.getPerfilSemilla();
        const local = this.perfilStorage.leer(userId);
        const base = this.perfilStorage.construirDesdeSesion(userId, username, semilla);
        const perfil = local ? { ...base, ...local, id: userId } : base;

        this.offlineMode.set(true);
        this.applyPerfil(perfil as PerfilUsuario, true);

        const tieneDatos = !!(local?.nombres || local?.email || semilla?.nombreCompleto || semilla?.email);
        if (tieneDatos) {
          this.error.set('');
        } else if (err instanceof HttpErrorResponse && err.status === 403) {
          this.error.set(
            'No se pudo conectar con el servidor de perfil. Completa tus datos y se guardarán en este navegador.',
          );
        } else {
          this.error.set(
            extractHttpErrorMessage(err, 'No se pudo cargar tu perfil desde el servidor.'),
          );
        }
      },
    });
  }

  private guardarLocal(body: PerfilUpdateRequest): void {
    const userId = this.perfilId ?? this.auth.getUserId();
    this.perfilStorage.guardar(userId, body);
    this.snapshot = { ...body };
    this.saving.set(false);
    this.success.set(true);
    this.toast.success('Perfil guardado en este dispositivo.');
  }

  private construirBody(): PerfilUpdateRequest {
    const values = this.form.getRawValue();
    return {
      nombres: values.nombres.trim(),
      apellidos: values.apellidos.trim(),
      nombreCompleto: `${values.nombres} ${values.apellidos}`.trim(),
      email: values.email.trim(),
      dni: values.dni.trim(),
      fechaNacimiento: values.fechaNacimiento || null,
      sexo: values.sexo || undefined,
      telefono: values.telefono.trim(),
      pais: values.pais,
      departamento: values.departamento,
      provincia: values.provincia.trim(),
      distrito: values.distrito.trim(),
      codigoPostal: values.codigoPostal.trim() || undefined,
      direccion: values.direccion.trim(),
      referencia: values.referencia.trim() || undefined,
    };
  }

  private applyPerfil(perfil: PerfilUsuario, desdeServidor: boolean): void {
    this.perfilId = perfil.id;
    const stored = localStorage.getItem(`ts-avatar-${perfil.id}`);
    if (stored) this.avatarUrl.set(stored);

    let nombres = perfil.nombres ?? '';
    let apellidos = perfil.apellidos ?? '';
    if (!nombres && perfil.nombreCompleto) {
      const parts = perfil.nombreCompleto.trim().split(/\s+/);
      nombres = parts.shift() ?? '';
      apellidos = parts.join(' ');
    }

    const values: PerfilUpdateRequest = {
      nombres,
      apellidos,
      dni: perfil.dni ?? '',
      fechaNacimiento: perfil.fechaNacimiento ?? '',
      sexo: perfil.sexo ?? '',
      telefono: perfil.telefono ?? '',
      email: perfil.email ?? '',
      pais: perfil.pais ?? 'Perú',
      departamento: perfil.departamento ?? '',
      provincia: perfil.provincia ?? '',
      distrito: perfil.distrito ?? '',
      codigoPostal: perfil.codigoPostal ?? '',
      direccion: perfil.direccion ?? '',
      referencia: perfil.referencia ?? '',
    };

    this.form.patchValue(values as never);
    this.snapshot = { ...values };

    if (desdeServidor && !this.offlineMode()) {
      this.perfilStorage.guardar(perfil.id, values);
    }

    this.loading.set(false);
  }
}
