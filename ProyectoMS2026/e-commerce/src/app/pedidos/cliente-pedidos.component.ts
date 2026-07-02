import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Pago, Pedido, PedidoItem } from '../core/models/api.models';
import { PagoService, PedidoService } from '../core/services/api.service';
import { extractHttpErrorMessage } from '../core/utils/http-error.util';

@Component({
  selector: 'app-cliente-pedidos',
  imports: [DatePipe, DecimalPipe, RouterLink, FormsModule],
  templateUrl: './cliente-pedidos.component.html',
  styleUrl: './cliente-pedidos.component.scss',
})
export class ClientePedidosComponent implements OnInit {
  private readonly pedidoService = inject(PedidoService);
  private readonly pagoService = inject(PagoService);
  private readonly auth = inject(AuthService);

  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly pagosPorPedido = signal<Map<number, Pago>>(new Map());
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filtroEstado = signal('TODOS');
  protected readonly estadosFiltro = ['TODOS', 'PENDIENTE', 'CONFIRMADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];

  protected readonly pedidosVisibles = computed(() => {
    const filtro = this.filtroEstado();
    const list = this.pedidos();
    if (filtro === 'TODOS') return list;
    return list.filter((p) => p.estado === filtro);
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    const userId = this.auth.getUserId();

    forkJoin({
      pedidos: this.pedidoService.listar(),
      pagos: this.pagoService.listar(),
    }).subscribe({
      next: ({ pedidos, pagos }) => {
        this.pedidos.set(
          pedidos
            .filter((p) => p.userId === userId)
            .sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
        );

        const mapa = new Map<number, Pago>();
        for (const pago of pagos.filter((p) => p.userId === userId)) {
          mapa.set(pago.idPedido, pago);
        }
        this.pagosPorPedido.set(mapa);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudieron cargar tus pedidos'));
        this.loading.set(false);
      },
    });
  }

  pagoDePedido(pedidoId: number): Pago | undefined {
    return this.pagosPorPedido().get(pedidoId);
  }

  itemLabel(item: PedidoItem): string {
    return item.nombreProducto ?? `Producto #${item.productoId}`;
  }

  itemPrecio(item: PedidoItem): number {
    return Number(item.precioUnitario ?? item.precio ?? 0);
  }
}
