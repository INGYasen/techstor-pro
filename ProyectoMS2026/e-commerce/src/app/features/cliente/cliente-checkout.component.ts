import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  from,
  map,
  of,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { NominatimResult } from '../../core/models/nominatim.models';
import { MercadoPagoConfig, Pedido } from '../../core/models/api.models';
import { CartService, PagoService, PedidoService } from '../../core/services/api.service';
import { MercadoPagoSdkService } from '../../core/services/mercadopago.service';
import { NominatimService } from '../../core/services/nominatim.service';
import { ToastService } from '../../core/services/toast.service';
import { METODOS_PAGO } from '../../core/utils/producto-display.util';
import { extractHttpErrorMessage } from '../../core/utils/http-error.util';
import { resolveProductoImagenUrl } from '../../core/utils/producto-image.util';

@Component({
  selector: 'app-cliente-checkout',
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './cliente-checkout.component.html',
  styleUrl: './cliente-checkout.component.scss',
})
export class ClienteCheckoutComponent implements OnInit, OnDestroy {
  private readonly cart = inject(CartService);
  private readonly pedidoService = inject(PedidoService);
  private readonly pagoService = inject(PagoService);
  private readonly mpSdk = inject(MercadoPagoSdkService);
  private readonly auth = inject(AuthService);
  private readonly nominatim = inject(NominatimService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  protected readonly step = signal<1 | 2 | 3>(1);
  protected readonly processing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly ubicando = signal(false);
  protected readonly sugerencias = signal<NominatimResult[]>([]);
  protected readonly buscandoDireccion = signal(false);
  protected readonly mostrarSugerencias = signal(false);
  protected readonly indiceActivo = signal(-1);
  protected readonly latitud = signal<number | null>(null);
  protected readonly longitud = signal<number | null>(null);
  protected readonly metodosPago = METODOS_PAGO;
  protected readonly yapeSlots = [0, 1, 2, 3, 4, 5];
  protected readonly plinSlots = [0, 1, 2, 3, 4, 5];
  protected readonly checkoutSteps = [
    { n: 1, label: 'Envío' },
    { n: 2, label: 'Pago' },
    { n: 3, label: 'Resumen' },
  ] as const;
  protected readonly mpConfig = signal<MercadoPagoConfig | null>(null);

  protected readonly items = this.cart.items;
  protected readonly subtotal = computed(() => this.cart.subtotal());
  protected readonly baseImponible = computed(() => this.cart.baseImponible());
  protected readonly impuestos = computed(() => this.cart.impuestos());
  protected readonly envio = computed(() => this.cart.costoEnvio());
  protected readonly total = computed(() => this.cart.total());

  protected readonly envioForm = this.fb.nonNullable.group({
    direccionEnvio: ['', Validators.required],
    observacion: [''],
  });

  protected readonly pagoForm = this.fb.nonNullable.group({
    metodo: ['YAPE', Validators.required],
    numeroTarjeta: [''],
    titularTarjeta: [''],
    vencimiento: [''],
    cvv: [''],
    yapeCelular: [''],
    yapeCodigo: [''],
    plinCelular: [''],
    plinCodigo: [''],
    transferenciaRef: [''],
    aceptaPolitica: [false, Validators.requiredTrue],
  });

  ngOnInit(): void {
    if (!this.cart.getItems().length) {
      void this.router.navigate(['/carrito']);
      return;
    }

    this.pagoService
      .obtenerConfigMercadoPago()
      .pipe(catchError(() => of({ enabled: false, publicKey: '' })))
      .subscribe((cfg) => this.mpConfig.set(cfg));

    this.envioForm.controls.direccionEnvio.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap((query) => {
          const trimmed = query.trim();
          if (trimmed.length < 3) {
            this.sugerencias.set([]);
            this.mostrarSugerencias.set(false);
            this.buscandoDireccion.set(false);
          } else {
            this.buscandoDireccion.set(true);
            this.mostrarSugerencias.set(true);
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
        this.indiceActivo.set(results.length ? 0 : -1);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  pasoEstado(n: number): 'done' | 'active' | 'pending' {
    const actual = this.step();
    if (n < actual) return 'done';
    if (n === actual) return 'active';
    return 'pending';
  }

  metodoActivo(): string {
    return this.pagoForm.controls.metodo.value;
  }

  iconoMetodoImagen(id: string): string | null {
    const urls: Record<string, string> = {
      TARJETA: '/images/pago-tarjeta.png',
      YAPE: '/images/pago-yape.png',
      PLIN: '/images/pago-plin.png',
    };
    return urls[id] ?? null;
  }

  iconoMetodoTexto(id: string): string {
    if (id === 'YAPE') return 'Y';
    if (id === 'PLIN') return 'P';
    if (id === 'TARJETA') return '💳';
    if (id === 'TRANSFERENCIA') return '🏦';
    if (id === 'CONTRA_ENTREGA') return '💵';
    return '•';
  }

  iconoMetodoClase(id: string): string {
    const key = id.toLowerCase();
    if (key === 'yape') return 'metodo-yape';
    if (key === 'plin') return 'metodo-plin';
    if (key === 'tarjeta') return 'metodo-tarjeta';
    return 'metodo-otro';
  }

  usarUbicacion(): void {
    if (!navigator.geolocation) {
      this.error.set('Tu navegador no soporta geolocalización.');
      return;
    }
    this.ubicando.set(true);
    this.error.set(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        this.latitud.set(lat);
        this.longitud.set(lon);
        this.nominatim.reversa(lat, lon).subscribe({
          next: (result) => {
            this.envioForm.patchValue({
              direccionEnvio: result?.display_name ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
            });
            this.ubicando.set(false);
          },
          error: () => {
            this.envioForm.patchValue({ direccionEnvio: `${lat.toFixed(5)}, ${lon.toFixed(5)}` });
            this.ubicando.set(false);
          },
        });
      },
      () => {
        this.error.set('No se pudo obtener tu ubicación. Escribe la dirección manualmente.');
        this.ubicando.set(false);
      },
    );
  }

  seleccionarDireccion(resultado: NominatimResult): void {
    this.envioForm.patchValue({ direccionEnvio: resultado.display_name }, { emitEvent: false });
    this.latitud.set(parseFloat(resultado.lat));
    this.longitud.set(parseFloat(resultado.lon));
    this.sugerencias.set([]);
    this.mostrarSugerencias.set(false);
  }

  onDireccionBlur(): void {
    setTimeout(() => this.mostrarSugerencias.set(false), 180);
  }

  continuarAPago(): void {
    if (this.envioForm.invalid) {
      this.envioForm.markAllAsTouched();
      this.error.set('Ingresa la dirección de entrega.');
      return;
    }
    this.error.set(null);
    this.step.set(2);
  }

  continuarAResumen(): void {
    if (!this.validarPago()) return;
    this.error.set(null);
    this.step.set(3);
  }

  metodoLabel(): string {
    const id = this.pagoForm.controls.metodo.value;
    return this.metodosPago.find((m) => m.id === id)?.label ?? id;
  }

  onTarjetaNumeroInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 16);
    const formateado = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    this.pagoForm.controls.numeroTarjeta.setValue(formateado);
    input.value = formateado;
  }

  onVencimientoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let digits = input.value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) digits = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    this.pagoForm.controls.vencimiento.setValue(digits);
    input.value = digits;
  }

