import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Pago, PagoRequest, Pedido } from '../core/models/api.models';
import { PagoService, PedidoService } from '../core/services/api.service';
import { extractHttpErrorMessage } from '../core/utils/http-error.util';

@Component({
  selector: 'app-cliente-pagos',
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './cliente-pagos.component.html',
  styleUrl: './cliente-pagos.component.scss',
})
export class ClientePagosComponent implements OnInit {
  private readonly pagoService = inject(PagoService);
  private readonly pedidoService = inject(PedidoService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly pagos = signal<Pago[]>([]);
  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly showForm = signal(false);

  protected readonly metodos = ['TARJETA', 'EFECTIVO', 'YAPE', 'TRANSFERENCIA'];

  protected readonly pedidosSinPago = computed(() => {
    const pagados = new Set(this.pagos().map((p) => p.idPedido));
    return this.pedidos().filter((p) => !pagados.has(p.id) && p.estado !== 'CANCELADO');
  });

  protected readonly form = this.fb.nonNullable.group({
    idPedido: [0, [Validators.required, Validators.min(1)]],
    metodo: ['YAPE', Validators.required],
    referenciaTransaccion: [''],
  });

  ngOnInit(): void {
    const navState = this.router.currentNavigation()?.extras?.state ?? history.state;
    if (navState?.['mensaje']) {
      this.message.set(String(navState['mensaje']));
    }
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);

    const userId = this.auth.getUserId();

    this.pedidoService.listar().subscribe({
      next: (data) => {
        this.pedidos.set(
          data
            .filter((p) => p.userId === userId)
            .sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
        );
      },
      error: (err) => this.error.set(extractHttpErrorMessage(err, 'No se pudieron cargar tus pedidos')),
    });

    this.pagoService.listar().subscribe({
      next: (data) => {
        this.pagos.set(
          data
            .filter((p) => p.userId === userId)
            .sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudieron cargar tus pagos'));
        this.loading.set(false);
      },
    });
  }

  labelPedido(idPedido: number): string {
    const pedido = this.pedidos().find((p) => p.id === idPedido);
    if (!pedido) return `Pedido #${idPedido}`;
    return `Pedido #${pedido.id}`;
  }

  montoPedidoSeleccionado(): number {
    const idPedido = this.form.controls.idPedido.value;
    const pedido = this.pedidos().find((p) => p.id === idPedido);
    return pedido ? Number(pedido.total) : 0;
  }

  abrirFormulario(idPedido?: number): void {
    this.showForm.set(true);
    this.error.set(null);
    this.form.reset({
      idPedido: idPedido ?? 0,
      metodo: 'YAPE',
      referenciaTransaccion: '',
    });
  }

  cancelarFormulario(): void {
    this.showForm.set(false);
    this.form.reset({ idPedido: 0, metodo: 'YAPE', referenciaTransaccion: '' });
  }

  registrarPago(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Selecciona un pedido y método de pago.');
      return;
    }

    const raw = this.form.getRawValue();
    const pedido = this.pedidos().find((p) => p.id === raw.idPedido);

    if (!pedido) {
      this.error.set('Pedido no válido');
      return;
    }

    const payload: PagoRequest = {
      idPedido: pedido.id,
      monto: Number(pedido.total),
      metodo: raw.metodo,
      estado: 'APROBADO',
      referenciaTransaccion: raw.referenciaTransaccion || undefined,
    };

    this.saving.set(true);
    this.error.set(null);

    this.pagoService.crear(payload).subscribe({
      next: () => {
        this.message.set(`Pago del pedido #${pedido.id} registrado correctamente.`);
        this.showForm.set(false);
        this.form.reset({ idPedido: 0, metodo: 'YAPE', referenciaTransaccion: '' });
        this.cargar();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudo registrar el pago'));
        this.saving.set(false);
      },
    });
  }
}
