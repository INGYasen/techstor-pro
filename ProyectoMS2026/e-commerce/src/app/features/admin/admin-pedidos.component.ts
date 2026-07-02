import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Pedido, PedidoRequest, Pago, Producto } from '../../core/models/api.models';
import { PagoService, PedidoService, ProductoService } from '../../core/services/api.service';
import { ESTADOS_PEDIDO } from '../../core/utils/producto-display.util';
import { extractHttpErrorMessage } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-admin-pedidos',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './admin-pedidos.component.html',
  styleUrl: './admin-pedidos.component.scss',
})
export class AdminPedidosComponent implements OnInit {
  private readonly pedidoService = inject(PedidoService);
  private readonly productoService = inject(ProductoService);
  private readonly pagoService = inject(PagoService);
  private readonly fb = inject(FormBuilder);

  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly pagos = signal<Pago[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly pedidoSeleccionado = signal<Pedido | null>(null);
  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal('TODOS');

  protected readonly estados = [...ESTADOS_PEDIDO];

  protected readonly pedidosVisibles = computed(() => {
    const term = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();
    return this.pedidos().filter((p) => {
      const matchEstado = estado === 'TODOS' || p.estado === estado;
      const matchTerm =
        !term ||
        String(p.id).includes(term) ||
        p.cliente.toLowerCase().includes(term) ||
        (p.direccionEnvio?.toLowerCase().includes(term) ?? false);
      return matchEstado && matchTerm;
    });
  });

  protected readonly estadoForm = this.fb.nonNullable.group({
    estado: ['PENDIENTE', Validators.required],
    observacion: [''],
  });

  ngOnInit(): void {
    this.cargar();
  }

  contarPorEstado(estado: string): number {
    return this.pedidos().filter((p) => p.estado === estado).length;
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);

    this.productoService.listar().subscribe({
      next: (data) => this.productos.set(data),
      error: () => undefined,
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

    this.pagoService.listar().subscribe({
      next: (data) => this.pagos.set(data),
    });
  }

  metodoPago(idPedido: number): string {
    return this.pagos().find((p) => p.idPedido === idPedido)?.metodo ?? '—';
  }

  nombreProducto(productoId: number): string {
    return this.productos().find((p) => p.id === productoId)?.nombre ?? `Producto #${productoId}`;
  }

  abrirDetalle(pedido: Pedido): void {
    this.pedidoSeleccionado.set(pedido);
    this.estadoForm.patchValue({
      estado: pedido.estado,
      observacion: pedido.observacion ?? '',
    });
    this.error.set(null);
  }

  cerrarDetalle(): void {
    this.pedidoSeleccionado.set(null);
  }

  guardarEstado(): void {
    const pedido = this.pedidoSeleccionado();
    if (!pedido || this.estadoForm.invalid) return;

    const { estado, observacion } = this.estadoForm.getRawValue();
    const payload: PedidoRequest = {
      userId: pedido.userId,
      cliente: pedido.cliente,
      estado,
      observacion: observacion || undefined,
      direccionEnvio: pedido.direccionEnvio ?? '',
      items: pedido.items.map((item) => ({
        productoId: item.productoId,
        cantidad: item.cantidad,
      })),
    };

    this.saving.set(true);
    this.pedidoService.actualizar(pedido.id, payload).subscribe({
      next: () => {
        this.message.set(`Pedido #${pedido.id} actualizado`);
        this.cerrarDetalle();
        this.cargar();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudo actualizar el pedido'));
        this.saving.set(false);
      },
    });
  }

  imprimir(pedido: Pedido): void {
    const pago = this.pagos().find((p) => p.idPedido === pedido.id);
    const items = pedido.items
      .map(
        (i) =>
          `<tr><td>${i.nombreProducto ?? this.nombreProducto(i.productoId)}</td><td>${i.cantidad}</td><td>S/ ${i.subtotal ?? ''}</td></tr>`,
      )
      .join('');
    const html = `<html><head><title>Pedido #${pedido.id}</title></head><body>
      <h1>Comprobante Pedido #${pedido.id}</h1>
      <p>Cliente: ${pedido.cliente}</p>
      <p>Dirección: ${pedido.direccionEnvio ?? ''}</p>
      <p>Estado: ${pedido.estado}</p>
      <p>Método pago: ${pago?.metodo ?? 'PENDIENTE'}</p>
      <table border="1" cellpadding="6"><thead><tr><th>Producto</th><th>Cant.</th><th>Subtotal</th></tr></thead><tbody>${items}</tbody></table>
      <p><strong>Total: S/ ${pedido.total}</strong></p>
    </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  }
}