  codigoDigitoEn(campo: 'yape' | 'plin', indice: number): string {
    const codigo =
      campo === 'yape' ? this.pagoForm.controls.yapeCodigo.value : this.pagoForm.controls.plinCodigo.value;
    return codigo[indice] ?? '';
  }

  onCodigoDigito(campo: 'yape' | 'plin', indice: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digito = input.value.replace(/\D/g, '').slice(-1);
    input.value = digito;
    const control = campo === 'yape' ? this.pagoForm.controls.yapeCodigo : this.pagoForm.controls.plinCodigo;
    const digitos = control.value.split('');
    while (digitos.length < 6) digitos.push('');
    digitos[indice] = digito;
    control.setValue(digitos.join('').trimEnd());
    if (digito && indice < 5) {
      const contenedor = input.closest('.code-boxes');
      contenedor?.querySelectorAll<HTMLInputElement>('input')[indice + 1]?.focus();
    }
  }

  onCodigoKeydown(campo: 'yape' | 'plin', indice: number, event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    if (event.key !== 'Backspace' || input.value || indice === 0) return;
    event.preventDefault();
    const control = campo === 'yape' ? this.pagoForm.controls.yapeCodigo : this.pagoForm.controls.plinCodigo;
    const digitos = control.value.split('');
    while (digitos.length < 6) digitos.push('');
    digitos[indice - 1] = '';
    control.setValue(digitos.join('').trimEnd());
    input.closest('.code-boxes')?.querySelectorAll<HTMLInputElement>('input')[indice - 1]?.focus();
  }

