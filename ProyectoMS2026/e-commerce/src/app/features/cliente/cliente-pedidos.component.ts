import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Pago, Pedido, PedidoItem } from '../../core/models/api.models';
import { PagoService, PedidoService, ProductoService } from '../../core/services/api.service';
import { ESTADOS_PEDIDO, observacionVisible, tieneUbicacionGps } from '../../core/utils/producto-display.util';
import { resolveProductoImagenUrl } from '../../core/utils/producto-image.util';
import { extractHttpErrorMessage } from '../../core/utils/http-error.util';

const POR_PAGINA = 6;

@Component({
  selector: 'app-cliente-pedidos',
  imports: [DatePipe, DecimalPipe, RouterLink, FormsModule],
  templateUrl: './cliente-pedidos.component.html',
  styleUrl: './cliente-pedidos.component.scss',
})
export class ClientePedidosComponent implements OnInit {
  private readonly pedidoService = inject(PedidoService);
  private readonly pagoService = inject(PagoService);
  private readonly productoService = inject(ProductoService);
  private readonly auth = inject(AuthService);

  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly pagos = signal<Pago[]>([]);
  protected readonly imagenesProducto = signal<Record<number, string | null>>({});
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly filtroEstado = signal('TODOS');
  protected readonly paginaActual = signal(1);
  protected readonly detallePedido = signal<Pedido | null>(null);
  protected readonly estadosFiltro = ['TODOS', ...ESTADOS_PEDIDO];
  protected readonly porPagina = POR_PAGINA;

  protected readonly pedidosVisibles = computed(() => {
    const filtro = this.filtroEstado();
    const list = this.pedidos();
    if (filtro === 'TODOS') return list;
    return list.filter((p) => this.estadoMostrar(p, this.pagoDePedido(p.id)) === filtro);
  });

  protected readonly totalFiltrados = computed(() => this.pedidosVisibles().length);

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalFiltrados() / POR_PAGINA)),
  );

  protected readonly pedidosPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * POR_PAGINA;
    return this.pedidosVisibles().slice(inicio, inicio + POR_PAGINA);
  });

  protected readonly rangoPaginacion = computed(() => {
    const total = this.totalFiltrados();
    if (!total) return { desde: 0, hasta: 0 };
    return {
      desde: (this.paginaActual() - 1) * POR_PAGINA + 1,
      hasta: Math.min(this.paginaActual() * POR_PAGINA, total),
    };
  });

  protected readonly paginasLista = computed(() =>
    Array.from({ length: this.totalPaginas() }, (_, i) => i + 1),
  );

  ngOnInit(): void {
    const navState = history.state;
    if (navState?.['mensaje']) {
      this.success.set(String(navState['mensaje']));
    }
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
        for (const producto of productos) {
          imagenes[producto.id] = resolveProductoImagenUrl(producto.imagenUrl);
        }
        this.imagenesProducto.set(imagenes);
        this.pagos.set(pagos.filter((p) => p.userId === userId));
        this.pedidos.set(
          pedidos
            .filter((p) => p.userId === userId)
            .sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
        );
        this.paginaActual.set(1);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudieron cargar tus pedidos'));
        this.loading.set(false);
      },
    });
  }

  onFiltroChange(valor: string): void {
    this.filtroEstado.set(valor);
    this.paginaActual.set(1);
  }

  irPagina(pagina: number): void {
    const total = this.totalPaginas();
    if (pagina < 1 || pagina > total) return;
    this.paginaActual.set(pagina);
  }

  pagoDePedido(idPedido: number): Pago | undefined {
    return this.pagos().find((p) => p.idPedido === idPedido);
  }

  observacionVisible = observacionVisible;
  tieneUbicacionGps = tieneUbicacionGps;

  itemLabel(item: PedidoItem): string {
    return item.nombreProducto ?? `Producto ${item.productoId}`;
  }

  imagenItem(item: PedidoItem): string | null {
    return this.imagenesProducto()[item.productoId] ?? null;
  }

  itemPrecio(item: PedidoItem): number {
    return Number(item.subtotal ?? (this.itemPrecioUnitario(item) * item.cantidad));
  }

  itemPrecioUnitario(item: PedidoItem): number {
    return Number(item.precioUnitario ?? item.precio ?? 0);
  }

  claseEstado(estado: string): string {
    return `estado-${estado.toLowerCase()}`;
  }

  estadoMostrar(pedido: Pedido, pago?: Pago): string {
    if (pedido.estado === 'CANCELADO') return 'CANCELADO';
    if (pago?.estado === 'APROBADO' && pedido.estado === 'PENDIENTE') return 'PAGADO';
    return pedido.estado;
  }

  etiquetaEstado(estado: string): string {
    const etiquetas: Record<string, string> = {
      TODOS: 'Todos los estados',
      PENDIENTE: 'Pendiente',
      PAGADO: 'Pagado',
      PREPARANDO: 'En preparación',
      ENVIADO: 'Enviado',
      ENTREGADO: 'Entregado',
      CANCELADO: 'Cancelado',
      APROBADO: 'Aprobado',
      RECHAZADO: 'Rechazado',
    };
    return etiquetas[estado] ?? estado;
  }

  mostrarPagoAprobado(pedido: Pedido, pago?: Pago): boolean {
    if (pedido.estado === 'CANCELADO') return false;
    return pago?.estado === 'APROBADO';
  }

  mostrarNoAplicado(pedido: Pedido, pago?: Pago): boolean {
    return pedido.estado === 'CANCELADO' || !pago;
  }

  claseMetodoPago(metodo: string): string {
    const id = metodo.toLowerCase();
    if (id === 'yape') return 'metodo-yape';
    if (id === 'plin') return 'metodo-plin';
    return 'metodo-otro';
  }

  verDetalle(pedido: Pedido): void {
    this.detallePedido.set(pedido);
  }

  cerrarDetalle(): void {
    this.detallePedido.set(null);
  }

  imprimir(pedido: Pedido): void {
    const pago = this.pagoDePedido(pedido.id);
    const items = pedido.items
      .map(
        (i) =>
          `<tr><td>${this.itemLabel(i)}</td><td>${i.cantidad}</td><td>S/ ${this.itemPrecio(i).toFixed(2)}</td></tr>`,
      )
      .join('');
    const html = `<html><head><title>Pedido ${pedido.id}</title>
      <style>body{font-family:Segoe UI,sans-serif;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}</style>
      </head><body>
      <h1>Comprobante Pedido ${pedido.id}</h1>
      <p><strong>Fecha:</strong> ${pedido.createdAt ?? '—'}</p>
      <p><strong>Cliente:</strong> ${pedido.cliente}</p>
      <p><strong>Dirección:</strong> ${pedido.direccionEnvio ?? '—'}</p>
      <p><strong>Estado:</strong> ${this.etiquetaEstado(this.estadoMostrar(pedido, pago))}</p>
      <p><strong>Pago:</strong> ${pago ? `${this.etiquetaEstado(pago.estado)} (${pago.metodo})` : 'Pendiente'}</p>
      <table><thead><tr><th>Producto</th><th>Cant.</th><th>Subtotal</th></tr></thead><tbody>${items}</tbody></table>
      <p><strong>Total: S/ ${Number(pedido.total).toFixed(2)}</strong></p>
    </body></html>`;
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    ventana.document.write(html);
    ventana.document.close();
    ventana.print();
  }
}
