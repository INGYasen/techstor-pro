import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import {
  Categoria,
  MercadoPagoConfig,
  MercadoPagoTarjetaRequest,
  MercadoPagoYapeRequest,
  MercadoPagoYapeResponse,
  Pago,
  PagoRequest,
  Pedido,
  PedidoRequest,
  PerfilUpdateRequest,
  PerfilUsuario,
  Producto,
  ProductoRequest,
  Usuario,
  UsuarioCreateRequest,
  UsuarioUpdateRequest,
} from '../models/api.models';
export { CartService, COSTO_ENVIO, ENVIO_GRATIS_DESDE, IGV_RATE } from './cart.service';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly base = '/api/v1/categorias';

  constructor(private readonly http: HttpClient) {}

  listar() {
    return this.http.get<Categoria[]>(this.base);
  }

  crear(body: { nombre: string; descripcion?: string }) {
    return this.http.post<Categoria>(this.base, body);
  }

  actualizar(id: number, body: { nombre: string; descripcion?: string }) {
    return this.http.put<Categoria>(`${this.base}/${id}`, body);
  }

  eliminar(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private readonly base = '/api/v1/productos';

  constructor(private readonly http: HttpClient) {}

  private normalizeProducto(producto: Producto & { en_oferta?: boolean }): Producto {
    return {
      ...producto,
      enOferta: producto.enOferta === true || producto.en_oferta === true,
    };
  }

  listar() {
    return this.http
      .get<(Producto & { en_oferta?: boolean })[]>(this.base)
      .pipe(map((items) => items.map((p) => this.normalizeProducto(p))));
  }

  obtener(id: number) {
    return this.http
      .get<Producto & { en_oferta?: boolean }>(`${this.base}/${id}`)
      .pipe(map((p) => this.normalizeProducto(p)));
  }

  obtenerDetalle(id: number) {
    return this.http
      .get<Producto & { en_oferta?: boolean }>(`${this.base}/detalle/${id}`)
      .pipe(map((p) => this.normalizeProducto(p)));
  }

  crear(body: ProductoRequest) {
    return this.http
      .post<Producto & { en_oferta?: boolean }>(this.base, body)
      .pipe(map((p) => this.normalizeProducto(p)));
  }

  actualizar(id: number, body: ProductoRequest) {
    return this.http
      .put<Producto & { en_oferta?: boolean }>(`${this.base}/${id}`, body)
      .pipe(map((p) => this.normalizeProducto(p)));
  }

  subirImagen(archivo: File) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<{ imagenUrl: string; nombreArchivo: string }>(`${this.base}/imagen`, formData);
  }

  eliminar(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly base = '/api/v1/pedidos';

  constructor(private readonly http: HttpClient) {}

  listar() {
    return this.http.get<Pedido[]>(this.base);
  }

  crear(body: PedidoRequest) {
    return this.http.post<Pedido>(this.base, body);
  }

  obtener(id: number) {
    return this.http.get<Pedido>(`${this.base}/${id}`);
  }

  actualizar(id: number, body: PedidoRequest) {
    return this.http.put<Pedido>(`${this.base}/${id}`, body);
  }

  eliminar(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class PagoService {
  private readonly base = '/api/v1/pagos';

  constructor(private readonly http: HttpClient) {}

  listar() {
    return this.http.get<Pago[]>(this.base);
  }

  obtener(id: number) {
    return this.http.get<Pago>(`${this.base}/${id}`);
  }

  obtenerPorPedido(idPedido: number) {
    return this.http.get<Pago>(`${this.base}/pedido/${idPedido}`);
  }

  crear(body: PagoRequest) {
    return this.http.post<Pago>(this.base, body);
  }

  actualizar(id: number, body: PagoRequest) {
    return this.http.put<Pago>(`${this.base}/${id}`, body);
  }

  eliminar(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  obtenerConfigMercadoPago() {
    return this.http.get<MercadoPagoConfig>(`${this.base}/mercadopago/config`);
  }

  cobrarYapeMercadoPago(body: MercadoPagoYapeRequest) {
    return this.http.post<MercadoPagoYapeResponse>(`${this.base}/mercadopago/yape`, body);
  }

  cobrarTarjetaMercadoPago(body: MercadoPagoTarjetaRequest) {
    return this.http.post<MercadoPagoYapeResponse>(`${this.base}/mercadopago/tarjeta`, body);
  }
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly base = '/auth/users';

  constructor(private readonly http: HttpClient) {}

  listar() {
    return this.http.get<Usuario[]>(this.base);
  }

  crear(body: UsuarioCreateRequest) {
    return this.http.post<Usuario>(this.base, body);
  }

  actualizar(id: number, body: UsuarioUpdateRequest) {
    return this.http.put<Usuario>(`${this.base}/${id}`, body);
  }

  eliminar(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  obtenerPerfil() {
    return this.http.get<PerfilUsuario>('/auth/me');
  }

  actualizarPerfil(body: PerfilUpdateRequest) {
    return this.http.put<PerfilUsuario>('/auth/me', body);
  }
}
