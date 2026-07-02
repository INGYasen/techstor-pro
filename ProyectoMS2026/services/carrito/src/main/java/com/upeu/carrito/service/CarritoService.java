package com.upeu.carrito.service;

import com.upeu.carrito.dto.CarritoItemQuantityRequest;
import com.upeu.carrito.dto.CarritoItemRequest;
import com.upeu.carrito.dto.CarritoResponse;

public interface CarritoService {

	CarritoResponse obtenerCarrito(Long userId);

	CarritoResponse agregarItem(Long userId, CarritoItemRequest request);

	CarritoResponse actualizarCantidad(Long userId, Long productoId, CarritoItemQuantityRequest request);

	CarritoResponse eliminarItem(Long userId, Long productoId);

	void vaciarCarrito(Long userId);
}
