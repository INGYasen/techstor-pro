import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Categoria } from '../../core/models/api.models';
import { CategoriaService } from '../../core/services/api.service';
import { extractHttpErrorMessage } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-admin-categorias',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-categorias.component.html',
  styleUrl: './admin-categorias.component.scss',
})
export class AdminCategoriasComponent implements OnInit {
  private readonly categoriaService = inject(CategoriaService);
  private readonly fb = inject(FormBuilder);

  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly editingId = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.categoriaService.listar().subscribe({
      next: (data) => {
        this.categorias.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudieron cargar las categorías'));
        this.loading.set(false);
      },
    });
  }

  editar(categoria: Categoria): void {
    this.editingId.set(categoria.id);
    this.form.patchValue({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion ?? '',
    });
    this.message.set(null);
    this.error.set(null);
  }

  cancelarEdicion(): void {
    this.editingId.set(null);
    this.form.reset();
    this.error.set(null);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const editingId = this.editingId();
    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);

    const payload = this.form.getRawValue();
    const request$ = editingId
      ? this.categoriaService.actualizar(editingId, payload)
      : this.categoriaService.crear(payload);

    request$.subscribe({
      next: () => {
        this.message.set(editingId ? 'Categoría actualizada' : 'Categoría creada');
        this.editingId.set(null);
        this.form.reset();
        this.cargar();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(
          extractHttpErrorMessage(err, editingId ? 'Error al actualizar categoría' : 'Error al crear categoría'),
        );
        this.saving.set(false);
      },
    });
  }

  eliminar(categoria: Categoria): void {
    if (!confirm(`¿Eliminar categoría "${categoria.nombre}"?`)) return;

    this.categoriaService.eliminar(categoria.id).subscribe({
      next: () => {
        this.message.set('Categoría eliminada');
        if (this.editingId() === categoria.id) {
          this.cancelarEdicion();
        }
        this.cargar();
      },
      error: (err) =>
        this.error.set(extractHttpErrorMessage(err, 'No se pudo eliminar (puede tener productos asociados)')),
    });
  }
}
