import { DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Producto } from '../../core/models/api.models';
import { CartService, ProductoService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import {
  descuentoPorcentaje,
  esDestacado,
  esOferta,
  imagenesProducto,
  precioAnterior,
  productoMarca,
  productoRating,
} from '../../core/utils/producto-display.util';
import { extractHttpErrorMessage } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-producto-detalle',
  imports: [DecimalPipe, FormsModule, RouterLink],
  templateUrl: './producto-detalle.component.html',
  styleUrl: './producto-detalle.component.scss',
})
export class ProductoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productoService = inject(ProductoService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly producto = signal<Producto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly imagenActiva = signal(0);
  protected readonly cantidad = signal(1);

  protected readonly marca = () => (this.producto() ? productoMarca(this.producto()!) : '');
  protected readonly rating = () => (this.producto() ? productoRating(this.producto()!) : 0);
  protected readonly destacado = () => (this.producto() ? esDestacado(this.producto()!) : false);
  protected readonly oferta = () => (this.producto() ? esOferta(this.producto()!) : false);
  protected readonly imagenes = () => (this.producto() ? imagenesProducto(this.producto()!) : []);

  esOferta = esOferta;
  precioAnterior = precioAnterior;
  descuentoPorcentaje = descuentoPorcentaje;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      void this.router.navigate(['/catalogo']);
      return;
    }

    this.productoService.obtenerDetalle(id).subscribe({
      next: (p) => {
        this.producto.set(p);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudo cargar el producto'));
        this.loading.set(false);
      },
    });
  }

  seleccionarImagen(index: number): void {
    this.imagenActiva.set(index);
  }

  cambiarCantidad(delta: number): void {
    const p = this.producto();
    if (!p) return;
    this.cantidad.set(Math.max(1, Math.min(this.cantidad() + delta, p.stock)));
  }

  agregarAlCarrito(): void {
    const p = this.producto();
    if (!p) return;
    void this.cart.add(p, this.cantidad()).then((ok) => {
      if (ok) {
        this.toast.success(`"${p.nombre}" agregado al carrito`);
        return;
      }
      if (this.auth.isAdmin()) {
        this.toast.error('Los administradores no usan carrito. Prueba con la cuenta user / user123.');
        return;
      }
      this.toast.error('No se pudo agregar el producto al carrito.');
    });
  }
}
