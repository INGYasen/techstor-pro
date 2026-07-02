import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Pedido, PedidoRequest, Producto } from '../core/models/api.models';
import { PedidoService, ProductoService } from '../core/services/api.service';
import { extractHttpErrorMessage } from '../core/utils/http-error.util';

@Component({
  selector: 'app-admin-pedidos',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './admin-pedidos.component.html',
  styleUrl: './admin-pedidos.component.scss',
})
export class AdminPedidosComponent implements OnInit {
  private readonly pedidoService = inject(PedidoService);
  private readonly productoService = inject(ProductoService);
  private readonly fb = inject(FormBuilder);

  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly editingId = signal<number | null>(null);

  protected readonly estados = ['PENDIENTE', 'CONFIRMADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];

  protected readonly form = this.fb.nonNullable.group({
    userId: [1, [Validators.required, Validators.min(1)]],
    cliente: ['', Validators.required],
    estado: ['PENDIENTE', Validators.required],
    observacion: [''],
    direccionEnvio: ['', Validators.required],
    items: this.fb.array([this.createItemGroup()]),
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  private createItemGroup(productoId = 0, cantidad = 1) {
    return this.fb.nonNullable.group({
      productoId: [productoId, Validators.min(1)],
      cantidad: [cantidad, [Validators.required, Validators.min(1)]],
    });
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);

    this.productoService.listar().subscribe({
      next: (data) => this.productos.set(data.filter((p) => p.activo !== false)),
      error: (err) => this.error.set(extractHttpErrorMessage(err, 'No se pudieron cargar los productos')),
    });

    this.pedidoService.listar().subscribe({
      next: (data) => {
        this.pedidos.set(data.sort((a, b) => (b.id ?? 0) - (a.id ?? 0)));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudieron cargar los pedidos'));
        this.loading.set(false);
      },
    });
  }

  nombreProducto(productoId: number): string {
    return this.productos().find((p) => p.id === productoId)?.nombre ?? `#${productoId}`;
  }

  agregarItem(): void {
    this.items.push(this.createItemGroup());
  }

  quitarItem(index: number): void {
    if (this.items.length <= 1) return;
    this.items.removeAt(index);
  }

  editar(pedido: Pedido): void {
    this.editingId.set(pedido.id);
    this.message.set(null);
    this.error.set(null);

    this.form.patchValue({
      userId: pedido.userId,
      cliente: pedido.cliente,
      estado: pedido.estado,
      observacion: pedido.observacion ?? '',
      direccionEnvio: pedido.direccionEnvio ?? '',
    });

    this.items.clear();
    for (const item of pedido.items) {
      this.items.push(this.createItemGroup(item.productoId, item.cantidad));
    }
    if (!pedido.items.length) {
      this.items.push(this.createItemGroup());
    }
  }

  cancelarEdicion(): void {
    this.editingId.set(null);
    this.resetForm();
    this.error.set(null);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const items = raw.items.filter((item) => item.productoId > 0);

    if (!items.length) {
      this.error.set('Agrega al menos un producto al pedido');
      return;
    }

    if (!this.productos().length) {
      this.error.set('No hay productos disponibles para crear pedidos');
      return;
    }

    const payload: PedidoRequest = {
      userId: raw.userId,
      cliente: raw.cliente,
      estado: raw.estado,
      observacion: raw.observacion || undefined,
      direccionEnvio: raw.direccionEnvio,
      items: items.map((item) => ({
        productoId: item.productoId,
        cantidad: item.cantidad,
      })),
    };

    const editingId = this.editingId();
    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);

    const request$ = editingId
      ? this.pedidoService.actualizar(editingId, payload)
      : this.pedidoService.crear(payload);

    request$.subscribe({
      next: () => {
        this.message.set(editingId ? 'Pedido actualizado' : 'Pedido creado correctamente');
        this.editingId.set(null);
        this.resetForm();
        this.cargar();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(
          extractHttpErrorMessage(err, editingId ? 'Error al actualizar pedido' : 'Error al crear pedido'),
        );
        this.saving.set(false);
      },
    });
  }

  eliminar(pedido: Pedido): void {
    if (!confirm(`¿Eliminar pedido #${pedido.id}?`)) return;

    this.pedidoService.eliminar(pedido.id).subscribe({
      next: () => {
        this.message.set(`Pedido #${pedido.id} eliminado`);
        if (this.editingId() === pedido.id) {
          this.cancelarEdicion();
        }
        this.cargar();
      },
      error: (err) => this.error.set(extractHttpErrorMessage(err, 'No se pudo eliminar el pedido')),
    });
  }

  private resetForm(): void {
    this.items.clear();
    this.items.push(this.createItemGroup());
    this.form.reset({
      userId: 1,
      estado: 'PENDIENTE',
      cliente: '',
      observacion: '',
      direccionEnvio: '',
    });
  }
}
