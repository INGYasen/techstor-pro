import { DecimalPipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Producto } from '../../core/models/api.models';
import { ProductoService } from '../../core/services/api.service';
import { esOferta, descuentoPorcentaje, precioAnterior } from '../../core/utils/producto-display.util';
import { resolveProductoImagenUrl } from '../../core/utils/producto-image.util';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly productoService = inject(ProductoService);
  protected readonly auth = inject(AuthService);

  protected readonly productos = signal<Producto[]>([]);
  protected readonly loadingProductos = signal(true);
  protected readonly slideActual = signal(0);
  protected readonly fondoActual = signal(0);

  protected readonly fondosHero = [
    '/images/hero/hero-1.png',
    '/images/hero/hero-2.png',
    '/images/hero/hero-3.png',
    '/images/hero/hero-4.png',
    '/images/hero/hero-5.png',
    '/images/hero/hero-6.png',
  ];

  private autoScrollId: ReturnType<typeof setInterval> | null = null;
  private fondoIntervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.iniciarFondoCarrusel();

    this.productoService.listar().subscribe({
      next: (data) => {
        const destacados = data
          .filter((p) => p.activo && this.esProductoVitrina(p))
          .sort((a, b) => this.puntajeVitrina(b) - this.puntajeVitrina(a))
          .slice(0, 6);

        this.productos.set(destacados.length ? destacados : data.filter((p) => p.activo).slice(0, 4));
        this.loadingProductos.set(false);
        this.iniciarAutoScroll();
      },
      error: () => this.loadingProductos.set(false),
    });
  }

  ngOnDestroy(): void {
    this.detenerAutoScroll();
    this.detenerFondoCarrusel();
  }

  imagenProducto(producto: Producto): string | null {
    return resolveProductoImagenUrl(producto.imagenUrl) ?? '/images/laptop1.webp';
  }

  descripcionVisible(descripcion?: string | null): string | null {
    if (!descripcion?.trim()) return null;
    const texto = descripcion.trim();
    const lower = texto.toLowerCase();
    if (['demo', 'test', 'hkjkj', 'hk', 'prueba'].includes(lower)) return null;
    if (texto.length < 8) return null;
    return texto;
  }

  esOferta = esOferta;
  descuentoPorcentaje = descuentoPorcentaje;
  precioAnterior = precioAnterior;

  categoriaProducto(producto: Producto): string {
    const cat = producto.categoria?.nombre?.trim();
    if (cat) return cat.toUpperCase();
    const nombre = producto.nombre.toLowerCase();
    if (/laptop|notebook|ideapad|macbook/i.test(nombre)) return 'LAPTOP';
    if (/aud[ií]fono|headphone|earbud/i.test(nombre)) return 'AUDÍFONOS';
    if (/mouse|teclado|perif/i.test(nombre)) return 'PERIFÉRICOS';
    return 'TECNOLOGÍA';
  }

  irASlide(index: number): void {
    const total = this.productos().length;
    if (!total) return;
    const normalizado = ((index % total) + total) % total;
    this.slideActual.set(normalizado);
    this.reiniciarAutoScroll();
  }

  anterior(): void {
    this.irASlide(this.slideActual() - 1);
  }

  siguiente(): void {
    this.irASlide(this.slideActual() + 1);
  }

  private esProductoVitrina(producto: Producto): boolean {
    const nombre = producto.nombre.trim().toLowerCase();
    if (/testprod|frontendedit|prodfrontend|^demo$/i.test(nombre)) return false;
    return nombre.length >= 2;
  }

  private puntajeVitrina(producto: Producto): number {
    let score = producto.stock;
    if (producto.imagenUrl) score += 50;
    if (producto.descripcion && this.descripcionVisible(producto.descripcion)) score += 10;
    if (esOferta(producto)) score += 5;
    return score;
  }

  private avanzarAutomatico(): void {
    const total = this.productos().length;
    if (total <= 1) return;
    this.slideActual.set((this.slideActual() + 1) % total);
  }

  private iniciarAutoScroll(): void {
    this.detenerAutoScroll();
    if (this.productos().length <= 1) return;

    this.autoScrollId = setInterval(() => {
      this.avanzarAutomatico();
    }, 3000);
  }

  private reiniciarAutoScroll(): void {
    this.detenerAutoScroll();
    this.iniciarAutoScroll();
  }

  private detenerAutoScroll(): void {
    if (this.autoScrollId) {
      clearInterval(this.autoScrollId);
      this.autoScrollId = null;
    }
  }

  private iniciarFondoCarrusel(): void {
    this.detenerFondoCarrusel();
    this.fondoIntervalId = setInterval(() => {
      const total = this.fondosHero.length;
      this.fondoActual.set((this.fondoActual() + 1) % total);
    }, 2000);
  }

  private detenerFondoCarrusel(): void {
    if (this.fondoIntervalId) {
      clearInterval(this.fondoIntervalId);
      this.fondoIntervalId = null;
    }
  }
}
