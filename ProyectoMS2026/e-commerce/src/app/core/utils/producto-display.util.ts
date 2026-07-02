import { Producto } from '../models/api.models';
import { resolveProductoImagenUrl } from './producto-image.util';

export function productoMarca(producto: Producto): string {
  if (producto.sku?.includes('-')) {
    return producto.sku.split('-')[0].trim();
  }
  const cat = producto.categoria?.nombre ?? '';
  if (cat) return cat.split(' ')[0];
  return 'TechStore';
}

export function productoRating(producto: Producto): number {
  return Math.round((4 + (producto.id % 10) / 10) * 10) / 10;
}

export function esDestacado(producto: Producto): boolean {
  return producto.stock >= 5;
}

export function esOferta(producto: Producto): boolean {
  const extra = producto as Producto & { en_oferta?: boolean };
  return producto.enOferta === true || extra.en_oferta === true;
}

export function descuentoPorcentaje(producto: Producto): number {
  return 10 + (producto.id % 5) * 2;
}

export function precioAnterior(producto: Producto): number {
  const pct = descuentoPorcentaje(producto);
  return Math.round((Number(producto.precio) / (1 - pct / 100)) * 100) / 100;
}

export function popularidadScore(producto: Producto): number {
  return producto.stock * 2 + producto.id;
}

export function imagenesProducto(producto: Producto): string[] {
  const principal = resolveProductoImagenUrl(producto.imagenUrl);
  const extras = [
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400',
    'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
    'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400',
  ];
  const urls = principal ? [principal, ...extras.slice(0, 2)] : extras.slice(0, 3);
  return urls;
}

export const METODOS_PAGO = [
  { id: 'TARJETA', label: 'Tarjeta de crédito o débito', icon: '💳', imagen: '/images/pago-tarjeta.png' },
  { id: 'YAPE', label: 'Yape', icon: '🟣', imagen: '/images/pago-yape.png' },
  { id: 'TRANSFERENCIA', label: 'Transferencia bancaria', icon: '🏦' },
  { id: 'CONTRA_ENTREGA', label: 'Pago contra entrega', icon: '💵' },
] as const;

export function observacionVisible(observacion?: string | null): string | null {
  if (!observacion?.trim()) return null;
  const limpia = observacion.replace(/\s*\[GPS:[^\]]+\]/gi, '').trim();
  return limpia || null;
}

export function tieneUbicacionGps(observacion?: string | null): boolean {
  return !!observacion && /\[GPS:/i.test(observacion);
}

export const ESTADOS_PEDIDO = [
  'PENDIENTE',
  'PAGADO',
  'PREPARANDO',
  'ENVIADO',
  'ENTREGADO',
  'CANCELADO',
] as const;
