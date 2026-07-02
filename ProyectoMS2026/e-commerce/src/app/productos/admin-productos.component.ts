import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Categoria, Producto } from '../core/models/api.models';
import { CategoriaService, ProductoService } from '../core/services/api.service';
import { extractHttpErrorMessage } from '../core/utils/http-error.util';
import { resolveProductoImagenUrl } from '../core/utils/producto-image.util';

@Component({
  selector: 'app-admin-productos',
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './admin-productos.component.html',
  styleUrl: './admin-productos.component.scss',
})
export class AdminProductosComponent implements OnInit {
  private readonly productoService = inject(ProductoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly fb = inject(FormBuilder);

  protected readonly productos = signal<Producto[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly uploadingImage = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly editingId = signal<number | null>(null);
  protected readonly imagenUrl = signal<string | null>(null);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly selectedFileName = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    idCategoria: [0, Validators.min(1)],
    precio: [1, [Validators.required, Validators.min(0.01)]],
    stock: [1, [Validators.required, Validators.min(0)]],
    sku: [''],
    activo: [true],
  });

  ngOnInit(): void {
    this.cargar();
  }

  nombreCategoria(idCategoria: number): string {
    return this.categorias().find((c) => c.id === idCategoria)?.nombre ?? `#${idCategoria}`;
  }

  imagenProducto(producto: Producto): string | null {
    return resolveProductoImagenUrl(producto.imagenUrl);
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);

    this.categoriaService.listar().subscribe({
      next: (cats) => {
        this.categorias.set(cats);
        if (cats.length && !this.editingId() && this.form.controls.idCategoria.value === 0) {
          this.form.patchValue({ idCategoria: cats[0].id });
        }
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudieron cargar las categorías'));
      },
    });

    this.productoService.listar().subscribe({
      next: (data) => {
        this.productos.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudieron cargar los productos'));
        this.loading.set(false);
      },
    });
  }

  editar(producto: Producto): void {
    this.editingId.set(producto.id);
    this.imagenUrl.set(producto.imagenUrl ?? null);
    this.previewUrl.set(resolveProductoImagenUrl(producto.imagenUrl));
    this.selectedFileName.set(null);
    this.form.patchValue({
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? '',
      idCategoria: producto.idCategoria,
      precio: Number(producto.precio),
      stock: producto.stock,
      sku: producto.sku ?? '',
      activo: producto.activo !== false,
    });
    this.message.set(null);
    this.error.set(null);
  }

  cancelarEdicion(): void {
    this.editingId.set(null);
    this.resetForm();
    this.error.set(null);
  }

  onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) {
      return;
    }

    if (!archivo.type.startsWith('image/')) {
      this.error.set('Selecciona un archivo de imagen válido (JPG, PNG, WEBP o GIF)');
      input.value = '';
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      this.error.set('La imagen no debe superar 5 MB');
      input.value = '';
      return;
    }

    this.error.set(null);
    this.uploadingImage.set(true);
    this.selectedFileName.set(archivo.name);

    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(archivo);

    this.productoService.subirImagen(archivo).subscribe({
      next: (response) => {
        this.imagenUrl.set(response.imagenUrl);
        this.previewUrl.set(resolveProductoImagenUrl(response.imagenUrl));
        this.message.set('Imagen cargada correctamente');
        this.uploadingImage.set(false);
        input.value = '';
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudo subir la imagen'));
        this.uploadingImage.set(false);
        input.value = '';
      },
    });
  }

  quitarImagen(): void {
    this.imagenUrl.set(null);
    this.previewUrl.set(null);
    this.selectedFileName.set(null);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.categorias().length) {
      this.error.set('Crea al menos una categoría antes de registrar productos');
      return;
    }

    if (this.uploadingImage()) {
      this.error.set('Espera a que termine de subirse la imagen');
      return;
    }

    const editingId = this.editingId();
    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);

    const payload = {
      ...this.form.getRawValue(),
      imagenUrl: this.imagenUrl(),
    };

    const request$ = editingId
      ? this.productoService.actualizar(editingId, payload)
      : this.productoService.crear(payload);

    request$.subscribe({
      next: () => {
        this.message.set(editingId ? 'Producto actualizado' : 'Producto creado correctamente');
        this.editingId.set(null);
        this.resetForm();
        this.cargar();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(
          extractHttpErrorMessage(err, editingId ? 'Error al actualizar producto' : 'Error al crear producto'),
        );
        this.saving.set(false);
      },
    });
  }

  eliminar(producto: Producto): void {
    if (!confirm(`¿Eliminar "${producto.nombre}"?`)) return;

    this.productoService.eliminar(producto.id).subscribe({
      next: () => {
        this.message.set('Producto eliminado');
        if (this.editingId() === producto.id) {
          this.cancelarEdicion();
        }
        this.cargar();
      },
      error: (err) => this.error.set(extractHttpErrorMessage(err, 'No se pudo eliminar el producto')),
    });
  }

  private resetForm(): void {
    this.imagenUrl.set(null);
    this.previewUrl.set(null);
    this.selectedFileName.set(null);
    this.form.reset({
      idCategoria: this.categorias()[0]?.id ?? 0,
      activo: true,
      precio: 1,
      stock: 1,
    });
  }
}
