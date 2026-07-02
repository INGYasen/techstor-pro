import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink],
  template: `
    <section class="panel">
      <h2>Panel de administración</h2>
      <p>Gestiona productos, categorías, pedidos y pagos del catálogo.</p>
      <div class="cards">
        <a routerLink="/admin/productos" class="card-link">
          <h3>Productos</h3>
          <p>Alta, edición y baja de productos</p>
        </a>
        <a routerLink="/admin/categorias" class="card-link">
          <h3>Categorías</h3>
          <p>Organiza el catálogo por categorías</p>
        </a>
        <a routerLink="/admin/pedidos" class="card-link">
          <h3>Pedidos</h3>
          <p>Consulta, edita y elimina pedidos</p>
        </a>
        <a routerLink="/admin/pagos" class="card-link">
          <h3>Pagos</h3>
          <p>Registra, edita y elimina pagos de pedidos</p>
        </a>
      </div>
    </section>
  `,
})
export class AdminDashboardComponent {}
