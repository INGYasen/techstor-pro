import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Pago, PagoRequest, Pedido } from '../core/models/api.models';
import { PagoService, PedidoService } from '../core/services/api.service';
import { extractHttpErrorMessage } from '../core/utils/http-error.util';

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
  protected readonly editingId = signal<number | null>(null);

  protected readonly metodos = ['TARJETA', 'EFECTIVO', 'YAPE', 'TRANSFERENCIA'];
  protected readonly estados = ['PENDIENTE', 'APROBADO', 'RECHAZADO'];

  protected readonly pedidosConPago = computed(() => new Set(this.pagos().map((p) => p.idPedido)));

  protected readonly pedidosDisponibles = computed(() => {
    const editingId = this.editingId();
    const pagado = this.pedidosConPago();
    const pagoEditando = editingId ? this.pagos().find((p) => p.id === editingId) : null;

    return this.pedidos().filter((pedido) => {
      if (pagoEditando?.idPedido === pedido.id) return true;
      return !pagado.has(pedido.id);
    });
  });

  protected readonly form = this.fb.nonNullable.group({
    idPedido: [0, [Validators.required, Validators.min(1)]],
    monto: [0, [Validators.required, Validators.min(0.01)]],
    metodo: ['TARJETA', Validators.required],
    estado: ['PENDIENTE', Validators.required],
    referenciaTransaccion: [''],
  });

  ngOnInit(): void {
    this.cargar();
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

  labelPedido(idPedido: number): string {
    const pedido = this.pedidos().find((p) => p.id === idPedido);
    if (!pedido) return `Pedido #${idPedido}`;
    return `#${pedido.id} — ${pedido.cliente} (S/ ${Number(pedido.total).toFixed(2)})`;
  }

  onPedidoChange(): void {
    const idPedido = this.form.controls.idPedido.value;
    const pedido = this.pedidos().find((p) => p.id === idPedido);
    if (pedido) {
      this.form.controls.monto.setValue(Number(pedido.total));
    }
  }

  editar(pago: Pago): void {
    this.editingId.set(pago.id);
    this.message.set(null);
    this.error.set(null);

    this.form.patchValue({
      idPedido: pago.idPedido,
      monto: Number(pago.monto),
      metodo: pago.metodo,
      estado: pago.estado,
      referenciaTransaccion: pago.referenciaTransaccion ?? '',
    });
  }

  cancelarEdicion(): void {
    this.editingId.set(null);
    this.resetForm();
    this.error.set(null);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Completa todos los campos obligatorios.');
      return;
    }

    const raw = this.form.getRawValue();
    const pedido = this.pedidos().find((p) => p.id === raw.idPedido);

    if (!pedido) {
      this.error.set('Selecciona un pedido válido');
      return;
    }

    if (Number(raw.monto) !== Number(pedido.total)) {
      this.error.set(`El monto debe coincidir con el total del pedido (S/ ${Number(pedido.total).toFixed(2)})`);
      return;
    }

    const payload: PagoRequest = {
      idPedido: raw.idPedido,
      monto: raw.monto,
      metodo: raw.metodo,
      estado: raw.estado,
      referenciaTransaccion: raw.referenciaTransaccion || undefined,
    };

    const editingId = this.editingId();
    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);

    const request$ = editingId
      ? this.pagoService.actualizar(editingId, payload)
      : this.pagoService.crear(payload);

    request$.subscribe({
      next: () => {
        this.message.set(editingId ? 'Pago actualizado' : 'Pago registrado correctamente');
        this.editingId.set(null);
        this.resetForm();
        this.cargar();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(
          extractHttpErrorMessage(err, editingId ? 'Error al actualizar pago' : 'Error al registrar pago'),
        );
        this.saving.set(false);
      },
    });
  }

  eliminar(pago: Pago): void {
    if (!confirm(`¿Eliminar pago #${pago.id} del pedido #${pago.idPedido}?`)) return;

    this.pagoService.eliminar(pago.id).subscribe({
      next: () => {
        this.message.set(`Pago #${pago.id} eliminado`);
        if (this.editingId() === pago.id) {
          this.cancelarEdicion();
        }
        this.cargar();
      },
      error: (err) => this.error.set(extractHttpErrorMessage(err, 'No se pudo eliminar el pago')),
    });
  }

  private resetForm(): void {
    this.form.reset({
      idPedido: 0,
      monto: 0,
      metodo: 'TARJETA',
      estado: 'PENDIENTE',
      referenciaTransaccion: '',
    });
  }
}