  private validarPago(): boolean {
    const metodo = this.pagoForm.controls.metodo.value;
    const f = this.pagoForm.controls;

    if (!f.aceptaPolitica.value) {
      this.error.set('Debes aceptar la política de privacidad.');
      return false;
    }

    if (metodo === 'TARJETA') {
      if (f.numeroTarjeta.value.replace(/\s/g, '').length < 13) {
        this.error.set('Ingresa un número de tarjeta válido.');
        return false;
      }
      if (!f.titularTarjeta.value.trim()) {
        this.error.set('Ingresa el nombre del titular.');
        return false;
      }
      if (!/^\d{2}\/\d{2}$/.test(f.vencimiento.value.trim())) {
        this.error.set('Vencimiento inválido. Usa MM/AA.');
        return false;
      }
      if (f.cvv.value.replace(/\D/g, '').length < 3) {
        this.error.set('Ingresa el código de seguridad.');
        return false;
      }
    }

    if (metodo === 'YAPE') {
      const celular = f.yapeCelular.value.replace(/\D/g, '');
      if (celular.startsWith('51') && celular.length === 11) {
        // ok, se normaliza al cobrar
      } else if (celular.length !== 9 || !celular.startsWith('9')) {
        this.error.set('Ingresa tu celular Yape de 9 dígitos (ej: 967 007 832).');
        return false;
      }
      if (f.yapeCodigo.value.length !== 6) {
        this.error.set('El código de Yape debe tener 6 dígitos.');
        return false;
      }
      if (this.total() < 2) {
        this.error.set('Mercado Pago requiere un mínimo de S/ 2. Agrega otro producto al carrito.');
        return false;
      }
    }

    if (metodo === 'PLIN') {
      if (f.plinCelular.value.replace(/\D/g, '').length < 9) {
        this.error.set('Ingresa el celular asociado a Plin.');
        return false;
      }
      if (f.plinCodigo.value.length !== 6) {
        this.error.set('El código de Plin debe tener 6 dígitos.');
        return false;
      }
    }

    if (metodo === 'TRANSFERENCIA' && !f.transferenciaRef.value.trim()) {
      this.error.set('Ingresa el número de operación.');
      return false;
    }

    return true;
  }

  private construirReferencia(): string | undefined {
    const metodo = this.pagoForm.controls.metodo.value;
    const f = this.pagoForm.getRawValue();

    if (metodo === 'TARJETA') {
      return `TARJ-****${f.numeroTarjeta.replace(/\s/g, '').slice(-4)}`;
    }
    if (metodo === 'YAPE') {
      return `YAPE-${f.yapeCelular.replace(/\D/g, '')}-${f.yapeCodigo}`;
    }
    if (metodo === 'PLIN') {
      return `PLIN-${f.plinCelular.replace(/\D/g, '')}-${f.plinCodigo}`;
    }
    if (metodo === 'TRANSFERENCIA') {
      return f.transferenciaRef.trim();
    }
    return undefined;
  }

