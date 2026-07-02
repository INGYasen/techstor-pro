import { HttpClient } from '@angular/common/http';

import { computed, inject, Injectable, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { AuthService } from '../auth/auth.service';

import { CarritoResponse, CartItem, Producto } from '../models/api.models';



export const IGV_RATE = 0.18;

export const ENVIO_GRATIS_DESDE = 1;

export const COSTO_ENVIO = 12;



const STORAGE_KEY = 'techstore_cart';

const API_BASE = '/api/v1/carritos';



@Injectable({ providedIn: 'root' })

export class CartService {

  private readonly http = inject(HttpClient);

  private readonly auth = inject(AuthService);

  private readonly itemsSignal = signal<CartItem[]>(this.loadFromStorage());

  private readonly backendAvailable = signal(true);



  readonly items = this.itemsSignal.asReadonly();

  readonly itemCount = computed(() => this.itemsSignal().reduce((sum, i) => sum + i.cantidad, 0));

  readonly usesBackend = computed(() => this.useBackend() && this.backendAvailable());



  constructor() {

    void this.bootstrap();

  }



  count(): number {

    return this.itemCount();

  }



  getItems(): CartItem[] {

    return [...this.itemsSignal()];

  }



  async add(producto: Producto, cantidad = 1): Promise<boolean> {

    if (this.auth.isAdmin()) {

      return false;

    }



    if (this.useBackend()) {

      const synced = await this.runBackendAction(() =>

        firstValueFrom(

          this.http.post<CarritoResponse>(`${API_BASE}/items`, {

            productoId: producto.id,

            cantidad,

          }),

        ),

      );



      if (synced) {

        return true;

      }



      this.addLocal(producto, cantidad);

      return true;

    }



    this.addLocal(producto, cantidad);

    return true;

  }



  async setQuantity(productoId: number, cantidad: number): Promise<void> {

    if (this.useBackend()) {

      const synced = await this.runBackendAction(() =>

        firstValueFrom(

          this.http.put<CarritoResponse>(`${API_BASE}/items/${productoId}`, { cantidad }),

        ),

      );

      if (synced) return;

    }



    const items = this.itemsSignal()

      .map((i) => {

        if (i.producto.id !== productoId) return i;

        const max = i.producto.stock ?? 99;

        return { ...i, cantidad: Math.max(1, Math.min(cantidad, max)) };

      })

      .filter((i) => i.cantidad > 0);

    this.persistLocal(items);

  }



  async remove(productoId: number): Promise<void> {

    if (this.useBackend()) {

      const synced = await this.runBackendAction(() =>

        firstValueFrom(this.http.delete<CarritoResponse>(`${API_BASE}/items/${productoId}`)),

      );

      if (synced) return;

    }



    this.persistLocal(this.itemsSignal().filter((i) => i.producto.id !== productoId));

  }



  async clear(): Promise<void> {

    if (this.useBackend()) {

      const synced = await this.runBackendAction(() => firstValueFrom(this.http.delete<void>(API_BASE)));

      if (synced) {

        this.persistLocal([]);

        return;

      }

    }



    this.persistLocal([]);

  }



  async refreshFromServer(): Promise<void> {

    if (!this.useBackend()) {

      this.itemsSignal.set(this.loadFromStorage());

      return;

    }



    try {

      const response = await firstValueFrom(this.http.get<CarritoResponse>(`${API_BASE}/me`));

      this.applyServerCart(response);

      this.backendAvailable.set(true);

    } catch {

      this.backendAvailable.set(false);

      this.itemsSignal.set(this.loadFromStorage());

    }

  }



  subtotal(): number {

    return this.itemsSignal().reduce((sum, i) => sum + Number(i.producto.precio) * i.cantidad, 0);

  }



  baseImponible(): number {

    return this.subtotal() / (1 + IGV_RATE);

  }



  impuestos(): number {

    return this.subtotal() - this.baseImponible();

  }



  costoEnvio(): number {

    return this.subtotal() >= ENVIO_GRATIS_DESDE ? 0 : COSTO_ENVIO;

  }



  total(): number {

    return this.subtotal() + this.costoEnvio();

  }



  private async bootstrap(): Promise<void> {

    if (this.useBackend()) {

      await this.refreshFromServer();

    }

  }



  private useBackend(): boolean {

    return this.auth.isLoggedIn() && !this.auth.isAdmin();

  }



  private async runBackendAction(action: () => Promise<CarritoResponse | void>): Promise<boolean> {

    try {

      const response = await action();

      if (response && 'items' in response) {

        this.applyServerCart(response);

        this.backendAvailable.set(true);

        return true;

      }



      this.backendAvailable.set(true);

      return true;

    } catch {

      this.backendAvailable.set(false);

      return false;

    }

  }



  private applyServerCart(response: CarritoResponse): void {

    const items: CartItem[] = (response.items ?? []).map((item) => ({

      producto: {

        id: item.productoId,

        nombre: item.nombreProducto,

        precio: Number(item.precioUnitario),

        stock: item.stockDisponible,

        activo: true,

        idCategoria: 0,

        imagenUrl: item.imagenUrl ?? null,

      },

      cantidad: item.cantidad,

    }));

    this.itemsSignal.set(items);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

  }



  private addLocal(producto: Producto, cantidad: number): void {

    const items = [...this.itemsSignal()];

    const existing = items.find((i) => i.producto.id === producto.id);

    const max = producto.stock ?? 99;



    if (existing) {

      existing.cantidad = Math.min(existing.cantidad + cantidad, max);

    } else {

      items.push({ producto, cantidad: Math.min(cantidad, max) });

    }



    this.persistLocal(items);

  }



  private persistLocal(items: CartItem[]): void {

    this.itemsSignal.set(items);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

  }



  private loadFromStorage(): CartItem[] {

    try {

      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) return [];

      const parsed = JSON.parse(raw) as CartItem[];

      return Array.isArray(parsed) ? parsed : [];

    } catch {

      return [];

    }

  }

}


