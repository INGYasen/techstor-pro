import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Categoria, Producto } from '../core/models/api.models';
import { CartService, CategoriaService, ProductoService } from '../core/services/api.service';
import { CatalogSearchService } from '../core/services/catalog-search.service';
import { extractHttpErrorMessage } from '../core/utils/http-error.util';
import { resolveProductoImagenUrl } from '../core/utils/producto-image.util';

type SortOption = 'nombre' | 'precio-asc' | 'precio-desc';

interface CategoriaMeta {
  icon: string;
  tone: string;
}

@Component({
  selector: 'app-catalogo',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.scss',
})
export class CatalogoComponent implements OnInit, OnDestroy {
  private readonly productoService = inject(ProductoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly cart = inject(CartService);
  protected readonly catalogSearch = inject(CatalogSearchService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly allProductos = signal<Producto[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly loading = signal(true);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly selectedCategoriaId = signal<number | null>(null);
  protected readonly precioMin = signal<number | null>(null);
  protected readonly precioMax = signal<number | null>(null);
  protected readonly sortBy = signal<SortOption>('nombre');

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

    const sort = this.sortBy();
    list.sort((a, b) => {
      if (sort === 'precio-asc') return Number(a.precio) - Number(b.precio);
      if (sort === 'precio-desc') return Number(b.precio) - Number(a.precio);
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

  categoriaMeta(nombre: string): CategoriaMeta {
    const key = nombre.toLowerCase();
    if (key.includes('laptop') || key.includes('notebook')) {
      return { icon: '💻', tone: 'blue' };
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

  agregar(producto: Producto): void {
    if (!this.auth.isLoggedIn() || this.auth.isAdmin()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/catalogo' } });
      return;
    }

    this.cart.add(producto);
    this.message.set(`"${producto.nombre}" agregado al carrito`);
    setTimeout(() => this.message.set(null), 2500);
  }
}
