import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CartService, ENVIO_GRATIS_DESDE } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { resolveProductoImagenUrl } from '../../core/utils/producto-image.util';

@Component({
  selector: 'app-carrito-page',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './carrito-page.component.html',
  styleUrl: './carrito-page.component.scss',
})
export class CarritoPageComponent implements OnInit {
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly items = this.cart.items;
  protected readonly subtotal = computed(() => this.cart.subtotal());
  protected readonly baseImponible = computed(() => this.cart.baseImponible());
  protected readonly impuestos = computed(() => this.cart.impuestos());
  protected readonly envio = computed(() => this.cart.costoEnvio());
  protected readonly total = computed(() => this.cart.total());
  protected readonly faltaEnvioGratis = computed(() => {
    const falta = ENVIO_GRATIS_DESDE - this.subtotal();
    return falta > 0 ? falta : 0;
  });

  ngOnInit(): void {
    void this.cart.refreshFromServer();
  }

  imagenProducto(url?: string | null): string | null {
    return resolveProductoImagenUrl(url);
  }

  cambiarCantidad(productoId: number, delta: number): void {
    const item = this.cart.getItems().find((i) => i.producto.id === productoId);
    if (!item) return;
    this.cart.setQuantity(productoId, item.cantidad + delta);
  }

  quitar(productoId: number): void {
    this.cart.remove(productoId);
    this.toast.info('Producto eliminado del carrito');
  }

  continuarCompra(): void {
    if (!this.cart.getItems().length) return;
    if (!this.auth.isLoggedIn() || this.auth.isAdmin()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/cliente/checkout' } });
      return;
    }
    void this.router.navigate(['/cliente/checkout']);
  }
}