  private construirObservacion(): string | undefined {
    const obs = this.envioForm.controls.observacion.value.trim();
    const lat = this.latitud();
    const lon = this.longitud();
    const coords = lat != null && lon != null ? ` [GPS: ${lat}, ${lon}]` : '';
    const texto = `${obs}${coords}`.trim();
    return texto || undefined;
  }

  confirmarCompra(): void {
    if (!this.validarPago()) {
      this.step.set(2);
      return;
    }

    const cartItems = this.cart.getItems();
    if (!cartItems.length) {
      void this.router.navigate(['/carrito']);
      return;
    }

    this.processing.set(true);
    this.error.set(null);

    const metodo = this.pagoForm.controls.metodo.value;
    if (metodo === 'YAPE') {
      this.confirmarCompraYape(cartItems);
      return;
    }
    if (metodo === 'TARJETA') {
      this.confirmarCompraTarjeta(cartItems);
      return;
    }

    this.confirmarCompraSimulado(cartItems, metodo);
  }

  private confirmarCompraYape(cartItems: ReturnType<CartService['getItems']>): void {
    const mp = this.mpConfig();
    if (!mp?.enabled || !mp.publicKey) {
      this.error.set(
        'Yape con cobro real requiere configurar Mercado Pago (credenciales TEST). Revisa Guia.txt.',
      );
      this.processing.set(false);
      this.step.set(2);
      return;
    }

    const { direccionEnvio } = this.envioForm.getRawValue();
    const f = this.pagoForm.getRawValue();
    const celular = f.yapeCelular.replace(/\D/g, '');
    const otp = f.yapeCodigo;

    const pedidoPayload = {
      userId: this.auth.getUserId(),
      cliente: this.auth.getUsername() ?? 'cliente',
      estado: 'PENDIENTE',
      direccionEnvio,
      observacion: this.construirObservacion(),
      items: cartItems.map((i) => ({ productoId: i.producto.id, cantidad: i.cantidad })),
    };

    from(this.mpSdk.init(mp.publicKey))
      .pipe(
        switchMap(() => from(this.mpSdk.crearTokenYape(celular, otp))),
        switchMap((token) =>
          this.pedidoService.crear(pedidoPayload).pipe(
            switchMap((pedido) =>
              this.pagoService.cobrarYapeMercadoPago({ idPedido: pedido.id, token }).pipe(
                switchMap((mpRes) => {
                  if (!mpRes.approved) {
                    throw new Error(mpRes.message || 'El pago con Yape no fue aprobado.');
                  }
                  return this.pedidoService
                    .actualizar(pedido.id, { ...pedidoPayload, estado: 'PAGADO' })
                    .pipe(map(() => ({ pedido, mpPaymentId: mpRes.mercadoPagoPaymentId })));
                }),
              ),
            ),
          ),
        ),
      )
      .subscribe({
        next: ({ pedido, mpPaymentId }) => this.finalizarCompra(pedido, 'YAPE', mpPaymentId),
        error: (err) => {
          this.error.set(extractHttpErrorMessage(err, 'No se pudo completar el pago con Yape'));
          this.processing.set(false);
          this.step.set(2);
        },
      });
  }

