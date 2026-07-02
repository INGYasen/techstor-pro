import { DecimalPipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  of,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { NominatimResult } from '../../core/models/nominatim.models';
import { CartService, PedidoService } from '../../core/services/api.service';
import { NominatimService } from '../../core/services/nominatim.service';
import { extractHttpErrorMessage } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-cliente-carrito',
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './cliente-carrito.component.html',
  styleUrl: './cliente-carrito.component.scss',
})
export class ClienteCarritoComponent implements OnInit, OnDestroy {
  private readonly cart = inject(CartService);
  private readonly pedidoService = inject(PedidoService);
  private readonly auth = inject(AuthService);
  private readonly nominatim = inject(NominatimService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  protected readonly items = signal(this.cart.getItems());
  protected readonly processing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly sugerencias = signal<NominatimResult[]>([]);
  protected readonly buscandoDireccion = signal(false);
  protected readonly mostrarSugerencias = signal(false);
  protected readonly sinResultados = signal(false);
  protected readonly indiceActivo = signal(-1);

  protected readonly checkoutForm = this.fb.nonNullable.group({
    direccionEnvio: ['', Validators.required],
    observacion: [''],
  });

  ngOnInit(): void {
    this.checkoutForm.controls.direccionEnvio.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap((query) => {
          const trimmed = query.trim();
          if (trimmed.length < 3) {
            this.sugerencias.set([]);
            this.mostrarSugerencias.set(false);
            this.sinResultados.set(false);
            this.buscandoDireccion.set(false);
            this.indiceActivo.set(-1);
          } else {
            this.buscandoDireccion.set(true);
            this.mostrarSugerencias.set(true);
            this.sinResultados.set(false);
          }
        }),
        filter((query) => query.trim().length >= 3),
        switchMap((query) =>
          this.nominatim.buscar(query.trim()).pipe(catchError(() => of([] as NominatimResult[]))),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((results) => {
        this.sugerencias.set(results);
        this.buscandoDireccion.set(false);
        this.mostrarSugerencias.set(true);
        this.sinResultados.set(results.length === 0);
        this.indiceActivo.set(results.length ? 0 : -1);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.items.set(this.cart.getItems());
  }

  quitar(productoId: number): void {
    this.cart.remove(productoId);
    this.refresh();
  }

  total(): number {
    return this.cart.total();
  }

  onDireccionFocus(): void {
    if (this.sugerencias().length || this.buscandoDireccion()) {
      this.mostrarSugerencias.set(true);
    }
  }

  onDireccionBlur(): void {
    setTimeout(() => this.mostrarSugerencias.set(false), 180);
  }

  onDireccionKeydown(event: KeyboardEvent): void {
    const sugerencias = this.sugerencias();
    if (!this.mostrarSugerencias() || !sugerencias.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = Math.min(this.indiceActivo() + 1, sugerencias.length - 1);
      this.indiceActivo.set(next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = Math.max(this.indiceActivo() - 1, 0);
      this.indiceActivo.set(prev);
    } else if (event.key === 'Enter' && this.indiceActivo() >= 0) {
      event.preventDefault();
      this.seleccionarDireccion(sugerencias[this.indiceActivo()]);
    } else if (event.key === 'Escape') {
      this.mostrarSugerencias.set(false);
      this.indiceActivo.set(-1);
    }
  }

  seleccionarDireccion(resultado: NominatimResult): void {
    this.checkoutForm.patchValue({ direccionEnvio: resultado.display_name }, { emitEvent: false });
    this.sugerencias.set([]);
    this.mostrarSugerencias.set(false);
    this.sinResultados.set(false);
    this.indiceActivo.set(-1);
  }

  confirmarPedido(): void {
    const cartItems = this.cart.getItems();
    if (!cartItems.length) {
      this.error.set('El carrito está vacío');
      return;
    }

    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    this.processing.set(true);
    this.error.set(null);

    const { direccionEnvio, observacion } = this.checkoutForm.getRawValue();

    this.pedidoService
      .crear({
        userId: this.auth.getUserId(),
        cliente: this.auth.getUsername() ?? 'cliente',
        estado: 'PENDIENTE',
        direccionEnvio,
        observacion: observacion || undefined,
        items: cartItems.map((i) => ({
          productoId: i.producto.id,
          cantidad: i.cantidad,
        })),
      })
      .subscribe({
        next: (pedido) => {
          this.cart.clear();
          this.refresh();
          this.success.set(`Pedido #${pedido.id} creado correctamente`);
          this.processing.set(false);
          setTimeout(() => void this.router.navigate(['/cliente/pedidos']), 1500);
        },
        error: (err) => {
          this.error.set(extractHttpErrorMessage(err, 'No se pudo crear el pedido'));
          this.processing.set(false);
        },
      });
  }
}
