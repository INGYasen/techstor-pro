package com.upeu.carrito.service.impl;

import com.upeu.carrito.client.ProductoClient;
import com.upeu.carrito.dto.CarritoItemQuantityRequest;
import com.upeu.carrito.dto.CarritoItemRequest;
import com.upeu.carrito.dto.CarritoResponse;
import com.upeu.carrito.dto.ProductoDto;
import com.upeu.carrito.entity.Carrito;
import com.upeu.carrito.entity.CarritoItem;
import com.upeu.carrito.exception.ResourceNotFoundException;
import com.upeu.carrito.mapper.CarritoMapper;
import com.upeu.carrito.repository.CarritoRepository;
import com.upeu.carrito.service.CarritoService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CarritoServiceImpl implements CarritoService {

	private final CarritoRepository carritoRepository;
	private final ProductoClient productoClient;
	private final CarritoMapper carritoMapper;

	@Override
	@Transactional
	public CarritoResponse obtenerCarrito(Long userId) {
		return carritoMapper.toResponse(obtenerOCrearCarrito(userId));
	}

	@Override
	@Transactional
	public CarritoResponse agregarItem(Long userId, CarritoItemRequest request) {
		Carrito carrito = obtenerOCrearCarrito(userId);
		ProductoDto producto = validarProducto(request.getProductoId());
		int stock = producto.getStock() != null ? producto.getStock() : 0;
		int cantidadSolicitada = request.getCantidad();

		CarritoItem existente = carrito.getItems().stream()
				.filter(item -> item.getProductoId().equals(request.getProductoId()))
				.findFirst()
				.orElse(null);

		if (existente != null) {
			int nuevaCantidad = Math.min(existente.getCantidad() + cantidadSolicitada, stock);
			if (nuevaCantidad < 1) {
				throw new IllegalArgumentException("No hay stock disponible para este producto");
			}
			actualizarSnapshotItem(existente, producto, nuevaCantidad);
		} else {
			if (stock < cantidadSolicitada) {
				throw new IllegalArgumentException("Stock insuficiente para este producto");
			}
			CarritoItem nuevo = CarritoItem.builder()
					.carrito(carrito)
					.productoId(producto.getId())
					.cantidad(cantidadSolicitada)
					.nombreProducto(producto.getNombre())
					.precioUnitario(producto.getPrecio())
					.imagenUrl(producto.getImagenUrl())
					.stockDisponible(stock)
					.build();
			carrito.getItems().add(nuevo);
		}

		carrito.touch();
		return carritoMapper.toResponse(carritoRepository.save(carrito));
	}

	@Override
	@Transactional
	public CarritoResponse actualizarCantidad(Long userId, Long productoId, CarritoItemQuantityRequest request) {
		Carrito carrito = obtenerOCrearCarrito(userId);
		CarritoItem item = carrito.getItems().stream()
				.filter(i -> i.getProductoId().equals(productoId))
				.findFirst()
				.orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado en el carrito"));

		ProductoDto producto = validarProducto(productoId);
		int stock = producto.getStock() != null ? producto.getStock() : 0;
		int cantidad = Math.min(request.getCantidad(), stock);
		if (cantidad < 1) {
			throw new IllegalArgumentException("La cantidad debe ser al menos 1");
		}

		actualizarSnapshotItem(item, producto, cantidad);
		carrito.touch();
		return carritoMapper.toResponse(carritoRepository.save(carrito));
	}

	@Override
	@Transactional
	public CarritoResponse eliminarItem(Long userId, Long productoId) {
		Carrito carrito = obtenerOCrearCarrito(userId);
		boolean removed = carrito.getItems().removeIf(item -> item.getProductoId().equals(productoId));
		if (!removed) {
			throw new ResourceNotFoundException("Producto no encontrado en el carrito");
		}
		carrito.touch();
		return carritoMapper.toResponse(carritoRepository.save(carrito));
	}

	@Override
	@Transactional
	public void vaciarCarrito(Long userId) {
		Carrito carrito = carritoRepository.findByUserId(userId).orElse(null);
		if (carrito == null) {
			return;
		}
		carrito.getItems().clear();
		carrito.touch();
		carritoRepository.save(carrito);
	}

	private Carrito obtenerOCrearCarrito(Long userId) {
		return carritoRepository.findByUserId(userId)
				.orElseGet(() -> carritoRepository.save(Carrito.builder()
						.userId(userId)
						.updatedAt(LocalDateTime.now())
						.build()));
	}

	private ProductoDto validarProducto(Long productoId) {
		ProductoDto producto = productoClient.findById(productoId);
		if (producto == null) {
			throw new ResourceNotFoundException("Producto no encontrado");
		}
		if (Boolean.FALSE.equals(producto.getActivo())) {
			throw new IllegalArgumentException("El producto no está disponible");
		}
		return producto;
	}

	private void actualizarSnapshotItem(CarritoItem item, ProductoDto producto, int cantidad) {
		item.setCantidad(cantidad);
		item.setNombreProducto(producto.getNombre());
		item.setPrecioUnitario(producto.getPrecio());
		item.setImagenUrl(producto.getImagenUrl());
		item.setStockDisponible(producto.getStock() != null ? producto.getStock() : 0);
	}
}
