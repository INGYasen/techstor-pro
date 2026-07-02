import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Producto } from '../core/models/api.models';
import { CartService, ProductoService } from '../core/services/api.service';

@Component({
  selector: 'app-cliente-tienda',
  imports: [CurrencyPipe],
  templateUrl: './cliente-tienda.component.html',
  styleUrl: './cliente-tienda.component.scss',
})
export class ClienteTiendaComponent implements OnInit {
  private readonly productoService = inject(ProductoService);
  protected readonly cart = inject(CartService);

  protected readonly productos = signal<Producto[]>([]);
  protected readonly loading = signal(true);
  protected readonly message = signal<string | null>(null);

  ngOnInit(): void {
    this.productoService.listar().subscribe({
      next: (data) => {
        this.productos.set(data.filter((p) => p.activo !== false && p.stock > 0));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  agregar(producto: Producto): void {
    this.cart.add(producto);
    this.message.set(`"${producto.nombre}" agregado al carrito`);
    setTimeout(() => this.message.set(null), 2000);
  }
}
