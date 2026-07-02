export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  idCategoria: number;
  precio: number;
  stock: number;
  activo: boolean;
  sku?: string;
  imagenUrl?: string | null;
  enOferta?: boolean;
  categoria?: { id: number; nombre: string };
}

export interface ProductoRequest {
  nombre: string;
  descripcion?: string;
  idCategoria: number;
  precio: number;
  stock: number;
  activo?: boolean;
  sku?: string;
  imagenUrl?: string | null;
  enOferta?: boolean;
}

export interface PedidoItem {
  id?: number;
  productoId: number;
  nombreProducto?: string;
  cantidad: number;
  precio?: number;
  precioUnitario?: number;
  subtotal?: number;
}

export interface Pedido {
  id: number;
  userId: number;
  cliente: string;
  estado: string;
  observacion?: string;
  direccionEnvio?: string;
  total: number;
  createdAt?: string;
  items: PedidoItem[];
}

export interface PedidoRequest {
  userId: number;
  cliente: string;
  estado: string;
  observacion?: string;
  direccionEnvio?: string;
  items: { productoId: number; cantidad: number }[];
}

export interface CartItem {
  producto: Producto;
  cantidad: number;
}

export interface CarritoItemResponse {
  id: number;
  productoId: number;
  cantidad: number;
  nombreProducto: string;
  precioUnitario: number;
  imagenUrl?: string | null;
  stockDisponible: number;
}

export interface CarritoResponse {
  id: number;
  userId: number;
  items: CarritoItemResponse[];
  updatedAt?: string;
}

export interface Pago {
  id: number;
  idPedido: number;
  userId: number;
  monto: number;
  metodo: string;
  estado: string;
  referenciaTransaccion?: string;
  fechaPago?: string;
}

export interface PagoRequest {
  idPedido: number;
  monto: number;
  metodo: string;
  estado: string;
  referenciaTransaccion?: string;
}

export interface MercadoPagoConfig {
  enabled: boolean;
  publicKey: string;
}

export interface MercadoPagoYapeRequest {
  idPedido: number;
  token: string;
  payerEmail?: string;
}

export interface MercadoPagoYapeResponse {
  approved: boolean;
  status: string;
  statusDetail: string;
  mercadoPagoPaymentId?: number;
  idPedido: number;
  idPago?: number;
  message: string;
}

export interface MercadoPagoTarjetaRequest {
  idPedido: number;
  token: string;
  paymentMethodId: string;
  payerEmail?: string;
  installments?: number;
}

export interface Usuario {
  id: number;
  username: string;
  nombreCompleto: string;
  email: string;
  roles: string[];
  enabled: boolean;
}

export interface UsuarioCreateRequest {
  username: string;
  password: string;
  nombreCompleto: string;
  email: string;
  role: 'ADMIN' | 'USER';
  enabled: boolean;
}

export interface UsuarioUpdateRequest {
  nombreCompleto?: string;
  email?: string;
  role?: 'ADMIN' | 'USER';
  enabled?: boolean;
  password?: string;
}

export interface PerfilUsuario {
  id: number;
  username: string;
  nombreCompleto: string;
  email: string;
  nombres?: string | null;
  apellidos?: string | null;
  dni?: string | null;
  fechaNacimiento?: string | null;
  sexo?: string | null;
  telefono?: string | null;
  pais?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  codigoPostal?: string | null;
  direccion?: string | null;
  referencia?: string | null;
  roles: string[];
  enabled: boolean;
}

export interface PerfilUpdateRequest {
  nombres?: string;
  apellidos?: string;
  nombreCompleto?: string;
  email?: string;
  dni?: string;
  fechaNacimiento?: string | null;
  sexo?: string;
  telefono?: string;
  pais?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  codigoPostal?: string;
  direccion?: string;
  referencia?: string;
}
