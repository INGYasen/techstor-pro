import { Routes } from '@angular/router';
import { adminGuard, authGuard, carritoGuard, clienteGuard, guestGuard } from './core/auth/auth.guard';
import { AdminCategoriasComponent } from './features/admin/admin-categorias.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard.component';
import { AdminLayoutComponent } from './features/admin/admin-layout.component';
import { AdminPagosComponent } from './features/admin/admin-pagos.component';
import { AdminPedidosComponent } from './features/admin/admin-pedidos.component';
import { AdminProductosComponent } from './features/admin/admin-productos.component';
import { AdminUsuariosComponent } from './features/admin/admin-usuarios.component';
import { ClienteCheckoutComponent } from './features/cliente/cliente-checkout.component';
import { ClienteLayoutComponent } from './features/cliente/cliente-layout.component';
import { ClientePedidosComponent } from './features/cliente/cliente-pedidos.component';
import { ClientePagosComponent } from './features/cliente/cliente-pagos.component';
import { ClientePerfilComponent } from './features/cliente/cliente-perfil.component';
import { ClienteTiendaComponent } from './features/cliente/cliente-tienda.component';
import { LoginComponent } from './features/login/login.component';
import { LogoutComponent } from './features/login/logout.component';
import { RegisterComponent } from './features/login/register.component';
import { CarritoPageComponent } from './features/store/carrito-page.component';
import { CatalogoComponent } from './features/store/catalogo.component';
import { HomeComponent } from './features/store/home.component';
import { ProductoDetalleComponent } from './features/store/producto-detalle.component';
import { StoreLayoutComponent } from './features/store/store-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: StoreLayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'catalogo', component: CatalogoComponent },
      { path: 'producto/:id', component: ProductoDetalleComponent },
      { path: 'carrito', component: CarritoPageComponent, canActivate: [carritoGuard] },
    ],
  },
  { path: 'logout', component: LogoutComponent },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'registro', component: RegisterComponent, canActivate: [guestGuard] },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'productos', component: AdminProductosComponent },
      { path: 'categorias', component: AdminCategoriasComponent },
      { path: 'pedidos', component: AdminPedidosComponent },
      { path: 'pagos', component: AdminPagosComponent },
      { path: 'usuarios', component: AdminUsuariosComponent },
    ],
  },
  {
    path: 'cliente',
    component: ClienteLayoutComponent,
    canActivate: [authGuard, clienteGuard],
    children: [
      { path: '', redirectTo: 'pedidos', pathMatch: 'full' },
      { path: 'tienda', component: ClienteTiendaComponent },
      { path: 'checkout', component: ClienteCheckoutComponent },
      { path: 'carrito', redirectTo: '/carrito', pathMatch: 'full' },
      { path: 'pedidos', component: ClientePedidosComponent },
      { path: 'pagos', component: ClientePagosComponent },
      { path: 'perfil', component: ClientePerfilComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