  private confirmarCompraTarjeta(cartItems: ReturnType<CartService['getItems']>): void {
    const mp = this.mpConfig();
    if (!mp?.enabled || !mp.publicKey) {
      this.error.set(
        'Pago con tarjeta requiere configurar Mercado Pago (credenciales TEST). Revisa Guia.txt.',
      );
      this.processing.set(false);
      this.step.set(2);
      return;
    }

    const { direccionEnvio } = this.envioForm.getRawValue();
    const f = this.pagoForm.getRawValue();

    const pedidoPayload = {
      userId: this.auth.getUserId(),
      cliente: this.auth.getUsername() ?? 'cliente',
      estado: 'PENDIENTE',
      direccionEnvio,
      observacion: this.construirObservacion(),
      items: cartItems.map((i) => ({ productoId: i.producto.id, cantidad: i.cantidad })),
    };

    from(this.mpSdk.init(mp.publicKey))
      .pipe(
        switchMap(() =>
          from(
            this.mpSdk.crearTokenTarjeta({
              numero: f.numeroTarjeta,
              titular: f.titularTarjeta,
              vencimiento: f.vencimiento,
              cvv: f.cvv,
            }),
          ),
        ),
        switchMap(({ token, paymentMethodId }) =>
          this.pedidoService.crear(pedidoPayload).pipe(
            switchMap((pedido) =>
              this.pagoService
                .cobrarTarjetaMercadoPago({
                  idPedido: pedido.id,
                  token,
                  paymentMethodId,
                  installments: 1,
                })
                .pipe(
                  switchMap((mpRes) => {
                    if (!mpRes.approved) {
                      throw new Error(mpRes.message || 'El pago con tarjeta no fue aprobado.');
                    }
                    return this.pedidoService
                      .actualizar(pedido.id, { ...pedidoPayload, estado: 'PAGADO' })
                      .pipe(map(() => ({ pedido, mpPaymentId: mpRes.mercadoPagoPaymentId })));
                  }),
                ),
            ),
          ),
        ),
      )
      .subscribe({
        next: ({ pedido, mpPaymentId }) => this.finalizarCompra(pedido, 'TARJETA', mpPaymentId),
        error: (err) => {
          this.error.set(extractHttpErrorMessage(err, 'No se pudo completar el pago con tarjeta'));
          this.processing.set(false);
          this.step.set(2);
        },
      });
  }

  private confirmarCompraSimulado(
    cartItems: ReturnType<CartService['getItems']>,
    metodo: string,
  ): void {
    const { direccionEnvio } = this.envioForm.getRawValue();
    const referencia = this.construirReferencia();

    this.pedidoService
      .crear({
        userId: this.auth.getUserId(),
        cliente: this.auth.getUsername() ?? 'cliente',
        estado: 'PAGADO',
        direccionEnvio,
        observacion: this.construirObservacion(),
        items: cartItems.map((i) => ({ productoId: i.producto.id, cantidad: i.cantidad })),
      })
      .pipe(
        switchMap((pedido) =>
          this.pagoService.obtenerPorPedido(pedido.id).pipe(
            switchMap((pago) =>
              this.pagoService
                .actualizar(pago.id, {
                  idPedido: pedido.id,
                  monto: Number(pedido.total),
                  metodo,
                  estado: 'APROBADO',
                  referenciaTransaccion: referencia,
                })
                .pipe(map(() => pedido)),
            ),
          ),
        ),
      )
      .subscribe({
        next: (pedido) => this.finalizarCompra(pedido, metodo),
        error: (err) => {
          this.error.set(extractHttpErrorMessage(err, 'No se pudo completar la compra'));
          this.processing.set(false);
        },
      });
  }

  private finalizarCompra(pedido: Pedido, metodo: string, mercadoPagoPaymentId?: number): void {
    this.cart.clear();
    this.processing.set(false);
    const refMp = mercadoPagoPaymentId ? ` (Mercado Pago #${mercadoPagoPaymentId})` : '';
    this.toast.success(`¡Pedido ${pedido.id} confirmado!${refMp}`);
    void this.router.navigate(['/cliente/pedidos'], {
      state: {
        mensaje: `Compra exitosa. Pedido ${pedido.id} — pago con ${metodo} registrado${refMp}.`,
      },
    });
  }

  imagenProducto(url?: string | null): string | null {
    return resolveProductoImagenUrl(url);
  }
}
