import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Categoria, Producto } from '../../core/models/api.models';
import { CartService, CategoriaService, ProductoService } from '../../core/services/api.service';
import { CatalogSearchService } from '../../core/services/catalog-search.service';
import { ToastService } from '../../core/services/toast.service';
import { esDestacado, esOferta, popularidadScore, precioAnterior, descuentoPorcentaje } from '../../core/utils/producto-display.util';
import { extractHttpErrorMessage } from '../../core/utils/http-error.util';
import { resolveProductoImagenUrl } from '../../core/utils/producto-image.util';

type SortOption = 'nombre' | 'precio-asc' | 'precio-desc' | 'popularidad';

interface CategoriaMeta {
  icon: string;
  tone: string;
}

@Component({
  selector: 'app-catalogo',
  imports: [DecimalPipe, FormsModule, RouterLink],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.scss',
})
export class CatalogoComponent implements OnInit, OnDestroy {
  private readonly productoService = inject(ProductoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  protected readonly catalogSearch = inject(CatalogSearchService);
  private readonly toast = inject(ToastService);

  protected readonly allProductos = signal<Producto[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly loading = signal(true);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly selectedCategoriaId = signal<number | null>(null);
  protected readonly precioMin = signal<number | null>(null);
  protected readonly precioMax = signal<number | null>(null);
  protected readonly sortBy = signal<SortOption>('nombre');
  protected readonly soloOfertas = signal(false);

  protected readonly conteoPorCategoria = computed(() => {
    const map = new Map<number, number>();
    for (const p of this.allProductos()) {
      map.set(p.idCategoria, (map.get(p.idCategoria) ?? 0) + 1);
    }
    return map;
  });

  protected readonly productosFiltrados = computed(() => {
    let list = [...this.allProductos()];
    const categoriaId = this.selectedCategoriaId();
    const term = this.catalogSearch.term().trim().toLowerCase();
    const min = this.precioMin();
    const max = this.precioMax();

    if (categoriaId != null) {
      list = list.filter((p) => p.idCategoria === categoriaId);
    }

    if (term) {
      list = list.filter((p) => {
        const cat = this.nombreCategoria(p.idCategoria).toLowerCase();
        return (
          p.nombre.toLowerCase().includes(term) ||
          (p.descripcion?.toLowerCase().includes(term) ?? false) ||
          cat.includes(term) ||
          (p.sku?.toLowerCase().includes(term) ?? false)
        );
      });
    }

    if (min != null) {
      list = list.filter((p) => Number(p.precio) >= min);
    }

    if (max != null) {
      list = list.filter((p) => Number(p.precio) <= max);
    }

    if (this.soloOfertas()) {
      list = list.filter((p) => esOferta(p));
    }

    const sort = this.sortBy();
    list.sort((a, b) => {
      if (sort === 'precio-asc') return Number(a.precio) - Number(b.precio);
      if (sort === 'precio-desc') return Number(b.precio) - Number(a.precio);
      if (sort === 'popularidad') return popularidadScore(b) - popularidadScore(a);
      return a.nombre.localeCompare(b.nombre);
    });

    return list;
  });

  ngOnInit(): void {
    this.categoriaService.listar().subscribe({
      next: (cats) => this.categorias.set(cats),
    });

    this.productoService.listar().subscribe({
      next: (data) => {
        this.allProductos.set(data.filter((p) => p.activo !== false && p.stock > 0));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractHttpErrorMessage(err, 'No se pudo cargar el catálogo'));
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.catalogSearch.term.set('');
  }

  nombreCategoria(idCategoria: number): string {
    return this.categorias().find((c) => c.id === idCategoria)?.nombre ?? 'General';
  }

  contarCategoria(id: number | null): number {
    if (id == null) return this.allProductos().length;
    return this.conteoPorCategoria().get(id) ?? 0;
  }

  categoriaSelectValue(): string {
    const id = this.selectedCategoriaId();
    return id == null ? 'all' : String(id);
  }

  onCategoriaChange(value: string): void {
    this.selectedCategoriaId.set(value === 'all' ? null : Number(value));
  }

  seleccionarCategoria(id: number | null): void {
    this.selectedCategoriaId.set(id);
  }

  limpiarFiltros(): void {
    this.selectedCategoriaId.set(null);
    this.catalogSearch.term.set('');
    this.precioMin.set(null);
    this.precioMax.set(null);
    this.sortBy.set('nombre');
    this.soloOfertas.set(false);
  }

  categoriaMeta(nombre: string): CategoriaMeta {
    const key = nombre.toLowerCase();
    if (key.includes('laptop') || key.includes('notebook')) {
      return { icon: '💻', tone: 'blue' };
    }
    if (key.includes('celular') || key.includes('phone') || key.includes('móvil') || key.includes('movil')) {
      return { icon: '📱', tone: 'purple' };
    }
    if (key.includes('monitor') || key.includes('pantalla')) {
      return { icon: '🖥️', tone: 'green' };
    }
    if (key.includes('audio') || key.includes('auricular') || key.includes('sony')) {
      return { icon: '🎧', tone: 'red' };
    }
    if (key.includes('perif')) {
      return { icon: '⌨️', tone: 'purple' };
    }
    if (key.includes('almacen') || key.includes('storage') || key.includes('ssd')) {
      return { icon: '💾', tone: 'green' };
    }
    if (key.includes('component')) {
      return { icon: '🔧', tone: 'orange' };
    }
    return { icon: '📦', tone: 'slate' };
  }

  imagenProducto(producto: Producto): string | null {
    return resolveProductoImagenUrl(producto.imagenUrl);
  }

  agregar(producto: Producto, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    void this.cart.add(producto).then((ok) => {
      if (ok) {
        this.toast.success(`"${producto.nombre}" agregado al carrito`);
        return;
      }
      if (this.auth.isAdmin()) {
        this.toast.error('Los administradores no usan carrito. Prueba con la cuenta user / user123.');
        return;
      }
      this.toast.error('No se pudo agregar el producto al carrito.');
    });
  }

  esDestacado = esDestacado;
  esOferta = esOferta;
  precioAnterior = precioAnterior;
  descuentoPorcentaje = descuentoPorcentaje;
}
