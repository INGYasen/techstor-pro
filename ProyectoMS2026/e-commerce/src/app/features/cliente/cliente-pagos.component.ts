import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Pago, Pedido, PedidoItem } from '../../core/models/api.models';
import { PagoService, PedidoService, ProductoService } from '../../core/services/api.service';
import { resolveProductoImagenUrl } from '../../core/utils/producto-image.util';
import { extractHttpErrorMessage } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-cliente-pagos',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './cliente-pagos.component.html',
  styleUrl: './cliente-pagos.component.scss',
})
export class ClientePagosComponent implements OnInit {
  private readonly pagoService = inject(PagoService);
  private readonly pedidoService = inject(PedidoService);
  private readonly productoService = inject(ProductoService);
  private readonly auth = inject(AuthService);

  protected readonly pagos = signal<Pago[]>([]);
  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly imagenesProducto = signal<Record<number, string | null>>({});
  protected readonly nombresProducto = signal<Record<number, string>>({});
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly comprobantePago = signal<Pago | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    const userId = this.auth.getUserId();

    forkJoin({
      pagos: this.pagoService.listar(),
      pedidos: this.pedidoService.listar(),
      productos: this.productoService.listar(),
    }).subscribe({
      next: ({ pagos, pedidos, productos }) => {
        const imagenes: Record<number, string | null> = {};
        const nombres: Record<number, string> = {};
        for (const producto of productos) {
          imagenes[producto.id] = resolveProductoImagenUrl(producto.imagenUrl);
          nombres[producto.id] = producto.nombre;
        }
        this.imagenesProducto.set(imagenes);
        this.nombresProducto.set(nombres);
        this.pagos.set(
          pagos
            .filter((p) => p.userId === userId)
            .sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
        );
        this.pedidos.set(pedidos.filter((p) => p.userId === userId));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudieron cargar tus pagos'));
        this.loading.set(false);
      },
    });
  }

  pedidoDePago(pago: Pago): Pedido | undefined {
    return this.pedidos().find((p) => p.id === pago.idPedido);
  }

  verComprobante(pago: Pago): void {
    this.comprobantePago.set(pago);
  }

  cerrarComprobante(): void {
    this.comprobantePago.set(null);
  }

  imprimirComprobante(pago: Pago): void {
    const pedido = this.pedidoDePago(pago);
    const fecha = pago.fechaPago
      ? new Date(pago.fechaPago).toLocaleString('es-PE', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

    const itemsHtml = pedido?.items
      .map(
        (i) =>
          `<tr>
            <td>${this.itemLabel(i)}</td>
            <td style="text-align:right">S/ ${this.itemPrecioUnitario(i).toFixed(2)}</td>
            <td style="text-align:center">${i.cantidad}</td>
            <td style="text-align:right">S/ ${this.itemPrecio(i).toFixed(2)}</td>
          </tr>`,
      )
      .join('');

    const productosBlock = pedido?.items.length
      ? `<h3 style="font-size:0.85rem;text-transform:uppercase;color:#64748b;margin:24px 0 8px">Detalle de la compra</h3>
        <table><thead><tr>
          <th>Producto</th>
          <th style="text-align:right">P. unit.</th>
          <th style="text-align:center">Cant.</th>
          <th style="text-align:right">Subtotal</th>
        </tr></thead><tbody>${itemsHtml}</tbody></table>`
      : '';

    const html = `<html><head><title>Comprobante pago ${pago.id}</title>
      <style>
        body{font-family:Segoe UI,sans-serif;padding:32px;color:#0f172a;max-width:640px;margin:0 auto}
        h1{font-size:1.35rem;margin:0 0 4px}
        .sub{color:#64748b;font-size:0.9rem;margin:0 0 24px}
        .meta{margin:0 0 20px;line-height:1.7}
        .meta p{margin:0}
        table{border-collapse:collapse;width:100%;margin:16px 0}
        th,td{border:1px solid #e2e8f0;padding:10px;text-align:left;font-size:0.9rem}
        th{background:#f8fafc;color:#64748b;font-size:0.75rem;text-transform:uppercase}
        .total{margin-top:20px;font-size:1.15rem}
        .brand{margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #2563eb}
      </style></head><body>
      <div class="brand"><h1>TechStore</h1><p class="sub">Comprobante de pago</p></div>
      <div class="meta">
        <p><strong>N.º pago:</strong> ${pago.id}</p>
        <p><strong>Pedido:</strong> ${pago.idPedido}</p>
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Cliente:</strong> ${pedido?.cliente ?? this.auth.getUsername() ?? '—'}</p>
        ${pedido?.direccionEnvio ? `<p><strong>Envío:</strong> ${pedido.direccionEnvio}</p>` : ''}
        <p><strong>Método:</strong> ${this.etiquetaMetodo(pago.metodo)}</p>
        <p><strong>Estado:</strong> ${this.etiquetaEstado(pago.estado)}</p>
      </div>
      ${productosBlock}
      <p class="total"><strong>Total pagado: S/ ${Number(pago.monto).toFixed(2)}</strong></p>
      <p style="color:#94a3b8;font-size:0.8rem;margin-top:32px">Documento generado por TechStore. No constituye factura electrónica.</p>
    </body></html>`;

    const ventana = window.open('', '_blank');
    if (!ventana) return;
    ventana.document.write(html);
    ventana.document.close();
    ventana.print();
  }

  itemLabel(item: PedidoItem): string {
    return this.nombresProducto()[item.productoId] ?? item.nombreProducto ?? `Producto ${item.productoId}`;
  }

  imagenItem(item: PedidoItem): string | null {
    return this.imagenesProducto()[item.productoId] ?? null;
  }

  itemPrecioUnitario(item: PedidoItem): number {
    const subtotal = Number(item.subtotal ?? 0);
    if (item.precioUnitario != null) return Number(item.precioUnitario);
    if (item.precio != null) return Number(item.precio);
    if (subtotal > 0 && item.cantidad > 0) return subtotal / item.cantidad;
    return 0;
  }

  itemPrecio(item: PedidoItem): number {
    return Number(item.subtotal ?? this.itemPrecioUnitario(item) * item.cantidad);
  }

  etiquetaMetodo(metodo: string): string {
    const etiquetas: Record<string, string> = {
      YAPE: 'Yape',
      PLIN: 'Plin',
      TARJETA: 'Tarjeta',
      TRANSFERENCIA: 'Transferencia',
      CONTRA_ENTREGA: 'Contra entrega',
    };
    return etiquetas[metodo.toUpperCase()] ?? metodo;
  }

  imagenMetodo(metodo: string): string | null {
    const imagenes: Record<string, string> = {
      YAPE: '/images/pago-yape.png',
      PLIN: '/images/pago-plin.png',
      TARJETA: '/images/pago-tarjeta.png',
    };
    return imagenes[metodo.toUpperCase()] ?? null;
  }

  iconoMetodoFallback(metodo: string): string {
    const id = metodo.toUpperCase();
    if (id === 'TRANSFERENCIA') return '🏦';
    if (id === 'CONTRA_ENTREGA') return '💵';
    return '💳';
  }

  etiquetaEstado(estado: string): string {
    const etiquetas: Record<string, string> = {
      APROBADO: 'Pagado',
      PENDIENTE: 'Pendiente',
      RECHAZADO: 'Rechazado',
    };
    return etiquetas[estado.toUpperCase()] ?? estado;
  }

  claseMetodo(metodo: string): string {
    const id = metodo.toLowerCase();
    if (id === 'yape') return 'metodo-yape';
    if (id === 'plin') return 'metodo-plin';
    if (id === 'tarjeta') return 'metodo-tarjeta';
    return 'metodo-otro';
  }

  claseEstado(estado: string): string {
    return `estado-${estado.toLowerCase()}`;
  }
}
