import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Pago, PagoRequest, Pedido } from '../../core/models/api.models';
import { PagoService, PedidoService } from '../../core/services/api.service';
import { extractHttpErrorMessage } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-admin-pagos',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './admin-pagos.component.html',
  styleUrl: './admin-pagos.component.scss',
})
export class AdminPagosComponent implements OnInit {
  private readonly pagoService = inject(PagoService);
  private readonly pedidoService = inject(PedidoService);
  private readonly fb = inject(FormBuilder);

  protected readonly pagos = signal<Pago[]>([]);
  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly pagoSeleccionado = signal<Pago | null>(null);
  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal('TODOS');

  protected readonly estados = ['PENDIENTE', 'APROBADO', 'RECHAZADO'];

  protected readonly pagosVisibles = computed(() => {
    const term = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();
    return this.pagos().filter((p) => {
      const matchEstado = estado === 'TODOS' || p.estado === estado;
      const cliente = this.nombreCliente(p.idPedido).toLowerCase();
      const matchTerm =
        !term ||
        String(p.id).includes(term) ||
        String(p.idPedido).includes(term) ||
        cliente.includes(term) ||
        (p.referenciaTransaccion?.toLowerCase().includes(term) ?? false);
      return matchEstado && matchTerm;
    });
  });

  protected readonly validacionForm = this.fb.nonNullable.group({
    estado: ['PENDIENTE', Validators.required],
    referenciaTransaccion: [''],
  });

  ngOnInit(): void {
    this.cargar();
  }

  contarPorEstado(estado: string): number {
    return this.pagos().filter((p) => p.estado === estado).length;
  }

  totalAprobado(): number {
    return this.pagos()
      .filter((p) => p.estado === 'APROBADO')
      .reduce((sum, p) => sum + (p.monto ?? 0), 0);
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);

    this.pedidoService.listar().subscribe({
      next: (data) => this.pedidos.set(data.sort((a, b) => (b.id ?? 0) - (a.id ?? 0))),
      error: (err) => this.error.set(extractHttpErrorMessage(err, 'No se pudieron cargar los pedidos')),
    });

    this.pagoService.listar().subscribe({
      next: (data) => {
        this.pagos.set(data.sort((a, b) => (b.id ?? 0) - (a.id ?? 0)));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudieron cargar los pagos'));
        this.loading.set(false);
      },
    });
  }

  nombreCliente(idPedido: number): string {
    return this.pedidos().find((p) => p.id === idPedido)?.cliente ?? `Pedido #${idPedido}`;
  }

  abrirDetalle(pago: Pago): void {
    this.pagoSeleccionado.set(pago);
    this.validacionForm.patchValue({
      estado: pago.estado,
      referenciaTransaccion: pago.referenciaTransaccion ?? '',
    });
    this.error.set(null);
  }

  cerrarDetalle(): void {
    this.pagoSeleccionado.set(null);
  }

  guardarValidacion(): void {
    const pago = this.pagoSeleccionado();
    if (!pago || this.validacionForm.invalid) return;

    const raw = this.validacionForm.getRawValue();
    const payload: PagoRequest = {
      idPedido: pago.idPedido,
      monto: pago.monto,
      metodo: pago.metodo,
      estado: raw.estado,
      referenciaTransaccion: raw.referenciaTransaccion || undefined,
    };

    this.saving.set(true);
    this.pagoService.actualizar(pago.id, payload).subscribe({
      next: () => {
        this.message.set(`Pago #${pago.id} actualizado`);
        this.cerrarDetalle();
        this.cargar();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudo actualizar el pago'));
        this.saving.set(false);
      },
    });
  }
}
