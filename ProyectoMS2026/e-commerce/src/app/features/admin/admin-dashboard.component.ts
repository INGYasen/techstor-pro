import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Pago } from '../../core/models/api.models';
import {
  CategoriaService,
  PagoService,
  PedidoService,
  ProductoService,
  UsuarioService,
} from '../../core/services/api.service';

interface DashModule {
  route: string;
  title: string;
  description: string;
  image: string;
  theme: 'purple' | 'green' | 'blue' | 'amber' | 'rose';
}

interface KpiCard {
  label: string;
  hint: string;
  statKey: keyof DashStats;
  route: string;
  linkText: string;
  theme: 'purple' | 'green' | 'blue' | 'amber';
  icon: string;
  watermark: string;
  isMoney?: boolean;
}

interface QuickLink {
  route: string;
  title: string;
  description: string;
  theme: 'purple' | 'green' | 'blue' | 'amber';
  image: string;
}

interface PaymentSlice {
  label: string;
  color: string;
  amount: number;
  percent: number;
}

interface DashStats {
  productos: number;
  categorias: number;
  pedidos: number;
  usuarios: number;
  ventas: number;
}

const PAYMENT_META: Record<string, { label: string; color: string }> = {
  YAPE: { label: 'Yape', color: '#6366f1' },
  PLIN: { label: 'Plin', color: '#22d3ee' },
  TARJETA: { label: 'Tarjeta', color: '#3b82f6' },
  TRANSFERENCIA: { label: 'Transferencia', color: '#8b5cf6' },
  CONTRA_ENTREGA: { label: 'Contra entrega', color: '#d4a574' },
};

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly productoService = inject(ProductoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly pedidoService = inject(PedidoService);
  private readonly pagoService = inject(PagoService);
  private readonly usuarioService = inject(UsuarioService);

  readonly loading = signal(true);
  readonly stats = signal<DashStats>({
    productos: 0,
    categorias: 0,
    pedidos: 0,
    usuarios: 0,
    ventas: 0,
  });
  readonly paymentSlices = signal<PaymentSlice[]>([]);

  readonly kpiCards: KpiCard[] = [
    {
      label: 'Productos',
      hint: 'En catálogo',
      statKey: 'productos',
      route: '/admin/productos',
      linkText: 'Ver productos',
      theme: 'purple',
      icon: '/images/admin/icon-productos.png',
      watermark: '/images/admin/mod-productos.png',
    },
    {
      label: 'Pedidos',
      hint: 'Registrados',
      statKey: 'pedidos',
      route: '/admin/pedidos',
      linkText: 'Ver pedidos',
      theme: 'green',
      icon: '/images/admin/icon-pedidos.png',
      watermark: '/images/admin/mod-pedidos.png',
    },
    {
      label: 'Usuarios',
      hint: 'Cuentas activas',
      statKey: 'usuarios',
      route: '/admin/usuarios',
      linkText: 'Ver usuarios',
      theme: 'blue',
      icon: '/images/admin/icon-usuarios.png',
      watermark: '/images/admin/mod-usuarios.png',
    },
    {
      label: 'Ventas',
      hint: 'Pagos aprobados',
      statKey: 'ventas',
      route: '/admin/pagos',
      linkText: 'Ver pagos',
      theme: 'amber',
      icon: '/images/admin/icon-ventas.png',
      watermark: '/images/admin/mod-pagos.png',
      isMoney: true,
    },
  ];

  readonly quickLinks: QuickLink[] = [
    {
      route: '/admin/productos',
      title: 'Gestionar productos',
      description: 'Alta, edición y stock',
      theme: 'purple',
      image: '/images/admin/icon-productos.png',
    },
    {
      route: '/admin/pedidos',
      title: 'Revisar pedidos pendientes',
      description: 'Consulta y cambia estados',
      theme: 'green',
      image: '/images/admin/icon-pedidos.png',
    },
    {
      route: '/admin/pagos',
      title: 'Registrar un pago',
      description: 'Yape y tarjeta',
      theme: 'blue',
      image: '/images/admin/mod-pagos.png',
    },
    {
      route: '/admin/usuarios',
      title: 'Administrar usuarios',
      description: 'Roles y accesos',
      theme: 'amber',
      image: '/images/admin/icon-usuarios.png',
    },
  ];

  readonly modules: DashModule[] = [
    {
      route: '/admin/productos',
      title: 'Productos',
      description: 'Catálogo e inventario',
      image: '/images/admin/mod-productos.png',
      theme: 'purple',
    },
    {
      route: '/admin/categorias',
      title: 'Categorías',
      description: 'Familias de productos',
      image: '/images/admin/mod-categorias.png',
      theme: 'green',
    },
    {
      route: '/admin/pedidos',
      title: 'Pedidos',
      description: 'Estados y comprobantes',
      image: '/images/admin/mod-pedidos.png',
      theme: 'blue',
    },
    {
      route: '/admin/pagos',
      title: 'Pagos',
      description: 'Registro y validación',
      image: '/images/admin/mod-pagos.png',
      theme: 'amber',
    },
    {
      route: '/admin/usuarios',
      title: 'Usuarios',
      description: 'Roles y accesos',
      image: '/images/admin/mod-usuarios.png',
      theme: 'rose',
    },
  ];

  readonly donutStyle = computed(() => {
    const slices = this.paymentSlices();
    if (!slices.length) {
      return 'conic-gradient(#e8ecf4 0% 100%)';
    }

    let acc = 0;
    const parts = slices.map((slice) => {
      const from = acc;
      acc += slice.percent;
      return `${slice.color} ${from}% ${acc}%`;
    });
    return `conic-gradient(${parts.join(', ')})`;
  });

  ngOnInit(): void {
    forkJoin({
      productos: this.productoService.listar().pipe(catchError(() => of([]))),
      categorias: this.categoriaService.listar().pipe(catchError(() => of([]))),
      pedidos: this.pedidoService.listar().pipe(catchError(() => of([]))),
      pagos: this.pagoService.listar().pipe(catchError(() => of([]))),
      usuarios: this.usuarioService.listar().pipe(catchError(() => of([]))),
    }).subscribe(({ productos, categorias, pedidos, pagos, usuarios }) => {
      const ventas = this.sumApprovedPayments(pagos);
      this.stats.set({
        productos: productos.length,
        categorias: categorias.length,
        pedidos: pedidos.length,
        usuarios: usuarios.length,
        ventas,
      });
      this.paymentSlices.set(this.buildPaymentSlices(pagos));
      this.loading.set(false);
    });
  }

  statValue(card: KpiCard): string {
    const value = this.stats()[card.statKey];
    return card.isMoney ? this.formatMoney(value) : String(value);
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
    }).format(value);
  }

  private sumApprovedPayments(pagos: Pago[]): number {
    return pagos
      .filter((p) => this.isApproved(p.estado))
      .reduce((sum, p) => sum + (p.monto ?? 0), 0);
  }

  private buildPaymentSlices(pagos: Pago[]): PaymentSlice[] {
    const approved = pagos.filter((p) => this.isApproved(p.estado));
    const totals = new Map<string, number>();

    for (const pago of approved) {
      const key = (pago.metodo ?? 'OTRO').toUpperCase();
      totals.set(key, (totals.get(key) ?? 0) + (pago.monto ?? 0));
    }

    const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
    if (total <= 0) {
      return [];
    }

    return [...totals.entries()]
      .map(([key, amount]) => {
        const meta = PAYMENT_META[key] ?? { label: key, color: '#94a3b8' };
        return {
          label: meta.label,
          color: meta.color,
          amount,
          percent: Math.round((amount / total) * 1000) / 10,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }

  private isApproved(estado: string): boolean {
    const normalized = (estado ?? '').toUpperCase();
    return normalized === 'APROBADO' || normalized === 'PAGADO' || normalized === 'COMPLETADO';
  }
}
